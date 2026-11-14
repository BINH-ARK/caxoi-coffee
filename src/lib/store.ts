import { Category, Product, ProductOption, Order, GroupSession, BusinessSettings, CartItem } from "@/types";

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 1,
    name: "Cà Hê Truyền Thống & Chai Rót",
    slug: "ca-he-truyen-thong",
    description: "Cà phê Robusta đậm vị, có sẵn Ly uống liền hoặc Chai 100ml & 250ml tiện lợi",
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 2,
    name: "Dòng Kem Trứng Muối & Kem Muối Xứ Huế",
    slug: "dong-kem-trung-muoi",
    description: "Signature Cà Xòi: Kem trứng muối vàng óng béo ngậy & Kem muối xứ Huế sánh mịn",
    imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80",
    displayOrder: 2,
    isActive: true,
  },
];

export const INITIAL_OPTIONS: ProductOption[] = [
  {
    id: 1,
    name: "Độ ngọt",
    isRequired: true,
    isMultiple: false,
    displayOrder: 1,
    values: [
      { id: 1, optionId: 1, name: "100% Đường (Chuẩn vị Cà Xòi)", extraPrice: 0, isDefault: true, displayOrder: 1 },
      { id: 2, optionId: 1, name: "70% Đường (Ít ngọt nhẹ)", extraPrice: 0, isDefault: false, displayOrder: 2 },
      { id: 3, optionId: 1, name: "50% Đường (Ngọt vừa)", extraPrice: 0, isDefault: false, displayOrder: 3 },
      { id: 4, optionId: 1, name: "30% Đường (Rất ít ngọt)", extraPrice: 0, isDefault: false, displayOrder: 4 },
      { id: 5, optionId: 1, name: "0% Đường (Không đường)", extraPrice: 0, isDefault: false, displayOrder: 5 },
    ],
  },
  {
    id: 2,
    name: "Đá",
    isRequired: true,
    isMultiple: false,
    displayOrder: 2,
    values: [
      { id: 6, optionId: 2, name: "Bình thường (Đầy ly)", extraPrice: 0, isDefault: true, displayOrder: 1 },
      { id: 7, optionId: 2, name: "Ít đá (Nhiều nước)", extraPrice: 0, isDefault: false, displayOrder: 2 },
      { id: 8, optionId: 2, name: "Không đá", extraPrice: 0, isDefault: false, displayOrder: 3 },
      { id: 9, optionId: 2, name: "Túi đá riêng (Dành cho chai rót)", extraPrice: 0, isDefault: false, displayOrder: 4 },
    ],
  },
  {
    id: 3,
    name: "Topping & Thêm kem béo",
    isRequired: false,
    isMultiple: true,
    displayOrder: 3,
    values: [
      { id: 10, optionId: 3, name: "Thêm lớp Kem Trứng Muối béo ngậy", extraPrice: 10000, isDefault: false, displayOrder: 1 },
      { id: 11, optionId: 3, name: "Thêm lớp Kem Muối Huế mặn mà", extraPrice: 8000, isDefault: false, displayOrder: 2 },
      { id: 12, optionId: 3, name: "Thêm 1 shot cà phê đậm đặc", extraPrice: 7000, isDefault: false, displayOrder: 3 },
    ],
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "p1",
    categoryId: 1,
    name: "Cà hê đen",
    slug: "ca-he-den",
    description: "Cà phê đen phin Robusta Đắk Lắk đậm đà nguyên bản, vị đắng dịu hậu ngọt sâu chuẩn gu Cà Xòi",
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
    basePrice: 13000,
    isAvailable: true,
    isFeatured: true,
    prepTimeMinutes: 3,
    tags: ["BEST_SELLER", "SIGNATURE"],
    variants: [
      { id: 101, productId: "p1", sizeName: "Ly", extraPrice: 0, isDefault: true },
      { id: 102, productId: "p1", sizeName: "100ml", extraPrice: 12000, isDefault: false },
      { id: 103, productId: "p1", sizeName: "250ml", extraPrice: 37000, isDefault: false },
    ],
  },
  {
    id: "p2",
    categoryId: 1,
    name: "Cà hê sữa",
    slug: "ca-he-sua",
    description: "Cà phê phin đậm đà hòa quyện cùng sữa đặc ngọt béo thơm lừng truyền thống, uống là mê mẩn",
    imageUrl: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
    basePrice: 16000,
    isAvailable: true,
    isFeatured: true,
    prepTimeMinutes: 4,
    tags: ["BEST_SELLER", "SIGNATURE"],
    variants: [
      { id: 201, productId: "p2", sizeName: "Ly", extraPrice: 0, isDefault: true },
      { id: 202, productId: "p2", sizeName: "100ml", extraPrice: 9000, isDefault: false },
      { id: 203, productId: "p2", sizeName: "250ml", extraPrice: 36000, isDefault: false },
    ],
  },
  {
    id: "p3",
    categoryId: 1,
    name: "Bạc xĩuuuu",
    slug: "bac-xiuuuu",
    description: "Nhiều sữa béo thơm dịu ngọt quyện cùng một xíu cà phê thơm nhẹ nhàng, gu ngọt ngào cưng xỉu",
    imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80",
    basePrice: 19000,
    isAvailable: true,
    isFeatured: true,
    prepTimeMinutes: 4,
    tags: ["BEST_SELLER"],
    variants: [
      { id: 301, productId: "p3", sizeName: "Ly", extraPrice: 0, isDefault: true },
      { id: 302, productId: "p3", sizeName: "100ml", extraPrice: 7000, isDefault: false },
      { id: 303, productId: "p3", sizeName: "250ml", extraPrice: 28000, isDefault: false },
    ],
  },
  {
    id: "p4",
    categoryId: 2,
    name: "Cà hê múi huệ",
    slug: "ca-he-mui-hue",
    description: "Lớp kem muối béo mặn mượt mà đặc trưng xứ Huế, hòa quyện cà phê cốt phin đậm đà gây nghiện",
    imageUrl: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=600&auto=format&fit=crop&q=80",
    basePrice: 23000,
    isAvailable: true,
    isFeatured: true,
    prepTimeMinutes: 4,
    tags: ["SIGNATURE", "BEST_SELLER", "HOT"],
    variants: [
      { id: 401, productId: "p4", sizeName: "Ly", extraPrice: 0, isDefault: true },
      { id: 402, productId: "p4", sizeName: "100ml", extraPrice: 4000, isDefault: false },
      { id: 403, productId: "p4", sizeName: "250ml", extraPrice: 37000, isDefault: false },
    ],
  },
  {
    id: "p5",
    categoryId: 2,
    name: "Cà hê trứng múi",
    slug: "ca-he-trung-mui",
    description: "Signature Cà Xòi! Kem trứng muối vàng óng béo ngậy ngọt mặn, cực thơm bùi, nhấp một ngụm là tỉnh táo tức thì",
    imageUrl: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80",
    basePrice: 25000,
    isAvailable: true,
    isFeatured: true,
    prepTimeMinutes: 5,
    tags: ["SIGNATURE", "BEST_SELLER", "HOT"],
    variants: [
      { id: 501, productId: "p5", sizeName: "Ly", extraPrice: 0, isDefault: true },
      { id: 502, productId: "p5", sizeName: "100ml", extraPrice: 6000, isDefault: false },
      { id: 503, productId: "p5", sizeName: "250ml", extraPrice: 40000, isDefault: false },
    ],
  },
];

export const INITIAL_SETTINGS: BusinessSettings = {
  storeName: "Cà Xòi - Trạm Cấp Cứu Cơn Buồn Ngủ Công Sở",
  storeStatus: "OPEN",
  storeStatusMessage: "Tỉnh như sáo, báo như Xòi • Giao siêu tốc Hải Châu, Thanh Khê, Ngũ Hành Sơn, Đà Nẵng",
  hotline: "0905.249.733",
  openTime: "07:00",
  closeTime: "18:30",
  baseDeliveryFee: 15000,
  freeDeliveryMinCups: 3,
  maxSlotCapacityCups: 30,
  prepLeadTimeMinutes: 5,
  vietqrBankId: "MB",
  vietqrAccountNo: "999988886666",
  vietqrAccountName: "CA XOI CAFE",
  heroBadgeBrand: "🐾 Quán Cà Xòi",
  heroLocation: "Hải Châu, Thanh Khê, Ngũ Hành Sơn, Đà Nẵng",
  heroEyebrow: "Trạm cấp cứu cơn buồn ngủ công sở ☕",
  heroHeadlinePrimary: "“Tỉnh như sáo,",
  heroHeadlineHighlight: "báo như Xòi”",
  heroDescription:
    'Giao siêu tốc Đà Nẵng • Gom đơn cả phòng, Cà Xòi bao giá! Cà phê cốt đậm đà, kem trứng muối, kem muối Huế thơm ngậy. Không sợ đá tan làm nhạt vị khi họp hành dở dang, cứ cất một chai vào túi hoặc tủ lạnh văn phòng, lúc nào "sập nguồn" thì rót ra nhâm nhi ngay.',
  heroServiceNote: "🛵 Xòi ship hoặc khách ghé lấy để gặp Xòi",
  heroPriceBadge1: "🥤 Ly: từ 13.000đ",
  heroPriceBadge2: "🧴 Chai 100ml: từ 25.000đ",
  heroPriceBadge3: "🍶 Chai 250ml: từ 47.000đ",
  heroPrimaryCtaText: "Gom đơn cả phòng (Cà Xòi bao giá)",
  heroSecondaryCtaText: "Xem Bảng Menu Cà Xòi",
  heroWatermarkText: "CÀ XÒI •",
  heroLogoUrl: "/images/ca-xoi-logo.jpg",
  heroMascotTitle: "🐾 Mèo Xòi & Trái Xoài 🥭",
  heroMascotSubtitle: "Quán cà phê Internet • Đà Nẵng",
  facebookUrl: "https://www.facebook.com/caxoi2022?locale=vi_VN",
  qrFacebookTitle: "Facebook Cà Xòi",
  qrFacebookSubtitle: "Quét theo dõi",
  xanhSmUrl: "https://xanhsmngon.onelink.me/14WJ/5hxil4ex",
  qrXanhSmTitle: "Xòi chạy Xanh SM",
  qrXanhSmSubtitle: "Quét đặt giao",
};

// Initial in-memory operational state
class StoreDataLayer {
  public categories: Category[] = [...INITIAL_CATEGORIES];
  public products: Product[] = [...INITIAL_PRODUCTS];
  public options: ProductOption[] = [...INITIAL_OPTIONS];
  public settings: BusinessSettings = { ...INITIAL_SETTINGS };
  public orders: Order[] = [];

  public groupSessions: Record<string, GroupSession> = {};

  public resetToDefault() {
    this.categories = JSON.parse(JSON.stringify(INITIAL_CATEGORIES));
    this.products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
    this.options = JSON.parse(JSON.stringify(INITIAL_OPTIONS));
    this.settings = JSON.parse(JSON.stringify(INITIAL_SETTINGS));
  }
}

// Global singleton to persist across hot reloads in development
declare global {
  var __CAFE_STORE__: StoreDataLayer | undefined;
}

export const store = globalThis.__CAFE_STORE__ ?? new StoreDataLayer();
globalThis.__CAFE_STORE__ = store;
