import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
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
} from "@/types";

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

let dbInstance: Database.Database | null = null;
let lastSqlSeedMtime = 0;

/**
 * Tự động kiểm tra xem tệp tin SQL có được sửa đổi bên ngoài hay không
 * Nếu người dùng vừa sửa file SQL, hệ thống tự động nạp dữ liệu mới vào caxoi_cafe.db
 */
export function checkAndAutoSyncSqlite(): boolean {
  try {
    if (fs.existsSync(SQL_SEED_FILE)) {
      const currentSqlMtime = fs.statSync(SQL_SEED_FILE).mtimeMs;
      if (lastSqlSeedMtime > 0 && currentSqlMtime > lastSqlSeedMtime) {
        console.log("[SQLite Auto-Sync] Phát hiện file SQL vừa được thay đổi! Đang tự động nạp lại CSDL...");
        executeSqlSeedFile();
        lastSqlSeedMtime = currentSqlMtime;
        return true;
      }
      if (lastSqlSeedMtime === 0) {
        lastSqlSeedMtime = currentSqlMtime;
      }
    }
  } catch (err: any) {
    console.error("[SQLite Auto-Sync] Lỗi kiểm tra đồng bộ:", err.message);
  }
  return false;
}

/**
 * Thực thi toàn bộ tệp SQL vào cơ sở dữ liệu SQLite
 */
export function executeSqlSeedFile(): boolean {
  try {
    if (!fs.existsSync(SQL_SEED_FILE)) {
      return false;
    }

    const sqlContent = fs.readFileSync(SQL_SEED_FILE, "utf-8");
    const db = getSqliteDb();

    // Thực thi toàn bộ script SQL
    db.exec(sqlContent);

    // Checkpoint WAL và copy sang mirror file để cả 2 file .db và .sqlite luôn đồng bộ
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
      fs.copyFileSync(PRIMARY_DB_FILE, MIRROR_DB_FILE);
    } catch {}

    lastSqlSeedMtime = fs.statSync(SQL_SEED_FILE).mtimeMs;
    return true;
  } catch (error: any) {
    console.error("Lỗi thực thi SQL seed:", error);
    return false;
  }
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
      lastSqlSeedMtime = fs.statSync(SQL_SEED_FILE).mtimeMs;
      try {
        db.pragma("wal_checkpoint(TRUNCATE)");
        fs.copyFileSync(PRIMARY_DB_FILE, MIRROR_DB_FILE);
      } catch {}
    }
  } else if (fs.existsSync(SQL_SEED_FILE)) {
    lastSqlSeedMtime = fs.statSync(SQL_SEED_FILE).mtimeMs;
  }

  // Đảm bảo cột email tồn tại trong bảng users (Safe non-destructive migration)
  try {
    const userTableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (userTableCheck) {
      const userCols = db.prepare("PRAGMA table_info(users)").all() as any[];
      if (userCols.length > 0 && !userCols.some((col: any) => col.name === "email")) {
        db.exec("ALTER TABLE users ADD COLUMN email TEXT;");
      }
    }
  } catch (err: any) {
    console.error("[SQLite Migration] Lỗi kiểm tra cột email:", err.message);
  }

  dbInstance = db;
  return dbInstance;
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
      filePath: PRIMARY_DB_FILE,
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
      sqlFilePath: SQL_SEED_FILE,
    };
  } catch (error: any) {
    return {
      connected: false,
      filePath: PRIMARY_DB_FILE,
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

      let tags: string[] = ["BEST_SELLER"];
      if (r.tags) {
        tags = typeof r.tags === "string" ? r.tags.split(",") : r.tags;
      }

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
    const stmt = db.prepare(`
      UPDATE products 
      SET name = ?, description = ?, base_price = ?, sale_price = ?, is_available = ?, is_featured = ?, image_url = ?, category_id = ?, prep_time_minutes = ?
      WHERE id = ?
    `);

    stmt.run(
      product.name,
      product.description,
      product.basePrice,
      product.salePrice || null,
      product.isAvailable ? 1 : 0,
      product.isFeatured ? 1 : 0,
      product.imageUrl || "",
      product.categoryId || 1,
      product.prepTimeMinutes || 4,
      product.id
    );

    if (product.variants && product.variants.length > 0) {
      // Thay thế chính xác toàn bộ variants theo cấu hình từ Admin (nếu xóa Ly thì lưu đúng các size còn lại)
      db.prepare("DELETE FROM product_variants WHERE product_id = ?").run(product.id);
      const vStmt = db.prepare(`
        INSERT INTO product_variants (product_id, size_name, extra_price, is_default)
        VALUES (?, ?, ?, ?)
      `);

      for (const v of product.variants) {
        vStmt.run(
          product.id,
          v.sizeName.trim(),
          Number(v.extraPrice) || 0,
          v.isDefault ? 1 : 0
        );
      }
    }

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
export function getBusinessSettingsFromSqlite(): BusinessSettings {
  try {
    checkAndAutoSyncSqlite();
    const db = getSqliteDb();
    const row: any = db.prepare("SELECT * FROM business_settings WHERE id = 1").get();
    if (!row) {
      return {
        storeName: "Cà Xòi - Trạm Cấp Cứu Cơn Buồn Ngủ Công Sở",
        storeStatus: "OPEN",
        storeStatusMessage: "Tỉnh như sáo, báo như Xòi • Giao siêu tốc Hải Châu, Thanh Khê, Ngũ Hành Sơn, Đà Nẵng",
        hotline: "0905 249 733",
        openTime: "06:30",
        closeTime: "21:30",
        baseDeliveryFee: 15000,
        freeDeliveryMinCups: 3,
        maxSlotCapacityCups: 30,
        prepLeadTimeMinutes: 5,
        vietqrBankId: "MB",
        vietqrAccountNo: "999988886666",
        vietqrAccountName: "CA XOI CAFE",
      };
    }

    return {
      storeName: row.store_name || "Cà Xòi - Trạm Cấp Cứu Cơn Buồn Ngủ Công Sở",
      storeStatus: (row.store_status as any) || "OPEN",
      storeStatusMessage: row.store_status_message || row.rush_mode_message || "Tỉnh như sáo, báo như Xòi • Đà Nẵng",
      hotline: row.hotline || row.phone || "0905 249 733",
      openTime: row.open_time || "06:30",
      closeTime: row.close_time || "21:30",
      baseDeliveryFee: Number(row.base_delivery_fee || row.default_delivery_fee || 15000),
      freeDeliveryMinCups: Number(row.free_delivery_min_cups || 3),
      maxSlotCapacityCups: Number(row.max_slot_capacity_cups || row.max_orders_per_slot || 30),
      prepLeadTimeMinutes: Number(row.prep_lead_time_minutes || 5),
      vietqrBankId: row.vietqr_bank_id || row.bank_bin || "MB",
      vietqrAccountNo: row.vietqr_account_no || row.bank_account_no || "999988886666",
      vietqrAccountName: row.vietqr_account_name || row.bank_account_name || "CA XOI CAFE",
    };
  } catch (error) {
    return {
      storeName: "Cà Xòi - Trạm Cấp Cứu Cơn Buồn Ngủ Công Sở",
      storeStatus: "OPEN",
      storeStatusMessage: "Tỉnh như sáo, báo như Xòi • Đà Nẵng",
      hotline: "0905 249 733",
      openTime: "06:30",
      closeTime: "21:30",
      baseDeliveryFee: 15000,
      freeDeliveryMinCups: 3,
      maxSlotCapacityCups: 30,
      prepLeadTimeMinutes: 5,
      vietqrBankId: "MB",
      vietqrAccountNo: "999988886666",
      vietqrAccountName: "CA XOI CAFE",
    };
  }
}

export function updateBusinessSettingsInSqlite(updates: Partial<BusinessSettings>): BusinessSettings {
  try {
    const db = getSqliteDb();
    const current = getBusinessSettingsFromSqlite();
    const merged = { ...current, ...updates };

    const stmt = db.prepare(`
      UPDATE business_settings SET
        store_name = ?,
        store_status = ?,
        store_status_message = ?,
        hotline = ?,
        phone = ?,
        open_time = ?,
        close_time = ?,
        base_delivery_fee = ?,
        free_delivery_min_cups = ?,
        max_slot_capacity_cups = ?,
        prep_lead_time_minutes = ?,
        vietqr_bank_id = ?,
        vietqr_account_no = ?,
        vietqr_account_name = ?
      WHERE id = 1
    `);

    stmt.run(
      merged.storeName,
      merged.storeStatus,
      merged.storeStatusMessage,
      merged.hotline,
      merged.hotline,
      merged.openTime,
      merged.closeTime,
      merged.baseDeliveryFee,
      merged.freeDeliveryMinCups,
      merged.maxSlotCapacityCups,
      merged.prepLeadTimeMinutes,
      merged.vietqrBankId,
      merged.vietqrAccountNo,
      merged.vietqrAccountName
    );

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
  } catch (e) {
    console.error("Lỗi kiểm tra cấu trúc bảng orders:", e);
  }
}

export function getOrdersFromSqlite(filter?: {
  status?: string;
  orderType?: string;
  phone?: string;
  search?: string;
  date?: string; // 'TODAY' | 'YESTERDAY' | '7DAYS' | 'ALL'
}): Order[] {
  try {
    checkAndAutoSyncSqlite();
    const db = getSqliteDb();
    ensureOrdersColumns(db);

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

    if (filter?.phone) {
      conditions.push("recipient_phone LIKE ?");
      params.push(`%${filter.phone}%`);
    }

    if (filter?.search && filter.search.trim()) {
      const s = `%${filter.search.trim()}%`;
      conditions.push("(order_code LIKE ? OR recipient_name LIKE ? OR recipient_phone LIKE ? OR building_name LIKE ? OR company_name LIKE ?)");
      params.push(s, s, s, s, s);
    }

    if (filter?.date && filter.date !== "ALL") {
      if (filter.date === "TODAY") {
        conditions.push("date(created_at) = date('now', 'localtime')");
      } else if (filter.date === "YESTERDAY") {
        conditions.push("date(created_at) = date('now', 'localtime', '-1 day')");
      } else if (filter.date === "7DAYS") {
        conditions.push("date(created_at) >= date('now', 'localtime', '-7 days')");
      }
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY created_at DESC";

    const orderRows = db.prepare(query).all(...params) as any[];
    const itemRows = db.prepare("SELECT * FROM order_items").all() as any[];

    return orderRows.map((o: any) => {
      const items: OrderItemRecord[] = itemRows
        .filter((i: any) => i.order_id === o.id)
        .map((i: any) => {
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
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        items,
      };
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách đơn hàng:", error);
    return [];
  }
}

export function getOrderByIdFromSqlite(idOrCode: string): Order | null {
  try {
    checkAndAutoSyncSqlite();
    const db = getSqliteDb();
    const row: any = db
      .prepare("SELECT * FROM orders WHERE id = ? OR LOWER(order_code) = LOWER(?) LIMIT 1")
      .get(idOrCode, idOrCode);

    if (!row) return null;

    const itemsRows = db
      .prepare("SELECT * FROM order_items WHERE order_id = ?")
      .all(row.id) as any[];

    const items: OrderItemRecord[] = itemsRows.map((i) => {
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
      id: row.id,
      orderCode: row.order_code,
      orderType: row.order_type,
      status: row.status,
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method,
      recipientName: row.recipient_name,
      recipientPhone: row.recipient_phone,
      companyName: row.company_name || undefined,
      buildingName: row.building_name || undefined,
      floorRoom: row.floor_room || undefined,
      deliveryAddress: row.delivery_address || undefined,
      deliveryNotes: row.delivery_notes || undefined,
      scheduledType: row.scheduled_type || "ASAP",
      scheduledTime: row.scheduled_time || undefined,
      subtotalAmount: Number(row.subtotal_amount),
      discountAmount: Number(row.discount_amount || 0),
      deliveryFee: Number(row.delivery_fee || 0),
      totalAmount: Number(row.total_amount),
      promotionCode: row.promotion_code || undefined,
      groupSessionId: row.group_session_id || undefined,
      baristaNotes: row.barista_notes || undefined,
      shipperName: row.shipper_name || undefined,
      shipperPhone: row.shipper_phone || undefined,
      estimatedDeliveryTime: row.estimated_delivery_time || undefined,
      trackingNotes: row.tracking_notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items,
    };
  } catch (error) {
    return null;
  }
}

export function saveOrderToSqlite(order: Order): boolean {
  try {
    const db = getSqliteDb();
    const insertOrder = db.prepare(`
      INSERT INTO orders 
      (id, order_code, order_type, recipient_name, recipient_phone, company_name, building_name, floor_room,
       delivery_address, delivery_notes, scheduled_type, scheduled_time, subtotal_amount, discount_amount,
       delivery_fee, total_amount, payment_method, payment_status, status, promotion_code, group_session_id,
       barista_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertOrder.run(
      order.id,
      order.orderCode,
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
        const fee = Number(options.deliveryFee) || 0;
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
    const row: any = db.prepare("SELECT COUNT(*) as c FROM orders").get();
    return (row?.c || 0) + 1;
  } catch {
    return 1;
  }
}

// ============================================================================
// 6. THỐNG KÊ DOANH THU & GIỜ CAO ĐIỂM (100% REAL SQL AGGREGATION)
// ============================================================================
export function getStatsFromSqlite(timeRange: string = "TODAY") {
  try {
    checkAndAutoSyncSqlite();
    const db = getSqliteDb();

    // Xác định điều kiện lọc thời gian theo timeRange
    let orderDateClause = "";
    let cupsDateClause = "";
    if (timeRange === "TODAY") {
      orderDateClause = "AND DATE(created_at) = DATE('now', 'localtime')";
      cupsDateClause = "AND DATE(o.created_at) = DATE('now', 'localtime')";
    } else if (timeRange === "YESTERDAY") {
      orderDateClause = "AND DATE(created_at) = DATE('now', '-1 day', 'localtime')";
      cupsDateClause = "AND DATE(o.created_at) = DATE('now', '-1 day', 'localtime')";
    } else if (timeRange === "LAST_7_DAYS") {
      orderDateClause = "AND DATE(created_at) >= DATE('now', '-7 days', 'localtime')";
      cupsDateClause = "AND DATE(o.created_at) >= DATE('now', '-7 days', 'localtime')";
    } else if (timeRange === "THIS_MONTH") {
      orderDateClause = "AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')";
      cupsDateClause = "AND strftime('%Y-%m', o.created_at) = strftime('%Y-%m', 'now', 'localtime')";
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

    // 6. Phân bổ đơn hàng theo khung giờ thực tế (07:00 - 22:00)
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
        strftime('%H:00', created_at) as hour,
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
export function getGroupSessionFromSqlite(code: string): GroupSession | null {
  try {
    checkAndAutoSyncSqlite();
    const db = getSqliteDb();
    const row: any = db
      .prepare("SELECT * FROM group_sessions WHERE UPPER(session_code) = UPPER(?) LIMIT 1")
      .get(code);

    if (!row) return null;

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
      buildingName: row.building_name || undefined,
      status: row.status as any,
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
    db.prepare(`
      INSERT INTO group_sessions (id, session_code, host_name, host_phone, building_name, status, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.sessionCode.toUpperCase(),
      session.hostName,
      session.hostPhone,
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
    const itemId = `item-g-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
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
    db.prepare("UPDATE group_sessions SET status = 'LOCKED' WHERE UPPER(session_code) = UPPER(?)").run(sessionCode);
    syncMirrorFile();
    return true;
  } catch (error) {
    return false;
  }
}

export function removeGroupItemFromSqlite(sessionCode: string, cartItemId: string): boolean {
  try {
    const db = getSqliteDb();
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
export function getRolesAndPermissionsFromSqlite(): {
  definitions: PermissionDefinition[];
  roles: RolePermissionConfig[];
  staff: StaffAccount[];
} {
  try {
    checkAndAutoSyncSqlite();
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

    // 3. Danh sách tài khoản nhân viên
    const userRows = db.prepare(`
      SELECT u.*, r.name as role_name
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
      pin: u.pin || undefined,
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
  }
): boolean {
  try {
    const db = getSqliteDb();
    let roleId: number | null = null;
    if (updates.role) {
      const r: any = db.prepare("SELECT id FROM roles WHERE name = ?").get(updates.role);
      if (r) roleId = r.id;
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.fullName !== undefined) {
      fields.push("full_name = ?");
      values.push(updates.fullName.trim());
    }
    if (roleId !== null) {
      fields.push("role_id = ?");
      values.push(roleId);
    }
    if (updates.pin !== undefined) {
      fields.push("pin = ?");
      values.push(updates.pin.trim() || null);
    }
    if (updates.isActive !== undefined) {
      fields.push("is_active = ?");
      values.push(updates.isActive ? 1 : 0);
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
      fields.push("plain_password = ?");
      values.push(updates.password.trim());
    }

    if (fields.length === 0) return true;

    values.push(staffId);
    db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    syncMirrorFile();
    return true;
  } catch (error) {
    console.error("Lỗi cập nhật nhân viên trong SQLite:", error);
    return false;
  }
}

export function deleteStaffInSqlite(staffId: string): { success: boolean; message: string } {
  try {
    const db = getSqliteDb();
    // Kiểm tra xem có phải tài khoản cuối cùng của SUPER_ADMIN không
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
    return { success: false, message: error.message || "Lỗi xóa tài khoản nhân viên." };
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
}): boolean {
  try {
    const db = getSqliteDb();
    const r: any = db.prepare("SELECT id FROM roles WHERE name = ?").get(staff.role);
    const roleId = r ? r.id : 3; // Default BARISTA

    const id = `staff-${Date.now()}`;
    const defaultPasswordHash = "$2b$10$w82Qf0L1.Q4U3iA9gGgqveJqfQv8eXnFh/jK9GzJ6d0S/6hB3F7iO"; // Admin@123456
    const plainPwd = staff.password?.trim() || "Caxoi@123";

    db.prepare(`
      INSERT INTO users (id, username, password_hash, plain_password, pin, full_name, phone, email, role_id, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now', 'localtime'))
    `).run(
      id,
      staff.username.trim().toLowerCase(),
      defaultPasswordHash,
      plainPwd,
      staff.pin?.trim() || null,
      staff.fullName.trim(),
      staff.phone?.trim() || null,
      staff.email?.trim() || null,
      roleId
    );

    syncMirrorFile();
    return true;
  } catch (error) {
    console.error("Lỗi tạo nhân viên trong SQLite:", error);
    return false;
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
export function findUserInSqlite(usernameOrPin: string, isPin = false): any | null {
  try {
    checkAndAutoSyncSqlite();
    const db = getSqliteDb();
    let row: any = null;

    if (isPin) {
      row = db.prepare(`
        SELECT u.*, r.name as role_name 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.pin = ? AND u.is_active = 1 
        LIMIT 1
      `).get(usernameOrPin);
    } else {
      row = db.prepare(`
        SELECT u.*, r.name as role_name 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE LOWER(u.username) = LOWER(?) AND u.is_active = 1 
        LIMIT 1
      `).get(usernameOrPin);
    }

    if (row) {
      return {
        id: row.id,
        username: row.username,
        fullName: row.full_name,
        role: row.role_name,
        plainPassword: row.plain_password,
        pin: row.pin,
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
    const colNames = Array.isArray(columns) ? columns.map((c) => c.name) : [];
    if (!colNames.includes("max_discount_amount")) {
      db.exec("ALTER TABLE promotions ADD COLUMN max_discount_amount REAL DEFAULT NULL");
    }
  } catch (e) {
    // Schema will handle if table does not exist
  }
}

/**
 * Lấy danh sách toàn bộ mã khuyến mãi từ SQLite
 */
export function getPromotionsFromSqlite(): Promotion[] {
  try {
    checkAndAutoSyncSqlite();
    const db = getSqliteDb();
    ensurePromotionsColumns(db);
    const rows = db.prepare("SELECT * FROM promotions ORDER BY id ASC").all() as any[];
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      discountType: (r.discount_type || "PERCENTAGE") as DiscountType,
      discountValue: Number(r.discount_value),
      minOrderAmount: Number(r.min_order_amount || 0),
      isActive: Boolean(r.is_active),
      maxDiscountAmount: r.max_discount_amount != null ? Number(r.max_discount_amount) : null,
    }));
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
    checkAndAutoSyncSqlite();
    const db = getSqliteDb();
    ensurePromotionsColumns(db);
    const cleanCode = (code || "").trim().toUpperCase();
    if (!cleanCode) return null;
    const row = db.prepare("SELECT * FROM promotions WHERE UPPER(code) = ? LIMIT 1").get(cleanCode) as any;
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      discountType: (row.discount_type || "PERCENTAGE") as DiscountType,
      discountValue: Number(row.discount_value),
      minOrderAmount: Number(row.min_order_amount || 0),
      isActive: Boolean(row.is_active),
      maxDiscountAmount: row.max_discount_amount != null ? Number(row.max_discount_amount) : null,
    };
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
}): { success: boolean; promotion?: Promotion; message?: string } {
  try {
    checkAndAutoSyncSqlite();
    const db = getSqliteDb();
    ensurePromotionsColumns(db);

    const cleanCode = (data.code || "").trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: "Mã khuyến mãi không được để trống" };
    }
    if (!data.name || !data.name.trim()) {
      return { success: false, message: "Tên chương trình không được để trống" };
    }
    if (data.discountValue <= 0) {
      return { success: false, message: "Giá trị giảm giá phải lớn hơn 0" };
    }
    if (data.discountType === "PERCENTAGE" && data.discountValue > 100) {
      return { success: false, message: "Phần trăm giảm giá không được vượt quá 100%" };
    }

    const existing = db.prepare("SELECT id FROM promotions WHERE UPPER(code) = ?").get(cleanCode);
    if (existing) {
      return { success: false, message: `Mã khuyến mãi "${cleanCode}" đã tồn tại trên hệ thống` };
    }

    const isActiveVal = data.isActive !== false ? 1 : 0;
    const maxDiscount = data.maxDiscountAmount != null && data.maxDiscountAmount > 0 ? Number(data.maxDiscountAmount) : null;

    const result = db.prepare(`
      INSERT INTO promotions (code, name, discount_type, discount_value, min_order_amount, is_active, max_discount_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      cleanCode,
      data.name.trim(),
      data.discountType,
      data.discountValue,
      data.minOrderAmount || 0,
      isActiveVal,
      maxDiscount
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
    };

    return { success: true, promotion: newPromotion, message: "Tạo mã khuyến mãi thành công" };
  } catch (error: any) {
    console.error("Lỗi tạo khuyến mãi trong SQLite:", error);
    return { success: false, message: error.message || "Lỗi tạo khuyến mãi trong SQLite" };
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
  }>
): { success: boolean; promotion?: Promotion; message?: string } {
  try {
    checkAndAutoSyncSqlite();
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
    const discountType = data.discountType !== undefined ? data.discountType : existing.discount_type;
    const discountValue = data.discountValue !== undefined ? Number(data.discountValue) : Number(existing.discount_value);
    const minOrderAmount = data.minOrderAmount !== undefined ? Number(data.minOrderAmount) : Number(existing.min_order_amount);
    const isActiveVal = data.isActive !== undefined ? (data.isActive ? 1 : 0) : existing.is_active;
    const maxDiscountAmount = data.maxDiscountAmount !== undefined ? (data.maxDiscountAmount != null && data.maxDiscountAmount > 0 ? Number(data.maxDiscountAmount) : null) : existing.max_discount_amount;

    db.prepare(`
      UPDATE promotions
      SET code = ?, name = ?, discount_type = ?, discount_value = ?, min_order_amount = ?, is_active = ?, max_discount_amount = ?
      WHERE id = ?
    `).run(code, name, discountType, discountValue, minOrderAmount, isActiveVal, maxDiscountAmount, id);

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
    };

    return { success: true, promotion: updated, message: "Cập nhật mã khuyến mãi thành công" };
  } catch (error: any) {
    console.error("Lỗi cập nhật khuyến mãi trong SQLite:", error);
    return { success: false, message: error.message || "Lỗi cập nhật khuyến mãi trong SQLite" };
  }
}

/**
 * Bật / tắt trạng thái kích hoạt của mã khuyến mãi
 */
export function togglePromotionInSqlite(id: number): { success: boolean; promotion?: Promotion; message?: string } {
  try {
    checkAndAutoSyncSqlite();
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
      promotion: {
        id: existing.id,
        code: existing.code,
        name: existing.name,
        discountType: existing.discount_type,
        discountValue: Number(existing.discount_value),
        minOrderAmount: Number(existing.min_order_amount),
        isActive: newStatus === 1,
        maxDiscountAmount: existing.max_discount_amount != null ? Number(existing.max_discount_amount) : null,
      },
    };
  } catch (error: any) {
    console.error("Lỗi chuyển đổi trạng thái khuyến mãi:", error);
    return { success: false, message: error.message || "Lỗi chuyển đổi trạng thái" };
  }
}

/**
 * Xóa vĩnh viễn mã khuyến mãi
 */
export function deletePromotionInSqlite(id: number): { success: boolean; message?: string } {
  try {
    checkAndAutoSyncSqlite();
    const db = getSqliteDb();
    const result = db.prepare("DELETE FROM promotions WHERE id = ?").run(id);
    syncMirrorFile();
    if (result.changes > 0) {
      return { success: true, message: "Đã xóa mã khuyến mãi thành công" };
    }
    return { success: false, message: "Không tìm thấy mã khuyến mãi để xóa" };
  } catch (error: any) {
    console.error("Lỗi xóa khuyến mãi trong SQLite:", error);
    return { success: false, message: error.message || "Lỗi xóa mã khuyến mãi" };
  }
}

/**
 * Tính toán mức giảm giá chính xác của voucher dựa trên giá trị đơn hàng và phí ship
 */
export function calculatePromotionDiscount(
  promotion: Promotion,
  subtotalAmount: number,
  deliveryFee: number = 0
): { valid: boolean; discountAmount: number; message?: string } {
  if (!promotion.isActive) {
    return { valid: false, discountAmount: 0, message: `Mã "${promotion.code}" hiện đang tạm ngưng áp dụng.` };
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
  if (promotion.discountType === "PERCENTAGE") {
    discount = Math.round(subtotalAmount * (promotion.discountValue / 100));
    if (promotion.maxDiscountAmount && promotion.maxDiscountAmount > 0) {
      discount = Math.min(discount, promotion.maxDiscountAmount);
    }
  } else {
    // FIXED
    // Trường hợp đặc biệt nếu là FREESHIP: giảm tối đa bằng phí ship hiện tại
    if (promotion.code.toUpperCase() === "FREESHIP") {
      discount = deliveryFee > 0 ? Math.min(deliveryFee, promotion.discountValue) : promotion.discountValue;
    } else {
      discount = promotion.discountValue;
    }
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

/**
 * Xuất toàn bộ 16 bảng của hệ thống Cà Xòi Coffee ra đối tượng JSON đầy đủ
 */
export function exportFullDatabaseToJson(): any {
  checkAndAutoSyncSqlite();
  const db = getSqliteDb();

  const tables = [
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
  ];

  const exportData: Record<string, any[]> = {};
  for (const tbl of tables) {
    try {
      exportData[tbl] = db.prepare(`SELECT * FROM "${tbl}"`).all();
    } catch {
      exportData[tbl] = [];
    }
  }

  return {
    version: "1.0",
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
 * Nhập dữ liệu từ tệp JSON vào SQLite
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

    const fullTables = [
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
    ];

    const targetTables = mode === "MENU_ONLY" ? menuTables : fullTables;

    const db = getSqliteDb();

    // Thực thi trong Transaction với foreign_keys tạm tắt để tránh lỗi ràng buộc thứ tự
    db.pragma("foreign_keys = OFF");

    const stats: Record<string, number> = {};

    const runImport = db.transaction(() => {
      for (const tbl of targetTables) {
        const rows = tablesData[tbl];
        if (Array.isArray(rows)) {
          // Xóa dữ liệu cũ của bảng này
          db.prepare(`DELETE FROM "${tbl}"`).run();

          if (rows.length > 0) {
            // Lấy danh sách cột từ hàng đầu tiên
            const sample = rows[0];
            const columns = Object.keys(sample);
            const placeholders = columns.map(() => "?").join(", ");
            const colNames = columns.map((c) => `"${c}"`).join(", ");
            const insertStmt = db.prepare(
              `INSERT INTO "${tbl}" (${colNames}) VALUES (${placeholders})`
            );

            for (const r of rows) {
              const values = columns.map((c) => (r[c] !== undefined ? r[c] : null));
              insertStmt.run(...values);
            }
          }
          stats[tbl] = rows.length;
        }
      }
    });

    runImport();

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
    return { success: false, message: "Lỗi khôi phục dữ liệu: " + error.message };
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
    const cleanLabel = label ? `_${label.replace(/[^a-zA-Z0-9_-]/g, "")}` : "";
    const filename = `caxoi_backup_${ts}${cleanLabel}.db`;
    const targetPath = path.join(BACKUPS_DIR, filename);

    // Online backup an toàn của better-sqlite3
    await db.backup(targetPath);

    // Tạo thêm bản sao JSON đồng hành để có thể đọc/xem trực quan
    const jsonFilename = `caxoi_backup_${ts}${cleanLabel}.json`;
    const jsonPath = path.join(BACKUPS_DIR, jsonFilename);
    const fullJson = exportFullDatabaseToJson();
    fs.writeFileSync(jsonPath, JSON.stringify(fullJson, null, 2), "utf-8");

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
      message: "Lỗi tạo bản sao lưu: " + error.message,
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
 * Xóa một bản sao lưu khỏi database/backups/
 */
export function deleteBackupSnapshot(filename: string): { success: boolean; message: string } {
  try {
    const safeName = path.basename(filename);
    const target = path.join(BACKUPS_DIR, safeName);
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
      return { success: true, message: `Đã xóa bản sao lưu ${safeName} thành công!` };
    }
    return { success: false, message: "Không tìm thấy file sao lưu cần xóa" };
  } catch (error: any) {
    return { success: false, message: "Lỗi xóa bản sao lưu: " + error.message };
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
    const safeName = path.basename(filename);
    const sourcePath = path.join(BACKUPS_DIR, safeName);

    if (!fs.existsSync(sourcePath)) {
      return { success: false, message: "Không tìm thấy file sao lưu trên hệ thống" };
    }

    // 1. Tự động chụp bản pre-backup trước khi khôi phục
    await createDatabaseBackupSnapshot("pre_restore");

    // 2. Nếu file là JSON
    if (safeName.endsWith(".json")) {
      const content = fs.readFileSync(sourcePath, "utf-8");
      const parsed = JSON.parse(content);
      return importFullDatabaseFromJson(parsed, mode);
    }

    // 3. Nếu file là SQL
    if (safeName.endsWith(".sql")) {
      const sqlContent = fs.readFileSync(sourcePath, "utf-8");
      const db = getSqliteDb();
      db.exec(sqlContent);
      db.pragma("wal_checkpoint(TRUNCATE)");
      syncMirrorFile();
      return { success: true, message: `Đã khôi phục CSDL từ script ${safeName} thành công!` };
    }

    // 4. Nếu file là .db / .sqlite
    reloadSqliteDb(); // Đóng kết nối
    if (dbInstance) {
      try {
        (dbInstance as any).close();
      } catch {}
      dbInstance = null;
    }

    fs.copyFileSync(sourcePath, PRIMARY_DB_FILE);
    fs.copyFileSync(sourcePath, MIRROR_DB_FILE);

    // Xóa WAL và SHM cũ nếu có
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
    return { success: false, message: "Lỗi khôi phục: " + error.message };
  }
}

/**
 * Khôi phục CSDL từ Buffer tệp tin được tải lên qua Web
 */
export async function restoreDatabaseFromUploadedBuffer(
  buffer: Buffer,
  originalFilename: string,
  mode: "FULL" | "MENU_ONLY" = "FULL"
): Promise<{ success: boolean; message: string; stats?: any }> {
  try {
    const lowerName = originalFilename.toLowerCase();

    // 1. Luôn tự động tạo bản sao lưu dự phòng trước khi can thiệp
    await createDatabaseBackupSnapshot("pre_restore");

    // Lưu một bản sao của file vừa tải lên vào database/backups/
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const uploadedSaveName = `uploaded_${Date.now()}_${path.basename(originalFilename)}`;
    fs.writeFileSync(path.join(BACKUPS_DIR, uploadedSaveName), buffer);

    // 2. Xử lý file JSON
    if (lowerName.endsWith(".json")) {
      const jsonStr = buffer.toString("utf-8");
      let parsed: any;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        return { success: false, message: "Tệp tải lên không phải là định dạng JSON hợp lệ" };
      }
      return importFullDatabaseFromJson(parsed, mode);
    }

    // 3. Xử lý file SQL
    if (lowerName.endsWith(".sql")) {
      const sqlStr = buffer.toString("utf-8");
      const db = getSqliteDb();
      db.exec(sqlStr);
      db.pragma("wal_checkpoint(TRUNCATE)");
      syncMirrorFile();
      return { success: true, message: `Đã thực thi thành công tệp lệnh SQL "${originalFilename}" vào CSDL!` };
    }

    // 4. Xử lý file .db hoặc .sqlite
    if (lowerName.endsWith(".db") || lowerName.endsWith(".sqlite")) {
      if (dbInstance) {
        try {
          (dbInstance as any).close();
        } catch {}
        dbInstance = null;
      }

      fs.writeFileSync(PRIMARY_DB_FILE, buffer);
      fs.writeFileSync(MIRROR_DB_FILE, buffer);

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
        message: `Đã khôi phục hoàn chỉnh tệp CSDL SQLite "${originalFilename}"! Tất cả dữ liệu đã được cập nhật.`,
      };
    }

    return {
      success: false,
      message: "Định dạng file không được hỗ trợ. Vui lòng tải lên file .db, .sqlite, .json hoặc .sql.",
    };
  } catch (error: any) {
    console.error("Lỗi khôi phục tệp tải lên:", error);
    return { success: false, message: "Lỗi trong quá trình khôi phục: " + error.message };
  }
}
