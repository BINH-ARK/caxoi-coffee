import mysql from "mysql2/promise";
import { Product, Order, Category, BusinessSettings } from "@/types";

export interface DatabaseStatus {
  connected: boolean;
  type: "MYSQL_PHPMYADMIN" | "MEMORY_CACHE";
  host: string;
  port: number;
  user: string;
  database: string;
  message: string;
  tables?: {
    usersCount: number;
    productsCount: number;
    variantsCount: number;
    ordersCount: number;
    categoriesCount: number;
  };
}

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "caxoi_cafe",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 2500, // 2.5s quick timeout so app stays blazing fast if MySQL is offline
};

let pool: mysql.Pool | null = null;
let lastKnownConnectionState: boolean | null = null;
let lastCheckedTime = 0;

export function getMySqlPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
  }
  return pool;
}

/**
 * Kiểm tra trạng thái kết nối tới phpMyAdmin / MySQL
 */
export async function checkMySqlConnection(): Promise<DatabaseStatus> {
  const baseStatus: DatabaseStatus = {
    connected: false,
    type: "MEMORY_CACHE",
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    database: DB_CONFIG.database,
    message: "Chưa kết nối MySQL. Đang hoạt động ở chế độ Bộ Nhớ Đệm Tốc Độ Cao.",
  };

  try {
    const currentPool = getMySqlPool();
    // Quick test ping
    const connection = await currentPool.getConnection();
    
    // Check if tables exist
    let usersCount = 0;
    let productsCount = 0;
    let variantsCount = 0;
    let ordersCount = 0;
    let categoriesCount = 0;

    try {
      const [uRows]: any = await connection.query("SELECT COUNT(*) as cnt FROM users");
      usersCount = uRows[0]?.cnt || 0;
    } catch {}

    try {
      const [pRows]: any = await connection.query("SELECT COUNT(*) as cnt FROM products");
      productsCount = pRows[0]?.cnt || 0;
    } catch {}

    try {
      const [vRows]: any = await connection.query("SELECT COUNT(*) as cnt FROM product_variants");
      variantsCount = vRows[0]?.cnt || 0;
    } catch {}

    try {
      const [oRows]: any = await connection.query("SELECT COUNT(*) as cnt FROM orders");
      ordersCount = oRows[0]?.cnt || 0;
    } catch {}

    try {
      const [cRows]: any = await connection.query("SELECT COUNT(*) as cnt FROM categories");
      categoriesCount = cRows[0]?.cnt || 0;
    } catch {}

    connection.release();

    lastKnownConnectionState = true;
    lastCheckedTime = Date.now();

    return {
      connected: true,
      type: "MYSQL_PHPMYADMIN",
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      database: DB_CONFIG.database,
      message: `Đã kết nối thành công tới phpMyAdmin / MySQL [${DB_CONFIG.database}@${DB_CONFIG.host}:${DB_CONFIG.port}]`,
      tables: {
        usersCount,
        productsCount,
        variantsCount,
        ordersCount,
        categoriesCount,
      },
    };
  } catch (err: any) {
    lastKnownConnectionState = false;
    lastCheckedTime = Date.now();
    baseStatus.message = `Không thể kết nối MySQL (${err.code || err.message}). Hãy kiểm tra XAMPP/Laragon và mở phpMyAdmin.`;
    return baseStatus;
  }
}

/**
 * Đọc danh sách sản phẩm từ MySQL nếu có kết nối
 */
export async function getProductsFromMySql(): Promise<Product[] | null> {
  try {
    const pool = getMySqlPool();
    const [rows]: any = await pool.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      ORDER BY p.id ASC
    `);

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const [variantsRows]: any = await pool.query(`
      SELECT * FROM product_variants ORDER BY id ASC
    `);

    const products: Product[] = rows.map((r: any) => {
      const pVariants = (variantsRows || [])
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
        try {
          tags = typeof r.tags === "string" ? r.tags.split(",") : r.tags;
        } catch {}
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

    return products;
  } catch (error) {
    // Graceful fallback to null so store handles it
    return null;
  }
}

/**
 * Cập nhật trạng thái sản phẩm vào MySQL
 */
export async function updateProductInMySql(product: Product): Promise<boolean> {
  try {
    const pool = getMySqlPool();
    await pool.query(
      `UPDATE products 
       SET name = ?, description = ?, base_price = ?, sale_price = ?, is_available = ?, is_featured = ?
       WHERE id = ?`,
      [
        product.name,
        product.description,
        product.basePrice,
        product.salePrice,
        product.isAvailable ? 1 : 0,
        product.isFeatured ? 1 : 0,
        product.id,
      ]
    );

    // Update variants if provided: xóa cũ và thêm lại danh sách mới để hỗ trợ khi xóa size
    if (product.variants && product.variants.length > 0) {
      await pool.query("DELETE FROM product_variants WHERE product_id = ?", [product.id]);
      for (const variant of product.variants) {
        await pool.query(
          `INSERT INTO product_variants (product_id, size_name, extra_price, is_default)
           VALUES (?, ?, ?, ?)`,
          [product.id, variant.sizeName.trim(), Number(variant.extraPrice) || 0, variant.isDefault ? 1 : 0]
        );
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Cập nhật bật/tắt còn hàng tức thì vào MySQL
 */
export async function toggleProductAvailabilityInMySql(productId: string, isAvailable: boolean): Promise<boolean> {
  try {
    const pool = getMySqlPool();
    await pool.query("UPDATE products SET is_available = ? WHERE id = ?", [isAvailable ? 1 : 0, productId]);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Lưu đơn hàng mới vào MySQL
 */
export async function saveOrderToMySql(order: Order): Promise<boolean> {
  try {
    const pool = getMySqlPool();
    await pool.query(
      `INSERT INTO orders 
       (id, order_type, recipient_name, recipient_phone, delivery_address, floor_room, company_name, delivery_notes,
        scheduled_type, subtotal_amount, discount_amount, delivery_fee, total_amount, payment_method, payment_status,
        status, promotion_code, barista_notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        order.orderType,
        order.recipientName,
        order.recipientPhone,
        order.deliveryAddress || "",
        order.floorRoom || "",
        order.companyName || "",
        order.deliveryNotes || "",
        order.scheduledType || "ASAP",
        order.subtotalAmount,
        order.discountAmount || 0,
        order.deliveryFee || 0,
        order.totalAmount,
        order.paymentMethod,
        order.paymentStatus,
        order.status,
        order.promotionCode || null,
        order.baristaNotes || "",
        new Date(order.createdAt),
        new Date(order.updatedAt),
      ]
    );

    // Insert order items
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        await pool.query(
          `INSERT INTO order_items
           (id, order_id, product_id, product_name, variant_name, quantity, unit_price, total_price, recipient_label, selected_options_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            order.id,
            item.productId,
            item.productName,
            item.variantName,
            item.quantity,
            item.unitPrice,
            item.totalPrice,
            item.recipientLabel || "",
            JSON.stringify(item.options || []),
          ]
        );
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Cập nhật trạng thái đơn hàng trong MySQL
 */
export async function updateOrderStatusInMySql(orderId: string, status: string): Promise<boolean> {
  try {
    const pool = getMySqlPool();
    await pool.query("UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?", [status, orderId]);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Xác thực tài khoản nhân viên từ bảng users trong MySQL
 */
export async function findUserInMySql(usernameOrPin: string, isPin = false): Promise<any | null> {
  try {
    const pool = getMySqlPool();
    let query = "";
    let params: any[] = [];

    if (isPin) {
      query = `
        SELECT u.*, r.name as role_name 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.pin = ? AND u.is_active = 1 
        LIMIT 1
      `;
      params = [usernameOrPin];
    } else {
      query = `
        SELECT u.*, r.name as role_name 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE LOWER(u.username) = LOWER(?) AND u.is_active = 1 
        LIMIT 1
      `;
      params = [usernameOrPin];
    }

    const [rows]: any = await pool.query(query, params);
    if (Array.isArray(rows) && rows.length > 0) {
      const user = rows[0];
      return {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role_name,
        plainPassword: user.plain_password,
        pin: user.pin,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}
