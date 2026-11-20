import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "node:crypto";
import {
  Product,
  Order,
  OrderItemRecord,
  Category,
  ProductOption,
  BusinessSettings,
  GroupSession,
  CartItem,
  PermissionDefinition,
  RolePermissionConfig,
  StaffAccount,
  Promotion,
  DiscountType,
  ShippingFeeMode,
} from "@/types";
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_SETTINGS } from "@/lib/store";
import { parseProductTags } from "@/lib/utils";
import { hashPassword, isScryptHash, safeEqualStrings } from "@/lib/password";

export interface SqliteStatus {
  connected: boolean;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  journalMode: string;
  foreignKeys: boolean;
  tables: {
    usersCount: number;
    productsCount: number;
    variantsCount: number;
    ordersCount: number;
    orderItemsCount: number;
    categoriesCount: number;
    optionsCount: number;
    settingsCount: number;
    groupSessionsCount: number;
    permissionsCount: number;
    rolePermissionsCount: number;
    promotionsCount?: number;
  };
  optimizedFor: string;
  sqlFileLastModified?: string;
  sqlFilePath?: string;
}

const DB_DIR = path.join(process.cwd(), "database");
// Primary SQLite Database file that DB Browser for SQLite opens:
const PRIMARY_DB_FILE = path.join(DB_DIR, "caxoi_cafe.db");
const MIRROR_DB_FILE = path.join(DB_DIR, "caxoi_cafe.sqlite");
const SQL_SEED_FILE = path.join(DB_DIR, "sqlite_caxoi_cafe.sql");
const BACKUPS_DIR = path.join(DB_DIR, "backups");
const MAX_BACKUP_FILES = 30;

let dbInstance: Database.Database | null = null;

/**
 * Đã vô hiệu hóa cơ chế tự động DROP TABLE khi file .sql đổi mtime để bảo vệ tuyệt đối dữ liệu đơn hàng & tài khoản.
 */
export function checkAndAutoSyncSqlite(): boolean {
  return false;
}

/**
 * Chỉ nạp lại 5 món & 3 quy cách chuẩn Quán Cà Xòi (categories, products, product_variants) trong transaction.
 * Tuyệt đối KHÔNG xóa orders, users, promotions, business_settings hay group_sessions.
 */
export function resetMenuTablesOnlyInSqlite(): boolean {
  try {
    const db = getSqliteDb();
    const runReset = db.transaction(() => {
      db.prepare("DELETE FROM product_variants").run();
      db.prepare("DELETE FROM products").run();
      db.prepare("DELETE FROM categories").run();

      const catStmt = db.prepare(`
        INSERT INTO categories (id, name, slug, description, image_url, display_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of INITIAL_CATEGORIES) {
        catStmt.run(
          c.id,
          c.name,
          c.slug,
          c.description || "",
          c.imageUrl || "",
          c.displayOrder,
          c.isActive ? 1 : 0
        );
      }

      const prodStmt = db.prepare(`
        INSERT INTO products (id, category_id, name, slug, description, image_url, base_price, sale_price, is_available, is_featured, prep_time_minutes, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const varStmt = db.prepare(`
        INSERT INTO product_variants (product_id, size_name, extra_price, is_default)
        VALUES (?, ?, ?, ?)
      `);

      for (const p of INITIAL_PRODUCTS) {
        prodStmt.run(
          p.id,
          p.categoryId,
          p.name,
          p.slug,
          p.description || "",
          p.imageUrl || "",
          p.basePrice,
          p.salePrice ?? null,
          p.isAvailable ? 1 : 0,
          p.isFeatured ? 1 : 0,
          p.prepTimeMinutes || 4,
          Array.isArray(p.tags) ? p.tags.join(",") : ""
        );
        for (const v of p.variants) {
          varStmt.run(p.id, v.sizeName, v.extraPrice, v.isDefault ? 1 : 0);
        }
      }
    });

    runReset();
    syncMirrorFile();
    return true;
  } catch (error) {
    console.error("Lỗi khôi phục bảng thực đơn SQLite:", error);
    return false;
  }
}

/**
 * Thực thi tệp SQL seed (chỉ dùng khi khởi tạo CSDL mới hoặc thao tác đặt lại toàn bộ từ SUPER_ADMIN).
 */
export function executeSqlSeedFile(): boolean {
  try {
    if (!fs.existsSync(SQL_SEED_FILE)) {
      return false;
    }

    const sqlContent = fs.readFileSync(SQL_SEED_FILE, "utf-8");
    const db = getSqliteDb();

    db.exec(sqlContent);
    runNonDestructiveMigrations(db);

    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
      fs.copyFileSync(PRIMARY_DB_FILE, MIRROR_DB_FILE);
    } catch {}

    return true;
  } catch (error: any) {
    console.error("Lỗi thực thi SQL seed:", error);
    return false;
  }
}

function runNonDestructiveMigrations(db: Database.Database) {
  ensureUsersSecurityColumns(db);
  ensureBusinessSettingsColumns(db);
  ensureOrdersColumns(db);
  ensurePromotionsColumns(db);
  ensureGroupSessionsColumns(db);
  ensureWebhookTransactionsTable(db);
}

/**
 * Lấy đối tượng kết nối SQLite (Singleton) kết nối trực tiếp caxoi_cafe.db
 * Áp dụng các PRAGMA tối ưu hóa hiệu năng và đồng bộ với DB Browser for SQLite
 */
export function getSqliteDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const isNewDb = !fs.existsSync(PRIMARY_DB_FILE);

  const db = new Database(PRIMARY_DB_FILE, {
    timeout: 5000, // Chờ 5s nếu DB Browser for SQLite đang thực hiện transaction
  });

  // TỐI ƯU HÓA CHO DB BROWSER FOR SQLITE:
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");
  db.pragma("cache_size = -64000");
  db.pragma("temp_store = MEMORY");

  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").get();
  if (isNewDb || !tableCheck) {
    if (fs.existsSync(SQL_SEED_FILE)) {
      const sqlContent = fs.readFileSync(SQL_SEED_FILE, "utf-8");
      db.exec(sqlContent);
      try {
        db.pragma("wal_checkpoint(TRUNCATE)");
        fs.copyFileSync(PRIMARY_DB_FILE, MIRROR_DB_FILE);
      } catch {}
    }
  }

  runNonDestructiveMigrations(db);

  dbInstance = db;
  return dbInstance;
}

/**
 * Đồng bộ WAL checkpoint chuẩn trước khi tải tệp .db về máy
 */
export function checkpointSqliteForDownload(): void {
  try {
    const db = getSqliteDb();
    db.pragma("wal_checkpoint(TRUNCATE)");
    fs.copyFileSync(PRIMARY_DB_FILE, MIRROR_DB_FILE);
  } catch (err) {
    console.error("Lỗi checkpoint SQLite:", err);
  }
}

/**
 * Đồng bộ mirror file sau các thao tác ghi (Write)
 */
function syncMirrorFile() {
  try {
    if (dbInstance) {
      dbInstance.pragma("wal_checkpoint(PASSIVE)");
      fs.copyFileSync(PRIMARY_DB_FILE, MIRROR_DB_FILE);
    }
  } catch {}
}

/**
 * Kiểm tra trạng thái và thông số file SQLite
 */
export function getSqliteStatus(): SqliteStatus {
  try {
    checkAndAutoSyncSqlite();
    const db = getSqliteDb();

    let fileSizeBytes = 0;
    if (fs.existsSync(PRIMARY_DB_FILE)) {
      fileSizeBytes = fs.statSync(PRIMARY_DB_FILE).size;
    }

    const journalModeRow: any = db.pragma("journal_mode", { simple: true });
    const foreignKeysRow: any = db.pragma("foreign_keys", { simple: true });

    const getCount = (tbl: string) => {
      try {
        const row: any = db.prepare(`SELECT COUNT(*) as count FROM ${tbl}`).get();
        return row?.count || 0;
      } catch {
        return 0;
      }
    };

    let sqlFileModifiedFormatted = "Chưa xác định";
    if (fs.existsSync(SQL_SEED_FILE)) {
      const mtime = fs.statSync(SQL_SEED_FILE).mtime;
      sqlFileModifiedFormatted = mtime.toLocaleTimeString("vi-VN") + " " + mtime.toLocaleDateString("vi-VN");
    }

    return {
      connected: true,
      filePath: "database/caxoi_cafe.db",
      fileName: "database/caxoi_cafe.db",
      fileSizeBytes,
      fileSizeFormatted: `${(fileSizeBytes / 1024).toFixed(1)} KB`,
      journalMode: String(journalModeRow || "WAL").toUpperCase(),
      foreignKeys: Boolean(foreignKeysRow),
      tables: {
        usersCount: getCount("users"),
        productsCount: getCount("products"),
        variantsCount: getCount("product_variants"),
        ordersCount: getCount("orders"),
        orderItemsCount: getCount("order_items"),
        categoriesCount: getCount("categories"),
        optionsCount: getCount("product_options"),
        settingsCount: getCount("business_settings"),
        groupSessionsCount: getCount("group_sessions"),
        permissionsCount: getCount("permissions"),
        rolePermissionsCount: getCount("role_permissions"),
        promotionsCount: getCount("promotions"),
      },
      optimizedFor: "DB Browser for SQLite (https://sqlitebrowser.org)",
      sqlFileLastModified: sqlFileModifiedFormatted,
      sqlFilePath: "database/sqlite_caxoi_cafe.sql",
    };
  } catch (error: any) {
    return {
      connected: false,
      filePath: "database/caxoi_cafe.db",
      fileName: "database/caxoi_cafe.db",
      fileSizeBytes: 0,
      fileSizeFormatted: "0 KB",
      journalMode: "UNKNOWN",
      foreignKeys: false,
      tables: {
        usersCount: 0,
        productsCount: 0,
        variantsCount: 0,
        ordersCount: 0,
        orderItemsCount: 0,
        categoriesCount: 0,
        optionsCount: 0,
        settingsCount: 0,
        groupSessionsCount: 0,
        permissionsCount: 0,
        rolePermissionsCount: 0,
      },
      optimizedFor: "DB Browser for SQLite",
    };
  }
}

// ============================================================================
// 1. DANH MỤC (CATEGORIES)
// ============================================================================
export function getCategoriesFromSqlite(): Category[] {
  try {
    checkAndAutoSyncSqlite();
    const db = getSqliteDb();
    const rows = db.prepare("SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC").all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description || "",
      imageUrl: r.image_url || "",
      displayOrder: r.display_order,
      isActive: Boolean(r.is_active),
    }));
  } catch (error) {
    return [];
  }
}

// ============================================================================
// 2. SẢN PHẨM & QUY CÁCH (PRODUCTS & VARIANTS)
// ============================================================================
export function getProductsFromSqlite(): Product[] {
  try {
    checkAndAutoSyncSqlite();
    const db = getSqliteDb();
    const rows = db.prepare("SELECT * FROM products ORDER BY id ASC").all() as any[];
    const variantsRows = db.prepare("SELECT * FROM product_variants ORDER BY id ASC").all() as any[];

    return rows.map((r: any) => {
      const pVariants = variantsRows
        .filter((v: any) => v.product_id === r.id)
        .map((v: any) => ({
          id: v.id,
          productId: v.product_id,
          sizeName: v.size_name,
          extraPrice: Number(v.extra_price),
          isDefault: Boolean(v.is_default),
        }));

      const tags = parseProductTags(r.tags);

      return {
        id: r.id,
        categoryId: r.category_id,
        name: r.name,
        slug: r.slug,
        description: r.description || "",
        imageUrl: r.image_url || "",
        basePrice: Number(r.base_price),
        salePrice: r.sale_price ? Number(r.sale_price) : null,
        isAvailable: Boolean(r.is_available),
        isFeatured: Boolean(r.is_featured),
        prepTimeMinutes: Number(r.prep_time_minutes) || 4,
        tags,
        variants: pVariants.length > 0 ? pVariants : [
          { id: 1, productId: r.id, sizeName: "Ly", extraPrice: 0, isDefault: true },
          { id: 2, productId: r.id, sizeName: "100ml", extraPrice: 12000, isDefault: false },
          { id: 3, productId: r.id, sizeName: "250ml", extraPrice: 37000, isDefault: false },
        ],
      };
    });
  } catch (error) {
    return [];
  }
}

export function createProductInSqlite(product: Product): boolean {
  try {
    const db = getSqliteDb();
    const stmt = db.prepare(`
      INSERT INTO products (id, category_id, name, slug, description, image_url, base_price, sale_price, is_available, is_featured, prep_time_minutes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      product.id,
      product.categoryId || 1,
      product.name,
      product.slug,
      product.description || "",
      product.imageUrl || "",
      product.basePrice,
      product.salePrice || null,
      product.isAvailable ? 1 : 0,
      product.isFeatured ? 1 : 0,
      product.prepTimeMinutes || 4,
      Array.isArray(product.tags) ? product.tags.join(",") : product.tags || "NEW"
    );

    if (product.variants && product.variants.length > 0) {
      const vStmt = db.prepare(`
        INSERT INTO product_variants (product_id, size_name, extra_price, is_default)
        VALUES (?, ?, ?, ?)
      `);
      for (const v of product.variants) {
        vStmt.run(product.id, v.sizeName, v.extraPrice, v.isDefault ? 1 : 0);
      }
    }

    syncMirrorFile();
    return true;
  } catch (error) {
    console.error("Lỗi tạo món vào SQLite:", error);
    return false;
  }
}

export function updateProductInSqlite(product: Product): boolean {
  try {
    const db = getSqliteDb();
    const serializedTags = Array.isArray(product.tags) ? product.tags.join(",") : "";

    const runUpdate = db.transaction(() => {
      db.prepare(`
        UPDATE products 
        SET name = ?, description = ?, base_price = ?, sale_price = ?, is_available = ?, is_featured = ?, image_url = ?, category_id = ?, prep_time_minutes = ?, tags = ?
        WHERE id = ?
      `).run(
        product.name,
        product.description,
        product.basePrice,
        product.salePrice || null,
        product.isAvailable ? 1 : 0,
        product.isFeatured ? 1 : 0,
        product.imageUrl || "",
        product.categoryId || 1,
        product.prepTimeMinutes || 4,
        serializedTags,
        product.id
      );

      if (product.variants && product.variants.length > 0) {
        const existingRows = db
          .prepare("SELECT id, size_name FROM product_variants WHERE product_id = ?")
          .all(product.id) as Array<{ id: number; size_name: string }>;
        const existingById = new Map(existingRows.map((r) => [r.id, r]));
        const keptIds = new Set<number>();

        const updateVarStmt = db.prepare(`
          UPDATE product_variants
          SET size_name = ?, extra_price = ?, is_default = ?
          WHERE id = ? AND product_id = ?
        `);
        const insertVarStmt = db.prepare(`
          INSERT INTO product_variants (product_id, size_name, extra_price, is_default)
          VALUES (?, ?, ?, ?)
        `);

        for (const v of product.variants) {
          const cleanSize = v.sizeName.trim();
          const extra = Number(v.extraPrice) || 0;
          const isDef = v.isDefault ? 1 : 0;

          if (v.id && existingById.has(v.id) && !keptIds.has(v.id)) {
            updateVarStmt.run(cleanSize, extra, isDef, v.id, product.id);
            keptIds.add(v.id);
          } else {
            const matchedByName = existingRows.find(
              (r) => !keptIds.has(r.id) && r.size_name.trim().toLowerCase() === cleanSize.toLowerCase()
            );
            if (matchedByName) {
              updateVarStmt.run(cleanSize, extra, isDef, matchedByName.id, product.id);
              keptIds.add(matchedByName.id);
            } else {
              const res = insertVarStmt.run(product.id, cleanSize, extra, isDef);
              keptIds.add(Number(res.lastInsertRowid));
            }
          }
        }

        const deleteVarStmt = db.prepare("DELETE FROM product_variants WHERE id = ? AND product_id = ?");
        for (const row of existingRows) {
          if (!keptIds.has(row.id)) {
            deleteVarStmt.run(row.id, product.id);
          }
        }
      }
    });

    runUpdate();
    syncMirrorFile();
    return true;
  } catch (error) {
    console.error("Lỗi updateProductInSqlite:", error);
    return false;
  }
}

export function deleteProductFromSqlite(id: string): boolean {
  try {
    const db = getSqliteDb();
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    syncMirrorFile();
    return true;
  } catch (error) {
    return false;
  }
}

export function toggleProductAvailabilityInSqlite(productId: string, isAvailable: boolean): boolean {
  try {
    const db = getSqliteDb();
    db.prepare("UPDATE products SET is_available = ? WHERE id = ?").run(isAvailable ? 1 : 0, productId);
    syncMirrorFile();
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// 3. TÙY CHỌN MÓN (PRODUCT OPTIONS)
// ============================================================================
export function getProductOptionsFromSqlite(): ProductOption[] {
  try {
    checkAndAutoSyncSqlite();
    const db = getSqliteDb();
    const optionRows = db.prepare("SELECT * FROM product_options ORDER BY display_order ASC").all() as any[];
    const valueRows = db.prepare("SELECT * FROM product_option_values ORDER BY display_order ASC").all() as any[];

    return optionRows.map((opt) => ({
      id: opt.id,
      name: opt.name,
      isRequired: Boolean(opt.is_required),
      isMultiple: Boolean(opt.is_multiple),
      displayOrder: opt.display_order,
      values: valueRows
        .filter((val) => val.option_id === opt.id)
        .map((val) => ({
          id: val.id,
          optionId: val.option_id,
          name: val.name,
          extraPrice: Number(val.extra_price),
          isDefault: Boolean(val.is_default),
          displayOrder: val.display_order,
        })),
    }));
  } catch (error) {
    return [];
  }
}

export function createOptionValueInSqlite(data: {
  optionId: number;
  name: string;
  extraPrice: number;
  isDefault?: boolean;
}): boolean {
  try {
    const db = getSqliteDb();
    const maxOrderRow = db
      .prepare("SELECT MAX(display_order) as maxOrder FROM product_option_values WHERE option_id = ?")
      .get(data.optionId) as any;
    const nextOrder = (maxOrderRow?.maxOrder ?? 0) + 1;

    if (data.isDefault) {
      const opt = db.prepare("SELECT is_multiple FROM product_options WHERE id = ?").get(data.optionId) as any;
      if (opt && !opt.is_multiple) {
        db.prepare("UPDATE product_option_values SET is_default = 0 WHERE option_id = ?").run(data.optionId);
      }
    }

    db.prepare(`
      INSERT INTO product_option_values (option_id, name, extra_price, is_default, display_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      data.optionId,
      data.name.trim(),
      Number(data.extraPrice) || 0,
      data.isDefault ? 1 : 0,
      nextOrder
    );

    syncMirrorFile();
    return true;
  } catch (error) {
    console.error("Lỗi createOptionValueInSqlite:", error);
    return false;
  }
}

export function updateOptionValueInSqlite(
  id: number,
  updates: {
    name?: string;
    extraPrice?: number;
    isDefault?: boolean;
    displayOrder?: number;
  }
): boolean {
  try {
    const db = getSqliteDb();
    const current = db.prepare("SELECT * FROM product_option_values WHERE id = ?").get(id) as any;
    if (!current) return false;

    const newName = updates.name !== undefined ? updates.name.trim() : current.name;
    const newExtraPrice = updates.extraPrice !== undefined ? Number(updates.extraPrice) : current.extra_price;
    const newIsDefault = updates.isDefault !== undefined ? (updates.isDefault ? 1 : 0) : current.is_default;
    const newDisplayOrder = updates.displayOrder !== undefined ? updates.displayOrder : current.display_order;

    if (updates.isDefault) {
      const opt = db.prepare("SELECT is_multiple FROM product_options WHERE id = ?").get(current.option_id) as any;
      if (opt && !opt.is_multiple) {
        db.prepare("UPDATE product_option_values SET is_default = 0 WHERE option_id = ?").run(current.option_id);
      }
    }

    db.prepare(`
      UPDATE product_option_values
      SET name = ?, extra_price = ?, is_default = ?, display_order = ?
      WHERE id = ?
    `).run(newName, newExtraPrice, newIsDefault, newDisplayOrder, id);

    syncMirrorFile();
    return true;
  } catch (error) {
    console.error("Lỗi updateOptionValueInSqlite:", error);
    return false;
  }
}

export function deleteOptionValueInSqlite(id: number): boolean {
  try {
    const db = getSqliteDb();
    db.prepare("DELETE FROM product_option_values WHERE id = ?").run(id);
    syncMirrorFile();
    return true;
  } catch (error) {
    console.error("Lỗi deleteOptionValueInSqlite:", error);
    return false;
  }
}

// ============================================================================
// 4. CẤU HÌNH VẬN HÀNH & VIETQR (BUSINESS SETTINGS)
// ============================================================================
const HERO_SETTINGS_COLUMNS: ReadonlyArray<{
  key: keyof BusinessSettings;
  col: string;
  required?: boolean;
}> = [
  { key: "heroBadgeBrand", col: "hero_badge_brand", required: true },
  { key: "heroLocation", col: "hero_location" },
  { key: "heroEyebrow", col: "hero_eyebrow" },
  { key: "heroHeadlinePrimary", col: "hero_headline_primary" },
  { key: "heroHeadlineHighlight", col: "hero_headline_highlight" },
  { key: "heroDescription", col: "hero_description" },
  { key: "heroServiceNote", col: "hero_service_note" },
  { key: "heroPriceBadge1", col: "hero_price_badge_1" },
  { key: "heroPriceBadge2", col: "hero_price_badge_2" },
  { key: "heroPriceBadge3", col: "hero_price_badge_3" },
  { key: "heroPrimaryCtaText", col: "hero_primary_cta_text" },
  { key: "heroSecondaryCtaText", col: "hero_secondary_cta_text" },
  { key: "heroWatermarkText", col: "hero_watermark_text" },
  { key: "heroLogoUrl", col: "hero_logo_url", required: true },
  { key: "heroMascotTitle", col: "hero_mascot_title" },
  { key: "heroMascotSubtitle", col: "hero_mascot_subtitle" },
  { key: "facebookUrl", col: "facebook_url", required: true },
  { key: "qrFacebookTitle", col: "qr_facebook_title" },
  { key: "qrFacebookSubtitle", col: "qr_facebook_subtitle" },
  { key: "xanhSmUrl", col: "xanh_sm_url", required: true },
  { key: "qrXanhSmTitle", col: "qr_xanh_sm_title" },
  { key: "qrXanhSmSubtitle", col: "qr_xanh_sm_subtitle" },
];

export function ensureBusinessSettingsColumns(db: Database.Database) {
  try {
    const columns = (db.pragma("table_info(business_settings)") || []) as any[];
    if (!Array.isArray(columns) || columns.length === 0) return;
    const colNames = columns.map((c) => c.name);
    if (!colNames.includes("shipping_fee_mode")) {
      db.exec("ALTER TABLE business_settings ADD COLUMN shipping_fee_mode TEXT DEFAULT 'AUTO'");
    }
    for (const def of HERO_SETTINGS_COLUMNS) {
      if (!colNames.includes(def.col)) {
        db.exec(`ALTER TABLE business_settings ADD COLUMN ${def.col} TEXT DEFAULT NULL`);
      }
    }
  } catch (err: any) {
    console.error("[SQLite Migration] Lỗi kiểm tra cột business_settings:", err.message);
  }
}

export function getBusinessSettingsFromSqlite(): BusinessSettings {
  try {
    const db = getSqliteDb();
    const row: any = db.prepare("SELECT * FROM business_settings WHERE id = 1").get();
    if (!row) {
      return { ...INITIAL_SETTINGS };
    }

    const shippingFeeMode: ShippingFeeMode =
      row.shipping_fee_mode === "MANUAL_ZERO" ? "MANUAL_ZERO" : "AUTO";

    const result: BusinessSettings = {
      ...INITIAL_SETTINGS,
      storeName: row.store_name || INITIAL_SETTINGS.storeName,
      storeStatus: (row.store_status as any) || INITIAL_SETTINGS.storeStatus,
      storeStatusMessage:
        row.store_status_message || row.rush_mode_message || INITIAL_SETTINGS.storeStatusMessage,
      hotline: row.hotline || row.phone || INITIAL_SETTINGS.hotline,
      openTime: row.open_time || INITIAL_SETTINGS.openTime,
      closeTime: row.close_time || INITIAL_SETTINGS.closeTime,
      shippingFeeMode,
      baseDeliveryFee: Number(row.base_delivery_fee ?? row.default_delivery_fee ?? INITIAL_SETTINGS.baseDeliveryFee),
      freeDeliveryMinCups: Number(row.free_delivery_min_cups ?? INITIAL_SETTINGS.freeDeliveryMinCups),
      maxSlotCapacityCups: Number(row.max_slot_capacity_cups ?? row.max_orders_per_slot ?? INITIAL_SETTINGS.maxSlotCapacityCups),
      prepLeadTimeMinutes: Number(row.prep_lead_time_minutes ?? INITIAL_SETTINGS.prepLeadTimeMinutes),
      vietqrBankId: row.vietqr_bank_id || row.bank_bin || INITIAL_SETTINGS.vietqrBankId,
      vietqrAccountNo: row.vietqr_account_no || row.bank_account_no || INITIAL_SETTINGS.vietqrAccountNo,
      vietqrAccountName: row.vietqr_account_name || row.bank_account_name || INITIAL_SETTINGS.vietqrAccountName,
    };

    for (const def of HERO_SETTINGS_COLUMNS) {
      const rawVal = row[def.col];
      const fallback = INITIAL_SETTINGS[def.key] as string;
      if (def.required) {
        (result as any)[def.key] = rawVal && String(rawVal).trim() ? String(rawVal) : fallback;
      } else {
        (result as any)[def.key] = rawVal === null || rawVal === undefined ? fallback : String(rawVal);
      }
    }

    return result;
  } catch (error) {
    return { ...INITIAL_SETTINGS };
  }
}

export function updateBusinessSettingsInSqlite(updates: Partial<BusinessSettings>): BusinessSettings {
  try {
    const db = getSqliteDb();
    ensureBusinessSettingsColumns(db);
    const current = getBusinessSettingsFromSqlite();
    const merged: BusinessSettings = { ...current, ...updates };
    const safeMode: ShippingFeeMode =
      merged.shippingFeeMode === "MANUAL_ZERO" ? "MANUAL_ZERO" : "AUTO";
    merged.shippingFeeMode = safeMode;

    const assignments = [
      "store_name = ?",
      "store_status = ?",
      "store_status_message = ?",
      "hotline = ?",
      "phone = ?",
      "open_time = ?",
      "close_time = ?",
      "shipping_fee_mode = ?",
      "base_delivery_fee = ?",
      "free_delivery_min_cups = ?",
      "max_slot_capacity_cups = ?",
      "prep_lead_time_minutes = ?",
      "vietqr_bank_id = ?",
      "vietqr_account_no = ?",
      "vietqr_account_name = ?",
      ...HERO_SETTINGS_COLUMNS.map((d) => `${d.col} = ?`),
    ];

    const values: any[] = [
      merged.storeName,
      merged.storeStatus,
      merged.storeStatusMessage,
      merged.hotline,
      merged.hotline,
      merged.openTime,
      merged.closeTime,
      safeMode,
      merged.baseDeliveryFee,
      merged.freeDeliveryMinCups,
      merged.maxSlotCapacityCups,
      merged.prepLeadTimeMinutes,
      merged.vietqrBankId,
      merged.vietqrAccountNo,
      merged.vietqrAccountName,
      ...HERO_SETTINGS_COLUMNS.map((d) => {
        const val = merged[d.key];
        return val === null || val === undefined ? INITIAL_SETTINGS[d.key] : String(val);
      }),
    ];

    const stmt = db.prepare(`UPDATE business_settings SET ${assignments.join(", ")} WHERE id = 1`);
    stmt.run(...values);

    syncMirrorFile();
    return merged;
  } catch (error) {
    return getBusinessSettingsFromSqlite();
  }
}

// ============================================================================
// 5. ĐƠN HÀNG (ORDERS & ORDER ITEMS)
// ============================================================================

function ensureOrdersColumns(db: Database.Database) {
  try {
    const columns = (db.pragma("table_info(orders)") || []) as any[];
    const colNames = Array.isArray(columns) ? columns.map((c) => c.name) : [];
    if (!colNames.includes("shipper_name")) {
      db.exec("ALTER TABLE orders ADD COLUMN shipper_name TEXT DEFAULT NULL");
    }
    if (!colNames.includes("shipper_phone")) {
      db.exec("ALTER TABLE orders ADD COLUMN shipper_phone TEXT DEFAULT NULL");
    }
    if (!colNames.includes("estimated_delivery_time")) {
      db.exec("ALTER TABLE orders ADD COLUMN estimated_delivery_time TEXT DEFAULT NULL");
    }
    if (!colNames.includes("tracking_notes")) {
      db.exec("ALTER TABLE orders ADD COLUMN tracking_notes TEXT DEFAULT NULL");
    }
    if (!colNames.includes("tracking_token")) {
      db.exec("ALTER TABLE orders ADD COLUMN tracking_token TEXT DEFAULT NULL");
    }
  } catch (e) {
    console.error("Lỗi kiểm tra cấu trúc bảng orders:", e);
  }
}

function ensureWebhookTransactionsTable(db: Database.Database) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS webhook_transactions (
        tx_id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        order_code TEXT NOT NULL,
        amount REAL NOT NULL,
        gateway TEXT,
        processed_at TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `);
  } catch (e) {
    console.error("Lỗi tạo bảng webhook_transactions:", e);
  }
}

export function hasWebhookTransactionInSqlite(txId: string): boolean {
  try {
    const db = getSqliteDb();
    ensureWebhookTransactionsTable(db);
    const row = db.prepare("SELECT tx_id FROM webhook_transactions WHERE tx_id = ? LIMIT 1").get(txId);
    return Boolean(row);
  } catch {
    return false;
  }
}

export function recordWebhookTransactionInSqlite(
  txId: string,
  orderId: string,
  orderCode: string,
  amount: number,
  gateway?: string
): boolean {
  try {
    const db = getSqliteDb();
    ensureWebhookTransactionsTable(db);
    db.prepare(`
      INSERT INTO webhook_transactions (tx_id, order_id, order_code, amount, gateway, processed_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(txId, orderId, orderCode, amount, gateway || "VIETQR");
    syncMirrorFile();
    return true;
  } catch {
    return false;
  }
}

function mapOrderRow(o: any, itemRows: any[]): Order {
  const items: OrderItemRecord[] = itemRows.map((i: any) => {
    let opts = [];
    try {
      opts = JSON.parse(i.selected_options_json || "[]");
    } catch {}
    return {
      id: i.id,
      orderId: i.order_id,
      productId: i.product_id,
      productName: i.product_name,
      variantName: i.variant_name,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      totalPrice: Number(i.total_price),
      recipientLabel: i.recipient_label || undefined,
      itemNotes: i.item_notes || undefined,
      options: opts,
    };
  });

  return {
    id: o.id,
    orderCode: o.order_code,
    orderType: o.order_type,
    status: o.status,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    recipientName: o.recipient_name,
    recipientPhone: o.recipient_phone,
    companyName: o.company_name || undefined,
    buildingName: o.building_name || undefined,
    floorRoom: o.floor_room || undefined,
    deliveryAddress: o.delivery_address || undefined,
    deliveryNotes: o.delivery_notes || undefined,
    scheduledType: o.scheduled_type || "ASAP",
    scheduledTime: o.scheduled_time || undefined,
    subtotalAmount: Number(o.subtotal_amount),
    discountAmount: Number(o.discount_amount || 0),
    deliveryFee: Number(o.delivery_fee || 0),
    totalAmount: Number(o.total_amount),
    promotionCode: o.promotion_code || undefined,
    groupSessionId: o.group_session_id || undefined,
    baristaNotes: o.barista_notes || undefined,
    shipperName: o.shipper_name || undefined,
    shipperPhone: o.shipper_phone || undefined,
    estimatedDeliveryTime: o.estimated_delivery_time || undefined,
    trackingNotes: o.tracking_notes || undefined,
    trackingToken: o.tracking_token || undefined,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    items,
  };
}

export function getOrdersFromSqlite(filter?: {
  status?: string;
  orderType?: string;
  phone?: string;
  exactPhone?: string;
  exactOrderCode?: string;
  search?: string;
  date?: string; // 'TODAY' | 'YESTERDAY' | '7DAYS' | 'ALL'
  limit?: number;
}): Order[] {
  try {
    const db = getSqliteDb();

    let query = "SELECT * FROM orders";
    const params: any[] = [];
    const conditions: string[] = [];

    if (filter?.status && filter.status !== "ALL") {
      conditions.push("status = ?");
      params.push(filter.status);
    }

    if (filter?.orderType && filter.orderType !== "ALL") {
      conditions.push("order_type = ?");
      params.push(filter.orderType);
    }

    if (filter?.exactPhone) {
      const normalized = filter.exactPhone.replace(/[^\d+]/g, "");
      conditions.push("REPLACE(REPLACE(REPLACE(recipient_phone, ' ', ''), '.', ''), '-', '') = ?");
      params.push(normalized);
    } else if (filter?.phone) {
      conditions.push("recipient_phone LIKE ?");
      params.push(`%${filter.phone}%`);
    }

    if (filter?.exactOrderCode) {
      conditions.push("(LOWER(order_code) = LOWER(?) OR id = ?)");
      params.push(filter.exactOrderCode.trim(), filter.exactOrderCode.trim());
    }

    if (filter?.search && filter.search.trim()) {
      const s = `%${filter.search.trim()}%`;
      conditions.push("(order_code LIKE ? OR recipient_name LIKE ? OR recipient_phone LIKE ? OR building_name LIKE ? OR company_name LIKE ?)");
      params.push(s, s, s, s, s);
    }

    if (filter?.date && filter.date !== "ALL") {
      if (filter.date === "TODAY") {
        conditions.push("date(created_at, 'localtime') = date('now', 'localtime')");
      } else if (filter.date === "YESTERDAY") {
        conditions.push("date(created_at, 'localtime') = date('now', 'localtime', '-1 day')");
      } else if (filter.date === "7DAYS") {
        conditions.push("date(created_at, 'localtime') >= date('now', 'localtime', '-7 days')");
      }
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY created_at DESC";

    if (filter?.limit && filter.limit > 0) {
      query += " LIMIT ?";
      params.push(Math.min(500, Math.floor(filter.limit)));
    }

    const orderRows = db.prepare(query).all(...params) as any[];
    if (orderRows.length === 0) return [];

    const orderIds = orderRows.map((o) => o.id);
    const placeholders = orderIds.map(() => "?").join(", ");
    const itemRows = db
      .prepare(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`)
      .all(...orderIds) as any[];

    const itemsByOrder = new Map<string, any[]>();
    for (const item of itemRows) {
      const bucket = itemsByOrder.get(item.order_id) || [];
      bucket.push(item);
      itemsByOrder.set(item.order_id, bucket);
    }

    return orderRows.map((o) => mapOrderRow(o, itemsByOrder.get(o.id) || []));
  } catch (error) {
    console.error("Lỗi lấy danh sách đơn hàng:", error);
    return [];
  }
}

export function getOrderByIdFromSqlite(idOrCode: string): Order | null {
  try {
    const db = getSqliteDb();
    const row: any = db
      .prepare("SELECT * FROM orders WHERE id = ? OR LOWER(order_code) = LOWER(?) LIMIT 1")
      .get(idOrCode, idOrCode);

    if (!row) return null;

    const itemsRows = db
      .prepare("SELECT * FROM order_items WHERE order_id = ?")
      .all(row.id) as any[];

    return mapOrderRow(row, itemsRows);
  } catch (error) {
    return null;
  }
}

function allocateNextOrderCodeTx(db: Database.Database): string {
  const rows = db.prepare("SELECT order_code FROM orders WHERE order_code LIKE 'CF2611-%'").all() as Array<{
    order_code: string;
  }>;
  let maxSeq = 0;
  for (const r of rows) {
    const match = String(r.order_code || "").match(/^CF2611-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  }
  return `CF2611-${String(maxSeq + 1).padStart(3, "0")}`;
}

export function saveOrderToSqlite(order: Order): boolean {
  try {
    const db = getSqliteDb();
    ensureOrdersColumns(db);

    const runSave = db.transaction(() => {
      // Sinh mã đơn nguyên tử bên trong transaction để chống trùng UNIQUE khi nhiều khách đặt cùng lúc
      let finalCode = order.orderCode;
      if (!finalCode || db.prepare("SELECT id FROM orders WHERE LOWER(order_code) = LOWER(?)").get(finalCode)) {
        finalCode = allocateNextOrderCodeTx(db);
        order.orderCode = finalCode;
      }

      if (!order.trackingToken) {
        order.trackingToken = crypto.randomBytes(16).toString("hex");
      }

      const insertOrder = db.prepare(`
        INSERT INTO orders 
        (id, order_code, order_type, recipient_name, recipient_phone, company_name, building_name, floor_room,
         delivery_address, delivery_notes, scheduled_type, scheduled_time, subtotal_amount, discount_amount,
         delivery_fee, total_amount, payment_method, payment_status, status, promotion_code, group_session_id,
         barista_notes, tracking_token, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertOrder.run(
        order.id,
        finalCode,
        order.orderType,
        order.recipientName,
        order.recipientPhone,
        order.companyName || "",
        order.buildingName || "",
        order.floorRoom || "",
        order.deliveryAddress || "",
        order.deliveryNotes || "",
        order.scheduledType || "ASAP",
        order.scheduledTime || null,
        order.subtotalAmount,
        order.discountAmount || 0,
        order.deliveryFee || 0,
        order.totalAmount,
        order.paymentMethod,
        order.paymentStatus,
        order.status,
        order.promotionCode || null,
        order.groupSessionId || null,
        order.baristaNotes || "",
        order.trackingToken,
        order.createdAt || new Date().toISOString(),
        order.updatedAt || new Date().toISOString()
      );

      if (order.items && order.items.length > 0) {
        const insertItem = db.prepare(`
          INSERT INTO order_items
          (id, order_id, product_id, product_name, variant_name, quantity, unit_price, total_price, recipient_label, item_notes, selected_options_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of order.items) {
          insertItem.run(
            item.id,
            order.id,
            item.productId,
            item.productName,
            item.variantName,
            item.quantity,
            item.unitPrice,
            item.totalPrice,
            item.recipientLabel || "",
            item.itemNotes || "",
            JSON.stringify(item.options || [])
          );
        }
      }

      // Tăng lượt dùng voucher nếu đơn có áp dụng giảm giá thực tế
      if (order.promotionCode && (order.discountAmount || 0) > 0) {
        db.prepare(
          "UPDATE promotions SET used_count = COALESCE(used_count, 0) + 1 WHERE UPPER(code) = UPPER(?)"
        ).run(order.promotionCode);
      }

      // Đánh dấu phòng gom đơn đã đặt thành công
      if (order.groupSessionId) {
        db.prepare(
          "UPDATE group_sessions SET status = 'ORDERED' WHERE id = ? OR UPPER(session_code) = UPPER(?)"
        ).run(order.groupSessionId, order.groupSessionId);
      }
    });

    runSave();
    syncMirrorFile();
    return true;
  } catch (error) {
    console.error("Lỗi lưu đơn hàng vào SQLite:", error);
    return false;
  }
}

export function updateOrderStatusInSqlite(
  orderId: string,
  status: string,
  options?:
    | string
    | {
        baristaNotes?: string;
        paymentStatus?: string;
        shipperName?: string;
        shipperPhone?: string;
        estimatedDeliveryTime?: string;
        trackingNotes?: string;
        deliveryNotes?: string;
        deliveryFee?: number;
      }
): boolean {
  try {
    const db = getSqliteDb();
    ensureOrdersColumns(db);

    if (typeof options === "string") {
      db.prepare(`
        UPDATE orders 
        SET status = ?, barista_notes = ?, updated_at = datetime('now', 'localtime') 
        WHERE id = ? OR LOWER(order_code) = LOWER(?)
      `).run(status, options, orderId, orderId);
    } else if (options && typeof options === "object") {
      const updates: string[] = ["status = ?"];
      const params: any[] = [status];

      if (options.baristaNotes !== undefined) {
        updates.push("barista_notes = ?");
        params.push(options.baristaNotes);
      }
      if (options.paymentStatus !== undefined) {
        updates.push("payment_status = ?");
        params.push(options.paymentStatus);
      }
      if (options.shipperName !== undefined) {
        updates.push("shipper_name = ?");
        params.push(options.shipperName);
      }
      if (options.shipperPhone !== undefined) {
        updates.push("shipper_phone = ?");
        params.push(options.shipperPhone);
      }
      if (options.estimatedDeliveryTime !== undefined) {
        updates.push("estimated_delivery_time = ?");
        params.push(options.estimatedDeliveryTime);
      }
      if (options.trackingNotes !== undefined) {
        updates.push("tracking_notes = ?");
        params.push(options.trackingNotes);
      }
      if (options.deliveryNotes !== undefined) {
        updates.push("delivery_notes = ?");
        params.push(options.deliveryNotes);
      }
      if (options.deliveryFee !== undefined) {
        const fee = Math.max(0, Number(options.deliveryFee) || 0);
        updates.push("delivery_fee = ?");
        params.push(fee);
        updates.push("total_amount = MAX(0, subtotal_amount + ? - discount_amount)");
        params.push(fee);
      }

      updates.push("updated_at = datetime('now', 'localtime')");
      params.push(orderId, orderId);

      db.prepare(`
        UPDATE orders 
        SET ${updates.join(", ")}
        WHERE id = ? OR LOWER(order_code) = LOWER(?)
      `).run(...params);
    } else {
      db.prepare(`
        UPDATE orders 
        SET status = ?, updated_at = datetime('now', 'localtime') 
        WHERE id = ? OR LOWER(order_code) = LOWER(?)
      `).run(status, orderId, orderId);
    }

    syncMirrorFile();
    return true;
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái đơn hàng SQLite:", error);
    return false;
  }
}

export function cancelOrderInSqlite(orderId: string, reason?: string): boolean {
  try {
    const db = getSqliteDb();
    ensureOrdersColumns(db);
    db.prepare(`
      UPDATE orders 
      SET status = 'CANCELLED',
          tracking_notes = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE tracking_notes END,
          updated_at = datetime('now', 'localtime')
      WHERE id = ? OR LOWER(order_code) = LOWER(?)
    `).run(reason || null, reason || null, reason || null, orderId, orderId);
    syncMirrorFile();
    return true;
  } catch (error) {
    console.error("Lỗi hủy đơn hàng trong SQLite:", error);
    return false;
  }
}

export function updatePaymentStatusInSqlite(orderCodeOrId: string, paymentStatus: string, status?: string): boolean {
  try {
    const db = getSqliteDb();
    if (status) {
      db.prepare(`
        UPDATE orders 
        SET payment_status = ?, status = ?, updated_at = datetime('now', 'localtime') 
        WHERE id = ? OR LOWER(order_code) = LOWER(?)
      `).run(paymentStatus, status, orderCodeOrId, orderCodeOrId);
    } else {
      db.prepare(`
        UPDATE orders 
        SET payment_status = ?, updated_at = datetime('now', 'localtime') 
        WHERE id = ? OR LOWER(order_code) = LOWER(?)
      `).run(paymentStatus, orderCodeOrId, orderCodeOrId);
    }
    syncMirrorFile();
    return true;
  } catch (error) {
    return false;
  }
}

export function getNextOrderSequence(): number {
  try {
    const db = getSqliteDb();
    const code = allocateNextOrderCodeTx(db);
    const match = code.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 1;
  } catch {
    return 1;
  }
}

// ============================================================================
// 6. THỐNG KÊ DOANH THU & GIỜ CAO ĐIỂM (100% REAL SQL AGGREGATION)
// ============================================================================
export function getStatsFromSqlite(timeRange: string = "TODAY") {
  try {
    const db = getSqliteDb();

    // Xác định điều kiện lọc thời gian theo múi giờ địa phương (localtime)
    let orderDateClause = "";
    let cupsDateClause = "";
    if (timeRange === "TODAY") {
      orderDateClause = "AND DATE(created_at, 'localtime') = DATE('now', 'localtime')";
      cupsDateClause = "AND DATE(o.created_at, 'localtime') = DATE('now', 'localtime')";
    } else if (timeRange === "YESTERDAY") {
      orderDateClause = "AND DATE(created_at, 'localtime') = DATE('now', '-1 day', 'localtime')";
      cupsDateClause = "AND DATE(o.created_at, 'localtime') = DATE('now', '-1 day', 'localtime')";
    } else if (timeRange === "LAST_7_DAYS") {
      orderDateClause = "AND DATE(created_at, 'localtime') >= DATE('now', '-7 days', 'localtime')";
      cupsDateClause = "AND DATE(o.created_at, 'localtime') >= DATE('now', '-7 days', 'localtime')";
    } else if (timeRange === "THIS_MONTH") {
      orderDateClause = "AND strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')";
      cupsDateClause = "AND strftime('%Y-%m', o.created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')";
    }
    // Nếu timeRange === "ALL" thì không áp dụng điều kiện ngày

    // 1. Tổng doanh thu & tổng đơn hợp lệ
    const revRow: any = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as totalRevenue,
        COUNT(*) as totalOrders
      FROM orders
      WHERE status != 'CANCELLED' ${orderDateClause}
    `).get();

    // 2. Tổng số ly/chai đã bán
    const cupsRow: any = db.prepare(`
      SELECT COALESCE(SUM(oi.quantity), 0) as totalCupsSold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'CANCELLED' ${cupsDateClause}
    `).get();

    // 3. Đếm đơn theo từng trạng thái
    const statusRows = db.prepare(`
      SELECT status, COUNT(*) as cnt
      FROM orders
      WHERE 1=1 ${orderDateClause}
      GROUP BY status
    `).all() as any[];

    let newOrdersCount = 0;
    let brewingCount = 0;
    let readyCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    for (const s of statusRows) {
      if (s.status === "PENDING_PAYMENT" || s.status === "CONFIRMED") {
        newOrdersCount += s.cnt;
      } else if (s.status === "BREWING") {
        brewingCount += s.cnt;
      } else if (s.status === "READY" || s.status === "DELIVERING") {
        readyCount += s.cnt;
      } else if (s.status === "COMPLETED") {
        completedCount += s.cnt;
      } else if (s.status === "CANCELLED") {
        cancelledCount += s.cnt;
      }
    }

    // 4. Phân tích phương thức thanh toán
    const paymentRows = db.prepare(`
      SELECT 
        COALESCE(payment_method, 'COD') as method,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE status != 'CANCELLED' ${orderDateClause}
      GROUP BY method
    `).all() as any[];

    let vietqrRevenue = 0;
    let vietqrOrdersCount = 0;
    let codRevenue = 0;
    let codOrdersCount = 0;

    for (const p of paymentRows) {
      const m = String(p.method || "").toUpperCase();
      if (m.includes("VIETQR") || m.includes("BANKING")) {
        vietqrRevenue += Number(p.revenue || 0);
        vietqrOrdersCount += Number(p.count || 0);
      } else {
        codRevenue += Number(p.revenue || 0);
        codOrdersCount += Number(p.count || 0);
      }
    }

    const totalRevenue = Number(revRow?.totalRevenue || 0);
    const totalOrders = Number(revRow?.totalOrders || 0);
    const totalCupsSold = Number(cupsRow?.totalCupsSold || 0);
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const completionRate = (totalOrders + cancelledCount) > 0 ? Math.round((completedCount / (totalOrders + cancelledCount)) * 100) : 100;

    // 5. Top 5 sản phẩm bán chạy kèm ảnh thật từ products
    const topProductsRows = db.prepare(`
      SELECT 
        oi.product_id as productId,
        COALESCE(p.name, oi.product_name) as name,
        COALESCE(p.image_url, '') as imageUrl,
        COALESCE(p.base_price, oi.unit_price) as basePrice,
        SUM(oi.quantity) as count,
        SUM(oi.total_price) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.status != 'CANCELLED' ${cupsDateClause}
      GROUP BY oi.product_id, name, imageUrl
      ORDER BY count DESC, revenue DESC
      LIMIT 5
    `).all() as any[];

    const topProducts = topProductsRows.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      percentage: totalRevenue > 0 ? Math.round((Number(item.revenue || 0) / totalRevenue) * 100) : 0,
    }));

    // 6. Phân bổ đơn hàng theo khung giờ thực tế giờ Việt Nam (07:00 - 22:00)
    const hoursList = [
      "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
      "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
      "19:00", "20:00", "21:00", "22:00"
    ];

    const hourlyMap: Record<string, { count: number; revenue: number }> = {};
    for (const h of hoursList) {
      hourlyMap[h] = { count: 0, revenue: 0 };
    }

    const hourlyRows = db.prepare(`
      SELECT 
        strftime('%H:00', created_at, 'localtime') as hour,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE created_at IS NOT NULL AND status != 'CANCELLED' ${orderDateClause}
      GROUP BY hour
      ORDER BY hour ASC
    `).all() as any[];

    let maxHourlyCount = 0;
    let peakHour = "";

    for (const h of hourlyRows) {
      if (h.hour && hourlyMap[h.hour]) {
        hourlyMap[h.hour].count = h.count;
        hourlyMap[h.hour].revenue = Number(h.revenue || 0);
        if (h.count > maxHourlyCount) {
          maxHourlyCount = h.count;
          peakHour = h.hour;
        }
      }
    }

    const hourlyDistribution = hoursList.map((h) => ({
      hour: h,
      count: hourlyMap[h].count,
      revenue: hourlyMap[h].revenue,
      isPeak: maxHourlyCount > 0 && hourlyMap[h].count === maxHourlyCount,
    }));

    const hourlyOrders: Record<string, number> = {};
    for (const h of hoursList) {
      hourlyOrders[h] = hourlyMap[h].count;
    }

    const peakHourLabel = peakHour
      ? `Khung giờ cao điểm: ${peakHour} (${maxHourlyCount} đơn • ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(hourlyMap[peakHour]?.revenue || 0)})`
      : "Chưa có khung giờ cao điểm";

    const storeSettings = getBusinessSettingsFromSqlite();

    return {
      timeRange,
      totalRevenue,
      totalOrders,
      totalCupsSold,
      averageOrderValue,
      completionRate,
      newOrdersCount,
      brewingCount,
      readyCount,
      completedCount,
      cancelledCount,
      vietqrRevenue,
      vietqrOrdersCount,
      codRevenue,
      codOrdersCount,
      topProducts,
      hourlyDistribution,
      hourlyOrders,
      peakHourLabel,
      maxHourlyCount,
      storeSettings,
    };
  } catch (error) {
    return {
      timeRange,
      totalRevenue: 0,
      totalOrders: 0,
      totalCupsSold: 0,
      averageOrderValue: 0,
      completionRate: 100,
      newOrdersCount: 0,
      brewingCount: 0,
      readyCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      vietqrRevenue: 0,
      vietqrOrdersCount: 0,
      codRevenue: 0,
      codOrdersCount: 0,
      topProducts: [],
      hourlyDistribution: [],
      hourlyOrders: {},
      peakHourLabel: "Chưa có khung giờ cao điểm",
      maxHourlyCount: 0,
      storeSettings: getBusinessSettingsFromSqlite(),
    };
  }
}

// ============================================================================
// 7. PHÒNG ĐẶT NHÓM CÔNG SỞ (GROUP SESSIONS)
// ============================================================================
function ensureGroupSessionsColumns(db: Database.Database) {
  try {
    const columns = (db.pragma("table_info(group_sessions)") || []) as any[];
    if (!Array.isArray(columns) || columns.length === 0) return;
    const colNames = columns.map((c) => c.name);
    if (!colNames.includes("host_token")) {
      db.exec("ALTER TABLE group_sessions ADD COLUMN host_token TEXT DEFAULT NULL");
    }
  } catch (e) {
    console.error("Lỗi kiểm tra cấu trúc bảng group_sessions:", e);
  }
}

export function getGroupSessionFromSqlite(code: string): GroupSession | null {
  try {
    const db = getSqliteDb();
    ensureGroupSessionsColumns(db);
    const row: any = db
      .prepare("SELECT * FROM group_sessions WHERE UPPER(session_code) = UPPER(?) LIMIT 1")
      .get(code);

    if (!row) return null;

    // Tự động chuyển sang EXPIRED nếu đã quá thời gian sống
    let currentStatus = row.status;
    if (
      currentStatus === "OPEN" &&
      row.expires_at &&
      !Number.isNaN(new Date(row.expires_at).getTime()) &&
      new Date(row.expires_at).getTime() <= Date.now()
    ) {
      currentStatus = "EXPIRED";
      try {
        db.prepare("UPDATE group_sessions SET status = 'EXPIRED' WHERE id = ?").run(row.id);
        syncMirrorFile();
      } catch {}
    }

    const itemRows = db
      .prepare("SELECT * FROM group_session_items WHERE UPPER(session_code) = UPPER(?) ORDER BY created_at ASC")
      .all(code) as any[];

    const items: CartItem[] = itemRows.map((i: any) => {
      if (i.item_payload_json) {
        try {
          return JSON.parse(i.item_payload_json);
        } catch {}
      }
      return {
        cartItemId: i.cart_item_id || i.id,
        product: {
          id: i.product_id,
          name: i.product_name,
          basePrice: i.unit_price,
        } as any,
        variant: {
          sizeName: i.variant_name,
        } as any,
        selectedOptions: [],
        quantity: i.quantity,
        recipientLabel: i.recipient_label,
        notes: i.notes,
        unitPrice: i.unit_price,
        totalPrice: i.total_price,
      };
    });

    return {
      id: row.id,
      sessionCode: row.session_code,
      hostName: row.host_name,
      hostPhone: row.host_phone,
      hostToken: row.host_token || undefined,
      buildingName: row.building_name || undefined,
      status: currentStatus as any,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      items,
    };
  } catch (error) {
    return null;
  }
}

export function createGroupSessionInSqlite(session: GroupSession): boolean {
  try {
    const db = getSqliteDb();
    ensureGroupSessionsColumns(db);
    db.prepare(`
      INSERT INTO group_sessions (id, session_code, host_name, host_phone, host_token, building_name, status, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.sessionCode.toUpperCase(),
      session.hostName,
      session.hostPhone,
      session.hostToken || crypto.randomBytes(16).toString("hex"),
      session.buildingName || "",
      session.status || "OPEN",
      session.expiresAt,
      session.createdAt || new Date().toISOString()
    );
    syncMirrorFile();
    return true;
  } catch (error) {
    return false;
  }
}

export function addGroupItemToSqlite(sessionCode: string, item: CartItem): boolean {
  try {
    const db = getSqliteDb();
    const itemId = `item-g-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const fullPayloadJson = JSON.stringify({
      ...item,
      cartItemId: itemId,
    });

    db.prepare(`
      INSERT INTO group_session_items 
      (id, session_code, cart_item_id, product_id, product_name, variant_name, quantity, unit_price, total_price, recipient_label, notes, item_payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      itemId,
      sessionCode.toUpperCase(),
      itemId,
      item.product.id,
      item.product.name,
      item.variant.sizeName,
      item.quantity || 1,
      item.unitPrice,
      item.totalPrice,
      item.recipientLabel || "",
      item.notes || "",
      fullPayloadJson
    );

    syncMirrorFile();
    return true;
  } catch (error) {
    return false;
  }
}

export function lockGroupSessionInSqlite(sessionCode: string): boolean {
  try {
    const db = getSqliteDb();
    db.prepare("UPDATE group_sessions SET status = 'LOCKED' WHERE UPPER(session_code) = UPPER(?) AND status = 'OPEN'").run(sessionCode);
    syncMirrorFile();
    return true;
  } catch (error) {
    return false;
  }
}

export function removeGroupItemFromSqlite(sessionCode: string, cartItemId: string): boolean {
  try {
    const db = getSqliteDb();
    const session: any = db
      .prepare("SELECT status FROM group_sessions WHERE UPPER(session_code) = UPPER(?) LIMIT 1")
      .get(sessionCode);
    if (!session || session.status !== "OPEN") {
      return false;
    }
    db.prepare("DELETE FROM group_session_items WHERE UPPER(session_code) = UPPER(?) AND (cart_item_id = ? OR id = ?)").run(
      sessionCode,
      cartItemId,
      cartItemId
    );
    syncMirrorFile();
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// 8. PHÂN QUYỀN & NHÂN VIÊN (RBAC: ROLES, PERMISSIONS & USERS)
// ============================================================================

export function ensureUsersSecurityColumns(db: Database.Database) {
  try {
    const userTableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (!userTableCheck) return;

    const userCols = (db.pragma("table_info(users)") || []) as any[];
    const colNames = userCols.map((c) => c.name);
    if (!colNames.includes("email")) {
      db.exec("ALTER TABLE users ADD COLUMN email TEXT;");
    }
    if (!colNames.includes("token_version")) {
      db.exec("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1;");
    }

    // Tự động chuyển đổi mật khẩu plaintext hiện có sang băm scrypt an toàn và xóa plain_password
    const rows = db.prepare(`
      SELECT u.id, u.password_hash, u.plain_password, u.pin, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
    `).all() as any[];

    const updatePwdStmt = db.prepare("UPDATE users SET password_hash = ?, plain_password = NULL WHERE id = ?");
    const clearAdminPinStmt = db.prepare("UPDATE users SET pin = NULL WHERE id = ?");

    let changed = false;
    for (const u of rows) {
      if (u.plain_password && String(u.plain_password).trim()) {
        if (!isScryptHash(u.password_hash)) {
          updatePwdStmt.run(hashPassword(String(u.plain_password).trim()), u.id);
          changed = true;
        } else {
          db.prepare("UPDATE users SET plain_password = NULL WHERE id = ?").run(u.id);
          changed = true;
        }
      }
      // Không cho phép SUPER_ADMIN / STORE_MANAGER đăng nhập bằng PIN 4 số
      if ((u.role_name === "SUPER_ADMIN" || u.role_name === "STORE_MANAGER") && u.pin) {
        clearAdminPinStmt.run(u.id);
        changed = true;
      }
    }

    if (changed) {
      syncMirrorFile();
    }
  } catch (err: any) {
    console.error("[SQLite Migration] Lỗi nâng cấp bảo mật bảng users:", err.message);
  }
}

export function getAuthUserByIdFromSqlite(userId: string): {
  id: string;
  username: string;
  fullName: string;
  role: "SUPER_ADMIN" | "STORE_MANAGER" | "BARISTA" | "CASHIER";
  isActive: boolean;
  tokenVersion: number;
  permissions: string[];
} | null {
  try {
    const db = getSqliteDb();
    const row: any = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.is_active, u.token_version, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
      LIMIT 1
    `).get(userId);

    if (!row) return null;

    const permRows = db
      .prepare("SELECT permission_code FROM role_permissions WHERE role_name = ?")
      .all(row.role_name) as Array<{ permission_code: string }>;

    return {
      id: row.id,
      username: row.username,
      fullName: row.full_name,
      role: row.role_name,
      isActive: Boolean(row.is_active),
      tokenVersion: Number(row.token_version || 1),
      permissions: permRows.map((p) => p.permission_code),
    };
  } catch {
    return null;
  }
}

export function incrementUserTokenVersionInSqlite(userId: string): boolean {
  try {
    const db = getSqliteDb();
    db.prepare("UPDATE users SET token_version = COALESCE(token_version, 1) + 1 WHERE id = ?").run(userId);
    syncMirrorFile();
    return true;
  } catch {
    return false;
  }
}

export function getRolesAndPermissionsFromSqlite(): {
  definitions: PermissionDefinition[];
  roles: RolePermissionConfig[];
  staff: StaffAccount[];
} {
  try {
    const db = getSqliteDb();

    // 1. Danh sách quyền hạn
    const permRows = db.prepare("SELECT * FROM permissions ORDER BY id ASC").all() as any[];
    const definitions: PermissionDefinition[] = permRows.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      description: p.description,
    }));

    // 2. Quyền gán cho từng vai trò
    const roleRows = db.prepare("SELECT * FROM roles ORDER BY id ASC").all() as any[];
    const rolePermRows = db.prepare("SELECT * FROM role_permissions").all() as any[];

    const roles: RolePermissionConfig[] = roleRows.map((r) => {
      const assignedPerms = rolePermRows
        .filter((rp) => rp.role_name === r.name)
        .map((rp) => rp.permission_code);

      let displayName = r.name;
      if (r.name === "SUPER_ADMIN") displayName = "Chủ Quán (Super Admin)";
      else if (r.name === "STORE_MANAGER") displayName = "Cửa Hàng Trưởng (Store Manager)";
      else if (r.name === "BARISTA") displayName = "Pha Chế (Barista - KDS)";
      else if (r.name === "CASHIER") displayName = "Thu Ngân (Cashier)";

      return {
        roleId: r.name,
        roleName: r.name as any,
        displayName,
        description: r.description || "",
        permissions: assignedPerms,
      };
    });

    // 3. Danh sách tài khoản nhân viên (TUYỆT ĐỐI không trả raw pin hay password_hash)
    const userRows = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.phone, u.email, u.pin, u.is_active, u.created_at, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at ASC
    `).all() as any[];

    const staff: StaffAccount[] = userRows.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      role: u.role_name as any,
      phone: u.phone || undefined,
      email: u.email || undefined,
      hasPin: Boolean(u.pin && String(u.pin).trim()),
      isActive: Boolean(u.is_active),
      createdAt: u.created_at,
    }));

    return { definitions, roles, staff };
  } catch (error) {
    return { definitions: [], roles: [], staff: [] };
  }
}

export function toggleRolePermissionInSqlite(roleName: string, permissionCode: string): {
  success: boolean;
  message: string;
  hasPerm?: boolean;
} {
  try {
    const db = getSqliteDb();
    if (roleName === "SUPER_ADMIN") {
      return { success: false, message: "Không thể thu hồi quyền của Chủ Quán (Super Admin)." };
    }

    const exists = db
      .prepare("SELECT id FROM role_permissions WHERE role_name = ? AND permission_code = ?")
      .get(roleName, permissionCode);

    if (exists) {
      db.prepare("DELETE FROM role_permissions WHERE role_name = ? AND permission_code = ?").run(
        roleName,
        permissionCode
      );
      syncMirrorFile();
      return { success: true, message: `Đã thu hồi quyền [${permissionCode}] từ vai trò ${roleName}`, hasPerm: false };
    } else {
      db.prepare("INSERT INTO role_permissions (role_name, permission_code) VALUES (?, ?)").run(
        roleName,
        permissionCode
      );
      syncMirrorFile();
      return { success: true, message: `Đã cấp quyền [${permissionCode}] cho vai trò ${roleName}`, hasPerm: true };
    }
  } catch (error: any) {
    return { success: false, message: "Lỗi phân quyền: " + error.message };
  }
}

export function updateStaffInSqlite(
  staffId: string,
  updates: {
    fullName?: string;
    role?: string;
    pin?: string;
    isActive?: boolean;
    phone?: string;
    email?: string;
    password?: string;
  },
  actorUserId?: string
): { success: boolean; message?: string } {
  try {
    const db = getSqliteDb();
    const target: any = db.prepare(`
      SELECT u.id, u.is_active, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
      LIMIT 1
    `).get(staffId);

    if (!target) {
      return { success: false, message: "Không tìm thấy tài khoản nhân viên." };
    }

    if (actorUserId && staffId === actorUserId && updates.isActive === false) {
      return { success: false, message: "Không thể tự khóa tài khoản đang đăng nhập." };
    }

    const effectiveRole = updates.role || target.role_name;

    // Bảo vệ tài khoản SUPER_ADMIN đang hoạt động cuối cùng
    if (
      target.role_name === "SUPER_ADMIN" &&
      (updates.isActive === false || (updates.role && updates.role !== "SUPER_ADMIN"))
    ) {
      const activeSuperAdmins: any = db.prepare(`
        SELECT COUNT(*) as count
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.name = 'SUPER_ADMIN' AND u.is_active = 1
      `).get();
      if (activeSuperAdmins && activeSuperAdmins.count <= 1) {
        return { success: false, message: "Không thể khóa hoặc hạ quyền Chủ Quán (SUPER_ADMIN) duy nhất đang hoạt động." };
      }
    }

    let roleId: number | null = null;
    if (updates.role) {
      const r: any = db.prepare("SELECT id FROM roles WHERE name = ?").get(updates.role);
      if (!r) return { success: false, message: "Vai trò không hợp lệ." };
      roleId = r.id;
    }

    const fields: string[] = [];
    const values: any[] = [];
    let shouldBumpTokenVersion = false;

    if (updates.fullName !== undefined) {
      fields.push("full_name = ?");
      values.push(updates.fullName.trim());
    }
    if (roleId !== null) {
      fields.push("role_id = ?");
      values.push(roleId);
      shouldBumpTokenVersion = true;
    }
    if (effectiveRole === "SUPER_ADMIN" || effectiveRole === "STORE_MANAGER") {
      // Cấm dùng PIN 4 số cho tài khoản quản trị
      fields.push("pin = NULL");
    } else if (updates.pin !== undefined) {
      const cleanPin = updates.pin.trim();
      if (cleanPin && !/^\d{4,6}$/.test(cleanPin)) {
        return { success: false, message: "Mã PIN KDS phải gồm 4 đến 6 chữ số." };
      }
      fields.push("pin = ?");
      values.push(cleanPin || null);
    }
    if (updates.isActive !== undefined) {
      fields.push("is_active = ?");
      values.push(updates.isActive ? 1 : 0);
      shouldBumpTokenVersion = true;
    }
    if (updates.phone !== undefined) {
      fields.push("phone = ?");
      values.push(updates.phone.trim() || null);
    }
    if (updates.email !== undefined) {
      fields.push("email = ?");
      values.push(updates.email.trim() || null);
    }
    if (updates.password !== undefined && updates.password.trim()) {
      if (updates.password.trim().length < 6) {
        return { success: false, message: "Mật khẩu mới phải có ít nhất 6 ký tự." };
      }
      fields.push("password_hash = ?");
      values.push(hashPassword(updates.password.trim()));
      fields.push("plain_password = NULL");
      shouldBumpTokenVersion = true;
    }
    if (shouldBumpTokenVersion) {
      fields.push("token_version = COALESCE(token_version, 1) + 1");
    }

    if (fields.length === 0) return { success: true };

    values.push(staffId);
    db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    syncMirrorFile();
    return { success: true };
  } catch (error) {
    console.error("Lỗi cập nhật nhân viên trong SQLite:", error);
    return { success: false, message: "Lỗi cập nhật nhân viên trong SQLite." };
  }
}

export function deleteStaffInSqlite(
  staffId: string,
  actorUserId?: string
): { success: boolean; message: string } {
  try {
    const db = getSqliteDb();
    if (actorUserId && staffId === actorUserId) {
      return { success: false, message: "Không thể tự xóa tài khoản đang đăng nhập." };
    }

    const targetUser: any = db.prepare(`
      SELECT u.*, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.id = ?
    `).get(staffId);

    if (!targetUser) {
      return { success: false, message: "Không tìm thấy tài khoản nhân viên." };
    }

    if (targetUser.role_name === "SUPER_ADMIN") {
      const superAdminCount: any = db.prepare(`
        SELECT COUNT(*) as count 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE r.name = 'SUPER_ADMIN'
      `).get();

      if (superAdminCount && superAdminCount.count <= 1) {
        return { success: false, message: "Không thể xóa tài khoản Chủ Quán duy nhất trong hệ thống!" };
      }
    }

    db.prepare("DELETE FROM users WHERE id = ?").run(staffId);
    syncMirrorFile();
    return { success: true, message: `Đã xóa tài khoản "${targetUser.full_name}" thành công!` };
  } catch (error: any) {
    console.error("Lỗi xóa nhân viên trong SQLite:", error);
    return { success: false, message: "Lỗi xóa tài khoản nhân viên." };
  }
}

export function createStaffInSqlite(staff: {
  username: string;
  fullName: string;
  role: string;
  phone?: string;
  email?: string;
  pin?: string;
  password?: string;
}): { success: boolean; message?: string } {
  try {
    const db = getSqliteDb();
    const r: any = db.prepare("SELECT id FROM roles WHERE name = ?").get(staff.role);
    if (!r) {
      return { success: false, message: "Vai trò không hợp lệ." };
    }

    const rawPwd = staff.password?.trim() || "";
    if (rawPwd.length < 6) {
      return { success: false, message: "Vui lòng nhập mật khẩu tối thiểu 6 ký tự cho nhân viên mới." };
    }

    const allowPin = staff.role === "BARISTA" || staff.role === "CASHIER";
    const cleanPin = allowPin && staff.pin?.trim() ? staff.pin.trim() : null;
    if (cleanPin && !/^\d{4,6}$/.test(cleanPin)) {
      return { success: false, message: "Mã PIN KDS phải gồm 4 đến 6 chữ số." };
    }

    const id = `staff-${crypto.randomUUID()}`;
    const pwdHash = hashPassword(rawPwd);

    db.prepare(`
      INSERT INTO users (id, username, password_hash, plain_password, pin, full_name, phone, email, role_id, is_active, token_version, created_at)
      VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, 1, 1, datetime('now', 'localtime'))
    `).run(
      id,
      staff.username.trim().toLowerCase(),
      pwdHash,
      cleanPin,
      staff.fullName.trim(),
      staff.phone?.trim() || null,
      staff.email?.trim() || null,
      r.id
    );

    syncMirrorFile();
    return { success: true };
  } catch (error) {
    console.error("Lỗi tạo nhân viên trong SQLite:", error);
    return { success: false, message: "Lỗi tạo tài khoản nhân viên trong SQLite." };
  }
}

/**
 * Lấy danh sách email của các nhân viên và quản trị viên đang hoạt động
 * để gửi thông báo đơn hàng mới (Chủ quán SUPER_ADMIN, Quản lý STORE_MANAGER, Pha chế BARISTA)
 */
export function getNotificationStaffEmails(): { email: string; fullName: string; role: string }[] {
  try {
    const db = getSqliteDb();
    const rows = db.prepare(`
      SELECT u.email, u.full_name, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.is_active = 1 
        AND u.email IS NOT NULL 
        AND TRIM(u.email) != ''
        AND r.name IN ('SUPER_ADMIN', 'BARISTA', 'STORE_MANAGER')
    `).all() as any[];

    return rows.map((r) => ({
      email: r.email.trim(),
      fullName: r.full_name,
      role: r.role_name,
    }));
  } catch (error) {
    console.error("Lỗi lấy email nhận thông báo:", error);
    return [];
  }
}

// ============================================================================
// 9. XÁC THỰC ĐĂNG NHẬP NHÂN VIÊN
// ============================================================================
export function findUserInSqlite(usernameOrPin: string, isPin = false): {
  id: string;
  username: string;
  fullName: string;
  role: "SUPER_ADMIN" | "STORE_MANAGER" | "BARISTA" | "CASHIER";
  passwordHash: string;
  tokenVersion: number;
} | null {
  try {
    const db = getSqliteDb();

    if (isPin) {
      // CHỈ cho phép BARISTA và CASHIER đăng nhập bằng PIN trên màn hình KDS
      const rows = db.prepare(`
        SELECT u.id, u.username, u.full_name, u.password_hash, u.pin, u.token_version, r.name as role_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.is_active = 1
          AND u.pin IS NOT NULL
          AND TRIM(u.pin) != ''
          AND r.name IN ('BARISTA', 'CASHIER')
      `).all() as any[];

      const inputPin = usernameOrPin.trim();
      const matched = rows.find((row) => safeEqualStrings(String(row.pin).trim(), inputPin));
      if (!matched) return null;

      return {
        id: matched.id,
        username: matched.username,
        fullName: matched.full_name,
        role: matched.role_name,
        passwordHash: matched.password_hash,
        tokenVersion: Number(matched.token_version || 1),
      };
    }

    const row: any = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.password_hash, u.token_version, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE LOWER(u.username) = LOWER(?) AND u.is_active = 1
      LIMIT 1
    `).get(usernameOrPin.trim());

    if (row) {
      return {
        id: row.id,
        username: row.username,
        fullName: row.full_name,
        role: row.role_name,
        passwordHash: row.password_hash,
        tokenVersion: Number(row.token_version || 1),
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// 10. QUẢN LÝ MÃ GIẢM GIÁ & VOUCHER (PROMOTIONS)
// ============================================================================

function ensurePromotionsColumns(db: Database.Database) {
  try {
    const columns = (db.pragma("table_info(promotions)") || []) as any[];
    if (!Array.isArray(columns) || columns.length === 0) return;
    const colNames = columns.map((c) => c.name);
    if (!colNames.includes("max_discount_amount")) {
      db.exec("ALTER TABLE promotions ADD COLUMN max_discount_amount REAL DEFAULT NULL");
    }
    if (!colNames.includes("usage_limit")) {
      db.exec("ALTER TABLE promotions ADD COLUMN usage_limit INTEGER DEFAULT NULL");
    }
    if (!colNames.includes("used_count")) {
      db.exec("ALTER TABLE promotions ADD COLUMN used_count INTEGER NOT NULL DEFAULT 0");
    }
    if (!colNames.includes("start_time")) {
      db.exec("ALTER TABLE promotions ADD COLUMN start_time TEXT DEFAULT NULL");
    }
    if (!colNames.includes("end_time")) {
      db.exec("ALTER TABLE promotions ADD COLUMN end_time TEXT DEFAULT NULL");
    }
  } catch (e) {
    // Schema will handle if table does not exist
  }
}

function mapPromotionRow(r: any): Promotion {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    discountType: (r.discount_type || "PERCENTAGE") as DiscountType,
    discountValue: Number(r.discount_value),
    minOrderAmount: Number(r.min_order_amount || 0),
    isActive: Boolean(r.is_active),
    maxDiscountAmount: r.max_discount_amount != null ? Number(r.max_discount_amount) : null,
    usageLimit: r.usage_limit != null ? Number(r.usage_limit) : null,
    usedCount: Number(r.used_count || 0),
    startTime: r.start_time || null,
    endTime: r.end_time || null,
  };
}

/**
 * Lấy danh sách toàn bộ mã khuyến mãi từ SQLite
 */
export function getPromotionsFromSqlite(): Promotion[] {
  try {
    const db = getSqliteDb();
    ensurePromotionsColumns(db);
    const rows = db.prepare("SELECT * FROM promotions ORDER BY id ASC").all() as any[];
    return rows.map(mapPromotionRow);
  } catch (error: any) {
    console.error("Lỗi lấy danh sách khuyến mãi trong SQLite:", error);
    return [];
  }
}

/**
 * Tìm mã khuyến mãi theo mã code (không phân biệt chữ hoa thường)
 */
export function getPromotionByCodeFromSqlite(code: string): Promotion | null {
  try {
    const db = getSqliteDb();
    ensurePromotionsColumns(db);
    const cleanCode = (code || "").trim().toUpperCase();
    if (!cleanCode) return null;
    const row = db.prepare("SELECT * FROM promotions WHERE UPPER(code) = ? LIMIT 1").get(cleanCode) as any;
    if (!row) return null;
    return mapPromotionRow(row);
  } catch (error: any) {
    console.error("Lỗi tìm kiếm khuyến mãi theo mã trong SQLite:", error);
    return null;
  }
}

/**
 * Tạo mới mã khuyến mãi
 */
export function createPromotionInSqlite(data: {
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  isActive?: boolean;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  startTime?: string | null;
  endTime?: string | null;
}): { success: boolean; promotion?: Promotion; message?: string } {
  try {
    const db = getSqliteDb();
    ensurePromotionsColumns(db);

    const cleanCode = (data.code || "").trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: "Mã khuyến mãi không được để trống" };
    }
    if (!data.name || !data.name.trim()) {
      return { success: false, message: "Tên chương trình không được để trống" };
    }
    if (!Number.isFinite(data.discountValue) || data.discountValue <= 0) {
      return { success: false, message: "Giá trị giảm giá phải lớn hơn 0" };
    }
    if (data.discountType === "PERCENTAGE" && data.discountValue > 100) {
      return { success: false, message: "Phần trăm giảm giá không được vượt quá 100%" };
    }
    if (data.minOrderAmount < 0) {
      return { success: false, message: "Giá trị đơn tối thiểu không được âm" };
    }

    const existing = db.prepare("SELECT id FROM promotions WHERE UPPER(code) = ?").get(cleanCode);
    if (existing) {
      return { success: false, message: `Mã khuyến mãi "${cleanCode}" đã tồn tại trên hệ thống` };
    }

    const isActiveVal = data.isActive !== false ? 1 : 0;
    const maxDiscount = data.maxDiscountAmount != null && data.maxDiscountAmount > 0 ? Number(data.maxDiscountAmount) : null;
    const usageLimit = data.usageLimit != null && data.usageLimit > 0 ? Math.floor(Number(data.usageLimit)) : null;

    const result = db.prepare(`
      INSERT INTO promotions (code, name, discount_type, discount_value, min_order_amount, is_active, max_discount_amount, usage_limit, used_count, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      cleanCode,
      data.name.trim(),
      data.discountType,
      data.discountValue,
      data.minOrderAmount || 0,
      isActiveVal,
      maxDiscount,
      usageLimit,
      data.startTime || null,
      data.endTime || null
    );

    syncMirrorFile();

    const newPromotion: Promotion = {
      id: Number(result.lastInsertRowid),
      code: cleanCode,
      name: data.name.trim(),
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderAmount: data.minOrderAmount || 0,
      isActive: isActiveVal === 1,
      maxDiscountAmount: maxDiscount,
      usageLimit,
      usedCount: 0,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
    };

    return { success: true, promotion: newPromotion, message: "Tạo mã khuyến mãi thành công" };
  } catch (error: any) {
    console.error("Lỗi tạo khuyến mãi trong SQLite:", error);
    return { success: false, message: "Lỗi tạo khuyến mãi trong SQLite" };
  }
}

/**
 * Cập nhật thông tin mã khuyến mãi
 */
export function updatePromotionInSqlite(
  id: number,
  data: Partial<{
    code: string;
    name: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderAmount: number;
    isActive: boolean;
    maxDiscountAmount: number | null;
    usageLimit: number | null;
    startTime: string | null;
    endTime: string | null;
  }>
): { success: boolean; promotion?: Promotion; message?: string } {
  try {
    const db = getSqliteDb();
    ensurePromotionsColumns(db);

    const existing: any = db.prepare("SELECT * FROM promotions WHERE id = ?").get(id);
    if (!existing) {
      return { success: false, message: "Không tìm thấy mã khuyến mãi cần sửa" };
    }

    let code = existing.code;
    if (data.code !== undefined) {
      code = data.code.trim().toUpperCase();
      if (!code) return { success: false, message: "Mã khuyến mãi không được để trống" };
      const duplicate: any = db.prepare("SELECT id FROM promotions WHERE UPPER(code) = ? AND id != ?").get(code, id);
      if (duplicate) {
        return { success: false, message: `Mã khuyến mãi "${code}" đã được sử dụng bởi khuyến mãi khác` };
      }
    }

    const name = data.name !== undefined ? data.name.trim() : existing.name;
    const discountType = (data.discountType !== undefined ? data.discountType : existing.discount_type) as DiscountType;
    const discountValue = data.discountValue !== undefined ? Number(data.discountValue) : Number(existing.discount_value);
    const minOrderAmount = data.minOrderAmount !== undefined ? Number(data.minOrderAmount) : Number(existing.min_order_amount);
    const isActiveVal = data.isActive !== undefined ? (data.isActive ? 1 : 0) : existing.is_active;
    const maxDiscountAmount =
      data.maxDiscountAmount !== undefined
        ? data.maxDiscountAmount != null && data.maxDiscountAmount > 0
          ? Number(data.maxDiscountAmount)
          : null
        : existing.max_discount_amount;
    const usageLimit =
      data.usageLimit !== undefined
        ? data.usageLimit != null && data.usageLimit > 0
          ? Math.floor(Number(data.usageLimit))
          : null
        : existing.usage_limit;
    const startTime = data.startTime !== undefined ? data.startTime || null : existing.start_time;
    const endTime = data.endTime !== undefined ? data.endTime || null : existing.end_time;

    if (!name) {
      return { success: false, message: "Tên chương trình không được để trống" };
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return { success: false, message: "Giá trị giảm giá phải lớn hơn 0" };
    }
    if (discountType === "PERCENTAGE" && discountValue > 100) {
      return { success: false, message: "Phần trăm giảm giá không được vượt quá 100%" };
    }
    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
      return { success: false, message: "Giá trị đơn tối thiểu không hợp lệ" };
    }

    db.prepare(`
      UPDATE promotions
      SET code = ?, name = ?, discount_type = ?, discount_value = ?, min_order_amount = ?, is_active = ?, max_discount_amount = ?, usage_limit = ?, start_time = ?, end_time = ?
      WHERE id = ?
    `).run(code, name, discountType, discountValue, minOrderAmount, isActiveVal, maxDiscountAmount, usageLimit, startTime, endTime, id);

    syncMirrorFile();

    const updated: Promotion = {
      id,
      code,
      name,
      discountType,
      discountValue,
      minOrderAmount,
      isActive: isActiveVal === 1,
      maxDiscountAmount,
      usageLimit,
      usedCount: Number(existing.used_count || 0),
      startTime,
      endTime,
    };

    return { success: true, promotion: updated, message: "Cập nhật mã khuyến mãi thành công" };
  } catch (error: any) {
    console.error("Lỗi cập nhật khuyến mãi trong SQLite:", error);
    return { success: false, message: "Lỗi cập nhật khuyến mãi trong SQLite" };
  }
}

/**
 * Bật / tắt trạng thái kích hoạt của mã khuyến mãi
 */
export function togglePromotionInSqlite(id: number): { success: boolean; promotion?: Promotion; message?: string } {
  try {
    const db = getSqliteDb();
    ensurePromotionsColumns(db);

    const existing: any = db.prepare("SELECT * FROM promotions WHERE id = ?").get(id);
    if (!existing) {
      return { success: false, message: "Không tìm thấy mã khuyến mãi" };
    }

    const newStatus = existing.is_active === 1 ? 0 : 1;
    db.prepare("UPDATE promotions SET is_active = ? WHERE id = ?").run(newStatus, id);
    syncMirrorFile();

    return {
      success: true,
      message: `Đã ${newStatus === 1 ? "kích hoạt" : "tắt"} mã ${existing.code}`,
      promotion: mapPromotionRow({ ...existing, is_active: newStatus }),
    };
  } catch (error: any) {
    console.error("Lỗi chuyển đổi trạng thái khuyến mãi:", error);
    return { success: false, message: "Lỗi chuyển đổi trạng thái" };
  }
}

/**
 * Xóa vĩnh viễn mã khuyến mãi
 */
export function deletePromotionInSqlite(id: number): { success: boolean; message?: string } {
  try {
    const db = getSqliteDb();
    const result = db.prepare("DELETE FROM promotions WHERE id = ?").run(id);
    syncMirrorFile();
    if (result.changes > 0) {
      return { success: true, message: "Đã xóa mã khuyến mãi thành công" };
    }
    return { success: false, message: "Không tìm thấy mã khuyến mãi để xóa" };
  } catch (error: any) {
    console.error("Lỗi xóa khuyến mãi trong SQLite:", error);
    return { success: false, message: "Lỗi xóa mã khuyến mãi" };
  }
}

/**
 * Tính toán mức giảm giá chính xác của voucher dựa trên giá trị đơn hàng, phí ship, thời hạn và giới hạn lượt dùng
 */
export function calculatePromotionDiscount(
  promotion: Promotion,
  subtotalAmount: number,
  deliveryFee: number = 0
): { valid: boolean; discountAmount: number; message?: string } {
  if (!promotion.isActive) {
    return { valid: false, discountAmount: 0, message: `Mã "${promotion.code}" hiện đang tạm ngưng áp dụng.` };
  }

  const now = Date.now();
  if (promotion.startTime && !Number.isNaN(new Date(promotion.startTime).getTime()) && now < new Date(promotion.startTime).getTime()) {
    return { valid: false, discountAmount: 0, message: `Mã "${promotion.code}" chưa đến thời gian áp dụng.` };
  }
  if (promotion.endTime && !Number.isNaN(new Date(promotion.endTime).getTime()) && now > new Date(promotion.endTime).getTime()) {
    return { valid: false, discountAmount: 0, message: `Mã "${promotion.code}" đã hết hạn sử dụng.` };
  }
  if (promotion.usageLimit != null && promotion.usageLimit > 0 && (promotion.usedCount || 0) >= promotion.usageLimit) {
    return { valid: false, discountAmount: 0, message: `Mã "${promotion.code}" đã hết lượt sử dụng.` };
  }

  if (subtotalAmount < promotion.minOrderAmount) {
    const diff = promotion.minOrderAmount - subtotalAmount;
    return {
      valid: false,
      discountAmount: 0,
      message: `Mã "${promotion.code}" áp dụng cho đơn từ ${new Intl.NumberFormat("vi-VN").format(promotion.minOrderAmount)}đ. Cần mua thêm ${new Intl.NumberFormat("vi-VN").format(diff)}đ nữa.`,
    };
  }

  let discount = 0;
  const isFreeship =
    promotion.discountType === "FREESHIP" || promotion.code.toUpperCase() === "FREESHIP";

  if (isFreeship) {
    if (deliveryFee <= 0) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Đơn hàng hiện có phí giao hàng 0đ nên không áp dụng mã "${promotion.code}".`,
      };
    }
    discount = Math.min(deliveryFee, promotion.discountValue);
  } else if (promotion.discountType === "PERCENTAGE") {
    discount = Math.round(subtotalAmount * (promotion.discountValue / 100));
    if (promotion.maxDiscountAmount && promotion.maxDiscountAmount > 0) {
      discount = Math.min(discount, promotion.maxDiscountAmount);
    }
  } else {
    discount = promotion.discountValue;
  }

  // Đảm bảo không giảm vượt quá tổng tiền món + ship
  discount = Math.max(0, Math.min(discount, subtotalAmount + deliveryFee));

  return { valid: true, discountAmount: discount };
}

// ============================================================================
// PHÂN HỆ SAO LƯU (BACKUP) & NHẬP DỮ LIỆU (IMPORT / RESTORE)
// ============================================================================

/**
 * Đóng và khởi động lại kết nối SQLite singleton (Dùng sau khi khôi phục / ghi đè file CSDL)
 */
export function reloadSqliteDb(): Database.Database {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }
  return getSqliteDb();
}

const EXPORT_TABLES = [
  "categories",
  "products",
  "product_variants",
  "product_options",
  "product_option_values",
  "business_settings",
  "companies",
  "promotions",
  "roles",
  "permissions",
  "role_permissions",
  "users",
  "orders",
  "order_items",
  "group_sessions",
  "group_session_items",
] as const;

function sqlEscapeLiteral(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return Number.isFinite(val) ? String(val) : "NULL";
  if (typeof val === "boolean") return val ? "1" : "0";
  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * Xuất bản sao lưu SQL từ DỮ LIỆU THỰC TẾ đang chạy trong SQLite (không dùng file seed tĩnh).
 */
export function exportLiveSqlDumpFromSqlite(): string {
  const db = getSqliteDb();
  const lines: string[] = [
    "-- ============================================================================",
    `-- CÀ XÒI COFFEE — LIVE SQLITE BACKUP DUMP (${new Date().toISOString()})`,
    "-- ============================================================================",
    "PRAGMA foreign_keys = OFF;",
    "BEGIN TRANSACTION;",
    "",
  ];

  for (const tbl of EXPORT_TABLES) {
    try {
      const cols = (db.pragma(`table_info("${tbl}")`) || []) as Array<{ name: string }>;
      if (cols.length === 0) continue;
      // Không xuất cột plain_password (đã ngừng dùng)
      const colNames = cols.map((c) => c.name).filter((name) => name !== "plain_password");
      const rows = db.prepare(`SELECT ${colNames.map((c) => `"${c}"`).join(", ")} FROM "${tbl}"`).all() as any[];

      lines.push(`-- Table: ${tbl} (${rows.length} rows)`);
      lines.push(`DELETE FROM "${tbl}";`);
      for (const row of rows) {
        const vals = colNames.map((c) => sqlEscapeLiteral(row[c])).join(", ");
        lines.push(`INSERT INTO "${tbl}" (${colNames.map((c) => `"${c}"`).join(", ")}) VALUES (${vals});`);
      }
      lines.push("");
    } catch {
      // Skip unavailable table
    }
  }

  lines.push("COMMIT;");
  lines.push("PRAGMA foreign_keys = ON;");
  return lines.join("\n");
}

function pruneOldBackupSnapshots() {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) return;
    const files = fs
      .readdirSync(BACKUPS_DIR)
      .filter((f) => f.endsWith(".db") || f.endsWith(".sqlite") || f.endsWith(".json") || f.endsWith(".sql"))
      .map((f) => {
        const fullPath = path.join(BACKUPS_DIR, f);
        return { fullPath, mtime: fs.statSync(fullPath).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > MAX_BACKUP_FILES) {
      for (const old of files.slice(MAX_BACKUP_FILES)) {
        try {
          fs.unlinkSync(old.fullPath);
        } catch {}
      }
    }
  } catch {}
}

function resolveSafeBackupPath(filename: string, allowedExts: string[]): string | null {
  if (!filename || typeof filename !== "string") return null;
  const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safeName || safeName !== path.basename(filename)) return null;
  const lower = safeName.toLowerCase();
  if (!allowedExts.some((ext) => lower.endsWith(ext))) return null;

  if (!fs.existsSync(BACKUPS_DIR)) return null;
  const candidate = path.join(BACKUPS_DIR, safeName);
  if (!fs.existsSync(candidate)) return null;

  const realDir = fs.realpathSync(BACKUPS_DIR);
  const realTarget = fs.realpathSync(candidate);
  if (!realTarget.startsWith(realDir + path.sep)) {
    return null;
  }
  return realTarget;
}

/**
 * Xuất toàn bộ 16 bảng của hệ thống Cà Xòi Coffee ra đối tượng JSON đầy đủ
 */
export function exportFullDatabaseToJson(): any {
  const db = getSqliteDb();
  const exportData: Record<string, any[]> = {};

  for (const tbl of EXPORT_TABLES) {
    try {
      const rows = db.prepare(`SELECT * FROM "${tbl}"`).all() as any[];
      if (tbl === "users") {
        // Tuyệt đối không xuất plain_password hoặc pin dạng cleartext
        exportData[tbl] = rows.map((u) => {
          const { plain_password: _unusedPlain, ...rest } = u;
          return { ...rest, plain_password: null };
        });
      } else {
        exportData[tbl] = rows;
      }
    } catch {
      exportData[tbl] = [];
    }
  }

  return {
    version: "1.1",
    appName: "Cà Xòi Coffee",
    exportedAt: new Date().toISOString(),
    summary: {
      totalCategories: exportData.categories?.length || 0,
      totalProducts: exportData.products?.length || 0,
      totalVariants: exportData.product_variants?.length || 0,
      totalOptions: exportData.product_options?.length || 0,
      totalOptionValues: exportData.product_option_values?.length || 0,
      totalPromotions: exportData.promotions?.length || 0,
      totalOrders: exportData.orders?.length || 0,
      totalUsers: exportData.users?.length || 0,
    },
    tables: exportData,
  };
}

/**
 * Nhập dữ liệu từ tệp JSON vào SQLite (đối chiếu nghiêm ngặt tên cột theo PRAGMA table_info để chống SQL Injection)
 * @param jsonData Dữ liệu JSON chứa tables
 * @param mode "FULL" (toàn bộ CSDL) hoặc "MENU_ONLY" (chỉ thực đơn, size, topping, độ ngọt, đá)
 */
export function importFullDatabaseFromJson(
  jsonData: any,
  mode: "FULL" | "MENU_ONLY" = "FULL"
): { success: boolean; message: string; stats?: any } {
  try {
    if (!jsonData || typeof jsonData !== "object") {
      return { success: false, message: "Dữ liệu JSON không hợp lệ" };
    }

    const tablesData = jsonData.tables || jsonData;
    if (!tablesData || typeof tablesData !== "object") {
      return { success: false, message: "Không tìm thấy cấu trúc bảng dữ liệu trong JSON" };
    }

    const menuTables = [
      "categories",
      "products",
      "product_variants",
      "product_options",
      "product_option_values",
    ];

    const targetTables = mode === "MENU_ONLY" ? menuTables : [...EXPORT_TABLES];

    const db = getSqliteDb();

    // Thực thi trong Transaction với foreign_keys tạm tắt để tránh lỗi ràng buộc thứ tự
    db.pragma("foreign_keys = OFF");

    const stats: Record<string, number> = {};

    const runImport = db.transaction(() => {
      for (const tbl of targetTables) {
        const rows = tablesData[tbl];
        if (!Array.isArray(rows)) continue;

        // Lấy danh sách cột thật từ PRAGMA table_info để chống SQL identifier injection
        const tableInfo = (db.pragma(`table_info("${tbl}")`) || []) as Array<{ name: string }>;
        const allowedColumns = new Set(tableInfo.map((c) => c.name));
        if (allowedColumns.size === 0) continue;

        db.prepare(`DELETE FROM "${tbl}"`).run();

        if (rows.length > 0 && rows[0] && typeof rows[0] === "object") {
          const rawKeys = Object.keys(rows[0]);
          const validColumns = rawKeys.filter(
            (c) => allowedColumns.has(c) && /^[a-z_][a-z0-9_]*$/i.test(c)
          );

          if (validColumns.length > 0) {
            const placeholders = validColumns.map(() => "?").join(", ");
            const colNames = validColumns.map((c) => `"${c}"`).join(", ");
            const insertStmt = db.prepare(
              `INSERT INTO "${tbl}" (${colNames}) VALUES (${placeholders})`
            );

            for (const r of rows) {
              if (!r || typeof r !== "object") continue;
              const values = validColumns.map((c) => (r[c] !== undefined ? r[c] : null));
              insertStmt.run(...values);
            }
          }
        }
        stats[tbl] = rows.length;
      }
    });

    runImport();
    runNonDestructiveMigrations(db);

    db.pragma("foreign_keys = ON");
    db.pragma("wal_checkpoint(TRUNCATE)");
    syncMirrorFile();

    const modeText = mode === "MENU_ONLY" ? "Thực đơn & Bảng giá" : "Toàn bộ CSDL";
    return {
      success: true,
      message: `Đã khôi phục thành công ${modeText}! (${stats.products ?? 0} món, ${stats.product_variants ?? 0} quy cách, ${stats.product_options ?? 0} tùy chọn).`,
      stats,
    };
  } catch (error: any) {
    console.error("Lỗi import JSON vào SQLite:", error);
    try {
      const db = getSqliteDb();
      db.pragma("foreign_keys = ON");
    } catch {}
    return { success: false, message: "Lỗi khôi phục dữ liệu JSON. Vui lòng kiểm tra cấu trúc file sao lưu." };
  }
}

/**
 * Tạo một bản sao lưu (Snapshot) của CSDL hiện tại vào database/backups/
 */
export async function createDatabaseBackupSnapshot(label?: string): Promise<{
  success: boolean;
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  message: string;
}> {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const db = getSqliteDb();
    db.pragma("wal_checkpoint(TRUNCATE)");

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const cleanLabel = label ? `_${label.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 30)}` : "";
    const filename = `caxoi_backup_${ts}${cleanLabel}.db`;
    const targetPath = path.join(BACKUPS_DIR, filename);

    // Online backup an toàn của better-sqlite3
    await db.backup(targetPath);

    // Tạo thêm bản sao JSON đồng hành để có thể khôi phục an toàn qua web
    const jsonFilename = `caxoi_backup_${ts}${cleanLabel}.json`;
    const jsonPath = path.join(BACKUPS_DIR, jsonFilename);
    const fullJson = exportFullDatabaseToJson();
    fs.writeFileSync(jsonPath, JSON.stringify(fullJson, null, 2), "utf-8");

    pruneOldBackupSnapshots();

    const stat = fs.statSync(targetPath);
    const sizeKb = Math.round(stat.size / 1024);
    const sizeFormatted = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

    return {
      success: true,
      filename,
      sizeBytes: stat.size,
      sizeFormatted,
      createdAt: now.toISOString(),
      message: `Đã tạo bản sao lưu ${filename} (${sizeFormatted}) an toàn trên hệ thống!`,
    };
  } catch (error: any) {
    console.error("Lỗi tạo snapshot sao lưu:", error);
    return {
      success: false,
      filename: "",
      sizeBytes: 0,
      sizeFormatted: "0 KB",
      createdAt: new Date().toISOString(),
      message: "Lỗi tạo bản sao lưu hệ thống.",
    };
  }
}

/**
 * Lấy danh sách tất cả các bản sao lưu trong thư mục database/backups/
 */
export function listDatabaseBackupSnapshots(): Array<{
  filename: string;
  format: "db" | "json" | "sql";
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  isAutoPreRestore: boolean;
}> {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const files = fs.readdirSync(BACKUPS_DIR);
    return files
      .filter((f) => f.endsWith(".db") || f.endsWith(".sqlite") || f.endsWith(".json") || f.endsWith(".sql"))
      .map((f) => {
        const fullPath = path.join(BACKUPS_DIR, f);
        const stat = fs.statSync(fullPath);
        let format: "db" | "json" | "sql" = "db";
        if (f.endsWith(".json")) format = "json";
        else if (f.endsWith(".sql")) format = "sql";

        const sizeKb = Math.round(stat.size / 1024);
        const sizeFormatted = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

        return {
          filename: f,
          format,
          sizeBytes: stat.size,
          sizeFormatted,
          createdAt: stat.mtime.toISOString(),
          isAutoPreRestore: f.startsWith("auto_pre_restore_") || f.includes("pre_restore"),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    return [];
  }
}

/**
 * Xóa một bản sao lưu khỏi database/backups/ (kiểm tra realpathSync & đuôi tệp hợp lệ)
 */
export function deleteBackupSnapshot(filename: string): { success: boolean; message: string } {
  try {
    const safePath = resolveSafeBackupPath(filename, [".db", ".sqlite", ".json", ".sql"]);
    if (!safePath) {
      return { success: false, message: "Không tìm thấy hoặc tệp sao lưu không hợp lệ" };
    }
    fs.unlinkSync(safePath);
    return { success: true, message: `Đã xóa bản sao lưu ${path.basename(safePath)} thành công!` };
  } catch (error: any) {
    return { success: false, message: "Lỗi xóa bản sao lưu." };
  }
}

/**
 * Khôi phục CSDL từ một file snapshot có sẵn trong database/backups/
 */
export async function restoreDatabaseFromBackupSnapshot(
  filename: string,
  mode: "FULL" | "MENU_ONLY" = "FULL"
): Promise<{ success: boolean; message: string }> {
  try {
    const sourcePath = resolveSafeBackupPath(filename, [".json", ".db", ".sqlite"]);
    if (!sourcePath) {
      return {
        success: false,
        message: "Chỉ hỗ trợ khôi phục snapshot .json hoặc .db/.sqlite nội bộ trong thư mục backups.",
      };
    }

    const safeName = path.basename(sourcePath);

    // 1. Tự động chụp bản pre-backup trước khi khôi phục
    await createDatabaseBackupSnapshot("pre_restore");

    // 2. Nếu file là JSON (hỗ trợ cả FULL và MENU_ONLY)
    if (safeName.toLowerCase().endsWith(".json")) {
      const content = fs.readFileSync(sourcePath, "utf-8");
      const parsed = JSON.parse(content);
      return importFullDatabaseFromJson(parsed, mode);
    }

    // 3. Nếu file là .db / .sqlite nội bộ: không cho phép dùng cho MENU_ONLY (vì file nhị phân thay toàn bộ DB)
    if (mode === "MENU_ONLY") {
      return {
        success: false,
        message: "Chế độ khôi phục Chỉ Thực Đơn (MENU_ONLY) chỉ hỗ trợ tệp sao lưu định dạng .json.",
      };
    }

    // Xác thực header SQLite trước khi thay thế
    const headerBuf = Buffer.alloc(16);
    const fd = fs.openSync(sourcePath, "r");
    try {
      fs.readSync(fd, headerBuf, 0, 16, 0);
    } finally {
      fs.closeSync(fd);
    }
    if (headerBuf.toString("ascii", 0, 15) !== "SQLite format 3") {
      return { success: false, message: "Tệp snapshot .db không đúng định dạng SQLite hợp lệ." };
    }

    reloadSqliteDb();
    if (dbInstance) {
      try {
        (dbInstance as any).close();
      } catch {}
      dbInstance = null;
    }

    fs.copyFileSync(sourcePath, PRIMARY_DB_FILE);
    fs.copyFileSync(sourcePath, MIRROR_DB_FILE);

    try {
      fs.unlinkSync(PRIMARY_DB_FILE + "-wal");
    } catch {}
    try {
      fs.unlinkSync(PRIMARY_DB_FILE + "-shm");
    } catch {}

    const newDb = reloadSqliteDb();
    newDb.pragma("wal_checkpoint(TRUNCATE)");

    return {
      success: true,
      message: `Đã khôi phục hoàn chỉnh CSDL từ bản sao lưu ${safeName}! Dữ liệu đã sẵn sàng.`,
    };
  } catch (error: any) {
    console.error("Lỗi khôi phục từ snapshot:", error);
    return { success: false, message: "Lỗi khôi phục bản sao lưu." };
  }
}

/**
 * Khôi phục CSDL từ Buffer tệp tin được tải lên qua Web.
 * Vì lý do bảo mật (chống thực thi SQL tùy ý / ghi đè file nhị phân chưa kiểm chứng), chỉ chấp nhận tệp .json hợp lệ và kiểm tra TRƯỚC khi lưu.
 */
export async function restoreDatabaseFromUploadedBuffer(
  buffer: Buffer,
  originalFilename: string,
  mode: "FULL" | "MENU_ONLY" = "FULL"
): Promise<{ success: boolean; message: string; stats?: any }> {
  try {
    const cleanFilename = path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const lowerName = cleanFilename.toLowerCase();

    if (!lowerName.endsWith(".json")) {
      return {
        success: false,
        message:
          "Vì lý do bảo mật, tính năng nhập qua trình duyệt chỉ hỗ trợ tệp sao lưu .json (xuất từ nút Tải Backup JSON). Không cho phép thực thi tệp .sql hoặc ghi đè file .db trực tiếp qua HTTP.",
      };
    }

    // 1. Kiểm tra JSON hợp lệ TRƯỚC khi tạo backup hoặc ghi đĩa
    let parsed: any;
    try {
      parsed = JSON.parse(buffer.toString("utf-8"));
    } catch {
      return { success: false, message: "Tệp tải lên không phải là định dạng JSON hợp lệ." };
    }

    const tablesData = parsed?.tables || parsed;
    if (!tablesData || typeof tablesData !== "object" || Array.isArray(tablesData)) {
      return { success: false, message: "Cấu trúc tệp JSON sao lưu không hợp lệ." };
    }

    // 2. Chụp bản sao lưu dự phòng trước khi can thiệp
    await createDatabaseBackupSnapshot("pre_restore");

    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const uploadedSaveName = `uploaded_${Date.now()}_${cleanFilename.slice(0, 60)}`;
    fs.writeFileSync(path.join(BACKUPS_DIR, uploadedSaveName), buffer);
    pruneOldBackupSnapshots();

    return importFullDatabaseFromJson(parsed, mode);
  } catch (error: any) {
    console.error("Lỗi khôi phục tệp tải lên:", error);
    return { success: false, message: "Lỗi trong quá trình khôi phục dữ liệu tải lên." };
  }
}
