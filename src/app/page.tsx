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
import WatermarkPattern from "@/components/WatermarkPattern";
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_OPTIONS, INITIAL_SETTINGS } from "@/lib/store";
import { getOperatingHoursStatus } from "@/lib/vietqr";
import {
  formatVND,
  MIN_LY_ORDER,
  MIN_LY_MESSAGE,
  FACEBOOK_FANPAGE_URL,
  XANH_SM_ONELINK,
  getQrImageSrc,
  getTelHref,
} from "@/lib/utils";

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
      {/* 1. HERO BANNER CÀ XÒI - LIGHT THEME 2/3 + 1/3 */}
      <section className="relative w-full overflow-hidden bg-gradient-to-br from-[#FFFDF9] via-[#FFF4F8] to-[#FFE7F0] text-coffee-950 py-8 sm:py-12 lg:py-16 shadow-sm border-b border-pink-200/80">
        {/* Cute seamless watermark pattern filling 100% width & height */}
        {settings.heroWatermarkText && (
          <WatermarkPattern
            patternId="hero-caxoi-watermark"
            text={settings.heroWatermarkText}
            color="#9D174D"
            opacity={0.045}
            tileWidth={184}
            tileHeight={72}
            fontSize={22}
            letterSpacing="0.1em"
          />
        )}

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-8 grid grid-cols-1 md:grid-cols-12 items-center gap-7 lg:gap-10">
          {/* Left Content: 2/3 width (8/12) so copy flows smoothly without empty center gaps */}
          <div className="md:col-span-8 w-full space-y-4 sm:space-y-5">
            {/* Tag / Location Pill */}
            <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-100/90 border border-pink-300/70 text-rose-900 text-xs sm:text-sm font-bold tracking-wide shadow-sm">
              <span>{settings.heroBadgeBrand}</span>
              {settings.heroLocation && (
                <>
                  <span className="text-rose-400">•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    {settings.heroLocation}
                  </span>
                </>
              )}
            </div>

            {/* Official Slogan */}
            <div className="space-y-2">
              {settings.heroEyebrow && (
                <span className="text-rose-600 font-extrabold text-sm sm:text-base lg:text-lg tracking-wide uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                  {settings.heroEyebrow}
                </span>
              )}
              <h1 className="text-3xl sm:text-5xl xl:text-[3.4rem] font-black tracking-tight leading-[1.12] text-coffee-950">
                {settings.heroHeadlinePrimary}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600">
                  {settings.heroHeadlineHighlight}
                </span>
              </h1>
            </div>

            {settings.heroDescription && (
              <p className="text-sm sm:text-base lg:text-[17px] text-coffee-800 leading-relaxed w-full">
                {settings.heroDescription}
              </p>
            )}

            {/* Service & Hotline highlight */}
            <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-xs font-bold">
              {settings.heroServiceNote && (
                <span className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200/80 shadow-sm">
                  {settings.heroServiceNote}
                </span>
              )}
              <a
                href={getTelHref(settings.hotline)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-100/90 hover:bg-amber-200/80 text-amber-950 border border-amber-300/80 shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-amber-700" />
                {settings.hotline}
              </a>
            </div>

            {/* Quick Pricing Highlights */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold">
              {[settings.heroPriceBadge1, settings.heroPriceBadge2, settings.heroPriceBadge3]
                .filter((b) => Boolean(b && b.trim()))
                .map((badgeText, idx) => {
                  const colonIdx = badgeText.indexOf(":");
                  if (colonIdx !== -1 && colonIdx < badgeText.length - 1) {
                    return (
                      <span
                        key={idx}
                        className="px-3.5 py-1.5 rounded-xl bg-white/90 text-coffee-900 border border-pink-200/80 shadow-sm"
                      >
                        {badgeText.slice(0, colonIdx + 1)}{" "}
                        <span className="text-rose-600 font-extrabold">
                          {badgeText.slice(colonIdx + 1).trim()}
                        </span>
                      </span>
                    );
                  }
                  return (
                    <span
                      key={idx}
                      className="px-3.5 py-1.5 rounded-xl bg-white/90 text-coffee-900 border border-pink-200/80 shadow-sm"
                    >
                      {badgeText}
                    </span>
                  );
                })}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                href="/group-order"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-md shadow-rose-500/20 transition-all active:scale-95"
              >
                <Users className="w-4 h-4" />
                <span>{settings.heroPrimaryCtaText || INITIAL_SETTINGS.heroPrimaryCtaText}</span>
              </Link>

              <a
                href="#menu"
                className="inline-flex items-center gap-1.5 bg-white hover:bg-pink-50 text-coffee-900 border border-coffee-200 font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-sm transition-all"
              >
                <Coffee className="w-4 h-4 text-caramel" />
                <span>{settings.heroSecondaryCtaText || INITIAL_SETTINGS.heroSecondaryCtaText}</span>
              </a>
            </div>
          </div>

          {/* Right Official Logo & Dual QR Card: 1/3 width (4/12) */}
          <div className="md:col-span-4 relative flex flex-col items-center justify-center p-4 sm:p-5 bg-white/80 backdrop-blur-md rounded-3xl border border-pink-200/90 shadow-xl shadow-pink-200/35 w-full max-w-[348px] mx-auto md:ml-auto md:mr-0">
            <div className="w-full max-w-[290px] aspect-square rounded-2xl overflow-hidden border-2 border-pink-300/70 shadow-lg bg-[#FFD1E3] relative mb-3 group">
              <Image
                src={settings.heroLogoUrl || "/images/ca-xoi-logo.jpg"}
                alt="Logo Quán Cà Xòi"
                fill
                unoptimized
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                priority
              />
            </div>
            <div className="text-center space-y-1">
              {settings.heroMascotTitle && (
                <span className="inline-block bg-pink-100 text-coffee-950 border border-pink-200/80 font-black text-xs sm:text-sm px-3.5 py-1 rounded-full shadow-sm">
                  {settings.heroMascotTitle}
                </span>
              )}
              {settings.heroMascotSubtitle && (
                <p className="text-[11px] sm:text-xs text-coffee-600 font-semibold">
                  {settings.heroMascotSubtitle}
                </p>
              )}
            </div>

            {/* Dual QR Codes: Facebook Fanpage + Xòi chạy Xanh SM */}
            <div className="w-full max-w-[290px] grid grid-cols-2 gap-2.5 mt-3">
              <a
                href={settings.facebookUrl || FACEBOOK_FANPAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-pink-50/75 hover:bg-blue-50/90 border border-pink-200/85 hover:border-blue-300 rounded-2xl p-2 flex flex-col items-center gap-1.5 transition-all hover:scale-[1.03] active:scale-95 shadow-sm"
                title="Quét mã hoặc nhấn để mở Fanpage Facebook Cà Xòi"
              >
                <div className="w-full aspect-square bg-white rounded-xl p-2 flex items-center justify-center shadow-inner border border-pink-100">
                  <Image
                    src={getQrImageSrc(settings.facebookUrl, "facebook")}
                    alt={settings.qrFacebookTitle || "QR Fanpage Facebook Cà Xòi"}
                    width={120}
                    height={120}
                    unoptimized
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-center leading-tight">
                  <span className="block text-[10px] sm:text-[11px] font-black text-coffee-950 group-hover:text-blue-700">
                    {settings.qrFacebookTitle || INITIAL_SETTINGS.qrFacebookTitle}
                  </span>
                  <span className="block text-[9px] font-semibold text-coffee-600">
                    {settings.qrFacebookSubtitle || INITIAL_SETTINGS.qrFacebookSubtitle}
                  </span>
                </div>
              </a>

              <a
                href={settings.xanhSmUrl || XANH_SM_ONELINK}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-emerald-50/85 hover:bg-emerald-100/90 border border-emerald-200 hover:border-emerald-400 rounded-2xl p-2 flex flex-col items-center gap-1.5 transition-all hover:scale-[1.03] active:scale-95 shadow-sm"
                title="Quét mã hoặc nhấn để đặt Cà Xòi qua Xanh SM Ngon"
              >
                <div className="w-full aspect-square bg-white rounded-xl p-2 flex items-center justify-center shadow-inner border border-emerald-100">
                  <Image
                    src={getQrImageSrc(settings.xanhSmUrl, "xanhsm")}
                    alt={settings.qrXanhSmTitle || "QR Xòi chạy Xanh SM"}
                    width={120}
                    height={120}
                    unoptimized
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-center leading-tight">
                  <span className="block text-[10px] sm:text-[11px] font-black text-emerald-950 group-hover:text-emerald-700">
                    {settings.qrXanhSmTitle || INITIAL_SETTINGS.qrXanhSmTitle}
                  </span>
                  <span className="block text-[9px] font-semibold text-emerald-700">
                    {settings.qrXanhSmSubtitle || INITIAL_SETTINGS.qrXanhSmSubtitle}
                  </span>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Soft pastel ambient glows */}
        <div className="absolute -right-16 -bottom-16 w-96 h-96 rounded-full bg-pink-300/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-amber-200/25 blur-3xl pointer-events-none" />
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-4 space-y-6">
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
      </div>

      {/* 4. MENU SECTION ANCHOR - FULL SCREEN WIDTH */}
      <section id="menu" className="w-full pt-2">
        {/* Search & Tag Chips */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pb-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
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
        <div className="sticky top-[61px] z-30 bg-cream/95 backdrop-blur-md py-2 border-y border-coffee-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
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
        </div>

        {/* CÀ XÒI OFFICIAL MENU BOARD or PRODUCT GRID */}
        {menuViewMode === "BOARD" ? (
          <div className="w-full">
            <CaXoiMenuBoard
              products={products}
              activeCategoryId={activeCategoryId}
              searchQuery={searchQuery}
              xanhSmUrl={settings.xanhSmUrl}
              onSelectProductVariant={(product, variantName) => {
                setSelectedVariantName(variantName);
                setSelectedProduct(product);
              }}
            />

            {/* Switch to Grid Prompt Banner */}
            <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 pb-8">
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
          </div>
        ) : (
          /* Product Grid */
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
          {filteredProducts.length === 0 ? (
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
          )}
          </div>
        )}
      </section>

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
