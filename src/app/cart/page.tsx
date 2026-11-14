"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  Building,
  Clock,
  CreditCard,
  Banknote,
  Tag,
  ShieldCheck,
  Coffee,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Truck,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatVND, POPULAR_BUILDINGS, MIN_LY_ORDER, getMinLyValidationError } from "@/lib/utils";
import { OrderType, PaymentMethod } from "@/types";

export default function CartCheckoutPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, totalItems, lyCount, totalPrice } = useCart();
  const minLyError = getMinLyValidationError(items);

  // Order Type
  const [orderType, setOrderType] = useState<OrderType>("OFFICE_DELIVERY");

  // Office Delivery Form
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [floorRoom, setFloorRoom] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Scheduling
  const [scheduledType, setScheduledType] = useState<"ASAP" | "PREORDER">("ASAP");
  const [scheduledTime, setScheduledTime] = useState("08:30");

  // Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<string | null>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherError, setVoucherError] = useState("");
  const [isCheckingVoucher, setIsCheckingVoucher] = useState(false);

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("VIETQR_BANKING");

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Load group order checkout info if transferred from group session
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("groupOrderData");
      if (raw) {
        const data = JSON.parse(raw);
        if (data.hostName) setRecipientName(data.hostName);
        if (data.hostPhone) setRecipientPhone(data.hostPhone);
        if (data.buildingName) setBuildingName(data.buildingName);
        if (data.sessionCode) setDeliveryNotes(`Đơn gom nhóm văn phòng mã #${data.sessionCode}`);
        setOrderType("OFFICE_DELIVERY");
        sessionStorage.removeItem("groupOrderData");
      }
    } catch (e) {
      console.error("Error reading group order data", e);
    }
  }, []);

  // Google Maps Distance & Delivery Fee
  const [shippingInfo, setShippingInfo] = useState<{
    distanceKm: number;
    durationMinutes: number;
    deliveryFee: number;
    isFreeDelivery: boolean;
    provider: string;
    googleMapsDirectionsUrl: string;
    destinationTitle?: string;
  }>({
    distanceKm: 1.5,
    durationMinutes: 7,
    deliveryFee: 15000,
    isFreeDelivery: totalItems >= 3 || orderType === "TAKEAWAY",
    provider: "SMART_LOCAL_ROUTING",
    googleMapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&origin=02+Quang+Trung+Đà+Nẵng&destination=Software+Park+Đà+Nẵng",
  });
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  // Tính toán khoảng cách và phí ship theo Google Maps khi đổi tòa nhà hoặc số lượng món
  useEffect(() => {
    if (orderType === "TAKEAWAY") {
      setShippingInfo((prev) => ({
        ...prev,
        deliveryFee: 0,
        isFreeDelivery: true,
      }));
      return;
    }

    const dest = buildingName.trim() || "Software Park Đà Nẵng";
    const timer = setTimeout(async () => {
      try {
        setIsCalculatingShipping(true);
        const res = await fetch("/api/shipping/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: dest,
            totalCups: totalItems,
            isTakeaway: false,
          }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setShippingInfo(data.data);
        }
      } catch (err) {
        console.error("Lỗi tính phí giao hàng:", err);
      } finally {
        setIsCalculatingShipping(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [buildingName, totalItems, orderType]);

  const deliveryFee = 0;

  // Final Total
  const finalTotal = Math.max(0, totalPrice - voucherDiscount + deliveryFee);

  const handleApplyVoucher = async () => {
    setVoucherError("");
    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      setVoucherError("Vui lòng nhập mã giảm giá");
      return;
    }

    try {
      setIsCheckingVoucher(true);
      const res = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          subtotalAmount: totalPrice,
          deliveryFee,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setVoucherDiscount(data.discountAmount);
        setAppliedVoucher(data.code);
        setVoucherCode(data.code);
      } else {
        setVoucherDiscount(0);
        setAppliedVoucher(null);
        setVoucherError(data.message || "Mã không hợp lệ hoặc đã hết hạn");
      }
    } catch {
      setVoucherError("Lỗi kết nối khi kiểm tra mã voucher");
    } finally {
      setIsCheckingVoucher(false);
    }
  };

  // Tự động kiểm tra lại điều kiện voucher khi tổng tiền hoặc phí ship thay đổi
  useEffect(() => {
    if (appliedVoucher) {
      fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: appliedVoucher,
          subtotalAmount: totalPrice,
          deliveryFee,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
            setVoucherDiscount(data.discountAmount);
          } else {
            setVoucherDiscount(0);
            setAppliedVoucher(null);
            setVoucherError(data.message || "Đơn hàng không còn đủ điều kiện áp dụng mã");
          }
        })
        .catch(() => {});
    }
  }, [totalPrice, deliveryFee]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (minLyError) {
      setFormError(minLyError);
      return;
    }

    if (!recipientName.trim()) {
      setFormError("Vui lòng nhập Họ và tên người nhận");
      return;
    }
    if (!recipientPhone.trim() || !/^[0-9]{9,11}$/.test(recipientPhone.trim())) {
      setFormError("Vui lòng nhập Số điện thoại hợp lệ (9-11 chữ số)");
      return;
    }

    if (orderType === "OFFICE_DELIVERY") {
      if (!buildingName.trim()) {
        setFormError("Vui lòng chọn hoặc nhập Tên tòa nhà văn phòng");
        return;
      }
      if (!floorRoom.trim()) {
        setFormError("Vui lòng nhập Tầng & Phòng ban / Công ty");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        orderType,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        companyName: companyName.trim() || undefined,
        buildingName: orderType === "OFFICE_DELIVERY" ? buildingName.trim() : undefined,
        floorRoom: orderType === "OFFICE_DELIVERY" ? floorRoom.trim() : undefined,
        deliveryNotes: deliveryNotes.trim() || undefined,
        scheduledType,
        scheduledTime: scheduledType === "PREORDER" ? scheduledTime : undefined,
        paymentMethod,
        items,
        deliveryFee,
        promotionCode: appliedVoucher || undefined,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Lỗi tạo đơn hàng");
      }

      // Success: clear cart and redirect to Order Tracking page
      clearCart();
      router.push(`/order/${data.data.orderCode}`);
    } catch (err: any) {
      setFormError(err.message || "Có lỗi xảy ra, vui lòng thử lại");
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-coffee-800 flex items-center justify-center mx-auto">
          <Coffee className="w-8 h-8 text-caramel" />
        </div>
        <h2 className="text-xl font-bold text-coffee-900">Giỏ hàng của bạn đang trống</h2>
        <p className="text-xs text-coffee-500">
          Hãy khám phá menu cà phê, trà trái cây và điểm tâm thơm ngon để nạp năng lượng!
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-coffee-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-caramel transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-coffee-700 hover:text-caramel transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Tiếp tục chọn món
        </Link>
        <span className="text-xs text-coffee-500 font-medium">
          {totalItems} món trong giỏ
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CART ITEMS LIST (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-coffee-100 shadow-sm space-y-4">
            <h2 className="font-bold text-base text-coffee-900 flex items-center justify-between border-b border-coffee-100 pb-3">
              <span>Đồ uống đã chọn</span>
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-red-500 hover:underline font-normal"
              >
                Xóa tất cả
              </button>
            </h2>

            <div className="divide-y divide-coffee-100 space-y-3">
              {items.map((item) => (
                <div key={item.cartItemId} className="pt-3 first:pt-0 flex gap-3">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-coffee-50 shrink-0">
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-coffee-900 leading-snug">
                        {item.product.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeItem(item.cartItemId)}
                        className="text-coffee-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-xs text-caramel font-semibold">
                      Size {item.variant.sizeName}
                    </div>

                    {/* Options list */}
                    {item.selectedOptions.length > 0 && (
                      <div className="text-[11px] text-coffee-500 mt-0.5 leading-relaxed">
                        {item.selectedOptions.map((o) => o.valueName).join(" • ")}
                      </div>
                    )}

                    {/* Recipient tag */}
                    {item.recipientLabel && (
                      <div className="inline-block bg-amber-100 text-coffee-800 text-[10px] font-bold px-2 py-0.5 rounded mt-1">
                        Người uống: {item.recipientLabel}
                      </div>
                    )}

                    {/* Quantity & Price */}
                    <div className="flex items-center justify-between mt-2 pt-1">
                      <div className="flex items-center gap-2 bg-coffee-50 rounded-lg p-0.5 border border-coffee-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-coffee-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold min-w-[1.5rem] text-center text-coffee-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, 1)}
                          disabled={item.quantity >= 50}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-coffee-700 disabled:opacity-30"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="font-bold text-sm text-coffee-900">
                        {formatVND(item.totalPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* VOUCHER APPLICATION */}
          <div className="bg-white rounded-3xl p-4 border border-coffee-100 shadow-sm space-y-2">
            <label className="text-xs font-bold text-coffee-800 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-caramel" /> Áp dụng Mã giảm giá / Voucher
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập mã: CHAOBANMOI hoặc OFFICE50K..."
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                disabled={isCheckingVoucher}
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-coffee-200 uppercase focus:outline-none focus:ring-2 focus:ring-caramel/40 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleApplyVoucher}
                disabled={isCheckingVoucher}
                className="text-xs font-bold bg-coffee-800 text-white px-4 py-2 rounded-xl hover:bg-caramel transition-colors disabled:opacity-50 shrink-0"
              >
                {isCheckingVoucher ? "Kiểm tra..." : "Áp dụng"}
              </button>
            </div>
            {appliedVoucher && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs text-emerald-800 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Đã áp dụng <strong>{appliedVoucher}</strong>: Giảm{" "}
                    <strong className="text-emerald-700">{formatVND(voucherDiscount)}</strong>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedVoucher(null);
                    setVoucherDiscount(0);
                    setVoucherCode("");
                  }}
                  className="text-xs text-red-600 hover:text-red-800 font-bold ml-2 underline"
                >
                  Gỡ mã
                </button>
              </div>
            )}
            {voucherError && <p className="text-xs text-red-500 mt-1">{voucherError}</p>}
          </div>
        </div>

        {/* RIGHT COLUMN: CHECKOUT FORM & PAYMENT (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          <form
            onSubmit={handleSubmitOrder}
            className="bg-white rounded-3xl p-5 border border-coffee-100 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b border-coffee-100 pb-2">
              <h2 className="font-bold text-base text-coffee-900">
                Thông tin đặt hàng
              </h2>
              <a
                href="https://xanhsmngon.onelink.me/14WJ/u8vplbn5"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#008F5D] hover:text-[#00764D] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-full transition-all"
                title="Mở ứng dụng Xanh SM Ngon"
              >
                <span>🛵 Đặt qua Xanh SM</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* 1. Order Type Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-coffee-50 p-1 rounded-2xl border border-coffee-200">
              <button
                type="button"
                onClick={() => setOrderType("OFFICE_DELIVERY")}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  orderType === "OFFICE_DELIVERY"
                    ? "bg-white text-coffee-900 shadow-sm"
                    : "text-coffee-600 hover:text-coffee-900"
                }`}
              >
                🏢 Giao đến văn phòng
              </button>
              <button
                type="button"
                onClick={() => setOrderType("TAKEAWAY")}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  orderType === "TAKEAWAY"
                    ? "bg-white text-coffee-900 shadow-sm"
                    : "text-coffee-600 hover:text-coffee-900"
                }`}
              >
                🚶 Đến quán lấy
              </button>
            </div>

            {/* 2. Customer Info */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-coffee-700 mb-1">
                  Họ và tên người nhận <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn Nam"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-coffee-700 mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="VD: 0987112233"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                />
              </div>

              {/* Office Delivery Details */}
              {orderType === "OFFICE_DELIVERY" && (
                <div className="space-y-3 pt-2 border-t border-coffee-100">
                  <div>
                    <label className="block text-[11px] font-bold text-coffee-700 mb-1 flex items-center justify-between">
                      <span>Tên Tòa nhà <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-caramel font-normal">Gợi ý nhanh</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Software Park Đà Nẵng, FPT Complex, Indochina..."
                      value={buildingName}
                      onChange={(e) => setBuildingName(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 mb-1.5"
                    />

                    {/* Quick pick chips */}
                    <div className="flex flex-wrap gap-1">
                      {POPULAR_BUILDINGS.slice(0, 4).map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBuildingName(b.split(" (")[0])}
                          className="text-[10px] bg-coffee-50 hover:bg-amber-100 text-coffee-700 px-2 py-0.5 rounded border border-coffee-200"
                        >
                          + {b.split(" (")[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-coffee-700 mb-1">
                        Tầng & Phòng <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Tầng 12, P.1205"
                        value={floorRoom}
                        onChange={(e) => setFloorRoom(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-coffee-700 mb-1">
                        Tên Công ty
                      </label>
                      <input
                        type="text"
                        placeholder="VD: FPT Software"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-coffee-700 mb-1">
                      Vị trí giao & Ghi chú cho Shipper
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Gửi bàn lễ tân sảnh G, gọi trước 5p..."
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                    />
                  </div>
                </div>
              )}

              {/* 3. Scheduling (ASAP or Preorder) */}
              <div className="pt-2 border-t border-coffee-100">
                <label className="block text-[11px] font-bold text-coffee-700 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-caramel" /> Thời gian nhận hàng
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setScheduledType("ASAP")}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border ${
                      scheduledType === "ASAP"
                        ? "border-caramel bg-amber-50 text-coffee-900"
                        : "border-coffee-200 text-coffee-600"
                    }`}
                  >
                    Giao ngay (~15-20p)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduledType("PREORDER")}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border ${
                      scheduledType === "PREORDER"
                        ? "border-caramel bg-amber-50 text-coffee-900"
                        : "border-coffee-200 text-coffee-600"
                    }`}
                  >
                    Đặt hẹn giờ trước
                  </button>
                </div>

                {scheduledType === "PREORDER" && (
                  <select
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 bg-white"
                  >
                    <option value="08:00">08:00 - 08:15 (Check-in sáng)</option>
                    <option value="08:30">08:30 - 08:45 (Sáng tỉnh táo)</option>
                    <option value="09:00">09:00 - 09:15</option>
                    <option value="10:00">10:00 - 10:15 (Giải lao sáng)</option>
                    <option value="13:30">13:30 - 13:45 (Sau giờ ăn trưa)</option>
                    <option value="14:00">14:00 - 14:15</option>
                    <option value="15:30">15:30 - 15:45 (Trà chiều năng lượng)</option>
                  </select>
                )}
              </div>

              {/* 4. Payment Method */}
              <div className="pt-2 border-t border-coffee-100 space-y-2">
                <label className="block text-[11px] font-bold text-coffee-700">
                  Phương thức thanh toán
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setPaymentMethod("VIETQR_BANKING")}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      paymentMethod === "VIETQR_BANKING"
                        ? "border-caramel bg-amber-50/70 ring-1 ring-caramel text-coffee-900 font-bold"
                        : "border-coffee-200 text-coffee-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-caramel" />
                      <div>
                        <span className="text-xs">Chuyển khoản VietQR (Khuyên dùng)</span>
                        <p className="text-[10px] text-coffee-500 font-normal">
                          Quét mã QR tự động xác nhận trong 2 giây
                        </p>
                      </div>
                    </div>
                    <span className="w-4 h-4 rounded-full border border-caramel flex items-center justify-center">
                      {paymentMethod === "VIETQR_BANKING" && (
                        <span className="w-2 h-2 rounded-full bg-caramel" />
                      )}
                    </span>
                  </label>

                  <label
                    onClick={() => setPaymentMethod("COD")}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      paymentMethod === "COD"
                        ? "border-caramel bg-amber-50/70 ring-1 ring-caramel text-coffee-900 font-bold"
                        : "border-coffee-200 text-coffee-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="text-xs">Tiền mặt khi nhận (COD)</span>
                        <p className="text-[10px] text-coffee-500 font-normal">
                          Thanh toán cho Shipper hoặc tại Quầy
                        </p>
                      </div>
                    </div>
                    <span className="w-4 h-4 rounded-full border border-caramel flex items-center justify-center">
                      {paymentMethod === "COD" && (
                        <span className="w-2 h-2 rounded-full bg-caramel" />
                      )}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Price breakdown summary */}
            <div className="pt-3 border-t border-coffee-100 space-y-1.5 text-xs text-coffee-600">
              <div className="flex justify-between">
                <span>Tiền hàng ({totalItems} ly):</span>
                <span className="font-semibold text-coffee-800">{formatVND(totalPrice)}</span>
              </div>

              {voucherDiscount > 0 && (
                <div className="flex justify-between text-caramel">
                  <span>Giảm giá ({appliedVoucher}):</span>
                  <span className="font-bold">-{formatVND(voucherDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-extrabold text-coffee-900 pt-2 border-t border-coffee-200">
                <span>Tổng thanh toán:</span>
                <span className="text-caramel">{formatVND(finalTotal)}</span>
              </div>
            </div>

            {minLyError && (
              <div className="text-xs text-rose-800 font-bold bg-rose-50 p-3 rounded-xl border border-rose-200 flex items-center justify-between gap-2">
                <span>{minLyError}</span>
                <span className="shrink-0 bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                  {lyCount}/{MIN_LY_ORDER} ly
                </span>
              </div>
            )}

            {formError && (
              <p className="text-xs text-red-500 font-semibold bg-red-50 p-2.5 rounded-xl border border-red-200">
                {formError}
              </p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full font-bold py-3 px-4 rounded-2xl shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 ${
                minLyError
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-coffee-800 hover:bg-coffee-900 text-white"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>
                {isSubmitting
                  ? "Đang xử lý đơn..."
                  : minLyError
                  ? `Cần đủ ${MIN_LY_ORDER} ly để mở cổng thanh toán (${lyCount}/${MIN_LY_ORDER})`
                  : "Xác nhận Đặt hàng"}
              </span>
            </button>

            {/* Hoặc đặt giao qua Xanh SM Ngon */}
            <div className="pt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-coffee-100"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold text-coffee-400 uppercase tracking-widest">
                  Hoặc đặt giao qua đối tác
                </span>
                <div className="flex-grow border-t border-coffee-100"></div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50/90 via-emerald-100/30 to-teal-50 border border-emerald-300/80 rounded-2xl p-3.5 space-y-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#008F5D] text-white flex items-center justify-center text-lg shrink-0 shadow-sm mt-0.5">
                    🛵
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-emerald-950">Đặt qua app Xanh SM Ngon</span>
                      <span className="text-[9px] bg-emerald-200 text-emerald-900 font-black px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        XE ĐIỆN GSM
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800/90 leading-relaxed mt-0.5">
                      Tài xế xe điện giao tận sảnh tòa nhà • Hưởng mã giảm giá & freeship trên app
                    </p>
                  </div>
                </div>

                <a
                  href="https://xanhsmngon.onelink.me/14WJ/u8vplbn5"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#008F5D] hover:bg-[#00764D] text-white font-black text-xs py-2.5 px-4 rounded-xl transition-all shadow-md hover:scale-[1.01] active:scale-95"
                >
                  <span>Mở Quán Trên App Xanh SM Ngon</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
