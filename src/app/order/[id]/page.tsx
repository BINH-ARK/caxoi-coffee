"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Coffee,
  Truck,
  Building,
  Copy,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Order, OrderStatus, BusinessSettings } from "@/types";
import { formatVND, generateVietQrUrl } from "@/lib/utils";
import { getBankById } from "@/lib/vietqr";

const STATUS_STEPS: { key: OrderStatus; label: string; desc: string }[] = [
  { key: "PENDING_PAYMENT", label: "Chờ thanh toán", desc: "Đang chờ chuyển khoản" },
  { key: "CONFIRMED", label: "Đã xác nhận", desc: "Đơn đã vào quầy bar" },
  { key: "BREWING", label: "Đang pha chế", desc: "Barista đang chuẩn bị" },
  { key: "READY", label: "Đã sẵn sàng", desc: "Đã đóng gói cẩn thận" },
  { key: "DELIVERING", label: "Đang giao hàng", desc: "Đang đến văn phòng" },
  { key: "COMPLETED", label: "Hoàn tất", desc: "Thưởng thức cà phê!" },
];

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [simMessage, setSimMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Poll order status every 4 seconds
  useEffect(() => {
    let isMounted = true;

    const fetchOrder = () => {
      fetch(`/api/orders/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.success) {
            setOrder(data.data);
            if (data.settings) {
              setSettings(data.settings);
            }
          }
        })
        .catch((e) => console.error("Poll order failed", e))
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [id]);

  // Simulate payment webhook call
  const handleSimulateWebhook = async () => {
    if (!order) return;
    setIsSimulatingPayment(true);
    setSimMessage("");

    const currentBankId = settings?.vietqrBankId || "MB";
    const currentAccountNo = settings?.vietqrAccountNo || "999988886666";

    try {
      const res = await fetch("/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway: currentBankId,
          content: `${order.orderCode} NGUYEN VAN A CHUYEN KHOAN`,
          transferAmount: order.totalAmount,
          accountNumber: currentAccountNo,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSimMessage("Thanh toán đối soát thành công! Đơn hàng đã chuyển sang quầy pha chế.");
        // Re-fetch order
        const orderRes = await fetch(`/api/orders/${id}`);
        const orderData = await orderRes.json();
        if (orderData.success) setOrder(orderData.data);
      } else {
        setSimMessage(data.message || "Không thể đối soát");
      }
    } catch {
      setSimMessage("Lỗi kết nối webhook");
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  const handleCopyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    setIsCancelling(true);
    setCancelError("");
    try {
      const res = await fetch(
        `/api/orders/${order.orderCode}?reason=${encodeURIComponent("Khách hàng đã hủy đơn")}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        setOrder((prev) =>
          prev ? { ...prev, status: "CANCELLED", trackingNotes: "Khách hàng đã hủy đơn" } : null
        );
        setShowCancelModal(false);
      } else {
        setCancelError(data.message || "Không thể hủy đơn hàng lúc này");
      }
    } catch {
      setCancelError("Lỗi kết nối khi hủy đơn hàng");
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-caramel animate-spin mx-auto" />
        <p className="text-xs font-semibold text-coffee-600">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-coffee-900">Không tìm thấy đơn hàng</h2>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-coffee-800 text-white font-bold text-xs px-4 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại Menu
        </Link>
      </div>
    );
  }

  // Calculate current progress index
  const statusOrderIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const isPaid = order.paymentStatus === "PAID";
  const isPendingPayment = order.status === "PENDING_PAYMENT" && !isPaid;
  const isCancelled = order.status === "CANCELLED";
  // Khi tiến trình chuẩn bị đồ uống đã chạy (đã thanh toán hoặc trạng thái không còn là PENDING_PAYMENT)
  // thì tuyệt đối KHÔNG hiển thị nút hủy đơn
  const isPreparationRunning = order.status !== "PENDING_PAYMENT" || isPaid;
  const canCancel = !isPreparationRunning && !isCancelled;

  const bankId = settings?.vietqrBankId || "MB";
  const accountNo = settings?.vietqrAccountNo || "999988886666";
  const accountName = settings?.vietqrAccountName || "CA XOI CAFE";
  const bankInfo = getBankById(bankId);

  // Generate VietQR dynamic URL
  const vietQrUrl = generateVietQrUrl({
    bankId,
    accountNo,
    accountName,
    amount: order.totalAmount,
    description: order.orderCode,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-coffee-700 hover:text-caramel"
        >
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-coffee-800 bg-amber-100 px-3 py-1 rounded-full">
            Mã đơn: #{order.orderCode}
          </span>
          {canCancel && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1 rounded-full flex items-center gap-1 transition-all active:scale-95 shadow-sm"
              title="Hủy đơn hàng nếu không muốn đặt"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Hủy đơn</span>
            </button>
          )}
        </div>
      </div>

      {/* CANCELLED STATE BANNER */}
      {isCancelled ? (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 shadow-inner">
            <XCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-bold px-3 py-1 bg-red-200 text-red-800 rounded-full">
              Đơn hàng đã được hủy
            </span>
            <h2 className="text-lg font-black text-coffee-950 pt-1">
              Đơn hàng #{order.orderCode} đã bị hủy
            </h2>
            <p className="text-xs text-coffee-600 max-w-md mx-auto leading-relaxed">
              {order.trackingNotes ||
                "Đơn hàng đã được hủy thành công theo yêu cầu của bạn. Quán sẽ không tiến hành pha chế hoặc giao đồ uống."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-coffee-800 hover:bg-coffee-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại Thực đơn để đặt món khác
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* 1. PROGRESS BAR */}
          <div className="bg-white rounded-3xl p-5 border border-coffee-100 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-coffee-900">Tiến trình chuẩn bị</h1>
                <p className="text-xs text-coffee-500 mt-0.5">
                  {order.scheduledType === "PREORDER"
                    ? `Hẹn giao lúc: ${order.scheduledTime}`
                    : isPendingPayment
                    ? "Vui lòng quét mã QR thanh toán để bắt đầu pha chế đồ uống"
                    : "Giao ngay khi Barista pha chế xong"}
                </p>
              </div>
              <div
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${
                  isPendingPayment
                    ? "bg-amber-100/90 text-amber-900 border-amber-300 shadow-sm"
                    : "bg-amber-50 text-coffee-800 border-amber-200"
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-caramel" />
                <span>
                  {order.status === "CONFIRMED" && "Quán đã nhận đơn"}
                  {order.status === "BREWING" && "Đang pha chế..."}
                  {order.status === "READY" && "Sẵn sàng giao / lấy"}
                  {order.status === "DELIVERING" && "Shipper đang giao"}
                  {order.status === "COMPLETED" && "Đã hoàn thành"}
                  {order.status === "PENDING_PAYMENT" && "Chờ thanh toán QR"}
                </span>
              </div>
            </div>

            {/* Waiting for payment warning banner */}
            {isPendingPayment && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Clock className="w-4 h-4 animate-spin text-amber-700" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <h3 className="font-bold text-coffee-950 text-sm flex items-center gap-2">
                    <span>Tiến trình pha chế chưa bắt đầu</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-black tracking-wide">
                      CHỜ THANH TOÁN
                    </span>
                  </h3>
                  <p className="text-coffee-700 text-[11px] sm:text-xs leading-relaxed pt-0.5">
                    Quý khách vui lòng <strong>quét mã VietQR bên dưới</strong> để hoàn tất thanh toán. Quán Cà Xòi sẽ tự động nhận đơn và Barista bắt đầu pha chế đồ uống ngay khi tiền về tài khoản!
                  </p>
                </div>
              </div>
            )}

            {/* Confirmed / paid success banner */}
            {isPaid && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 flex items-center gap-2.5 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-950">
                  Đã thanh toán thành công! Quầy Barista Cà Xòi đang chuẩn bị đồ uống cho bạn.
                </span>
              </div>
            )}

            {/* 5-step visual track (Only runs when payment completed) */}
            <div className="grid grid-cols-5 gap-2 relative">
              {STATUS_STEPS.slice(1, 6).map((step, idx) => {
                const stepNum = idx + 1;
                // If order is still pending payment, NO preparation step is active yet
                const currentStepNum = isPendingPayment ? 0 : statusOrderIndex >= 1 ? statusOrderIndex : 0;
                const isCompleted = currentStepNum >= stepNum;
                const isCurrent = currentStepNum === stepNum;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isCompleted
                          ? "bg-caramel text-white shadow-md ring-2 ring-caramel/20"
                          : isPendingPayment
                          ? "bg-stone-100 text-stone-300 border border-dashed border-stone-300"
                          : "bg-coffee-100 text-coffee-400"
                      } ${isCurrent ? "animate-bounce" : ""}`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : stepNum}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs font-bold mt-1.5 leading-tight ${
                        isCompleted
                          ? "text-coffee-900"
                          : isPendingPayment
                          ? "text-stone-400"
                          : "text-coffee-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

      {/* 2. VIETQR PAYMENT CARD (IF UNPAID) */}
      {isPendingPayment && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-3xl p-5 border border-amber-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
            <div>
              <h2 className="font-bold text-sm text-coffee-900">
                Quét mã VietQR để kích hoạt đơn hàng
              </h2>
              <p className="text-[11px] text-coffee-600 mt-0.5">
                Quét bằng mọi ứng dụng Ngân hàng (MBBank, Vietcombank, Techcombank, Momo...)
              </p>
            </div>
            <span className="text-xs font-bold text-caramel bg-white px-2.5 py-1 rounded-lg border border-amber-300">
              Chờ thanh toán
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
            {/* Dynamic VietQR Image */}
            <div className="bg-white p-3 rounded-2xl shadow-md border border-amber-200 shrink-0">
              <Image
                src={vietQrUrl}
                alt="VietQR Transfer"
                width={190}
                height={190}
                unoptimized
                priority
                className="rounded-lg object-contain"
              />
            </div>

            {/* Transfer instructions */}
            <div className="space-y-2.5 text-xs text-coffee-800 w-full max-w-sm">
              <div className="flex justify-between bg-white p-2.5 rounded-xl border border-amber-200">
                <span className="text-coffee-500">Ngân hàng:</span>
                <span className="font-bold">{bankInfo ? `${bankInfo.shortName} (${bankInfo.name})` : bankId}</span>
              </div>

              <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-amber-200">
                <span className="text-coffee-500">Số tài khoản:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-caramel">{accountNo}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyContent(accountNo)}
                    className="text-caramel hover:text-caramel-dark"
                    title="Sao chép số tài khoản"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-amber-200">
                <span className="text-coffee-500">Tên chủ tài khoản:</span>
                <span className="font-bold">{accountName}</span>
              </div>

              <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-amber-200">
                <span className="text-coffee-500">Nội dung CK:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-caramel bg-amber-100 px-1.5 py-0.5 rounded">
                    {order.orderCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyContent(order.orderCode)}
                    className="text-caramel hover:text-caramel-dark"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between bg-white p-2.5 rounded-xl border border-amber-200">
                <span className="text-coffee-500">Số tiền chính xác:</span>
                <span className="font-bold text-sm text-caramel">
                  {formatVND(order.totalAmount)}
                </span>
              </div>

              {copied && (
                <p className="text-[11px] text-emerald-600 font-bold text-center">
                  ✓ Đã sao chép vào bộ nhớ tạm
                </p>
              )}
            </div>
          </div>

          {/* SIMULATION TEST BUTTON FOR USER & TESTERS */}
          <div className="pt-3 border-t border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/70 p-3 rounded-2xl">
            <div>
              <span className="text-xs font-bold text-coffee-800">
                Dành cho kiểm thử hệ thống:
              </span>
              <p className="text-[11px] text-coffee-500">
                Bấm nút để mô phỏng Webhook ngân hàng bắn về Server đối soát tức thì.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSimulateWebhook}
              disabled={isSimulatingPayment}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-sm transition-all whitespace-nowrap active:scale-95 disabled:opacity-50"
            >
              {isSimulatingPayment ? "Đang đối soát..." : "Mô phỏng Chuyển khoản thành công"}
            </button>
          </div>
          {simMessage && (
            <p className="text-xs text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg text-center">
              {simMessage}
            </p>
          )}

          {/* Customer Cancel Option directly on payment card */}
          {canCancel && (
            <div className="pt-3 border-t border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 bg-rose-50/70 p-3 rounded-2xl border border-rose-200/80">
              <div className="text-left">
                <span className="text-xs font-bold text-coffee-800">
                  Đổi ý hoặc không muốn đặt món nữa?
                </span>
                <p className="text-[11px] text-coffee-500">
                  Bạn có thể hủy đơn hàng này ngay bây giờ trước khi chuyển khoản.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="text-xs font-bold bg-white hover:bg-red-50 text-red-600 border border-red-200 px-3.5 py-1.5 rounded-xl shadow-sm transition-all whitespace-nowrap active:scale-95 flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Hủy đơn hàng này</span>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )}

      {/* 3. ORDER DETAILS & ITEMS */}
      <div className="bg-white rounded-3xl p-5 border border-coffee-100 shadow-sm space-y-4">
        <h2 className="font-bold text-base text-coffee-900 border-b border-coffee-100 pb-2">
          Chi tiết đồ uống đã đặt
        </h2>

        <div className="divide-y divide-coffee-100 space-y-3">
          {order.items.map((item, idx) => (
            <div key={idx} className="pt-3 first:pt-0 flex justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-sm text-coffee-900">
                  {item.quantity}x {item.productName}
                </div>
                <div className="text-coffee-500 font-medium mt-0.5">
                  Size: {item.variantName}
                </div>

                {item.options && item.options.length > 0 && (
                  <div className="text-[11px] text-coffee-600 mt-0.5">
                    {item.options.map((o) => o.valueName).join(" • ")}
                  </div>
                )}

                {item.recipientLabel && (
                  <span className="inline-block bg-amber-100 text-coffee-800 text-[10px] font-bold px-2 py-0.5 rounded mt-1">
                    Ly của: {item.recipientLabel}
                  </span>
                )}
              </div>

              <div className="font-bold text-sm text-coffee-900 whitespace-nowrap">
                {formatVND(item.totalPrice)}
              </div>
            </div>
          ))}
        </div>

        {/* Pricing breakdown */}
        <div className="pt-3 border-t border-coffee-100 space-y-1.5 text-xs text-coffee-600">
          <div className="flex justify-between">
            <span>Tiền hàng:</span>
            <span className="font-semibold">{formatVND(order.subtotalAmount)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-caramel">
              <span>Giảm giá ({order.promotionCode}):</span>
              <span className="font-bold">-{formatVND(order.discountAmount)}</span>
            </div>
          )}
          {order.orderType === "OFFICE_DELIVERY" && order.deliveryFee > 0 && (
            <div className="flex justify-between">
              <span>Phí giao hàng:</span>
              <span>{formatVND(order.deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold text-coffee-900 pt-2 border-t border-coffee-200">
            <span>Tổng thanh toán:</span>
            <span className="text-caramel">{formatVND(order.totalAmount)}</span>
          </div>
        </div>

        {/* Recipient & Location Info */}
        <div className="pt-3 border-t border-coffee-100 text-xs text-coffee-700 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-coffee-900">Người nhận:</span>
            <span>{order.recipientName} ({order.recipientPhone})</span>
          </div>
          {order.buildingName && (
            <div className="flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-coffee-400" />
              <span>
                {order.buildingName} - {order.floorRoom} {order.companyName && `(${order.companyName})`}
              </span>
            </div>
          )}
          {order.deliveryNotes && (
            <div className="text-[11px] text-coffee-500 italic">
              Ghi chú: &ldquo;{order.deliveryNotes}&rdquo;
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-coffee-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-coffee-950 text-base">Xác nhận hủy đơn hàng?</h3>
              <p className="text-xs text-coffee-600 leading-relaxed">
                Bạn có chắc chắn muốn hủy đơn hàng <strong>#{order.orderCode}</strong> không? Quầy Barista Cà Xòi sẽ không thực hiện chuẩn bị đơn này.
              </p>
            </div>

            {cancelError && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl text-center font-semibold border border-red-200">
                {cancelError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2.5 rounded-xl border border-coffee-200 text-xs font-bold text-coffee-700 hover:bg-stone-50 active:scale-95 transition-all"
              >
                Giữ lại đơn
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelOrder}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isCancelling ? "Đang hủy..." : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
