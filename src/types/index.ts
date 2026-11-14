export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ProductVariant {
  id: number;
  productId: string;
  sizeName: string;
  extraPrice: number;
  isDefault: boolean;
}

export interface ProductOptionValue {
  id: number;
  optionId: number;
  name: string;
  extraPrice: number;
  isDefault: boolean;
  displayOrder: number;
}

export interface ProductOption {
  id: number;
  name: string;
  isRequired: boolean;
  isMultiple: boolean;
  displayOrder: number;
  values: ProductOptionValue[];
}

export interface Product {
  id: string;
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  salePrice?: number | null;
  isAvailable: boolean;
  isFeatured: boolean;
  prepTimeMinutes: number;
  tags: string[];
  variants: ProductVariant[];
  category?: Category;
}

export interface SelectedOptionItem {
  optionName: string;
  valueName: string;
  extraPrice: number;
}

export interface CartItem {
  cartItemId: string; // Unique client ID for this specific combination
  product: Product;
  variant: ProductVariant;
  selectedOptions: SelectedOptionItem[];
  quantity: number;
  recipientLabel?: string; // Tên người uống (dùng cho đơn nhóm & in tem ly)
  notes?: string;
  unitPrice: number; // basePrice + variant extra + option extras
  totalPrice: number;
}

export type OrderType = 'OFFICE_DELIVERY' | 'TAKEAWAY' | 'GROUP_ORDER';
export type OrderStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'BREWING' | 'READY' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';
export type PaymentMethod = 'VIETQR_BANKING' | 'COD' | 'EWALLET';

export interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  recipientLabel?: string;
  itemNotes?: string;
  options: { optionName: string; valueName: string; price: number }[];
}

export interface Order {
  id: string;
  orderCode: string;
  customerId?: string;
  groupSessionId?: string;
  orderType: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  recipientName: string;
  recipientPhone: string;
  companyName?: string;
  buildingName?: string;
  floorRoom?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  scheduledType: 'ASAP' | 'PREORDER';
  scheduledTime?: string;
  subtotalAmount: number;
  discountAmount: number;
  deliveryFee: number;
  totalAmount: number;
  promotionCode?: string;
  baristaNotes?: string;
  shipperName?: string;
  shipperPhone?: string;
  estimatedDeliveryTime?: string;
  trackingNotes?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemRecord[];
}

export interface GroupSession {
  id: string;
  sessionCode: string;
  hostName: string;
  hostPhone: string;
  buildingName?: string;
  status: 'OPEN' | 'LOCKED' | 'ORDERED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  items: CartItem[];
}

export interface BusinessSettings {
  storeName: string;
  storeStatus: 'OPEN' | 'CLOSED' | 'PAUSED';
  storeStatusMessage: string;
  hotline: string;
  openTime: string;
  closeTime: string;
  baseDeliveryFee: number;
  freeDeliveryMinCups: number;
  maxSlotCapacityCups: number;
  prepLeadTimeMinutes: number;
  vietqrBankId: string;
  vietqrAccountNo: string;
  vietqrAccountName: string;
  // Nội dung & thông tin Hero Banner (Hình 1) có thể chỉnh sửa từ Admin
  heroBadgeBrand: string;
  heroLocation: string;
  heroEyebrow: string;
  heroHeadlinePrimary: string;
  heroHeadlineHighlight: string;
  heroDescription: string;
  heroServiceNote: string;
  heroPriceBadge1: string;
  heroPriceBadge2: string;
  heroPriceBadge3: string;
  heroPrimaryCtaText: string;
  heroSecondaryCtaText: string;
  heroWatermarkText: string;
  heroLogoUrl: string;
  heroMascotTitle: string;
  heroMascotSubtitle: string;
  facebookUrl: string;
  qrFacebookTitle: string;
  qrFacebookSubtitle: string;
  xanhSmUrl: string;
  qrXanhSmTitle: string;
  qrXanhSmSubtitle: string;
}

export interface PermissionDefinition {
  id: string;
  code: string;
  name: string;
  category: 'ORDERS' | 'MENU' | 'PROMOTIONS' | 'FINANCE' | 'SYSTEM';
  description: string;
}

export interface RolePermissionConfig {
  roleId: string;
  roleName: 'SUPER_ADMIN' | 'STORE_MANAGER' | 'CASHIER' | 'BARISTA';
  displayName: string;
  description: string;
  permissions: string[]; // List of permission codes
}

export interface StaffAccount {
  id: string;
  username: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'STORE_MANAGER' | 'CASHIER' | 'BARISTA';
  phone?: string;
  email?: string;
  pin?: string;
  isActive: boolean;
  createdAt: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Promotion {
  id: number;
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  isActive: boolean;
  maxDiscountAmount?: number | null;
}
