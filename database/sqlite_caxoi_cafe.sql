-- ============================================================================
-- SQLITE DATABASE SCHEMA & SEED FOR QUÁN CÀ XÒI (ĐÀ NẴNG)
-- File: database/sqlite_caxoi_cafe.sql
-- Optimized for: DB Browser for SQLite (https://sqlitebrowser.org)
-- Features: 100% Real SQL Queries, WAL Mode, Foreign Keys, Vietnamese UTF-8
-- ============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- ----------------------------------------------------------------------------
-- DỌN DẸP BẢNG CŨ THEO THỨ TỰ KHÓA NGOẠI
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS group_session_items;
DROP TABLE IF EXISTS group_sessions;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS product_option_values;
DROP TABLE IF EXISTS product_options;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS business_settings;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS promotions;

-- ----------------------------------------------------------------------------
-- 1. BẢNG PHÂN QUYỀN (ROLES)
-- ----------------------------------------------------------------------------
CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

INSERT INTO roles (id, name, description) VALUES
(1, 'SUPER_ADMIN', 'Chủ quán - Toàn quyền quản trị hệ thống, thực đơn, doanh thu và cấu hình máy chủ'),
(2, 'STORE_MANAGER', 'Quản lý cửa hàng - Điều phối quán, cập nhật thực đơn, duyệt khuyến mãi và giờ mở cửa'),
(3, 'BARISTA', 'Nhân viên pha chế - Màn hình KDS nhận đơn, cập nhật tiến độ pha chế và in tem dán ly'),
(4, 'CASHIER', 'Thu ngân - Kiểm tra hóa đơn, đối soát và hỗ trợ xác nhận thanh toán');

-- ----------------------------------------------------------------------------
-- 2. BẢNG DANH MỤC QUYỀN HẠN (PERMISSIONS)
-- ----------------------------------------------------------------------------
CREATE TABLE permissions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT
);

INSERT INTO permissions (id, code, name, category, description) VALUES
('p_orders_view', 'orders.view', 'Xem đơn hàng', 'ORDERS', 'Xem chi tiết đơn hàng cá nhân, đơn tòa nhà và đơn nhóm'),
('p_orders_status', 'orders.update_status', 'Cập nhật tiến độ pha chế', 'ORDERS', 'Đổi trạng thái đơn: Chờ pha -> Đang pha -> Sẵn sàng -> Hoàn tất'),
('p_orders_print', 'orders.print', 'In tem ly & Hóa đơn', 'ORDERS', 'Gửi lệnh in tem dán ly 50x30mm và hóa đơn thanh toán'),
('p_orders_cancel', 'orders.cancel', 'Hủy đơn hàng', 'ORDERS', 'Hủy đơn hàng khi khách yêu cầu hoặc quầy gặp sự cố'),
('p_menu_view', 'menu.view', 'Xem thực đơn', 'MENU', 'Xem danh mục, sản phẩm, kích cỡ và bảng giá'),
('p_menu_toggle', 'menu.toggle_availability', 'Bật/Tắt còn hàng', 'MENU', 'Gạt nút khóa món tức thì khi hết nguyên liệu'),
('p_menu_pricing', 'menu.edit_pricing', 'Sửa giá & Tạo món', 'MENU', 'Thêm món mới, điều chỉnh giá bán và kích cỡ'),
('p_promotions_view', 'promotions.view', 'Xem mã giảm giá', 'PROMOTIONS', 'Xem danh sách mã khuyến mãi đang áp dụng'),
('p_promotions_manage', 'promotions.manage', 'Quản lý Voucher', 'PROMOTIONS', 'Tạo voucher mới, chỉnh sửa tỷ lệ chiết khấu và hạn mức'),
('p_finance_revenue', 'finance.view_revenue', 'Xem doanh thu', 'FINANCE', 'Xem số liệu doanh thu thực tế, tiền hàng theo ngày/tuần/tháng'),
('p_finance_analytics', 'finance.view_analytics', 'Biểu đồ giờ cao điểm', 'FINANCE', 'Xem phân bổ đơn theo khung giờ để tối ưu ca làm việc'),
('p_system_pause', 'system.emergency_pause', 'Tạm dừng nhận đơn cao điểm', 'SYSTEM', 'Nút khẩn cấp đóng nhận đơn trực tuyến khi quán quá tải'),
('p_system_settings', 'system.settings', 'Cấu hình ngân hàng & Vận hành', 'SYSTEM', 'Cấu hình tài khoản VietQR, phí giao hàng, giờ mở cửa'),
('p_system_roles', 'system.manage_roles', 'Quản lý Phân quyền & Nhân viên', 'SYSTEM', 'Cấp phát quyền hạn, cấp mã PIN và tài khoản nhân viên');

-- ----------------------------------------------------------------------------
-- 3. BẢNG LIÊN KẾT VAI TRÒ - QUYỀN HẠN (ROLE_PERMISSIONS)
-- ----------------------------------------------------------------------------
CREATE TABLE role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL,
    permission_code TEXT NOT NULL,
    UNIQUE(role_name, permission_code)
);

-- Cấp quyền mặc định cho SUPER_ADMIN (Toàn quyền)
INSERT INTO role_permissions (role_name, permission_code) VALUES
('SUPER_ADMIN', 'orders.view'),
('SUPER_ADMIN', 'orders.update_status'),
('SUPER_ADMIN', 'orders.print'),
('SUPER_ADMIN', 'orders.cancel'),
('SUPER_ADMIN', 'menu.view'),
('SUPER_ADMIN', 'menu.toggle_availability'),
('SUPER_ADMIN', 'menu.edit_pricing'),
('SUPER_ADMIN', 'promotions.view'),
('SUPER_ADMIN', 'promotions.manage'),
('SUPER_ADMIN', 'finance.view_revenue'),
('SUPER_ADMIN', 'finance.view_analytics'),
('SUPER_ADMIN', 'system.emergency_pause'),
('SUPER_ADMIN', 'system.settings'),
('SUPER_ADMIN', 'system.manage_roles');

-- Cấp quyền STORE_MANAGER (Quản lý cửa hàng)
INSERT INTO role_permissions (role_name, permission_code) VALUES
('STORE_MANAGER', 'orders.view'),
('STORE_MANAGER', 'orders.update_status'),
('STORE_MANAGER', 'orders.print'),
('STORE_MANAGER', 'orders.cancel'),
('STORE_MANAGER', 'menu.view'),
('STORE_MANAGER', 'menu.toggle_availability'),
('STORE_MANAGER', 'promotions.view'),
('STORE_MANAGER', 'finance.view_revenue'),
('STORE_MANAGER', 'finance.view_analytics'),
('STORE_MANAGER', 'system.emergency_pause');

-- Cấp quyền BARISTA (Pha chế)
INSERT INTO role_permissions (role_name, permission_code) VALUES
('BARISTA', 'orders.view'),
('BARISTA', 'orders.update_status'),
('BARISTA', 'orders.print'),
('BARISTA', 'menu.view');

-- Cấp quyền CASHIER (Thu ngân)
INSERT INTO role_permissions (role_name, permission_code) VALUES
('CASHIER', 'orders.view'),
('CASHIER', 'orders.update_status'),
('CASHIER', 'orders.print'),
('CASHIER', 'menu.view'),
('CASHIER', 'promotions.view');

-- ----------------------------------------------------------------------------
-- 4. BẢNG TÀI KHOẢN NHÂN VIÊN (USERS)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    plain_password TEXT,
    pin TEXT,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    role_id INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

INSERT INTO users (id, username, password_hash, plain_password, pin, full_name, phone, email, role_id, is_active) VALUES
('a0000000-0000-0000-0000-000000000001', 'admin', '$2b$10$w82Qf0L1.Q4U3iA9gGgqveJqfQv8eXnFh/jK9GzJ6d0S/6hB3F7iO', 'Admin@123456', '9999', 'Quản Trị Viên (Chủ Quán)', '0905249733', NULL, 1, 1),
('a0000000-0000-0000-0000-000000000002', 'manager', '$2b$10$w82Qf0L1.Q4U3iA9gGgqveJqfQv8eXnFh/jK9GzJ6d0S/6hB3F7iO', 'Manager@123', '2048', 'Quản Lý Cửa Hàng', '0905112233', NULL, 2, 1),
('a0000000-0000-0000-0000-000000000003', 'barista1', '$2b$10$w82Qf0L1.Q4U3iA9gGgqveJqfQv8eXnFh/jK9GzJ6d0S/6hB3F7iO', 'Barista@123', '8823', 'Nguyễn Văn Barista', '0905667788', NULL, 3, 1),
('a0000000-0000-0000-0000-000000000004', 'cashier1', '$2b$10$w82Qf0L1.Q4U3iA9gGgqveJqfQv8eXnFh/jK9GzJ6d0S/6hB3F7iO', 'Cashier@123', '6688', 'Trần Thu Ngân', '0905889900', NULL, 4, 1);

-- ----------------------------------------------------------------------------
-- 5. BẢNG DANH MỤC SẢN PHẨM (CATEGORIES)
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1
);

INSERT INTO categories (id, name, slug, description, image_url, display_order, is_active) VALUES
(1, 'Cà Hê Truyền Thống & Chai Rót', 'ca-he-truyen-thong', 'Cà phê Robusta đậm vị, có sẵn Ly uống liền hoặc Chai 100ml & 250ml tiện lợi', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80', 1, 1),
(2, 'Dòng Kem Trứng Muối & Kem Muối Xứ Huế', 'dong-kem-trung-muoi', 'Signature Cà Xòi: Kem trứng muối vàng óng béo ngậy & Kem muối xứ Huế sánh mịn', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80', 2, 1);

-- ----------------------------------------------------------------------------
-- 6. BẢNG SẢN PHẨM (PRODUCTS - 5 MÓN CHUẨN MENU CÀ XÒI)
-- ----------------------------------------------------------------------------
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    base_price REAL NOT NULL,
    sale_price REAL,
    is_available INTEGER NOT NULL DEFAULT 1,
    is_featured INTEGER NOT NULL DEFAULT 1,
    prep_time_minutes INTEGER NOT NULL DEFAULT 4,
    tags TEXT DEFAULT 'BEST_SELLER',
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

INSERT INTO products (id, category_id, name, slug, description, image_url, base_price, sale_price, is_available, is_featured, prep_time_minutes, tags) VALUES
('p1', 1, 'Cà hê đen', 'ca-he-den', 'Cà phê đen phin Robusta Đắk Lắk đậm đà nguyên bản, vị đắng dịu hậu ngọt sâu chuẩn gu Cà Xòi', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80', 13000, NULL, 1, 1, 3, 'BEST_SELLER,SIGNATURE'),
('p2', 1, 'Cà hê sữa', 'ca-he-sua', 'Cà phê phin đậm đà hòa quyện cùng sữa đặc ngọt béo thơm lừng truyền thống, uống là mê mẩn', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80', 16000, NULL, 1, 1, 4, 'BEST_SELLER,SIGNATURE'),
('p3', 1, 'Bạc xĩuuuu', 'bac-xiuuuu', 'Nhiều sữa đặc ngọt béo ngậy, sữa tươi thanh trùng thơm mát kết hợp lớp cốt cà phê phin sánh mịn nhẹ nhàng', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80', 19000, NULL, 1, 1, 4, 'POPULAR,OFFICE_FAVORITE'),
('p4', 2, 'Cà hê múi huệ', 'ca-he-mui-hue', 'Cà phê phin đậm đà phủ lớp kem muối xứ Huế béo ngậy mằn mặn đặc trưng, công thức độc quyền Cà Xòi', 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=600&auto=format&fit=crop&q=80', 23000, NULL, 1, 1, 5, 'SIGNATURE,MUST_TRY'),
('p5', 2, 'Cà hê trứng múi', 'ca-he-trung-mui', 'Siêu phẩm trứ danh Quán Cà Xòi: Cốt cà phê đậm sóng sánh phủ đầy lớp kem trứng muối vàng óng béo ngậy ngất ngây', 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80', 25000, NULL, 1, 1, 5, 'HOT_TREND,SIGNATURE,BEST_SELLER');

-- ----------------------------------------------------------------------------
-- 7. BẢNG QUY CÁCH ĐÓNG GÓI / KÍCH CỠ (VARIANTS: Ly, 100ml, 250ml)
-- ----------------------------------------------------------------------------
CREATE TABLE product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL,
    size_name TEXT NOT NULL,
    extra_price REAL NOT NULL DEFAULT 0,
    is_default INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

INSERT INTO product_variants (product_id, size_name, extra_price, is_default) VALUES
-- Cà hê đen (Ly: 13k, 100ml: 25k (+12k), 250ml: 50k (+37k))
('p1', 'Ly', 0, 1),
('p1', '100ml', 12000, 0),
('p1', '250ml', 37000, 0),
-- Cà hê sữa (Ly: 16k, 100ml: 25k (+9k), 250ml: 52k (+36k))
('p2', 'Ly', 0, 1),
('p2', '100ml', 9000, 0),
('p2', '250ml', 36000, 0),
-- Bạc xĩuuuu (Ly: 19k, 100ml: 26k (+7k), 250ml: 47k (+28k))
('p3', 'Ly', 0, 1),
('p3', '100ml', 7000, 0),
('p3', '250ml', 28000, 0),
-- Cà hê múi huệ (Ly: 23k, 100ml: 27k (+4k), 250ml: 60k (+37k))
('p4', 'Ly', 0, 1),
('p4', '100ml', 4000, 0),
('p4', '250ml', 37000, 0),
-- Cà hê trứng múi (Ly: 25k, 100ml: 31k (+6k), 250ml: 65k (+40k))
('p5', 'Ly', 0, 1),
('p5', '100ml', 6000, 0),
('p5', '250ml', 40000, 0);

-- ----------------------------------------------------------------------------
-- 8. BẢNG TÙY CHỌN (OPTIONS: Mức đường, Mức đá, Topping)
-- ----------------------------------------------------------------------------
CREATE TABLE product_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_required INTEGER NOT NULL DEFAULT 0,
    is_multiple INTEGER NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 1
);

INSERT INTO product_options (id, name, is_required, is_multiple, display_order) VALUES
(1, 'Độ ngọt', 1, 0, 1),
(2, 'Đá', 1, 0, 2),
(3, 'Topping & Thêm kem béo', 0, 1, 3);

CREATE TABLE product_option_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    option_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    extra_price REAL NOT NULL DEFAULT 0,
    is_default INTEGER NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (option_id) REFERENCES product_options(id) ON DELETE CASCADE
);

INSERT INTO product_option_values (id, option_id, name, extra_price, is_default, display_order) VALUES
-- Mức đường
(1, 1, '100% Đường (Chuẩn vị Cà Xòi)', 0, 1, 1),
(2, 1, '70% Đường (Ít ngọt nhẹ)', 0, 0, 2),
(3, 1, '50% Đường (Ngọt vừa)', 0, 0, 3),
(4, 1, '30% Đường (Rất ít ngọt)', 0, 0, 4),
(5, 1, '0% Đường (Không đường)', 0, 0, 5),
-- Mức đá
(6, 2, 'Bình thường (Đầy ly)', 0, 1, 1),
(7, 2, 'Ít đá (Nhiều nước)', 0, 0, 2),
(8, 2, 'Không đá', 0, 0, 3),
(9, 2, 'Túi đá riêng (Dành cho chai rót)', 0, 0, 4),
-- Topping & Kem béo
(10, 3, 'Thêm lớp Kem Trứng Muối béo ngậy', 10000, 0, 1),
(11, 3, 'Thêm lớp Kem Muối Huế mặn mà', 8000, 0, 2),
(12, 3, 'Thêm 1 shot cà phê đậm đặc', 7000, 0, 3);

-- ----------------------------------------------------------------------------
-- 9. BẢNG CẤU HÌNH VẬN HÀNH & VIETQR (BUSINESS_SETTINGS)
-- ----------------------------------------------------------------------------
CREATE TABLE business_settings (
    id INTEGER PRIMARY KEY,
    store_name TEXT NOT NULL,
    store_status TEXT NOT NULL DEFAULT 'OPEN',
    store_status_message TEXT,
    hotline TEXT,
    phone TEXT,
    address TEXT,
    open_time TEXT,
    close_time TEXT,
    base_delivery_fee REAL NOT NULL DEFAULT 15000,
    free_delivery_min_cups INTEGER NOT NULL DEFAULT 3,
    max_slot_capacity_cups INTEGER NOT NULL DEFAULT 30,
    prep_lead_time_minutes INTEGER NOT NULL DEFAULT 5,
    vietqr_bank_id TEXT DEFAULT 'MB',
    vietqr_account_no TEXT DEFAULT '999988886666',
    vietqr_account_name TEXT DEFAULT 'CA XOI CAFE',
    bank_account_no TEXT,
    bank_account_name TEXT,
    bank_bin TEXT,
    bank_name TEXT,
    is_auto_confirm_qr INTEGER NOT NULL DEFAULT 1,
    rush_mode_message TEXT,
    hero_badge_brand TEXT,
    hero_location TEXT,
    hero_eyebrow TEXT,
    hero_headline_primary TEXT,
    hero_headline_highlight TEXT,
    hero_description TEXT,
    hero_service_note TEXT,
    hero_price_badge_1 TEXT,
    hero_price_badge_2 TEXT,
    hero_price_badge_3 TEXT,
    hero_primary_cta_text TEXT,
    hero_secondary_cta_text TEXT,
    hero_watermark_text TEXT,
    hero_logo_url TEXT,
    hero_mascot_title TEXT,
    hero_mascot_subtitle TEXT,
    facebook_url TEXT,
    qr_facebook_title TEXT,
    qr_facebook_subtitle TEXT,
    xanh_sm_url TEXT,
    qr_xanh_sm_title TEXT,
    qr_xanh_sm_subtitle TEXT
);

INSERT INTO business_settings (
    id, store_name, store_status, store_status_message, hotline, phone, address, open_time, close_time,
    base_delivery_fee, free_delivery_min_cups, max_slot_capacity_cups, prep_lead_time_minutes,
    vietqr_bank_id, vietqr_account_no, vietqr_account_name,
    bank_account_no, bank_account_name, bank_bin, bank_name,
    is_auto_confirm_qr, rush_mode_message,
    hero_badge_brand, hero_location, hero_eyebrow, hero_headline_primary, hero_headline_highlight,
    hero_description, hero_service_note, hero_price_badge_1, hero_price_badge_2, hero_price_badge_3,
    hero_primary_cta_text, hero_secondary_cta_text, hero_watermark_text,
    hero_logo_url, hero_mascot_title, hero_mascot_subtitle,
    facebook_url, qr_facebook_title, qr_facebook_subtitle,
    xanh_sm_url, qr_xanh_sm_title, qr_xanh_sm_subtitle
) VALUES (
    1,
    'Cà Xòi - Trạm Cấp Cứu Cơn Buồn Ngủ Công Sở',
    'OPEN',
    'Tỉnh như sáo, báo như Xòi • Giao siêu tốc Hải Châu, Thanh Khê, Ngũ Hành Sơn, Đà Nẵng',
    '0905.249.733',
    '0905249733',
    'Hải Châu, Thanh Khê, Ngũ Hành Sơn, Đà Nẵng',
    '07:00',
    '18:30',
    15000,
    3,
    30,
    5,
    'MB',
    '999988886666',
    'CA XOI CAFE',
    '190367891234',
    'QUAN CA XOI DA NANG',
    '970407',
    'Techcombank (Ngân hàng TMCP Kỹ Thương)',
    1,
    'Quán đang trong khung giờ cao điểm gom đơn văn phòng. Dự kiến giao sau 20-30 phút.',
    '🐾 Quán Cà Xòi',
    'Hải Châu, Thanh Khê, Ngũ Hành Sơn, Đà Nẵng',
    'Trạm cấp cứu cơn buồn ngủ công sở ☕',
    '“Tỉnh như sáo,',
    'báo như Xòi”',
    'Giao siêu tốc Đà Nẵng • Gom đơn cả phòng, Cà Xòi bao giá! Cà phê cốt đậm đà, kem trứng muối, kem muối Huế thơm ngậy. Không sợ đá tan làm nhạt vị khi họp hành dở dang, cứ cất một chai vào túi hoặc tủ lạnh văn phòng, lúc nào "sập nguồn" thì rót ra nhâm nhi ngay.',
    '🛵 Xòi ship hoặc khách ghé lấy để gặp Xòi',
    '🥤 Ly: từ 13.000đ',
    '🧴 Chai 100ml: từ 25.000đ',
    '🍶 Chai 250ml: từ 47.000đ',
    'Gom đơn cả phòng (Cà Xòi bao giá)',
    'Xem Bảng Menu Cà Xòi',
    'CÀ XÒI •',
    '/images/ca-xoi-logo.jpg',
    '🐾 Mèo Xòi & Trái Xoài 🥭',
    'Quán cà phê Internet • Đà Nẵng',
    'https://www.facebook.com/caxoi2022?locale=vi_VN',
    'Facebook Cà Xòi',
    'Quét theo dõi',
    'https://xanhsmngon.onelink.me/14WJ/5hxil4ex',
    'Xòi chạy Xanh SM',
    'Quét đặt giao'
);

-- ----------------------------------------------------------------------------
-- 10. BẢNG TÒA NHÀ ĐỐI TÁC VĂN PHÒNG (COMPANIES)
-- ----------------------------------------------------------------------------
CREATE TABLE companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    building_name TEXT NOT NULL,
    address TEXT NOT NULL,
    is_partner INTEGER NOT NULL DEFAULT 1
);

INSERT INTO companies (id, name, building_name, address, is_partner) VALUES
(1, 'Software Park Đà Nẵng', 'Software Park 1 & 2', '02 Quang Trung, Phường Thạch Thang, Hải Châu, Đà Nẵng', 1),
(2, 'FPT Complex Ngũ Hành Sơn', 'FPT Complex', 'Đường Nam Kỳ Khởi Nghĩa, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng', 1),
(3, 'Tòa nhà VNPT Đà Nẵng', 'VNPT Building', '346 Đường 2 Tháng 9, Hòa Cường Bắc, Hải Châu, Đà Nẵng', 1),
(4, 'Tòa nhà Viettel Đà Nẵng', 'Viettel Complex', '92 Xô Viết Nghệ Tĩnh, Khuê Trung, Cẩm Lệ, Đà Nẵng', 1),
(5, 'Trung tâm Hành chính Đà Nẵng', 'Danang Admin Center', '24 Trần Phú, Thạch Thang, Hải Châu, Đà Nẵng', 1);

-- ----------------------------------------------------------------------------
-- 11. BẢNG MÃ GIẢM GIÁ (PROMOTIONS)
-- ----------------------------------------------------------------------------
CREATE TABLE promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    discount_type TEXT NOT NULL,
    discount_value REAL NOT NULL,
    min_order_amount REAL NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
);

INSERT INTO promotions (id, code, name, discount_type, discount_value, min_order_amount, is_active) VALUES
(1, 'CHAOBANMOI', 'Giảm 20% đơn đầu tiên cho dân văn phòng', 'PERCENTAGE', 20.00, 50000, 1),
(2, 'OFFICE50K', 'Giảm 50.000đ khi gom đơn cả phòng từ 200k', 'FIXED', 50000, 200000, 1),
(3, 'FREESHIP', 'Freeship siêu tốc toàn quận Hải Châu, Thanh Khê', 'FIXED', 15000, 80000, 1);

-- ----------------------------------------------------------------------------
-- 12. BẢNG PHÒNG ĐẶT NHÓM CÔNG SỞ (GROUP_SESSIONS & GROUP_SESSION_ITEMS)
-- ----------------------------------------------------------------------------
CREATE TABLE group_sessions (
    id TEXT PRIMARY KEY,
    session_code TEXT NOT NULL UNIQUE,
    host_name TEXT NOT NULL,
    host_phone TEXT NOT NULL,
    building_name TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN',
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE group_session_items (
    id TEXT PRIMARY KEY,
    session_code TEXT NOT NULL,
    cart_item_id TEXT,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    variant_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    recipient_label TEXT,
    notes TEXT,
    item_payload_json TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (session_code) REFERENCES group_sessions(session_code) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 13. BẢNG ĐƠN HÀNG (ORDERS) & CHI TIẾT ĐƠN (ORDER_ITEMS)
-- ----------------------------------------------------------------------------
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    order_code TEXT NOT NULL UNIQUE,
    order_type TEXT NOT NULL DEFAULT 'OFFICE_DELIVERY',
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    company_name TEXT,
    building_name TEXT,
    floor_room TEXT,
    delivery_address TEXT,
    delivery_notes TEXT,
    scheduled_type TEXT DEFAULT 'ASAP',
    scheduled_time TEXT,
    subtotal_amount REAL NOT NULL,
    discount_amount REAL NOT NULL DEFAULT 0,
    delivery_fee REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    status TEXT NOT NULL,
    promotion_code TEXT,
    group_session_id TEXT,
    barista_notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    variant_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    recipient_label TEXT,
    item_notes TEXT,
    selected_options_json TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

