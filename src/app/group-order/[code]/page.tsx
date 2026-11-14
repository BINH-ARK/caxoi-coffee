"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Users,
  Share2,
  Plus,
  Lock,
  Trash2,
  Check,
  Coffee,
  Sparkles,
  ArrowLeft,
  Building,
  RefreshCw,
  Search,
  QrCode,
  Copy,
  Receipt,
  Printer,
  Tag,
  Clock,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Flame,
} from "lucide-react";
import { GroupSession, Product, ProductOption, Category, CartItem, OrderItemRecord } from "@/types";
import { formatVND, MIN_LY_ORDER, countLyItems, getMinLyValidationError } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import ProductDetailModal from "@/components/ProductDetailModal";
import CupStickerPreview from "@/components/CupStickerPreview";
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, INITIAL_OPTIONS, INITIAL_SETTINGS } from "@/lib/store";

export default function GroupOrderPage({ params }: { params: { code: string } }) {
  const { code } = params;
  const router = useRouter();
  const { addToCart, clearCart } = useCart();

  const [session, setSession] = useState<GroupSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBill, setCopiedBill] = useState(false);

  // Active view tab for group order
  const [activeTab, setActiveTab] = useState<"ITEMS" | "SPLIT_BILL" | "STICKERS">("ITEMS");

  // Track who has paid in the office group (local storage / state)
  const [paidStatusMap, setPaidStatusMap] = useState<Record<string, boolean>>({});

  // QR Modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Sticker Single Preview Modal
  const [stickerPreviewItem, setStickerPreviewItem] = useState<CartItem | null>(null);

  // Add Item Modal
  const [isAddingModalOpen, setIsAddingModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [memberName, setMemberName] = useState("");

  // Categories & Products filter state
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [options, setOptions] = useState<ProductOption[]>(INITIAL_OPTIONS);
  const [selectedCategory, setSelectedCategory] = useState<number | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [groupCheckoutError, setGroupCheckoutError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Remaining time countdown
  const [timeLeftStr, setTimeLeftStr] = useState<string>("");

  // Fetch group session
  const fetchSession = async (showSpin = false) => {
    if (showSpin) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/group-orders?code=${code}`);
      const data = await res.json();
      if (data.success) {
        setSession(data.data);
      }
    } catch (e) {
      console.error("Error fetching group session", e);
    } finally {
      setIsLoading(false);
      if (showSpin) setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Fetch full live menu
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch("/api/menu");
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.categories?.length) setCategories(data.data.categories);
          if (data.data.products?.length) setProducts(data.data.products);
          if (data.data.options?.length) setOptions(data.data.options);
        }
      } catch (e) {
        // Fallback to initial values
      }
    };
    fetchMenu();
  }, []);

  // Poll room every 4s
  useEffect(() => {
    fetchSession();
    const interval = setInterval(() => fetchSession(false), 4000);
    return () => clearInterval(interval);
  }, [code]);

  // Load saved member name from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cafe_member_name");
      if (saved) setMemberName(saved);
    } catch (e) {}
  }, []);

  const handleSaveMemberName = (val: string) => {
    setMemberName(val);
    try {
      localStorage.setItem("cafe_member_name", val);
    } catch (e) {}
  };

  // Expiration countdown
  useEffect(() => {
    if (!session?.expiresAt) return;

    const updateTimer = () => {
      const diff = new Date(session.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeftStr("Hết hạn nhận món");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeftStr(`${hours > 0 ? `${hours}h ` : ""}${mins}m ${secs < 10 ? `0${secs}` : secs}s`);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [session?.expiresAt]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    showToast("Đã sao chép liên kết phòng vào bộ nhớ tạm!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareZaloOrWeb = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Đặt cà phê cùng ${session?.hostName || "đồng nghiệp"}`,
          text: `Mời bạn chọn ly cà phê / trà cho đơn nhóm văn phòng:`,
          url: window.location.href,
        });
      } catch (e) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleLockAndCheckout = async () => {
    if (!session || session.items.length === 0) return;

    const minLyError = getMinLyValidationError(session.items);
    if (minLyError) {
      setGroupCheckoutError(minLyError);
      showToast(minLyError);
      return;
    }
    setGroupCheckoutError(null);

    try {
      // 1. Lock room on server
      await fetch("/api/group-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LOCK",
          sessionCode: session.sessionCode,
        }),
      });

      // 2. Put all group items into host's cart
      clearCart();
      session.items.forEach((item) => {
        addToCart(item);
      });

      // 3. Store group checkout metadata for cart autofill
      try {
        sessionStorage.setItem(
          "groupOrderData",
          JSON.stringify({
            sessionCode: session.sessionCode,
            hostName: session.hostName,
            hostPhone: session.hostPhone,
            buildingName: session.buildingName || "",
          })
        );
      } catch (e) {}

      // 4. Navigate to checkout
      router.push("/cart");
    } catch (e) {
      console.error("Failed to lock group order", e);
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    if (!session || session.status !== "OPEN") return;
    try {
      const res = await fetch("/api/group-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REMOVE_ITEM",
          sessionCode: session.sessionCode,
          cartItemId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.data);
        showToast("Đã xóa ly khỏi danh sách nhóm");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter products by selected category and search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === "ALL" ? true : p.categoryId === selectedCategory;
      const matchSearch =
        searchQuery.trim() === ""
          ? true
          : p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Aggregate split bill items by recipient
  const splitBillData = useMemo(() => {
    if (!session) return [];
    const map: Record<
      string,
      {
        recipient: string;
        items: CartItem[];
        totalCups: number;
        totalAmount: number;
      }
    > = {};

    session.items.forEach((item) => {
      const name = item.recipientLabel?.trim() || "Chưa đặt tên";
      if (!map[name]) {
        map[name] = {
          recipient: name,
          items: [],
          totalCups: 0,
          totalAmount: 0,
        };
      }
      map[name].items.push(item);
      map[name].totalCups += item.quantity;
      map[name].totalAmount += item.totalPrice;
    });

    return Object.values(map);
  }, [session]);

  // Format text for Zalo / Slack copy
  const handleCopyZaloSummary = () => {
    if (!session) return;
    const lines: string[] = [];
    lines.push(`🐾 QUÁN CÀ XÒI - ĐƠN GOM NHÓM VĂN PHÒNG`);
    lines.push(`🏢 Tòa nhà: ${session.buildingName || "Văn phòng"}`);
    lines.push(`👑 Đại diện gom đơn: ${session.hostName} (${session.hostPhone || ""})`);
    lines.push(`🔢 Mã phòng: #${session.sessionCode}`);
    lines.push(`📊 Tổng cộng: ${totalCups} ly • ${formatVND(totalAmount)}`);
    lines.push(`----------------------------------------`);
    lines.push(`📋 DANH SÁCH & TIỀN TỪNG NGƯỜI:`);

    splitBillData.forEach((person, idx) => {
      const drinksSummary = person.items
        .map((i) => `${i.product.name} (${i.variant.sizeName})`)
        .join(", ");
      lines.push(`${idx + 1}. ${person.recipient}: ${formatVND(person.totalAmount)} (${person.totalCups} ly)`);
      lines.push(`   └ Món: ${drinksSummary}`);
    });

    lines.push(`----------------------------------------`);
    lines.push(`💳 THÔNG TIN CHUYỂN KHOẢN:`);
    lines.push(`Ngân hàng: ${INITIAL_SETTINGS.vietqrBankId} (MBBank)`);
    lines.push(`Số tài khoản: ${INITIAL_SETTINGS.vietqrAccountNo}`);
    lines.push(`Chủ TK: ${INITIAL_SETTINGS.vietqrAccountName}`);
    lines.push(`Nội dung: ${session.sessionCode} [Tên của bạn]`);

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedBill(true);
    showToast("Đã sao chép bảng chốt tiền gửi Zalo / Slack!");
    setTimeout(() => setCopiedBill(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-coffee-800 flex items-center justify-center mx-auto shadow-sm">
          <RefreshCw className="w-7 h-7 text-caramel animate-spin" />
        </div>
        <p className="text-sm font-bold text-coffee-900">Đang tải phòng đặt nhóm...</p>
        <p className="text-xs text-coffee-500">Hệ thống đang đồng bộ danh sách món từ đồng nghiệp</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5 bg-white rounded-3xl border border-coffee-100 shadow-sm mt-8">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-caramel flex items-center justify-center mx-auto">
          <Users className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-coffee-900">Phòng gom đơn không tồn tại</h2>
          <p className="text-xs text-coffee-500 mt-1">
            Mã phòng <strong className="text-caramel">#{code}</strong> đã hết hạn hoặc không chính xác.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/group-order"
            className="inline-flex items-center gap-2 bg-coffee-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-coffee-900 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tạo phòng mới
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-amber-100 text-coffee-900 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-amber-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Xem Menu
          </Link>
        </div>
      </div>
    );
  }

  const totalCups = session.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = session.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const minCupsForFreeShip = INITIAL_SETTINGS.freeDeliveryMinCups || 3;
  const isFreeShipEligible = totalCups >= minCupsForFreeShip;
  const cupsRemainingForFreeShip = Math.max(0, minCupsForFreeShip - totalCups);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(
    typeof window !== "undefined" ? window.location.href : `https://thecornercafe.vn/group-order/${code}`
  )}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-coffee-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-amber-400/40 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-coffee-700 hover:text-caramel transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Về trang chủ Menu
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchSession(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-coffee-600 bg-white hover:bg-coffee-50 border border-coffee-200 px-2.5 py-1 rounded-full transition-colors"
            title="Đồng bộ danh sách món mới nhất"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-caramel ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
          <span className="text-xs font-bold font-mono tracking-wider text-caramel bg-amber-100 border border-amber-200 px-3 py-1 rounded-full">
            Mã phòng: #{session.sessionCode}
          </span>
        </div>
      </div>

      {/* 1. HERO ROOM CARD */}
      <div className="bg-coffee-950 bg-gradient-to-br from-coffee-950 via-coffee-900 to-coffee-800 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden space-y-4 border border-coffee-800/80">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-caramel/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 bg-caramel/25 border border-caramel/40 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-amber-300">
                <Users className="w-3.5 h-3.5" /> Phòng gom đơn văn phòng
              </span>

              {session.buildingName && (
                <span className="inline-flex items-center gap-1 bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white">
                  <Building className="w-3.5 h-3.5 text-amber-300" /> {session.buildingName}
                </span>
              )}

              {timeLeftStr && (
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-emerald-300">
                  <Clock className="w-3.5 h-3.5" /> {timeLeftStr}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight pt-1">
              Nhóm của {session.hostName}
            </h1>
            <p className="text-xs text-coffee-200 leading-relaxed">
              Mời đồng nghiệp mở link hoặc quét mã QR trên điện thoại để tự chọn vị nước và ghi tên in tem dán lên ly!
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 text-amber-200 text-xs font-bold px-3 py-2.5 rounded-xl transition-all"
              title="Mở mã QR phòng cho đồng nghiệp quét"
            >
              <QrCode className="w-4 h-4 text-amber-300" />
              <span>Mã QR</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white text-coffee-950 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-amber-100 transition-colors shadow-sm"
            >
              {copiedLink ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Share2 className="w-4 h-4 text-caramel" />
              )}
              <span>{copiedLink ? "Đã copy link!" : "Gửi link nhóm"}</span>
            </button>
          </div>
        </div>

        {/* Live Status and Total summary banner */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3.5 border-t border-coffee-800/80 text-xs gap-2">
          <div className="flex items-center gap-2 text-coffee-300">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                session.status === "OPEN"
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-amber-400"
              }`}
            />
            <span className="font-semibold text-white">
              {session.status === "OPEN"
                ? "Đang mở nhận món từ đồng nghiệp"
                : "Đã chốt đơn & Khóa nhận món"}
            </span>
            {session.hostPhone && (
              <span className="hidden sm:inline text-coffee-400">
                • Hotline Host: {session.hostPhone}
              </span>
            )}
          </div>

          <div className="text-coffee-300">
            Tổng cả nhóm: <strong className="text-white text-sm">{totalCups} ly</strong> •{" "}
            <strong className="text-amber-300 text-base">{formatVND(totalAmount)}</strong>
          </div>
        </div>
      </div>

      {/* 2. FREESHIP MILESTONE BAR (Upsell / Team Target) */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-coffee-900 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-caramel" />
          </div>
          <div>
            {isFreeShipEligible ? (
              <div className="font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Tuyệt vời! Đã gom đủ {totalCups} ly và được FREESHIP tòa nhà 100%!</span>
              </div>
            ) : (
              <div>
                <span className="font-bold text-coffee-900">
                  Mục tiêu Freeship tòa nhà:
                </span>{" "}
                <span className="text-coffee-700">
                  Cả phòng chỉ cần gom thêm{" "}
                  <strong className="text-caramel font-extrabold">{cupsRemainingForFreeShip} ly</strong>{" "}
                  nữa để được <strong>MIỄN PHÍ SHIP</strong> (tiết kiệm 15.000đ)!
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mini progress bar */}
        <div className="w-full sm:w-48 bg-amber-200/70 rounded-full h-2.5 overflow-hidden shrink-0">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isFreeShipEligible ? "bg-emerald-500" : "bg-caramel"
            }`}
            style={{
              width: `${Math.min(100, Math.round((totalCups / minCupsForFreeShip) * 100))}%`,
            }}
          />
        </div>
      </div>

      {/* 3. CHOOSE DRINK SECTION (FULL MENU & SEARCH) */}
      {session.status === "OPEN" ? (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-coffee-100 shadow-sm space-y-4">
          <div>
            <h2 className="font-extrabold text-base text-coffee-900 flex items-center gap-2">
              <Coffee className="w-5 h-5 text-caramel" />
              Bạn muốn uống gì? Tự chọn ly của mình:
            </h2>
            <p className="text-xs text-coffee-500 mt-0.5">
              Nhập tên của bạn để in tem dán lên cốc, tránh uống nhầm ly của nhau khi giao đến văn phòng.
            </p>
          </div>

          {/* Member Name Input with Quick Chips */}
          <div className="bg-coffee-50/80 p-3.5 rounded-2xl border border-coffee-200/80 space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-coffee-800 shrink-0 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-caramel" /> Tên của bạn:
              </span>
              <input
                type="text"
                placeholder="VD: Tuấn Kỹ Thuật, Mai Marketing, Lan Kế toán..."
                value={memberName}
                onChange={(e) => handleSaveMemberName(e.target.value)}
                className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-coffee-200 bg-white focus:outline-none focus:ring-2 focus:ring-caramel/40 font-medium"
              />
              {memberName && (
                <button
                  type="button"
                  onClick={() => handleSaveMemberName("")}
                  className="text-coffee-400 hover:text-coffee-600 text-xs px-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Nickname Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-coffee-600">
              <span className="text-[10px] text-coffee-400 font-medium">Gợi ý nhanh:</span>
              {["Tuấn Lead", "Thu Trang MKT", "Hải Backend", "Linh Designer", "Quang PM"].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSaveMemberName(chip)}
                  className={`px-2.5 py-0.5 rounded-full border transition-all ${
                    memberName === chip
                      ? "bg-caramel text-white border-caramel font-bold"
                      : "bg-white border-coffee-200 hover:border-caramel hover:text-coffee-900"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="space-y-3 pt-1">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-coffee-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm món: Cà phê sữa, Americano, Trà đào cam sả, Bạc xỉu, Bánh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee-400 hover:text-coffee-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Horizontal Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                  selectedCategory === "ALL"
                    ? "bg-coffee-900 text-white shadow-sm"
                    : "bg-coffee-50 text-coffee-700 hover:bg-coffee-100"
                }`}
              >
                Tất cả ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? "bg-coffee-900 text-white shadow-sm"
                      : "bg-coffee-50 text-coffee-700 hover:bg-coffee-100"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {filteredProducts.map((p) => {
              const isBestSeller = p.tags?.includes("BEST_SELLER");
              const isNew = p.tags?.includes("NEW");
              const isCombo = p.tags?.includes("OFFICE_COMBO");

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedProduct(p);
                    setIsAddingModalOpen(true);
                  }}
                  className="bg-white rounded-2xl border border-coffee-200/90 hover:border-caramel p-2.5 flex flex-col justify-between shadow-xs hover:shadow-md hover:bg-amber-50/20 transition-all cursor-pointer group"
                >
                  <div>
                    {/* Thumbnail Image */}
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-coffee-50 mb-2">
                      <Image
                        src={p.imageUrl}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Badge */}
                      <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10">
                        {isBestSeller && (
                          <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                            Hot
                          </span>
                        )}
                        {isNew && (
                          <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                            Mới
                          </span>
                        )}
                        {isCombo && (
                          <span className="bg-caramel text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                            Combo
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {p.prepTimeMinutes}p
                      </div>
                    </div>

                    <div className="text-xs font-bold text-coffee-900 group-hover:text-caramel transition-colors leading-snug">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-coffee-500 font-semibold mt-0.5">
                      {formatVND(p.salePrice ?? p.basePrice)}
                      {p.salePrice && (
                        <span className="line-through text-coffee-400 text-[10px] ml-1">
                          {formatVND(p.basePrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-2.5 w-full py-1.5 px-2 rounded-xl bg-amber-50 group-hover:bg-caramel group-hover:text-white text-coffee-800 text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Chọn ly này
                  </button>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-10 text-center text-xs text-coffee-500 space-y-2">
              <Search className="w-8 h-8 text-coffee-300 mx-auto" />
              <p>Không tìm thấy món phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("ALL");
                }}
                className="text-caramel font-bold underline"
              >
                Xem lại toàn bộ menu
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-amber-50/60 border border-amber-200 rounded-3xl p-6 text-center space-y-2">
          <Lock className="w-8 h-8 text-coffee-600 mx-auto" />
          <h3 className="font-bold text-sm text-coffee-900">Phòng gom đơn đã được chốt</h3>
          <p className="text-xs text-coffee-600 max-w-md mx-auto">
            Chủ phòng đã khóa nhận món để tiến hành thanh toán và giao hàng. Vui lòng liên hệ với đại diện nhóm nếu bạn cần thêm món.
          </p>
        </div>
      )}

      {/* 4. GROUP ORDER ITEMS, SPLIT BILL & STICKER PREVIEW */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-coffee-100 shadow-sm space-y-5">
        {/* Tab switch header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-coffee-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("ITEMS")}
              className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "ITEMS"
                  ? "bg-coffee-900 text-white shadow-sm"
                  : "bg-coffee-50 text-coffee-700 hover:bg-coffee-100"
              }`}
            >
              <Coffee className="w-3.5 h-3.5 text-amber-300" />
              <span>Danh sách món ({totalCups} ly)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("SPLIT_BILL")}
              className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "SPLIT_BILL"
                  ? "bg-coffee-900 text-white shadow-sm"
                  : "bg-coffee-50 text-coffee-700 hover:bg-coffee-100"
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-caramel" />
              <span>Bảng chia tiền ({splitBillData.length} người)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("STICKERS")}
              className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "STICKERS"
                  ? "bg-coffee-900 text-white shadow-sm"
                  : "bg-coffee-50 text-coffee-700 hover:bg-coffee-100"
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Tem dán ly</span>
            </button>
          </div>

          <div className="text-right">
            <span className="text-xs text-coffee-500 mr-2">Tổng tiền:</span>
            <span className="text-base font-extrabold text-caramel">{formatVND(totalAmount)}</span>
          </div>
        </div>

        {/* TAB 1: ITEMS LIST */}
        {activeTab === "ITEMS" && (
          <div>
            {session.items.length === 0 ? (
              <div className="py-12 text-center text-xs text-coffee-400 space-y-2">
                <Coffee className="w-10 h-10 mx-auto text-coffee-300" />
                <p className="font-bold text-coffee-700 text-sm">Chưa có ai thêm đồ uống vào nhóm.</p>
                <p className="text-coffee-500 max-w-sm mx-auto">
                  Hãy bấm chọn món ở phần thực đơn phía trên hoặc gửi link / mã QR cho đồng nghiệp cùng chọn nhé!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-coffee-100 space-y-3">
                {session.items.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="pt-3.5 first:pt-0 flex items-start justify-between gap-3 text-xs group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Mini Thumbnail */}
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-coffee-50 shrink-0 border border-coffee-100">
                        <Image
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-coffee-900 text-sm">
                            {item.product.name}
                          </span>
                          <span className="bg-amber-100 text-coffee-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                            Ly của: {item.recipientLabel || "Khách"}
                          </span>
                          {item.quantity > 1 && (
                            <span className="bg-coffee-800 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                              x{item.quantity}
                            </span>
                          )}
                        </div>

                        <div className="text-coffee-600">
                          Size: <strong className="text-coffee-800">{item.variant.sizeName}</strong>
                          {item.selectedOptions.length > 0 && (
                            <span> • {item.selectedOptions.map((o) => o.valueName).join(", ")}</span>
                          )}
                        </div>

                        {item.notes && (
                          <div className="text-[11px] text-amber-700 italic">
                            * Ghi chú Barista: {item.notes}
                          </div>
                        )}

                        {/* View Sticker trigger */}
                        <button
                          type="button"
                          onClick={() => setStickerPreviewItem(item)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-coffee-500 hover:text-caramel mt-1"
                        >
                          <Printer className="w-3 h-3" /> Xem tem in dán ly
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-bold text-sm text-coffee-900">
                          {formatVND(item.totalPrice)}
                        </div>
                        {item.quantity > 1 && (
                          <div className="text-[10px] text-coffee-400">
                            {formatVND(item.unitPrice)}/ly
                          </div>
                        )}
                      </div>

                      {session.status === "OPEN" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.cartItemId)}
                          className="p-1.5 text-coffee-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa ly này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SPLIT BILL VIEW */}
        {activeTab === "SPLIT_BILL" && (
          <div className="space-y-4">
            {/* Header description & copy button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80">
              <div>
                <h4 className="font-bold text-xs text-coffee-900">
                  Bảng tổng hợp tiền theo từng thành viên
                </h4>
                <p className="text-[11px] text-coffee-600">
                  Giúp người đại diện gom đơn thu tiền chính xác, không lo tính nhầm hay thiếu sót.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyZaloSummary}
                className="inline-flex items-center gap-2 bg-coffee-800 hover:bg-coffee-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm shrink-0 active:scale-95"
              >
                {copiedBill ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>{copiedBill ? "Đã copy gửi Zalo!" : "Copy bảng tiền gửi Zalo"}</span>
              </button>
            </div>

            {/* Split bill cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {splitBillData.map((person) => {
                const isPaid = paidStatusMap[person.recipient] || false;

                return (
                  <div
                    key={person.recipient}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                      isPaid
                        ? "bg-emerald-50/50 border-emerald-200"
                        : "bg-white border-coffee-200/80 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-coffee-900"
                          }`}
                        >
                          {person.recipient.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-coffee-900">
                            {person.recipient}
                          </div>
                          <div className="text-[10px] text-coffee-500 font-medium">
                            {person.totalCups} ly đồ uống
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-sm text-caramel">
                          {formatVND(person.totalAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Drink items breakdown */}
                    <div className="border-t border-coffee-100 pt-2 space-y-1 text-[11px] text-coffee-600">
                      {person.items.map((i) => (
                        <div key={i.cartItemId} className="flex justify-between">
                          <span>
                            • {i.product.name} ({i.variant.sizeName})
                          </span>
                          <span className="font-semibold text-coffee-800 shrink-0 ml-2">
                            {formatVND(i.totalPrice)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Checkbox paid */}
                    <div className="border-t border-coffee-100 pt-2 flex items-center justify-between text-[11px]">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isPaid}
                          onChange={(e) =>
                            setPaidStatusMap((prev) => ({
                              ...prev,
                              [person.recipient]: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 rounded text-caramel focus:ring-caramel accent-amber-600"
                        />
                        <span className={isPaid ? "text-emerald-700 font-bold" : "text-coffee-600"}>
                          {isPaid ? "Đã nhận tiền chuyển khoản" : "Chưa chuyển khoản"}
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bank details card for quick transfer */}
            <div className="bg-coffee-50/70 p-4 rounded-2xl border border-coffee-200/80 text-xs text-coffee-800 space-y-2">
              <div className="font-bold text-coffee-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-caramel" />
                Thông tin thanh toán chuyển khoản:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-coffee-500">Ngân hàng:</span>{" "}
                  <strong>{INITIAL_SETTINGS.vietqrBankId} (MBBank)</strong>
                </div>
                <div>
                  <span className="text-coffee-500">Số tài khoản:</span>{" "}
                  <strong className="font-mono text-caramel font-bold">{INITIAL_SETTINGS.vietqrAccountNo}</strong>
                </div>
                <div>
                  <span className="text-coffee-500">Nội dung CK:</span>{" "}
                  <strong className="font-mono">{session.sessionCode} [Tên bạn]</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STICKERS PREVIEW */}
        {activeTab === "STICKERS" && (
          <div className="space-y-4">
            <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 text-xs text-coffee-700">
              <p className="font-bold text-coffee-900">
                Tem in nhiệt dán cốc pha chế của Barista ({totalCups} tem):
              </p>
              <p className="text-[11px] text-coffee-500 mt-0.5">
                Mỗi ly khi quán pha chế sẽ được in riêng 1 tem dán trực tiếp lên thân ly để đồng nghiệp nhận đúng món của mình.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {session.items.map((item) => {
                const orderRecord: OrderItemRecord = {
                  id: item.cartItemId,
                  orderId: session.sessionCode,
                  productId: item.product.id,
                  productName: item.product.name,
                  variantName: item.variant.sizeName,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                  recipientLabel: item.recipientLabel,
                  itemNotes: item.notes,
                  options: item.selectedOptions.map((o) => ({
                    optionName: o.optionName,
                    valueName: o.valueName,
                    price: o.extraPrice,
                  })),
                };

                return (
                  <div key={item.cartItemId} className="flex justify-center">
                    <CupStickerPreview
                      orderCode={session.sessionCode}
                      item={orderRecord}
                      createdAt={session.createdAt}
                      onPrint={() => window.print()}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HOST CHECKOUT ACTIONS FOOTER */}
        {session.items.length > 0 && getMinLyValidationError(session.items) && (
          <div className="mt-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-2">
            <span>{groupCheckoutError || getMinLyValidationError(session.items)}</span>
            <span className="shrink-0 bg-rose-100 px-2.5 py-1 rounded-full text-[11px] font-extrabold">
              {countLyItems(session.items)}/{MIN_LY_ORDER} ly
            </span>
          </div>
        )}
        {session.items.length > 0 && (
          <div className="pt-5 border-t border-coffee-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-coffee-600 space-y-0.5">
              <div className="font-bold text-coffee-800">
                Sẵn sàng đặt món cho cả phòng?
              </div>
              <p className="text-[11px] text-coffee-500">
                Đại diện nhóm bấm chốt để chuyển sang màn hình điền tầng/phòng ban & chọn hình thức thanh toán.
              </p>
            </div>

            {session.status === "OPEN" ? (
              <button
                type="button"
                onClick={handleLockAndCheckout}
                className={`w-full sm:w-auto font-bold text-xs px-6 py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95 ${
                  getMinLyValidationError(session.items)
                    ? "bg-rose-100 hover:bg-rose-200 text-rose-600 border border-rose-200 shadow-sm"
                    : "bg-coffee-800 hover:bg-coffee-900 text-white shadow-lg"
                }`}
              >
                <Lock className={`w-4 h-4 ${getMinLyValidationError(session.items) ? "text-rose-500" : "text-amber-300"}`} />
                <span>Chốt đơn nhóm & Thanh toán ({formatVND(totalAmount)})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/cart")}
                className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-6 py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Đã chốt phòng • Đi đến giỏ hàng thanh toán</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. MODAL QR CODE SHARING */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-coffee-100 space-y-5 text-center relative">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 text-coffee-400 hover:text-coffee-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-coffee-900 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6 text-caramel" />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-coffee-900">
                Mã QR Gom Đơn Cả Phòng
              </h3>
              <p className="text-xs text-coffee-500 mt-1">
                Đồng nghiệp mở Camera điện thoại hoặc Zalo quét mã để tự chọn món ngay!
              </p>
            </div>

            {/* Big QR Image */}
            <div className="relative w-56 h-56 mx-auto bg-white p-2 rounded-2xl border-2 border-coffee-200 shadow-inner flex items-center justify-center">
              <Image
                src={qrImageUrl}
                alt={`Mã QR phòng ${session.sessionCode}`}
                width={220}
                height={220}
                className="rounded-xl"
                unoptimized
              />
            </div>

            <div className="bg-coffee-50 py-1.5 px-3 rounded-xl text-xs font-mono font-bold text-coffee-800">
              Phòng: #{session.sessionCode} • {session.buildingName || "Văn phòng"}
            </div>

            {/* Action buttons inside QR modal */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full bg-coffee-800 hover:bg-coffee-900 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Copy className="w-4 h-4 text-amber-300" />
                <span>Sao chép link phòng</span>
              </button>

              <button
                type="button"
                onClick={handleShareZaloOrWeb}
                className="w-full bg-amber-100 hover:bg-amber-200 text-coffee-900 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4 text-caramel" />
                <span>Chia sẻ qua Zalo / Ứng dụng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL SINGLE CUP STICKER PREVIEW */}
      {stickerPreviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-coffee-100 space-y-4 max-w-sm w-full text-center relative">
            <button
              type="button"
              onClick={() => setStickerPreviewItem(null)}
              className="absolute top-4 right-4 text-coffee-400 hover:text-coffee-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-sm text-coffee-900">
              Tem in nhiệt dán cốc (Xem trước)
            </h3>

            <div className="flex justify-center py-2">
              <CupStickerPreview
                orderCode={session.sessionCode}
                item={{
                  id: stickerPreviewItem.cartItemId,
                  orderId: session.sessionCode,
                  productId: stickerPreviewItem.product.id,
                  productName: stickerPreviewItem.product.name,
                  variantName: stickerPreviewItem.variant.sizeName,
                  quantity: stickerPreviewItem.quantity,
                  unitPrice: stickerPreviewItem.unitPrice,
                  totalPrice: stickerPreviewItem.totalPrice,
                  recipientLabel: stickerPreviewItem.recipientLabel,
                  itemNotes: stickerPreviewItem.notes,
                  options: stickerPreviewItem.selectedOptions.map((o) => ({
                    optionName: o.optionName,
                    valueName: o.valueName,
                    price: o.extraPrice,
                  })),
                }}
                createdAt={session.createdAt}
                onPrint={() => window.print()}
              />
            </div>

            <button
              type="button"
              onClick={() => setStickerPreviewItem(null)}
              className="w-full py-2 bg-coffee-100 hover:bg-coffee-200 text-coffee-800 text-xs font-bold rounded-xl"
            >
              Đóng xem trước
            </button>
          </div>
        </div>
      )}

      {/* 7. MODAL CUSTOMIZE DRINK (ProductDetailModal) */}
      {isAddingModalOpen && selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          options={options}
          existingLyCount={countLyItems(session?.items || [])}
          defaultRecipientLabel={memberName}
          onClose={() => {
            setIsAddingModalOpen(false);
            setSelectedProduct(null);
          }}
          onAddToCart={async (item: CartItem) => {
            try {
              const res = await fetch("/api/group-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "ADD_ITEM",
                  sessionCode: session.sessionCode,
                  item: {
                    ...item,
                    recipientLabel:
                      memberName.trim() || item.recipientLabel || "Đồng nghiệp",
                  },
                }),
              });
              const data = await res.json();
              if (data.success) {
                setSession(data.data);
                showToast(`Đã thêm ${item.product.name} cho ${memberName.trim() || "bạn"}!`);
              }
            } catch (e) {
              console.error(e);
            }
            setIsAddingModalOpen(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}