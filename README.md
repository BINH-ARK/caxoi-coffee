# ☕ Cà Xòi Coffee - Website Đặt Món & Hệ Thống Quản Trị Vận Hành (Next.js 14 + SQLite)

Hệ thống website đặt món trực tuyến và quản trị quán cà phê **Cà Xòi Coffee** (Đà Nẵng), tích hợp chuyển khoản tự động VietQR, gom đơn nhóm văn phòng (Group Order), màn hình pha chế KDS (Kitchen Display System), in tem ly nước và thông báo đơn hàng qua Gmail tức thì.

---

## 🌟 Tính Năng Nổi Bật

### 1. Dành cho Khách Hàng (Customer Experience)
- **Bảng Menu Quán Cà Xòi Hồng Signature**: Thiết kế theo chuẩn nhận diện thương hiệu quán, thumbnail món, huy hiệu Bán chạy (`🔥`), Mới, chọn nhanh giá theo ly/chai 100ml/250ml.
- **Bộ chuyển đổi Chế độ xem (View Switcher)**: Linh hoạt chuyển đổi giữa **Bảng Menu Quán** và **Lưới Thẻ Món** (kèm hình ảnh lớn, mô tả thành phần, topping).
- **Tùy biến món sâu**: Chọn độ ngọt (100%, 70%, 50%, 30%, 0%), chọn đá (Đầy ly, Ít đá, Không đá, Túi đá riêng) và topping kem béo (Kem trứng muối, Kem muối huệ, shot cà phê...).
- **Đặt Hàng Gom Nhóm Văn Phòng (`/group-order`)**: Tạo link gom đơn, chia sẻ đồng nghiệp cùng chọn món vào 1 giỏ hàng chung với mã phòng/bàn/tầng.
- **Thanh toán VietQR động**: Tự động sinh mã VietQR chuẩn ngân hàng kèm số tiền và mã đơn hàng chính xác.
- **Theo dõi đơn hàng thời gian thực (`/order/[id]`)**: Xem tiến độ pha chế, giao nhận và tra cứu lại đơn cũ bằng số điện thoại.

### 2. Dành cho Quản Trị & Vận Hành (Admin & Staff)
- **Quản lý Thực đơn & Bảng giá**: 3 phân hệ trực quan (Món & Kích cỡ size, Bảng giá Topping, Cấu hình Độ ngọt & Đá).
- **Phân quyền & Tài khoản nhân sự (RBAC)**:
  - 👑 **Super Admin (Chủ quán)**: Toàn quyền hệ thống, cài đặt tài khoản VietQR, email nhận đơn.
  - 🎖️ **Store Manager (Quản lý)**: Quản lý menu, giá bán, duyệt đơn, cấu hình giờ mở cửa.
  - ☕ **Barista (Pha chế)**: Màn hình KDS `/kds` với mã PIN bảo mật, nhận công thức chi tiết từng ly.
  - 💵 **Cashier (Thu ngân)**: Quản lý dòng tiền, xác nhận thanh toán.
- **Thông báo Email tức thì qua Gmail (Nodemailer)**: Gửi thông báo đơn hàng mới đầy đủ chi tiết ly nước, topping, địa chỉ và số điện thoại người nhận.
- **Cơ sở dữ liệu SQLite độc lập**: Toàn bộ dữ liệu được lưu trữ tự động trong `database/caxoi_cafe.db` kèm công cụ tải file sao lưu trực tiếp trên web.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### Yêu Cầu Hệ Thống
- Node.js version **20+ hoặc 22 LTS** (khuyên dùng **Node 22 LTS**, tương thích hoàn toàn với **MacBook Apple Silicon M1/M2/M3/M4 `arm64`**, Intel Mac, Windows & Linux)
- npm

### 1. Cài đặt thư viện dependencies
```bash
npm install
```
*(Hệ thống hỗ trợ gốc Apple Silicon `arm64`: tự động dùng `@next/swc-darwin-arm64` và N-API `better-sqlite3` `darwin-arm64.node`, không cần Rosetta 2)*

### 2. Cấu hình biến môi trường (`.env`)
Tạo file `.env` từ file mẫu `.env.example`:
```bash
cp .env.example .env
```
*(Tùy chọn) Khi muốn bật thông báo email tự động, bạn có thể cấu hình `SMTP_USER` và `SMTP_PASS` (Mật khẩu ứng dụng Google) trực tiếp trong trang Quản trị Admin hoặc trong `.env`.*

### 3. Khởi chạy dự án
**Cách nhanh cho MacBook (M1 / M2 / M3 / M4 & Intel):**
```bash
./scripts/start-mac.sh
# hoặc:
npm run start:mac
```
*(Script tự động nhận diện chip Apple Silicon, nạp PATH Homebrew `/opt/homebrew/bin`, đồng bộ thư viện native `arm64`, kiểm tra SQLite và khởi chạy server)*

**Hoặc chạy thủ công trên mọi hệ điều hành:**
```bash
npm run dev
```
Mở trình duyệt truy cập:
- Trang khách hàng: [http://localhost:3000](http://localhost:3000)
- Trang quản trị: [http://localhost:3000/admin](http://localhost:3000/admin)
- Màn hình pha chế: [http://localhost:3000/kds](http://localhost:3000/kds) *(Mã PIN: `8823`)*

---

## 🛠️ Công Nghệ Sử Dụng
- **Frontend / Fullstack**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Lucide Icons.
- **Database**: SQLite (better-sqlite3) - Lưu trữ bền bỉ không phụ thuộc server MySQL ngoài.
- **Email Service**: Nodemailer (kết nối Gmail SMTP).
- **Payment**: VietQR API (sinh mã QR thanh toán nhanh Napas247).
