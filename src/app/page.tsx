"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Coffee,
  Search,
  Sparkles,
  Users,
  Flame,
  Clock,
  Building2,
  Tag,
  AlertCircle,
  RotateCcw,
  MapPin,
  Phone,
  ShoppingBag,
  ArrowRight,
  Eye,
  X,
  CheckCircle2,
  LayoutGrid,
  ClipboardList,
} from "lucide-react";
import { Category, Product, ProductVariant, ProductOption, BusinessSettings, CartItem, Order } from "@/types";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/ProductCard";
import ProductDetailModal from "@/components/ProductDetailModal";
import CaXoiMenuBoard from "@/components/CaXoiMenuBoard";
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_OPTIONS, INITIAL_SETTINGS } from "@/lib/store";
import { getOperatingHoursStatus } from "@/lib/vietqr";
import { formatVND, MIN_LY_ORDER, MIN_LY_MESSAGE } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const { addToCart, lyCount } = useCart();

  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [options, setOptions] = useState<ProductOption[]>(INITIAL_OPTIONS);
  const [settings, setSettings] = useState<BusinessSettings>(INITIAL_SETTINGS);

  const [activeCategoryId, setActiveCategoryId] = useState<number>(0); // 0 = All
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("ALL"); // 'ALL', 'BEST_SELLER', 'NEW', 'OFFICE_COMBO'
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantName, setSelectedVariantName] = useState<string | undefined>(undefined);
  const [menuViewMode, setMenuViewMode] = useState<"BOARD" | "GRID">("BOARD");
  const [lyToastMsg, setLyToastMsg] = useState<string | null>(null);

  // Multi-purpose lookup for re-order (Phone / Name / Order Code)
  const [lookupPhone, setLookupPhone] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [recentOrderMsg, setRecentOrderMsg] = useState<string | null>(null);
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem("caxoi_customer_lookup") ||
        localStorage.getItem("caxoi_customer_phone");
      if (saved) {
        setLookupPhone(saved);
      }
    } catch {}
  }, []);

  // Fetch updated data from API with real-time sync
  const fetchMenu = () => {
    fetch("/api/menu", { cache: "no-store", headers: { "Cache-Control": "no-cache" } })
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setCategories(res.data.categories);
          setProducts(res.data.products);
          setOptions(res.data.options);
          setSettings(res.data.settings);
        }
      })
      .catch((err) => console.error("Error fetching menu:", err));
  };

  useEffect(() => {
    fetchMenu();

    // 1. Tự động đồng bộ ngay khi người dùng chuyển lại tab Trang Khách từ tab Admin
    const handleFocus = () => fetchMenu();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") fetchMenu();
    });

    // 2. Nhận tín hiệu cập nhật thời gian thực từ tab Admin qua LocalStorage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "caxoi_menu_updated_at") {
        fetchMenu();
      }
    };
    window.addEventListener("storage", handleStorage);

    // 3. Tự động làm mới định kỳ mỗi 5 giây để đồng bộ với DB Browser for SQLite
    const interval = setInterval(fetchMenu, 5000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category match
      if (activeCategoryId !== 0 && p.categoryId !== activeCategoryId) {
        return false;
      }
      // Tag match
      if (selectedTag !== "ALL" && !p.tags.includes(selectedTag)) {
        return false;
      }
      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [products, activeCategoryId, selectedTag, searchQuery]);

  // Category item counts
  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    products.forEach((p) => {
      counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
    });
    return counts;
  }, [products]);

  const handleLookupRecentOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = lookupPhone.trim();
    if (!q) return;

    setIsLookingUp(true);
    setRecentOrderMsg(null);
    setFoundOrder(null);

    try {
      // Tự động nhận diện: Nếu là chuỗi số thuần thì thử tìm theo phone trước, nếu không thì tìm theo search tổng hợp
      const isPhone = /^[0-9+]+$/.test(q);
      const url = isPhone
        ? `/api/orders?phone=${encodeURIComponent(q)}`
        : `/api/orders?search=${encodeURIComponent(q)}`;

      let res = await fetch(url);
      let data = await res.json();

      // Nếu tìm theo phone mà không thấy, fallback sang tìm theo search tổng hợp
      if ((!data.success || !data.data || data.data.length === 0) && isPhone) {
        res = await fetch(`/api/orders?search=${encodeURIComponent(q)}`);
        data = await res.json();
      }

      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        const latest: Order = data.data[0];
        setFoundOrder(latest);
        setRecentOrderMsg(null);
        try {
          localStorage.setItem("caxoi_customer_lookup", q);
        } catch {}
      } else {
        setFoundOrder(null);
        setRecentOrderMsg(
          `Không tìm thấy đơn hàng nào khớp với "${q}". Bạn có thể thử tìm theo Số điện thoại, Tên người nhận hoặc Mã đơn (#CF...).`
        );
      }
    } catch {
      setFoundOrder(null);
      setRecentOrderMsg("Không thể kiểm tra lịch sử lúc này. Vui lòng thử lại sau.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleReorder = () => {
    if (!foundOrder || !foundOrder.items || foundOrder.items.length === 0) return;
    setIsReordering(true);

    try {
      foundOrder.items.forEach((item, idx) => {
        // Tìm sản phẩm khớp từ danh sách menu
        const matchedProduct: Product = products.find((p) => p.id === item.productId) || {
          id: item.productId,
          name: item.productName,
          slug: item.productId,
          categoryId: 1,
          description: "",
          basePrice: item.unitPrice,
          imageUrl: "/images/ca-phe-den.jpg",
          isAvailable: true,
          isFeatured: false,
          prepTimeMinutes: 5,
          tags: [],
          variants: [],
        };

        // Tìm variant khớp
        const matchedVariant: ProductVariant = matchedProduct.variants.find(
          (v) => v.sizeName === item.variantName
        ) || {
          id: idx + 1,
          productId: matchedProduct.id,
          sizeName: item.variantName || "Chuẩn",
          extraPrice: 0,
          isDefault: true,
        };

        const selectedOptions = (item.options || []).map((o) => ({
          optionName: o.optionName,
          valueName: o.valueName,
          extraPrice: o.price,
        }));

        const cartItem: CartItem = {
          cartItemId: `reorder-${item.productId}-${Date.now()}-${idx}`,
          product: matchedProduct,
          variant: matchedVariant,
          selectedOptions,
          quantity: item.quantity,
          recipientLabel: item.recipientLabel,
          notes: item.itemNotes,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        };

        addToCart(cartItem);
      });

      router.push("/cart");
    } catch (err) {
      console.error("Lỗi khi thêm đơn cũ vào giỏ:", err);
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <div className="w-full">
      {/* 1. HERO BANNER CÀ XÒI - FULL SCREEN */}
      <section
        style={{ backgroundColor: "#140A06" }}
        className="relative w-full min-h-[calc(100vh-61px)] flex items-center overflow-hidden bg-coffee-950 bg-gradient-to-br from-[#140A06] via-[#23120B] to-[#3B1E13] text-white py-10 sm:py-14 lg:py-16 shadow-xl border-b border-pink-900/30"
      >
        {/* Cute watermark pattern */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none select-none text-[20px] sm:text-[24px] font-black tracking-widest text-pink-300 leading-relaxed overflow-hidden whitespace-nowrap">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="-ml-8">
              CÀ XÒI • CÀ XÒI • CÀ XÒI • CÀ XÒI • CÀ XÒI • CÀ XÒI • CÀ XÒI • CÀ XÒI • CÀ XÒI • CÀ XÒI • CÀ XÒI
            </div>
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-8 lg:gap-12">
          <div className="max-w-2xl space-y-4 sm:space-y-5">
            {/* Tag / Location Pill */}
            <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-pink-200 text-xs sm:text-sm font-bold tracking-wide">
              <span>🐾 Quán Cà Xòi</span>
              <span className="text-pink-300">•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-pink-300" />
                Hải Châu, Thanh Khê, Ngũ Hành Sơn, Đà Nẵng
              </span>
            </div>

            {/* Official Slogan */}
            <div className="space-y-1.5">
              <span className="text-rose-400 font-extrabold text-sm sm:text-base lg:text-lg tracking-wide uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                Trạm cấp cứu cơn buồn ngủ công sở ☕
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-white">
                “Tỉnh như sáo, <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-rose-300 to-amber-300">
                  báo như Xòi”
                </span>
              </h1>
            </div>

            <p className="text-sm sm:text-base lg:text-[17px] text-pink-100/90 leading-relaxed max-w-xl">
              {'Giao siêu tốc Đà Nẵng - Gom đơn cả phòng, Cà Xòi bao giá! Cà phê cốt đậm đà, kem trứng muối, kem muối Huế thơm ngậy. Không sợ đá tan làm nhạt vị khi họp hành dở dang — cứ cất một chai vào túi hoặc tủ lạnh văn phòng, lúc nào "sập nguồn" thì rót ra nhâm nhi ngay.'}
            </p>

            {/* Service & Hotline highlight */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs font-bold">
              <span className="px-3 py-1.5 rounded-lg bg-pink-500/20 text-pink-200 border border-pink-400/30">
                🛵 Xòi ship hoặc khách ghé lấy để gặp Xòi
              </span>
              <a
                href="tel:0905249733"
                className="px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-300/40 transition-colors flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-amber-300" />
                0905.249.733
              </a>
            </div>

            {/* Quick Pricing Highlights */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs font-bold">
              <span className="px-3 py-1.5 rounded-lg bg-white/10 text-pink-100 border border-white/10">
                🥤 Ly: từ <span className="text-amber-300 font-extrabold">13.000đ</span>
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-white/10 text-pink-100 border border-white/10">
                🧴 Chai 100ml: từ <span className="text-amber-300 font-extrabold">25.000đ</span>
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-white/10 text-pink-100 border border-white/10">
                🍶 Chai 250ml: từ <span className="text-amber-300 font-extrabold">47.000đ</span>
              </span>
            </div>

            <div className="pt-3 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                href="/group-order"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-md transition-all active:scale-95"
              >
                <Users className="w-4 h-4" />
                <span>Gom đơn cả phòng (Cà Xòi bao giá)</span>
              </Link>

              <a
                href="#menu"
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm px-5 py-3 rounded-xl backdrop-blur-sm transition-all"
              >
                <Coffee className="w-4 h-4 text-amber-300" />
                <span>Xem Bảng Menu Cà Xòi</span>
              </a>
            </div>
          </div>

          {/* Right Official Logo & Mascot Card */}
          <div className="relative shrink-0 flex flex-col items-center justify-center p-4 sm:p-5 bg-gradient-to-b from-pink-200/20 via-pink-300/10 to-transparent rounded-3xl border border-pink-300/20 shadow-inner">
            <div className="w-48 sm:w-64 lg:w-72 h-48 sm:h-64 lg:h-72 rounded-2xl overflow-hidden border-2 border-pink-300/60 shadow-2xl bg-[#FFD1E3] relative mb-3 group">
              <Image
                src="/images/ca-xoi-logo.jpg"
                alt="Logo Quán Cà Xòi"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                priority
              />
            </div>
            <div className="text-center space-y-1">
              <span className="inline-block bg-white text-coffee-950 font-black text-xs sm:text-sm px-3.5 py-1 rounded-full shadow-md">
                🐾 Mèo Xòi & Trái Xoài 🥭
              </span>
              <p className="text-[11px] sm:text-xs text-pink-200 font-semibold">
                Quán cà phê Internet • Đà Nẵng
              </p>
            </div>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute -right-16 -bottom-16 w-96 h-96 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      </section>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 2. OPERATIONAL STATUS & VOUCHERS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Status card */}
        {(() => {
          const hoursInfo = getOperatingHoursStatus(settings.openTime, settings.closeTime);
          const isPaused = settings.storeStatus === "PAUSED";
          const isClosed = settings.storeStatus === "CLOSED" || (!hoursInfo.isWithinHours && settings.storeStatus === "OPEN");
          const isOpen = settings.storeStatus === "OPEN" && hoursInfo.isWithinHours;

          return (
            <div className="bg-white rounded-2xl p-3.5 border border-coffee-100 shadow-sm flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isOpen
                    ? "bg-emerald-50 text-emerald-600"
                    : isPaused
                    ? "bg-amber-50 text-amber-600"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isOpen
                        ? "bg-emerald-500 animate-pulse"
                        : isPaused
                        ? "bg-amber-500 animate-pulse"
                        : "bg-stone-400"
                    }`}
                  />
                  <span className="text-xs font-bold text-coffee-900 leading-snug">
                    {isOpen
                      ? "Đang mở cửa phục vụ"
                      : isPaused
                      ? "Tạm dừng nhận đơn"
                      : "Quán đang đóng cửa"}
                  </span>
                  <span className="text-[10px] font-semibold text-coffee-500 bg-coffee-50 px-1.5 py-0.5 rounded border border-coffee-100 shrink-0">
                    {settings.openTime} - {settings.closeTime}
                  </span>
                </div>
                <p className="text-[11px] text-coffee-500 mt-0.5 leading-snug">
                  {settings.storeStatusMessage || hoursInfo.remainingMessage}
                </p>
              </div>
            </div>
          );
        })()}

        {/* Voucher 1 */}
        <div className="bg-amber-50/60 rounded-2xl p-3.5 border border-amber-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Tag className="w-5 h-5 text-caramel shrink-0" />
            <div>
              <span className="text-xs font-bold text-coffee-900">Mã: CHAOBANMOI</span>
              <p className="text-[11px] text-coffee-600">Giảm 20% cho đơn đầu tiên</p>
            </div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText("CHAOBANMOI")}
            className="text-[11px] font-bold text-caramel hover:underline px-2 py-1 bg-white rounded-lg border border-amber-200"
          >
            Copy
          </button>
        </div>

        {/* Voucher 2 */}
        <div className="bg-amber-50/60 rounded-2xl p-3.5 border border-amber-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Tag className="w-5 h-5 text-caramel shrink-0" />
            <div>
              <span className="text-xs font-bold text-coffee-900">Mã: OFFICE50K</span>
              <p className="text-[11px] text-coffee-600">Giảm 50k cho đơn từ 200k</p>
            </div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText("OFFICE50K")}
            className="text-[11px] font-bold text-caramel hover:underline px-2 py-1 bg-white rounded-lg border border-amber-200"
          >
            Copy
          </button>
        </div>
      </div>

      {/* 3. QUICK 1-CLICK REORDER LOOKUP */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-coffee-100 shadow-sm space-y-3">
        <form onSubmit={handleLookupRecentOrder} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4 text-caramel" />
            </div>
            <div>
              <span className="text-xs font-bold text-coffee-950 block">Khách quen đặt lại nhanh</span>
              <span className="text-[10px] text-coffee-500 hidden sm:block">Tìm theo Tên, SĐT hoặc Mã đơn (#CF...)</span>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Nhập Số điện thoại, Tên của bạn hoặc Mã đơn..."
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-coffee-200 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-caramel/40 text-coffee-950 font-medium placeholder:text-stone-400 transition-all"
              />
              {lookupPhone && (
                <button
                  type="button"
                  onClick={() => {
                    setLookupPhone("");
                    setFoundOrder(null);
                    setRecentOrderMsg(null);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isLookingUp}
              className="text-xs font-bold bg-coffee-800 hover:bg-coffee-900 text-white px-4 py-2.5 rounded-xl shadow-sm transition-all shrink-0 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5 text-amber-300" />
              <span>{isLookingUp ? "Đang tìm..." : "Kiểm tra"}</span>
            </button>
          </div>
        </form>

        {/* Not found message */}
        {recentOrderMsg && (
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="flex-1 leading-relaxed">{recentOrderMsg}</p>
          </div>
        )}

        {/* Found Order Card */}
        {foundOrder && (
          <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white border border-amber-200 rounded-2xl p-4 space-y-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/70 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-coffee-950 bg-amber-200 text-coffee-900 px-2.5 py-1 rounded-lg shadow-sm">
                  #{foundOrder.orderCode}
                </span>
                <span className="text-xs font-bold text-coffee-800">
                  {foundOrder.recipientName} {foundOrder.recipientPhone && `(${foundOrder.recipientPhone})`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-amber-300 text-coffee-800">
                  {foundOrder.status === "PENDING_PAYMENT" && "⏳ Chờ thanh toán"}
                  {foundOrder.status === "CONFIRMED" && "✓ Quán đã nhận"}
                  {foundOrder.status === "BREWING" && "☕ Đang pha chế"}
                  {foundOrder.status === "READY" && "📦 Sẵn sàng giao"}
                  {foundOrder.status === "DELIVERING" && "🛵 Đang giao"}
                  {foundOrder.status === "COMPLETED" && "✓ Đã hoàn thành"}
                  {foundOrder.status === "CANCELLED" && "✕ Đã hủy"}
                </span>
                <button
                  type="button"
                  onClick={() => setFoundOrder(null)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                  title="Đóng kết quả"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List of items */}
            <div className="space-y-1.5 text-xs text-coffee-800 bg-white/80 p-3 rounded-xl border border-amber-100">
              {foundOrder.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-caramel" />
                    <span className="font-bold text-coffee-950">
                      {item.quantity}x {item.productName}
                    </span>
                    <span className="text-coffee-600 font-medium">
                      ({item.variantName || "Chuẩn"})
                    </span>
                    {item.options && item.options.length > 0 && (
                      <span className="text-[11px] text-coffee-400 hidden sm:inline">
                        • {item.options.map((o) => o.valueName).join(", ")}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-coffee-800 whitespace-nowrap">
                    {formatVND(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions: Re-order in 1-click & Track order */}
            <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-coffee-500 font-medium">
                  Tổng tiền ({foundOrder.items.reduce((s, i) => s + i.quantity, 0)} ly):{" "}
                </span>
                <span className="font-black text-caramel text-sm">
                  {formatVND(foundOrder.totalAmount)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/order/${foundOrder.orderCode}`}
                  className="px-3.5 py-2 rounded-xl border border-coffee-200 bg-white hover:bg-stone-50 text-coffee-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5 text-caramel" />
                  <span>Xem tiến trình</span>
                </Link>
                <button
                  type="button"
                  onClick={handleReorder}
                  disabled={isReordering}
                  className="px-4 py-2 rounded-xl bg-coffee-800 hover:bg-coffee-900 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isReordering ? "Đang đưa vào giỏ..." : "Đặt lại đơn này (3s)"}</span>
                  <ArrowRight className="w-3 h-3 text-amber-300" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. MENU SECTION ANCHOR */}
      <section id="menu" className="space-y-4 pt-2">
        {/* Search & Tag Chips */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-coffee-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm cà phê, trà đào, bánh croissant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs sm:text-sm pl-9 pr-4 py-2.5 rounded-xl border border-coffee-200 bg-white focus:outline-none focus:ring-2 focus:ring-caramel/40 placeholder:text-coffee-400 shadow-sm"
            />
          </div>

          {/* Quick Tag Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => setSelectedTag("ALL")}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
                selectedTag === "ALL"
                  ? "bg-coffee-800 text-white shadow-sm"
                  : "bg-white text-coffee-700 hover:bg-coffee-100 border border-coffee-200"
              }`}
            >
              Tất cả món
            </button>
            <button
              type="button"
              onClick={() => setSelectedTag("BEST_SELLER")}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1 transition-all whitespace-nowrap ${
                selectedTag === "BEST_SELLER"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-white text-coffee-700 hover:bg-coffee-100 border border-coffee-200"
              }`}
            >
              <Flame className="w-3 h-3 text-amber-300" /> Bán chạy
            </button>
            <button
              type="button"
              onClick={() => setSelectedTag("NEW")}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1 transition-all whitespace-nowrap ${
                selectedTag === "NEW"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-coffee-700 hover:bg-coffee-100 border border-coffee-200"
              }`}
            >
              <Sparkles className="w-3 h-3" /> Món mới
            </button>
            <button
              type="button"
              onClick={() => setSelectedTag("OFFICE_COMBO")}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1 transition-all whitespace-nowrap ${
                selectedTag === "OFFICE_COMBO"
                  ? "bg-caramel text-white shadow-sm"
                  : "bg-white text-coffee-700 hover:bg-coffee-100 border border-coffee-200"
              }`}
            >
              Combo Sáng/Chiều
            </button>
          </div>
        </div>

        {/* Horizontal Category Sticky Chips & View Switcher */}
        <div className="sticky top-[61px] z-30 bg-cream/95 backdrop-blur-md py-2 -mx-4 px-4 border-b border-coffee-100 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveCategoryId(0)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeCategoryId === 0
                  ? "bg-coffee-800 text-white shadow-sm"
                  : "bg-white text-coffee-700 border border-coffee-200 hover:border-coffee-300"
              }`}
            >
              <span>Tất cả</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  activeCategoryId === 0 ? "bg-white/25 text-white" : "bg-coffee-100 text-coffee-600"
                }`}
              >
                {products.length}
              </span>
            </button>
            {categories.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    activeCategoryId === cat.id
                      ? "bg-coffee-800 text-white shadow-sm"
                      : "bg-white text-coffee-700 border border-coffee-200 hover:border-coffee-300"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      activeCategoryId === cat.id ? "bg-white/25 text-white" : "bg-coffee-100 text-coffee-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode Switcher Toggle */}
          <div className="flex items-center bg-coffee-100/80 p-0.5 rounded-xl border border-coffee-200/60 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => setMenuViewMode("BOARD")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                menuViewMode === "BOARD"
                  ? "bg-white text-[#3B2219] shadow-sm"
                  : "text-coffee-600 hover:text-coffee-900"
              }`}
              title="Xem Bảng Menu Quán Cà Xòi"
            >
              <ClipboardList className="w-3.5 h-3.5 text-[#3B2219]" />
              <span className="hidden sm:inline">Bảng Menu</span>
            </button>
            <button
              type="button"
              onClick={() => setMenuViewMode("GRID")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                menuViewMode === "GRID"
                  ? "bg-white text-[#3B2219] shadow-sm"
                  : "text-coffee-600 hover:text-coffee-900"
              }`}
              title="Xem Lưới Thẻ Ảnh Món"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#3B2219]" />
              <span className="hidden sm:inline">Lưới Ảnh</span>
            </button>
          </div>
        </div>

        {/* CÀ XÒI OFFICIAL MENU BOARD or PRODUCT GRID */}
        {menuViewMode === "BOARD" ? (
          <div className="space-y-4">
            <CaXoiMenuBoard
              products={products}
              activeCategoryId={activeCategoryId}
              searchQuery={searchQuery}
              onSelectProductVariant={(product, variantName) => {
                setSelectedVariantName(variantName);
                setSelectedProduct(product);
              }}
            />

            {/* Switch to Grid Prompt Banner */}
            <div className="bg-white rounded-2xl p-4 border border-coffee-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-caramel/10 border border-caramel/20 flex items-center justify-center text-caramel shrink-0">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-coffee-900">
                    Khám phá toàn bộ {products.length} món với hình ảnh thực tế
                  </h4>
                  <p className="text-[11px] text-coffee-500">
                    Xem chi tiết mô tả thành phần, mức đường/đá và topping của từng món
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuViewMode("GRID")}
                className="px-4 py-2 bg-coffee-800 text-white rounded-xl text-xs font-bold hover:bg-coffee-900 transition-all flex items-center gap-1.5 shadow-sm shrink-0"
              >
                <span>Xem Lưới Thẻ Món</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Product Grid */
          filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-coffee-100 space-y-3">
              <AlertCircle className="w-10 h-10 text-coffee-400 mx-auto" />
              <h3 className="text-base font-bold text-coffee-800">Không tìm thấy món phù hợp</h3>
              <p className="text-xs text-coffee-500">
                Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc danh mục.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategoryId(0);
                  setSelectedTag("ALL");
                }}
                className="text-xs font-bold text-caramel hover:underline"
              >
                Xem lại toàn bộ Menu
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-black text-coffee-900 flex items-center gap-1.5">
                  <span>🖼️ Danh sách chi tiết món Cà Xòi ({filteredProducts.length} món)</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setMenuViewMode("BOARD")}
                  className="text-xs font-bold text-caramel hover:underline flex items-center gap-1"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Xem Bảng Menu Hồng</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={(p) => {
                      setSelectedVariantName(undefined);
                      setSelectedProduct(p);
                    }}
                  />
                ))}
              </div>
            </div>
          )
        )}
      </section>
      </div>

      {/* 5-Ly Minimum Toast Notification */}
      {Boolean(lyToastMsg) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] w-[92%] max-w-md bg-rose-600 text-white px-4 py-3 rounded-2xl shadow-2xl border border-rose-400/50 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold animate-fade-in">
          <span>{lyToastMsg}</span>
          <span className="shrink-0 bg-white/20 px-2.5 py-1 rounded-full text-[11px] font-extrabold">
            {lyCount}/{MIN_LY_ORDER} ly
          </span>
        </div>
      )}

      {/* Product Detail Customization Modal */}
      <ProductDetailModal
        product={selectedProduct}
        options={options}
        initialVariantName={selectedVariantName}
        existingLyCount={lyCount}
        onClose={() => {
          setSelectedProduct(null);
          setSelectedVariantName(undefined);
        }}
        onAddToCart={(item: CartItem) => {
          addToCart(item);
          if (item.variant.sizeName === "Ly" && lyCount + item.quantity < MIN_LY_ORDER) {
            setLyToastMsg(MIN_LY_MESSAGE);
            setTimeout(() => {
              setLyToastMsg("");
            }, 4000);
          }
        }}
      />
    </div>
  );
}
