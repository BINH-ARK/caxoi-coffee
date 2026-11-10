-- ============================================================================
-- ONLINE CAFÉ ORDERING & OFFICE DELIVERY PLATFORM
-- REALISTIC SEED DATA (Vietnamese Office Café Market)
-- ============================================================================

-- 1. ROLES & USERS
INSERT INTO roles (id, name, description) VALUES
(1, 'SUPER_ADMIN', 'Toàn quyền quản trị hệ thống, menu, doanh thu và cấu hình máy chủ'),
(2, 'STORE_MANAGER', 'Quản lý cửa hàng, duyệt khuyến mãi, cấu hình giờ mở cửa và tải quầy bar'),
(3, 'BARISTA', 'Nhân viên pha chế: Xem màn hình KDS, cập nhật tiến độ món, in tem dán ly'),
(4, 'CASHIER', 'Thu ngân: Kiểm tra hóa đơn, hỗ trợ xác nhận thanh toán tiền mặt');

-- Default Pass: Admin@123456 (Bcrypt hash)
INSERT INTO users (id, username, password_hash, full_name, phone, role_id, is_active) VALUES
('a0000000-0000-0000-0000-000000000001', 'admin', '$2b$10$w82Qf0L1.Q4U3iA9gGgqveJqfQv8eXnFh/jK9GzJ6d0S/6hB3F7iO', 'Quản Trị Viên', '0901234567', 1, TRUE),
('a0000000-0000-0000-0000-000000000002', 'barista1', '$2b$10$w82Qf0L1.Q4U3iA9gGgqveJqfQv8eXnFh/jK9GzJ6d0S/6hB3F7iO', 'Nguyễn Văn Barista', '0912345678', 3, TRUE);

-- 2. CATEGORIES CÀ XÒI
INSERT INTO categories (id, name, slug, description, image_url, display_order, is_active) VALUES
(1, 'Cà Hê Truyền Thống', 'ca-he-truyen-thong', 'Cà hê đen, Cà hê sữa & Bạc xĩuuuu đậm đà chuẩn vị phin truyền thống', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80', 1, TRUE),
(2, 'Cà Hê Kem Béo Xứ Huế & Trứng Muối', 'ca-he-kem-beo', 'Cà hê múi huệ béo mặn & Cà hê trứng múi vàng óng béo ngậy nức tiếng', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80', 2, TRUE);

-- 3. PRODUCT OPTIONS & VALUES (MODIFIERS)
INSERT INTO product_options (id, name, is_required, is_multiple, display_order) VALUES
(1, 'Mức đường', TRUE, FALSE, 1),
(2, 'Mức đá', TRUE, FALSE, 2),
(3, 'Topping & Thêm kem béo', FALSE, TRUE, 3);

INSERT INTO product_option_values (id, option_id, name, extra_price, is_default, display_order) VALUES
-- Mức đường
(1, 1, '100% Đường (Chuẩn vị Cà Xòi)', 0, TRUE, 1),
(2, 1, '70% Đường (Ít ngọt nhẹ)', 0, FALSE, 2),
(3, 1, '50% Đường (Ngọt vừa)', 0, FALSE, 3),
(4, 1, '30% Đường (Rất ít ngọt)', 0, FALSE, 4),
(5, 1, '0% Đường (Không ngọt)', 0, FALSE, 5),

-- Mức đá
(6, 2, 'Bình thường (Đầy ly)', 0, TRUE, 1),
(7, 2, 'Ít đá (Nhiều nước)', 0, FALSE, 2),
(8, 2, 'Không đá', 0, FALSE, 3),
(9, 2, 'Để đá riêng (Túi đá riêng cho chai)', 0, FALSE, 4),

-- Topping thêm
(10, 3, 'Thêm lớp Kem Trứng Muối béo ngậy', 10000, FALSE, 1),
(11, 3, 'Thêm lớp Kem Muối Huế mặn mà', 8000, FALSE, 2),
(12, 3, 'Thêm 1 shot cà phê đậm đặc', 7000, FALSE, 3),
(13, 3, 'Sương sáo thanh mát', 6000, FALSE, 4),
(14, 3, 'Trân châu trắng 3Q giòn', 7000, FALSE, 5);

-- 4. PRODUCTS (5 MÓN NGUYÊN BẢN MENU CÀ XÒI)
INSERT INTO products (id, category_id, name, slug, description, image_url, base_price, sale_price, is_available, is_featured, prep_time_minutes, tags) VALUES
('b0000000-0000-0000-0000-000000000001', 1, 'Cà hê đen', 'ca-he-den', 'Cà phê đen phin Robusta Đắk Lắk đậm đà nguyên bản, vị đắng dịu hậu ngọt sâu chuẩn gu Cà Xòi', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80', 13000, NULL, TRUE, TRUE, 3, ARRAY['BEST_SELLER', 'SIGNATURE']),
('b0000000-0000-0000-0000-000000000002', 1, 'Cà hê sữa', 'ca-he-sua', 'Cà phê phin đậm đà hòa quyện cùng sữa đặc ngọt béo thơm lừng truyền thống, uống là mê mẩn', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80', 16000, NULL, TRUE, TRUE, 4, ARRAY['BEST_SELLER', 'SIGNATURE']),
('b0000000-0000-0000-0000-000000000003', 1, 'Bạc xĩuuuu', 'bac-xiuuuu', 'Nhiều sữa béo thơm dịu ngọt quyện cùng một xíu cà phê thơm nhẹ nhàng, gu ngọt ngào cưng xỉu', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80', 19000, NULL, TRUE, TRUE, 4, ARRAY['BEST_SELLER']),
('b0000000-0000-0000-0000-000000000004', 2, 'Cà hê múi huệ', 'ca-he-mui-hue', 'Lớp kem muối béo mặn mượt mà đặc trưng xứ Huế, hòa quyện cà phê cốt phin đậm đà gây nghiện', 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=600&auto=format&fit=crop&q=80', 23000, NULL, TRUE, TRUE, 4, ARRAY['SIGNATURE', 'BEST_SELLER', 'HOT']),
('b0000000-0000-0000-0000-000000000005', 2, 'Cà hê trứng múi', 'ca-he-trung-mui', 'Signature Cà Xòi! Kem trứng muối vàng óng béo ngậy ngọt mặn, cực thơm bùi, nhấp một ngụm là tỉnh táo tức thì', 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80', 25000, NULL, TRUE, TRUE, 5, ARRAY['SIGNATURE', 'BEST_SELLER', 'HOT']);

-- 5. PRODUCT VARIANTS (3 QUY CÁCH: LY • 100ML • 250ML)
-- Cà hê đen: Ly (13k), 100ml (25k -> +12k), 250ml (50k -> +37k)
INSERT INTO product_variants (product_id, size_name, extra_price, is_default) VALUES
('b0000000-0000-0000-0000-000000000001', 'Ly', 0, TRUE),
('b0000000-0000-0000-0000-000000000001', '100ml', 12000, FALSE),
('b0000000-0000-0000-0000-000000000001', '250ml', 37000, FALSE),

-- Cà hê sữa: Ly (16k), 100ml (25k -> +9k), 250ml (52k -> +36k)
('b0000000-0000-0000-0000-000000000002', 'Ly', 0, TRUE),
('b0000000-0000-0000-0000-000000000002', '100ml', 9000, FALSE),
('b0000000-0000-0000-0000-000000000002', '250ml', 36000, FALSE),

-- Bạc xĩuuuu: Ly (19k), 100ml (26k -> +7k), 250ml (47k -> +28k)
('b0000000-0000-0000-0000-000000000003', 'Ly', 0, TRUE),
('b0000000-0000-0000-0000-000000000003', '100ml', 7000, FALSE),
('b0000000-0000-0000-0000-000000000003', '250ml', 28000, FALSE),

-- Cà hê múi huệ: Ly (23k), 100ml (27k -> +4k), 250ml (60k -> +37k)
('b0000000-0000-0000-0000-000000000004', 'Ly', 0, TRUE),
('b0000000-0000-0000-0000-000000000004', '100ml', 4000, FALSE),
('b0000000-0000-0000-0000-000000000004', '250ml', 37000, FALSE),

-- Cà hê trứng múi: Ly (25k), 100ml (31k -> +6k), 250ml (65k -> +40k)
('b0000000-0000-0000-0000-000000000005', 'Ly', 0, TRUE),
('b0000000-0000-0000-0000-000000000005', '100ml', 6000, FALSE),
('b0000000-0000-0000-0000-000000000005', '250ml', 40000, FALSE);

-- 6. SAMPLE COMPANIES & PARTNERS (ĐÀ NẴNG)
INSERT INTO companies (id, name, tax_code, preferred_building, is_corporate_partner, discount_rate) VALUES
('c0000000-0000-0000-0000-000000000001', 'FPT Software Đà Nẵng', '0101778163', 'FPT Complex Đà Nẵng (Ngũ Hành Sơn)', TRUE, 10.00),
('c0000000-0000-0000-0000-000000000002', 'KMS Technology Đà Nẵng', '0100109106', 'Software Park (02 Quang Trung, Hải Châu)', TRUE, 10.00),
('c0000000-0000-0000-0000-000000000003', 'Viettel Đà Nẵng', '0313334240', 'Viettel Building (Nguyễn Văn Linh, Hải Châu)', TRUE, 15.00);

-- 7. PROMOTIONS & VOUCHERS
INSERT INTO promotions (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, used_count, start_time, end_time, is_active) VALUES
('CHAOBANMOI', 'Giảm 20% cho đơn hàng đầu tiên trải nghiệm', 'PERCENT', 20.00, 50000, 30000, 1000, 42, NOW() - INTERVAL '7 days', NOW() + INTERVAL '90 days', TRUE),
('OFFICE50K', 'Giảm ngay 50.000đ cho đơn nhóm văn phòng từ 200.000đ', 'FIXED_AMOUNT', 50000, 200000, NULL, 500, 89, NOW() - INTERVAL '7 days', NOW() + INTERVAL '90 days', TRUE),
('FREESHIP', 'Miễn phí giao hàng bán kính 2km', 'FREE_SHIP', 15000, 80000, 15000, 2000, 156, NOW() - INTERVAL '7 days', NOW() + INTERVAL '90 days', TRUE);

-- 8. BUSINESS SETTINGS
INSERT INTO business_settings (setting_key, setting_value, description) VALUES
('STORE_NAME', 'Cà Xòi - Trạm Cấp Cứu Cơn Buồn Ngủ Công Sở', 'Tên thương hiệu quán cà phê hiển thị trên hóa đơn và web'),
('STORE_STATUS', 'OPEN', 'Trạng thái hoạt động: OPEN (Mở cửa), CLOSED (Đóng cửa), PAUSED (Tạm dừng nhận đơn cao điểm)'),
('STORE_STATUS_MESSAGE', 'Tỉnh như sáo, báo như Xòi • Giao siêu tốc Hải Châu, Thanh Khê, Ngũ Hành Sơn, Đà Nẵng', 'Thông báo hiển thị thanh banner đầu trang cho khách hàng'),
('HOTLINE', '0905249733', 'Số điện thoại hỗ trợ khách hàng và điều phối đơn'),
('OPEN_TIME', '07:00', 'Giờ bắt đầu tiếp nhận đơn hàng trực tuyến'),
('CLOSE_TIME', '18:30', 'Giờ kết thúc nhận đơn hàng trong ngày'),
('BASE_DELIVERY_FEE', '15000', 'Phí giao hàng cơ bản (VNĐ)'),
('FREE_DELIVERY_MIN_CUPS', '3', 'Số lượng ly tối thiểu trong đơn để được miễn phí ship'),
('MAX_SLOT_CAPACITY_CUPS', '30', 'Số ly tối đa quầy pha chế tiếp nhận trong mỗi slot 15 phút'),
('PREPARATION_LEAD_TIME_MINUTES', '5', 'Thời gian chuẩn bị món cơ bản (phút)'),
('VIETQR_BANK_ID', 'MB', 'Mã ngân hàng MBBank để tạo mã VietQR động'),
('VIETQR_ACCOUNT_NO', '999988886666', 'Số tài khoản ngân hàng thụ hưởng của quán'),
('VIETQR_ACCOUNT_NAME', 'CA XOI CAFE', 'Tên chủ tài khoản ngân hàng');
