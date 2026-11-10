-- ============================================================================
-- PHPMYADMIN / MYSQL DATABASE DUMP FOR QUÁN CÀ XÒI
-- Target System: phpMyAdmin (XAMPP / WAMP / Laragon / MySQL / MariaDB)
-- Character Set: utf8mb4 (Full Vietnamese Unicode & Emojis supported)
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

-- --------------------------------------------------------
-- 1. TẠO CƠ SỞ DỮ LIỆU
-- --------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `caxoi_cafe` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `caxoi_cafe`;

-- --------------------------------------------------------
-- 2. BẢNG PHÂN QUYỀN (ROLES)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_role_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'SUPER_ADMIN', 'Chủ quán - Toàn quyền quản trị hệ thống, thực đơn, doanh thu và cấu hình máy chủ'),
(2, 'STORE_MANAGER', 'Quản lý cửa hàng - Điều phối quán, cập nhật thực đơn, duyệt khuyến mãi và giờ mở cửa'),
(3, 'BARISTA', 'Nhân viên pha chế - Màn hình KDS nhận đơn, cập nhật tiến độ pha chế và in tem dán ly'),
(4, 'CASHIER', 'Thu ngân - Kiểm tra hóa đơn, đối soát và hỗ trợ xác nhận thanh toán');

-- --------------------------------------------------------
-- 3. BẢNG TÀI KHOẢN NHÂN VIÊN (USERS)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `plain_password` varchar(100) DEFAULT NULL,
  `pin` varchar(10) DEFAULT NULL,
  `full_name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_username` (`username`),
  KEY `fk_users_roles` (`role_id`),
  CONSTRAINT `fk_users_roles` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `username`, `password_hash`, `plain_password`, `pin`, `full_name`, `phone`, `role_id`, `is_active`) VALUES
('a0000000-0000-0000-0000-000000000001', 'admin', '$2b$10$w82Qf0L1.Q4U3iA9gGgqveJqfQv8eXnFh/jK9GzJ6d0S/6hB3F7iO', 'Admin@123456', '9999', 'Quản Trị Viên (Chủ Quán)', '0905249733', 1, 1),
('a0000000-0000-0000-0000-000000000002', 'manager', '$2b$10$w82Qf0L1.Q4U3iA9gGgqveJqfQv8eXnFh/jK9GzJ6d0S/6hB3F7iO', 'Manager@123', '5555', 'Lê Cửa Hàng Trưởng', '0905112233', 2, 1),
('a0000000-0000-0000-0000-000000000003', 'barista1', '$2b$10$w82Qf0L1.Q4U3iA9gGgqveJqfQv8eXnFh/jK9GzJ6d0S/6hB3F7iO', 'Barista@123', '8823', 'Nguyễn Văn Barista', '0905667788', 3, 1),
('a0000000-0000-0000-0000-000000000004', 'cashier1', '$2b$10$w82Qf0L1.Q4U3iA9gGgqveJqfQv8eXnFh/jK9GzJ6d0S/6hB3F7iO', 'Cashier@123', '6688', 'Trần Thu Ngân', '0905889900', 4, 1);

-- --------------------------------------------------------
-- 4. BẢNG DANH MỤC SẢN PHẨM (CATEGORIES)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_category_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `image_url`, `display_order`, `is_active`) VALUES
(1, 'Cà Hê Truyền Thống & Chai Rót', 'ca-he-truyen-thong', 'Cà phê Robusta đậm vị, có sẵn Ly uống liền hoặc Chai 100ml & 250ml tiện lợi', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80', 1, 1),
(2, 'Dòng Kem Trứng Muối & Kem Muối Xứ Huế', 'dong-kem-trung-muoi', 'Signature Cà Xòi: Kem trứng muối vàng óng béo ngậy & Kem muối xứ Huế sánh mịn', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80', 2, 1);

-- --------------------------------------------------------
-- 5. BẢNG SẢN PHẨM (PRODUCTS - 5 MÓN NGUYÊN BẢN CÀ XÒI)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` varchar(36) NOT NULL,
  `category_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `base_price` decimal(12,2) NOT NULL,
  `sale_price` decimal(12,2) DEFAULT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT 1,
  `is_featured` tinyint(1) NOT NULL DEFAULT 1,
  `prep_time_minutes` int(11) NOT NULL DEFAULT 4,
  `tags` varchar(255) DEFAULT 'BEST_SELLER',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_product_slug` (`slug`),
  KEY `fk_products_categories` (`category_id`),
  CONSTRAINT `fk_products_categories` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `description`, `image_url`, `base_price`, `sale_price`, `is_available`, `is_featured`, `prep_time_minutes`, `tags`) VALUES
('b0000000-0000-0000-0000-000000000001', 1, 'Cà hê đen', 'ca-he-den', 'Cà phê đen phin Robusta Đắk Lắk đậm đà nguyên bản, vị đắng dịu hậu ngọt sâu chuẩn gu Cà Xòi', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80', 13000.00, NULL, 1, 1, 3, 'BEST_SELLER,SIGNATURE'),
('b0000000-0000-0000-0000-000000000002', 1, 'Cà hê sữa', 'ca-he-sua', 'Cà phê phin đậm đà hòa quyện cùng sữa đặc ngọt béo thơm lừng truyền thống, uống là mê mẩn', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80', 16000.00, NULL, 1, 1, 4, 'BEST_SELLER,SIGNATURE'),
('b0000000-0000-0000-0000-000000000003', 1, 'Bạc xĩuuuu', 'bac-xiuuuu', 'Nhiều sữa béo thơm dịu ngọt quyện cùng một xíu cà phê thơm nhẹ nhàng, gu ngọt ngào cưng xỉu', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80', 19000.00, NULL, 1, 1, 4, 'BEST_SELLER'),
('b0000000-0000-0000-0000-000000000004', 2, 'Cà hê múi huệ', 'ca-he-mui-hue', 'Lớp kem muối béo mặn mượt mà đặc trưng xứ Huế, hòa quyện cà phê cốt phin đậm đà gây nghiện', 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=600&auto=format&fit=crop&q=80', 23000.00, NULL, 1, 1, 4, 'SIGNATURE,BEST_SELLER,HOT'),
('b0000000-0000-0000-0000-000000000005', 2, 'Cà hê trứng múi', 'ca-he-trung-mui', 'Signature Cà Xòi! Kem trứng muối vàng óng béo ngậy ngọt mặn, cực thơm bùi, nhấp một ngụm là tỉnh táo tức thì', 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80', 25000.00, NULL, 1, 1, 5, 'SIGNATURE,BEST_SELLER,HOT');

-- --------------------------------------------------------
-- 6. BẢNG QUY CÁCH / SIZE (PRODUCT_VARIANTS: LY • 100ML • 250ML)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `product_variants`;
CREATE TABLE `product_variants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` varchar(36) NOT NULL,
  `size_name` varchar(50) NOT NULL,
  `extra_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `fk_variants_products` (`product_id`),
  CONSTRAINT `fk_variants_products` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `product_variants` (`product_id`, `size_name`, `extra_price`, `is_default`) VALUES
-- 1. Cà hê đen: Ly (13k), 100ml (25k -> +12k), 250ml (50k -> +37k)
('b0000000-0000-0000-0000-000000000001', 'Ly', 0.00, 1),
('b0000000-0000-0000-0000-000000000001', '100ml', 12000.00, 0),
('b0000000-0000-0000-0000-000000000001', '250ml', 37000.00, 0),

-- 2. Cà hê sữa: Ly (16k), 100ml (25k -> +9k), 250ml (52k -> +36k)
('b0000000-0000-0000-0000-000000000002', 'Ly', 0.00, 1),
('b0000000-0000-0000-0000-000000000002', '100ml', 9000.00, 0),
('b0000000-0000-0000-0000-000000000002', '250ml', 36000.00, 0),

-- 3. Bạc xĩuuuu: Ly (19k), 100ml (26k -> +7k), 250ml (47k -> +28k)
('b0000000-0000-0000-0000-000000000003', 'Ly', 0.00, 1),
('b0000000-0000-0000-0000-000000000003', '100ml', 7000.00, 0),
('b0000000-0000-0000-0000-000000000003', '250ml', 28000.00, 0),

-- 4. Cà hê múi huệ: Ly (23k), 100ml (27k -> +4k), 250ml (60k -> +37k)
('b0000000-0000-0000-0000-000000000004', 'Ly', 0.00, 1),
('b0000000-0000-0000-0000-000000000004', '100ml', 4000.00, 0),
('b0000000-0000-0000-0000-000000000004', '250ml', 37000.00, 0),

-- 5. Cà hê trứng múi: Ly (25k), 100ml (31k -> +6k), 250ml (65k -> +40k)
('b0000000-0000-0000-0000-000000000005', 'Ly', 0.00, 1),
('b0000000-0000-0000-0000-000000000005', '100ml', 6000.00, 0),
('b0000000-0000-0000-0000-000000000005', '250ml', 40000.00, 0);

-- --------------------------------------------------------
-- 7. BẢNG TÙY CHỌN (OPTIONS & VALUES: ĐƯỜNG, ĐÁ, TOPPING)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `product_options`;
CREATE TABLE `product_options` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 0,
  `is_multiple` tinyint(1) NOT NULL DEFAULT 0,
  `display_order` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `product_options` (`id`, `name`, `is_required`, `is_multiple`, `display_order`) VALUES
(1, 'Mức đường', 1, 0, 1),
(2, 'Mức đá', 1, 0, 2),
(3, 'Topping & Thêm kem béo', 0, 1, 3);

DROP TABLE IF EXISTS `product_option_values`;
CREATE TABLE `product_option_values` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `option_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `extra_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `display_order` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `fk_optval_options` (`option_id`),
  CONSTRAINT `fk_optval_options` FOREIGN KEY (`option_id`) REFERENCES `product_options` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `product_option_values` (`id`, `option_id`, `name`, `extra_price`, `is_default`, `display_order`) VALUES
-- Đường
(1, 1, '100% Đường (Chuẩn vị Cà Xòi)', 0.00, 1, 1),
(2, 1, '70% Đường (Ít ngọt nhẹ)', 0.00, 0, 2),
(3, 1, '50% Đường (Ngọt vừa)', 0.00, 0, 3),
(4, 1, '30% Đường (Rất ít ngọt)', 0.00, 0, 4),
(5, 1, '0% Đường (Không đường)', 0.00, 0, 5),

-- Đá
(6, 2, 'Bình thường (Đầy ly)', 0.00, 1, 1),
(7, 2, 'Ít đá (Nhiều nước)', 0.00, 0, 2),
(8, 2, 'Không đá', 0.00, 0, 3),
(9, 2, 'Túi đá riêng (Dành cho chai rót)', 0.00, 0, 4),

-- Topping thêm
(10, 3, 'Thêm lớp Kem Trứng Muối béo ngậy', 10000.00, 0, 1),
(11, 3, 'Thêm lớp Kem Muối Huế mặn mà', 8000.00, 0, 2),
(12, 3, 'Thêm 1 shot cà phê đậm đặc', 7000.00, 0, 3),
(13, 3, 'Sương sáo giòn thanh mát', 6000.00, 0, 4),
(14, 3, 'Trân châu trắng 3Q giòn', 7000.00, 0, 5);

-- --------------------------------------------------------
-- 8. BẢNG CẤU HÌNH QUÁN & THANH TOÁN (BUSINESS_SETTINGS)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `business_settings`;
CREATE TABLE `business_settings` (
  `setting_key` varchar(50) NOT NULL,
  `setting_value` text NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `business_settings` (`setting_key`, `setting_value`, `description`) VALUES
('STORE_NAME', 'Cà Xòi - Trạm Cấp Cứu Cơn Buồn Ngủ Công Sở', 'Tên thương hiệu quán cà phê hiển thị trên hóa đơn và web'),
('STORE_STATUS', 'OPEN', 'Trạng thái hoạt động: OPEN (Mở cửa), CLOSED (Đóng cửa), PAUSED (Tạm dừng nhận đơn cao điểm)'),
('STORE_STATUS_MESSAGE', 'Tỉnh như sáo, báo như Xòi • Giao siêu tốc Hải Châu, Thanh Khê, Ngũ Hành Sơn, Đà Nẵng', 'Thông báo hiển thị thanh banner đầu trang cho khách hàng'),
('HOTLINE', '0905 249 733', 'Số điện thoại hỗ trợ khách hàng và điều phối đơn'),
('OPEN_TIME', '07:00', 'Giờ bắt đầu tiếp nhận đơn hàng trực tuyến'),
('CLOSE_TIME', '18:30', 'Giờ kết thúc nhận đơn hàng trong ngày'),
('BASE_DELIVERY_FEE', '15000', 'Phí giao hàng cơ bản (VNĐ)'),
('FREE_DELIVERY_MIN_CUPS', '3', 'Số lượng ly tối thiểu trong đơn để được miễn phí ship'),
('MAX_SLOT_CAPACITY_CUPS', '30', 'Số ly tối đa quầy pha chế tiếp nhận trong mỗi slot 15 phút'),
('PREPARATION_LEAD_TIME_MINUTES', '5', 'Thời gian chuẩn bị món cơ bản (phút)'),
('VIETQR_BANK_ID', 'MB', 'Mã ngân hàng MBBank để tạo mã VietQR động'),
('VIETQR_ACCOUNT_NO', '999988886666', 'Số tài khoản ngân hàng thụ hưởng của quán'),
('VIETQR_ACCOUNT_NAME', 'CA XOI CAFE', 'Tên chủ tài khoản ngân hàng');

-- --------------------------------------------------------
-- 9. BẢNG ĐỐI TÁC VĂN PHÒNG & TÒA NHÀ ĐÀ NẴNG (COMPANIES)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `companies`;
CREATE TABLE `companies` (
  `id` varchar(36) NOT NULL,
  `name` varchar(150) NOT NULL,
  `tax_code` varchar(30) DEFAULT NULL,
  `preferred_building` varchar(255) NOT NULL,
  `is_corporate_partner` tinyint(1) NOT NULL DEFAULT 1,
  `discount_rate` decimal(5,2) NOT NULL DEFAULT 10.00,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `companies` (`id`, `name`, `tax_code`, `preferred_building`, `is_corporate_partner`, `discount_rate`) VALUES
('c0000000-0000-0000-0000-000000000001', 'FPT Software Đà Nẵng', '0101778163', 'FPT Complex Đà Nẵng (KĐT FPT City, Ngũ Hành Sơn)', 1, 10.00),
('c0000000-0000-0000-0000-000000000002', 'KMS Technology Đà Nẵng', '0100109106', 'Software Park (02 Quang Trung, Hải Châu)', 1, 10.00),
('c0000000-0000-0000-0000-000000000003', 'Viettel Đà Nẵng', '0313334240', 'Viettel Building (Nguyễn Văn Linh, Hải Châu)', 1, 15.00);

-- --------------------------------------------------------
-- 10. BẢNG KHUYẾN MÃI (PROMOTIONS)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `promotions`;
CREATE TABLE `promotions` (
  `code` varchar(30) NOT NULL,
  `description` varchar(255) NOT NULL,
  `discount_type` enum('PERCENT','FIXED_AMOUNT','FREE_SHIP') NOT NULL,
  `discount_value` decimal(12,2) NOT NULL,
  `min_order_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `max_discount_amount` decimal(12,2) DEFAULT NULL,
  `usage_limit` int(11) NOT NULL DEFAULT 1000,
  `used_count` int(11) NOT NULL DEFAULT 0,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `promotions` (`code`, `description`, `discount_type`, `discount_value`, `min_order_amount`, `max_discount_amount`, `usage_limit`, `used_count`, `start_time`, `end_time`, `is_active`) VALUES
('CHAOBANMOI', 'Giảm 20% cho đơn hàng đầu tiên trải nghiệm', 'PERCENT', 20.00, 50000.00, 30000.00, 1000, 42, NOW() - INTERVAL 7 DAY, NOW() + INTERVAL 90 DAY, 1),
('OFFICE50K', 'Giảm ngay 50.000đ cho đơn nhóm văn phòng từ 200.000đ', 'FIXED_AMOUNT', 50000.00, 200000.00, NULL, 500, 89, NOW() - INTERVAL 7 DAY, NOW() + INTERVAL 90 DAY, 1),
('FREESHIP', 'Miễn phí giao hàng bán kính 2km', 'FREE_SHIP', 15000.00, 80000.00, 15000.00, 2000, 156, NOW() - INTERVAL 7 DAY, NOW() + INTERVAL 90 DAY, 1);

-- --------------------------------------------------------
-- 11. BẢNG ĐƠN HÀNG (ORDERS)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` varchar(36) NOT NULL,
  `order_code` varchar(30) NOT NULL,
  `customer_id` varchar(36) DEFAULT NULL,
  `group_session_id` varchar(36) DEFAULT NULL,
  `order_type` enum('OFFICE_DELIVERY','TAKEAWAY','DINE_IN','GROUP_ORDER') NOT NULL DEFAULT 'OFFICE_DELIVERY',
  `status` enum('PENDING_PAYMENT','CONFIRMED','BREWING','READY','DELIVERING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
  `payment_status` enum('PENDING','PAID','FAILED','REFUNDED') NOT NULL DEFAULT 'PAID',
  `payment_method` enum('VIETQR_BANKING','CASH','MOMO','ZALOPAY') NOT NULL DEFAULT 'VIETQR_BANKING',
  `recipient_name` varchar(100) NOT NULL,
  `recipient_phone` varchar(20) NOT NULL,
  `company_name` varchar(150) DEFAULT NULL,
  `building_name` varchar(150) DEFAULT NULL,
  `floor_room` varchar(50) DEFAULT NULL,
  `delivery_address` varchar(255) DEFAULT NULL,
  `delivery_notes` text DEFAULT NULL,
  `scheduled_type` enum('ASAP','PREORDER') NOT NULL DEFAULT 'ASAP',
  `scheduled_time` datetime DEFAULT NULL,
  `subtotal_amount` decimal(12,2) NOT NULL,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `delivery_fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(12,2) NOT NULL,
  `promotion_code` varchar(30) DEFAULT NULL,
  `barista_notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_order_code` (`order_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 12. BẢNG CHI TIẾT MÓN TRONG ĐƠN (ORDER_ITEMS)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` varchar(36) NOT NULL,
  `order_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `product_name` varchar(150) NOT NULL,
  `variant_name` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(12,2) NOT NULL,
  `total_price` decimal(12,2) NOT NULL,
  `recipient_label` varchar(100) DEFAULT NULL,
  `item_notes` text DEFAULT NULL,
  `options_json` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_orderitems_orders` (`order_id`),
  CONSTRAINT `fk_orderitems_orders` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

-- ============================================================================
-- KẾT THÚC DUMP DỮ LIỆU CÀ XÒI CHO PHPMYADMIN
-- Bạn có thể Import file này trực tiếp tại: http://localhost/phpmyadmin -> Import
-- ============================================================================
