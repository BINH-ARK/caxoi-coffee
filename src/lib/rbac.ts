import { PermissionDefinition, RolePermissionConfig, StaffAccount } from "@/types";

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // 1. ORDERS
  {
    id: "p_orders_view",
    code: "orders.view",
    name: "Xem đơn hàng",
    category: "ORDERS",
    description: "Xem chi tiết đơn hàng cá nhân, đơn tòa nhà và đơn nhóm",
  },
  {
    id: "p_orders_status",
    code: "orders.update_status",
    name: "Cập nhật tiến độ pha chế",
    category: "ORDERS",
    description: "Đổi trạng thái đơn: Chờ pha -> Đang pha -> Sẵn sàng -> Hoàn tất",
  },
  {
    id: "p_orders_print",
    code: "orders.print",
    name: "In tem ly & Hóa đơn",
    category: "ORDERS",
    description: "Gửi lệnh in tem dán ly 50x30mm và hóa đơn thanh toán",
  },
  {
    id: "p_orders_cancel",
    code: "orders.cancel",
    name: "Hủy đơn hàng",
    category: "ORDERS",
    description: "Hủy đơn hàng khi khách yêu cầu hoặc quầy gặp sự cố",
  },

  // 2. MENU
  {
    id: "p_menu_view",
    code: "menu.view",
    name: "Xem thực đơn",
    category: "MENU",
    description: "Xem danh mục, sản phẩm, kích cỡ và bảng giá",
  },
  {
    id: "p_menu_toggle",
    code: "menu.toggle_availability",
    name: "Bật/Tắt còn hàng",
    category: "MENU",
    description: "Gạt nút khóa món tức thì khi hết nguyên liệu",
  },
  {
    id: "p_menu_pricing",
    code: "menu.edit_pricing",
    name: "Sửa giá & Tạo món",
    category: "MENU",
    description: "Thêm món mới, điều chỉnh giá bán và kích cỡ",
  },

  // 3. PROMOTIONS
  {
    id: "p_promotions_view",
    code: "promotions.view",
    name: "Xem mã giảm giá",
    category: "PROMOTIONS",
    description: "Xem danh sách mã khuyến mãi đang áp dụng",
  },
  {
    id: "p_promotions_manage",
    code: "promotions.manage",
    name: "Quản lý Voucher",
    category: "PROMOTIONS",
    description: "Tạo voucher mới, chỉnh sửa tỷ lệ chiết khấu và hạn mức",
  },

  // 4. FINANCE & ANALYTICS
  {
    id: "p_finance_revenue",
    code: "finance.view_revenue",
    name: "Xem doanh thu",
    category: "FINANCE",
    description: "Xem số liệu doanh thu thực tế, tiền hàng theo ngày/tuần/tháng",
  },
  {
    id: "p_finance_analytics",
    code: "finance.view_analytics",
    name: "Biểu đồ giờ cao điểm",
    category: "FINANCE",
    description: "Xem phân bổ đơn theo khung giờ để tối ưu ca làm việc",
  },

  // 5. SYSTEM & OPERATIONAL
  {
    id: "p_system_pause",
    code: "system.emergency_pause",
    name: "Tạm dừng nhận đơn cao điểm",
    category: "SYSTEM",
    description: "Nút khẩn cấp đóng nhận đơn trực tuyến khi quán quá tải",
  },
  {
    id: "p_system_settings",
    code: "system.settings",
    name: "Cấu hình ngân hàng & Vận hành",
    category: "SYSTEM",
    description: "Cấu hình tài khoản VietQR, phí giao hàng, giờ mở cửa",
  },
  {
    id: "p_system_roles",
    code: "system.manage_roles",
    name: "Quản lý Phân quyền & Nhân viên",
    category: "SYSTEM",
    description: "Cấp phát quyền hạn, cấp mã PIN và tài khoản nhân viên",
  },
];

export const INITIAL_ROLE_PERMISSIONS: RolePermissionConfig[] = [
  {
    roleId: "SUPER_ADMIN",
    roleName: "SUPER_ADMIN",
    displayName: "Chủ Quán (Super Admin)",
    description: "Toàn quyền quản trị cao nhất, truy cập mọi chức năng tài chính và hệ thống",
    permissions: PERMISSION_DEFINITIONS.map((p) => p.code), // Full access
  },
  {
    roleId: "STORE_MANAGER",
    roleName: "STORE_MANAGER",
    displayName: "Cửa Hàng Trưởng (Store Manager)",
    description: "Quản lý vận hành hàng ngày, điều phối quầy bar, menu và xem báo cáo ca",
    permissions: [
      "orders.view",
      "orders.update_status",
      "orders.print",
      "orders.cancel",
      "menu.view",
      "menu.toggle_availability",
      "promotions.view",
      "finance.view_revenue",
      "finance.view_analytics",
      "system.emergency_pause",
    ],
  },
  {
    roleId: "CASHIER",
    roleName: "CASHIER",
    displayName: "Thu Ngân (Cashier)",
    description: "Tiếp nhận đơn tại quầy, in hóa đơn và đối soát thanh toán tiền mặt",
    permissions: [
      "orders.view",
      "orders.update_status",
      "orders.print",
      "menu.view",
      "promotions.view",
    ],
  },
  {
    roleId: "BARISTA",
    roleName: "BARISTA",
    displayName: "Pha Chế (Barista - KDS)",
    description: "Xem màn hình KDS, cập nhật tiến độ pha chế và in tem dán ly",
    permissions: [
      "orders.view",
      "orders.update_status",
      "orders.print",
      "menu.view",
    ],
  },
];

export const INITIAL_STAFF_ACCOUNTS: StaffAccount[] = [
  {
    id: "staff-1",
    username: "admin",
    fullName: "Nguyễn Hoàng Nam (Chủ quán)",
    role: "SUPER_ADMIN",
    phone: "0901234567",
    isActive: true,
    createdAt: "2026-10-01T08:00:00.000Z",
  },
  {
    id: "staff-2",
    username: "manager",
    fullName: "Lê Cửa Hàng Trưởng",
    role: "STORE_MANAGER",
    phone: "0912345678",
    isActive: true,
    createdAt: "2026-10-05T08:00:00.000Z",
  },
  {
    id: "staff-3",
    username: "barista1",
    fullName: "Trần Văn Barista",
    role: "BARISTA",
    phone: "0934567890",
    pin: "8823",
    isActive: true,
    createdAt: "2026-10-10T08:00:00.000Z",
  },
  {
    id: "staff-4",
    username: "cashier1",
    fullName: "Phạm Thu Ngân",
    role: "CASHIER",
    phone: "0945678901",
    pin: "6688",
    isActive: true,
    createdAt: "2026-10-12T08:00:00.000Z",
  },
];

// In-memory state for RBAC
class RbacDataLayer {
  public rolePermissions: RolePermissionConfig[] = JSON.parse(JSON.stringify(INITIAL_ROLE_PERMISSIONS));
  public staffAccounts: StaffAccount[] = JSON.parse(JSON.stringify(INITIAL_STAFF_ACCOUNTS));
}

declare global {
  var __CAFE_RBAC__: RbacDataLayer | undefined;
}

export const rbacStore = globalThis.__CAFE_RBAC__ ?? new RbacDataLayer();
if (process.env.NODE_ENV !== "production") {
  globalThis.__CAFE_RBAC__ = rbacStore;
}
