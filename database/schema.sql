-- ============================================================================
-- ONLINE CAFÉ ORDERING & OFFICE DELIVERY PLATFORM
-- DATABASE SCHEMA SPECIFICATION (PostgreSQL 16+)
-- ============================================================================

-- 0. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up if exists (for migration/fresh init)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS business_settings CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS slot_capacities CASCADE;
DROP TABLE IF EXISTS group_session_items CASCADE;
DROP TABLE IF EXISTS group_sessions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_status_history CASCADE;
DROP TABLE IF EXISTS order_item_options CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_option_values CASCADE;
DROP TABLE IF EXISTS product_options CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ============================================================================
-- 1. AUTHENTICATION & ACCESS CONTROL (RBAC)
-- ============================================================================

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'SUPER_ADMIN', 'STORE_MANAGER', 'BARISTA', 'CASHIER'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g. 'orders.view', 'orders.update_status', 'menu.manage', 'reports.view'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    role_id INT NOT NULL REFERENCES roles(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role_id ON users(role_id);

-- ============================================================================
-- 2. CUSTOMERS, COMPANIES & OFFICE DELIVERY ADDRESSES
-- ============================================================================

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    tax_code VARCHAR(30),
    preferred_building VARCHAR(150),
    is_corporate_partner BOOLEAN DEFAULT FALSE,
    discount_rate DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(15) NOT NULL UNIQUE,
    full_name VARCHAR(100),
    email VARCHAR(100),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    total_spent DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_orders INT NOT NULL DEFAULT 0,
    loyalty_points INT NOT NULL DEFAULT 0,
    membership_tier VARCHAR(20) NOT NULL DEFAULT 'BRONZE', -- 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'
    last_order_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_membership_tier ON customers(membership_tier);

CREATE TABLE customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    building_name VARCHAR(150) NOT NULL, -- Tòa nhà: Keangnam, Landmark 81, Bitexco, Viettel Complex...
    floor_room VARCHAR(100) NOT NULL,    -- Tầng & Phòng: Tầng 12, P.1205
    company_name VARCHAR(150),           -- Tên công ty
    address_detail VARCHAR(255),         -- Địa chỉ đường phố
    delivery_notes TEXT,                 -- Ghi chú nhận: Gửi sảnh lễ tân, gọi trước 5p
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);

-- ============================================================================
-- 3. MENU, CATEGORIES, PRODUCTS & MODIFIERS (TOPPINGS, OPTIONS)
-- ============================================================================

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(255),
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_display_order ON categories(display_order);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(170) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(255),
    base_price DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
    sale_price DECIMAL(10, 2) CHECK (sale_price IS NULL OR sale_price >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    prep_time_minutes INT NOT NULL DEFAULT 5,
    tags TEXT[], -- ['BEST_SELLER', 'NEW', 'OFFICE_COMBO', 'SIGNATURE']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_is_available ON products(is_available);

CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size_name VARCHAR(20) NOT NULL, -- 'S' (Nhỏ), 'M' (Tiêu chuẩn), 'L' (Lớn)
    extra_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (extra_price >= 0),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_product_size UNIQUE (product_id, size_name)
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);

CREATE TABLE product_options (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- 'Mức đường', 'Mức đá', 'Loại sữa', 'Topping'
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_multiple BOOLEAN NOT NULL DEFAULT FALSE, -- FALSE: Chọn 1 (radio); TRUE: Chọn nhiều (checkbox)
    display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE product_option_values (
    id SERIAL PRIMARY KEY,
    option_id INT NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- '100% Đường', '50% Đường', 'Trân châu trắng', 'Sữa yến mạch Oatside'
    extra_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (extra_price >= 0),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_product_option_values_option_id ON product_option_values(option_id);

-- ============================================================================
-- 4. CAPACITY THROTTLING (QUẢN LÝ TẢI QUẦY BAR THEO KHUNG GIỜ)
-- ============================================================================

CREATE TABLE slot_capacities (
    id SERIAL PRIMARY KEY,
    slot_date DATE NOT NULL,
    time_start TIME NOT NULL, -- e.g. 08:00:00
    time_end TIME NOT NULL,   -- e.g. 08:15:00
    max_cups INT NOT NULL DEFAULT 30, -- Tối đa số ly quán có thể làm trong slot này
    booked_cups INT NOT NULL DEFAULT 0,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE, -- Quản lý bấm chặn thủ công nếu có sự cố
    CONSTRAINT uq_slot UNIQUE (slot_date, time_start)
);

CREATE INDEX idx_slot_capacities_lookup ON slot_capacities(slot_date, time_start);

-- ============================================================================
-- 5. GROUP ORDER SESSIONS (ĐẶT HÀNG NHÓM CHO PHÒNG BAN)
-- ============================================================================

CREATE TABLE group_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code VARCHAR(12) NOT NULL UNIQUE, -- e.g. 'GRP-7892'
    host_name VARCHAR(100) NOT NULL,
    host_phone VARCHAR(15) NOT NULL,
    building_name VARCHAR(150),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'LOCKED', 'ORDERED', 'EXPIRED'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_group_sessions_code ON group_sessions(session_code);

-- ============================================================================
-- 6. PROMOTIONS & VOUCHERS
-- ============================================================================

CREATE TABLE promotions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    description VARCHAR(255),
    discount_type VARCHAR(20) NOT NULL, -- 'PERCENT', 'FIXED_AMOUNT', 'FREE_SHIP'
    discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
    min_order_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    max_discount_amount DECIMAL(10, 2), -- Giảm tối đa nếu là percent
    usage_limit INT, -- Số lượt dùng tối đa
    used_count INT NOT NULL DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_promotions_code ON promotions(code);

-- ============================================================================
-- 7. ORDERS, ITEMS, OPTIONS & HISTORY
-- ============================================================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(25) NOT NULL UNIQUE, -- e.g. 'CF261104-001'
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    group_session_id UUID REFERENCES group_sessions(id) ON DELETE SET NULL,
    order_type VARCHAR(20) NOT NULL, -- 'TAKEAWAY', 'OFFICE_DELIVERY', 'GROUP_ORDER'
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT',
    -- Status Enum: 'PENDING_PAYMENT', 'CONFIRMED', 'BREWING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED'
    payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID', -- 'UNPAID', 'PAID', 'REFUNDED'
    payment_method VARCHAR(20) NOT NULL, -- 'COD', 'VIETQR_BANKING', 'EWALLET'
    
    -- Recipient & Office Info
    recipient_name VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(15) NOT NULL,
    company_name VARCHAR(150),
    building_name VARCHAR(150),
    floor_room VARCHAR(100),
    delivery_address VARCHAR(255),
    delivery_notes TEXT,
    
    -- Scheduling
    scheduled_type VARCHAR(20) NOT NULL DEFAULT 'ASAP', -- 'ASAP', 'PREORDER'
    scheduled_time TIMESTAMP WITH TIME ZONE,
    
    -- Financials (Snapshot at order time)
    subtotal_amount DECIMAL(12, 2) NOT NULL CHECK (subtotal_amount >= 0),
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    delivery_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
    promotion_id INT REFERENCES promotions(id) ON DELETE SET NULL,
    
    -- Barista & Fulfillment Notes
    barista_notes TEXT,
    cancelled_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_order_code ON orders(order_code);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_recipient_phone ON orders(recipient_phone);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id INT REFERENCES product_variants(id) ON DELETE SET NULL,
    
    -- Snapshots
    product_name VARCHAR(150) NOT NULL,
    variant_name VARCHAR(50) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
    
    -- Group order & personalization
    recipient_label VARCHAR(60), -- Tên người uống in lên cốc: 'Tuấn Kỹ Thuật', 'Lan Kế Toán'
    item_notes VARCHAR(255)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

CREATE TABLE order_item_options (
    id BIGSERIAL PRIMARY KEY,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    option_name VARCHAR(50) NOT NULL,   -- e.g. 'Mức đường', 'Topping'
    value_name VARCHAR(50) NOT NULL,    -- e.g. '50% Đường', 'Trân châu trắng'
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0)
);

CREATE INDEX idx_order_item_options_item_id ON order_item_options(order_item_id);

CREATE TABLE order_status_history (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);

-- ============================================================================
-- 8. PAYMENTS & WEBHOOK RECONCILIATION
-- ============================================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    payment_method VARCHAR(30) NOT NULL, -- 'VIETQR', 'CASH_ON_DELIVERY'
    gateway VARCHAR(30) NOT NULL,        -- 'SEPAY', 'PAYOS', 'CASSO', 'MANUAL'
    transaction_code VARCHAR(100) UNIQUE, -- Mã giao dịch ngân hàng / gateway
    amount DECIMAL(12, 2) NOT NULL,
    is_success BOOLEAN NOT NULL DEFAULT FALSE,
    raw_payload JSONB,                   -- Toàn bộ webhook payload để kiểm tra đối soát
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_transaction_code ON payments(transaction_code);

-- ============================================================================
-- 9. BUSINESS SETTINGS & AUDIT LOGS
-- ============================================================================

CREATE TABLE business_settings (
    setting_key VARCHAR(60) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g. 'UPDATE_MENU', 'CANCEL_ORDER', 'CHANGE_SETTING'
    target_table VARCHAR(60),
    target_id VARCHAR(60),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
