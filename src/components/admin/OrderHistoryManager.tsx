"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Search,
  RefreshCw,
  Phone,
  MapPin,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Coffee,
  Calendar,
  ExternalLink,
  User,
  Building,
  Printer,
  Navigation,
  FileText,
  DollarSign,
  AlertTriangle,
  Send,
  Eye,
  Check,
  X,
} from "lucide-react";
import { Order, OrderStatus, OrderItemRecord } from "@/types";
import { formatVND } from "@/lib/utils";
import CupStickerPreview from "@/components/CupStickerPreview";

interface OrderHistoryManagerProps {
  currentUser?: any;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  PENDING_PAYMENT: {
    label: "Chờ thanh toán",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Đã tiếp nhận",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    icon: CheckCircle2,
  },
  BREWING: {
    label: "Đang pha chế",
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
    icon: Coffee,
  },
  READY: {
    label: "Sẵn sàng giao",
    bg: "bg-teal-50",
    text: "text-teal-800",
    border: "border-teal-200",
    icon: CheckCircle2,
  },
  DELIVERING: {
    label: "Đang giao hàng",
    bg: "bg-orange-50",
    text: "text-orange-800",
    border: "border-orange-200",
    icon: Truck,
  },
  COMPLETED: {
    label: "Hoàn thành",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Đã hủy",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    icon: XCircle,
  },
};

export default function OrderHistoryManager({ currentUser }: OrderHistoryManagerProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("TODAY");
  const [selectedOrderType, setSelectedOrderType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isShipperModalOpen, setIsShipperModalOpen] = useState(false);
  const [shipperForm, setShipperForm] = useState({
    shipperName: "",
    shipperPhone: "",
    estimatedDeliveryTime: "",
    trackingNotes: "",
    deliveryFee: 15000,
  });

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  // Sticker Print Modal State
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
  const [stickerOrder, setStickerOrder] = useState<Order | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);
      if (selectedDate !== "ALL") params.append("date", selectedDate);
      if (selectedOrderType !== "ALL") params.append("orderType", selectedOrderType);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setOrders(data.data);
      }
    } catch (e) {
      console.error("Lỗi tải đơn hàng:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedStatus, selectedDate, selectedOrderType, searchQuery]);

  // Initial & Filter fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = orders.length;
    let pendingPayment = 0;
    let brewing = 0;
    let delivering = 0;
    let completed = 0;
    let totalRevenue = 0;

    orders.forEach((o) => {
      if (o.status === "PENDING_PAYMENT") pendingPayment++;
      else if (o.status === "BREWING" || o.status === "CONFIRMED") brewing++;
      else if (o.status === "READY" || o.status === "DELIVERING") delivering++;
      else if (o.status === "COMPLETED") {
        completed++;
        totalRevenue += Number(o.totalAmount || 0);
      }
    });

    return { total, pendingPayment, brewing, delivering, completed, totalRevenue };
  }, [orders]);

  // Update Status handler
  const handleUpdateStatus = async (orderId: string, nextStatus: string, options?: any) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, ...options }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã chuyển đơn sang: ${STATUS_CONFIG[nextStatus]?.label || nextStatus}`);
        fetchOrders(true);
        if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderCode === orderId)) {
          setSelectedOrder(data.data);
        }
      } else {
        showToast(data.message || "Có lỗi xảy ra", "error");
      }
    } catch (e) {
      showToast("Không thể kết nối máy chủ", "error");
    }
  };

  // Toggle Payment status
  const handleTogglePayment = async (order: Order) => {
    const nextPaymentStatus = order.paymentStatus === "PAID" ? "UNPAID" : "PAID";
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: nextPaymentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã đổi thanh toán: ${nextPaymentStatus === "PAID" ? "ĐÃ THANH TOÁN" : "CHƯA THANH TOÁN"}`);
        fetchOrders(true);
      }
    } catch (e) {
      showToast("Lỗi cập nhật thanh toán", "error");
    }
  };

  // Open Shipper modal
  const handleOpenShipperModal = (order: Order) => {
    setSelectedOrder(order);
    setShipperForm({
      shipperName: order.shipperName || "Shipper Quán Cà Xòi",
      shipperPhone: order.shipperPhone || "0905249733",
      estimatedDeliveryTime: order.estimatedDeliveryTime || "15 - 20 phút",
      trackingNotes: order.trackingNotes || (order.deliveryNotes ? `Lưu ý: ${order.deliveryNotes}` : ""),
      deliveryFee: order.deliveryFee || 0,
    });
    setIsShipperModalOpen(true);
  };

  // Save Shipper assignment
  const handleSaveShipper = async () => {
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DELIVERING",
          ...shipperForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Đã điều phối Shipper & chuyển sang Đang giao hàng!");
        setIsShipperModalOpen(false);
        fetchOrders(true);
        setSelectedOrder(data.data);
      } else {
        showToast(data.message || "Lỗi lưu điều phối shipper", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối", "error");
    }
  };

  // Cancel order execution
  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    try {
      const res = await fetch(`/api/orders/${orderToCancel.id}?reason=${encodeURIComponent(cancelReason || "Hủy theo yêu cầu")}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("Đã hủy đơn hàng thành công!");
        setIsCancelModalOpen(false);
        setOrderToCancel(null);
        setCancelReason("");
        fetchOrders(true);
      } else {
        showToast(data.message || "Lỗi hủy đơn", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối", "error");
    }
  };

  // Get next logical status
  const getNextStatusAction = (currentStatus: string) => {
    switch (currentStatus) {
      case "PENDING_PAYMENT":
        return { next: "CONFIRMED", label: "Tiếp nhận đơn", icon: CheckCircle2, color: "bg-blue-600 hover:bg-blue-500" };
      case "CONFIRMED":
        return { next: "BREWING", label: "Bắt đầu pha", icon: Coffee, color: "bg-purple-600 hover:bg-purple-500" };
      case "BREWING":
        return { next: "READY", label: "Đã pha xong", icon: Check, color: "bg-teal-600 hover:bg-teal-500" };
      case "READY":
        return { next: "DELIVERING", label: "Giao shipper", icon: Truck, color: "bg-orange-600 hover:bg-orange-500" };
      case "DELIVERING":
        return { next: "COMPLETED", label: "Đã giao xong", icon: CheckCircle2, color: "bg-emerald-600 hover:bg-emerald-500" };
      default:
        return null;
    }
  };

  const getFullDestinationAddress = (order: Order) => {
    const parts = [
      order.floorRoom,
      order.buildingName,
      order.companyName,
      order.deliveryAddress,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "02 Quang Trung, Hải Châu, Đà Nẵng";
  };

  const getGoogleMapsDirectionsUrl = (order: Order) => {
    const dest = encodeURIComponent(getFullDestinationAddress(order));
    const origin = encodeURIComponent("02 Quang Trung, Thạch Thang, Hải Châu, Đà Nẵng");
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=two_wheeler`;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Alert */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-2 animate-bounce ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-300"
              : "bg-rose-50 text-rose-900 border-rose-300"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* METRICS SUMMARY BAR (LIGHT THEME) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white border border-coffee-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-stone-500 font-medium">Tổng đơn hiển thị</div>
            <div className="text-2xl font-black text-coffee-950 mt-1">{metrics.total}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-200">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-coffee-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-amber-700 font-medium">Chờ thanh toán</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{metrics.pendingPayment}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-coffee-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-purple-700 font-medium">Đang pha chế</div>
            <div className="text-2xl font-black text-purple-600 mt-1">{metrics.brewing}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-200">
            <Coffee className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-coffee-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-orange-700 font-medium">Sẵn sàng / Đang giao</div>
            <div className="text-2xl font-black text-orange-600 mt-1">{metrics.delivering}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-200">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-coffee-100 rounded-2xl p-4 flex items-center justify-between shadow-sm col-span-2 md:col-span-1">
          <div>
            <div className="text-xs text-emerald-700 font-medium">Đã hoàn thành</div>
            <div className="text-xl font-black text-emerald-600 mt-1">{formatVND(metrics.totalRevenue)}</div>
            <div className="text-[11px] text-stone-500 font-mono mt-0.5">{metrics.completed} đơn hoàn tất</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS & SEARCH TOOLBAR (LIGHT THEME) */}
      <div className="bg-white border border-coffee-100 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo Mã đơn (CX-...), SĐT, Tên khách, Tòa nhà..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-8 py-2 text-sm text-coffee-950 placeholder-stone-400 focus:outline-none focus:border-caramel focus:bg-white shadow-inner transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-bold">
            <button
              onClick={() => setSelectedDate("TODAY")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedDate === "TODAY" ? "bg-caramel text-white shadow" : "text-stone-600 hover:text-coffee-950"
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setSelectedDate("YESTERDAY")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedDate === "YESTERDAY" ? "bg-caramel text-white shadow" : "text-stone-600 hover:text-coffee-950"
              }`}
            >
              Hôm qua
            </button>
            <button
              onClick={() => setSelectedDate("7DAYS")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedDate === "7DAYS" ? "bg-caramel text-white shadow" : "text-stone-600 hover:text-coffee-950"
              }`}
            >
              7 ngày qua
            </button>
            <button
              onClick={() => setSelectedDate("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedDate === "ALL" ? "bg-caramel text-white shadow" : "text-stone-600 hover:text-coffee-950"
              }`}
            >
              Tất cả
            </button>
          </div>

          {/* Auto Refresh & Refresh Trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all ${
                autoRefresh
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-stone-100 text-stone-600 border-stone-200"
              }`}
              title="Tự động cập nhật mỗi 15s"
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-stone-400"}`} />
              <span>{autoRefresh ? "Auto Refresh" : "Tạm dừng"}</span>
            </button>

            <button
              onClick={() => fetchOrders()}
              className="flex items-center gap-1.5 text-xs font-bold bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 px-3 py-2 rounded-xl transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-caramel" : ""}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* STATUS TABS */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-stone-100">
          {[
            { id: "ALL", label: "Tất cả trạng thái" },
            { id: "PENDING_PAYMENT", label: "Chờ thanh toán" },
            { id: "CONFIRMED", label: "Đã tiếp nhận" },
            { id: "BREWING", label: "Đang pha chế" },
            { id: "READY", label: "Sẵn sàng giao" },
            { id: "DELIVERING", label: "Đang giao" },
            { id: "COMPLETED", label: "Đã hoàn thành" },
            { id: "CANCELLED", label: "Đã hủy" },
          ].map((tab) => {
            const isSelected = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-caramel text-white shadow ring-2 ring-caramel/30"
                    : "text-stone-600 hover:text-coffee-950 bg-stone-100/80 hover:bg-stone-200/80"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ORDERS LIST (LIGHT THEME) */}
      {loading && orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-coffee-100 rounded-3xl text-stone-500 space-y-3 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-caramel" />
          <p className="text-sm font-medium">Đang tải danh sách đơn hàng & trạng thái...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-coffee-100 rounded-3xl text-stone-500 space-y-2 shadow-sm">
          <FileText className="w-10 h-10 text-stone-300" />
          <p className="text-base font-bold text-coffee-900">Không tìm thấy đơn hàng nào</p>
          <p className="text-xs text-stone-500">Thử đổi bộ lọc ngày, trạng thái hoặc từ khóa tìm kiếm</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.status] || {
              label: order.status,
              bg: "bg-stone-100",
              text: "text-stone-700",
              border: "border-stone-200",
              icon: Clock,
            };
            const StatusIcon = statusConfig.icon;
            const nextAction = getNextStatusAction(order.status);
            const totalCups = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
            const isGroup = order.orderType === "GROUP_ORDER" || Boolean(order.groupSessionId);

            return (
              <div
                key={order.id}
                className="bg-white border border-coffee-100 hover:border-caramel/40 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-lg text-coffee-950 tracking-wider">
                      #{order.orderCode}
                    </span>
                    {isGroup && (
                      <span className="bg-purple-100 border border-purple-200 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Đơn Nhóm
                      </span>
                    )}
                    <span className="text-xs text-stone-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      {new Date(order.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(order.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Payment Badge */}
                    <button
                      onClick={() => handleTogglePayment(order)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        order.paymentStatus === "PAID"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                          : "bg-amber-50 border-amber-300 text-amber-900"
                      }`}
                      title="Nhấn để đổi trạng thái thanh toán"
                    >
                      {order.paymentMethod === "VIETQR_BANKING" ? "VietQR: " : "Tiền mặt: "}
                      {order.paymentStatus === "PAID" ? "Đã thanh toán" : "Chưa thanh toán"}
                    </button>

                    {/* Status Badge */}
                    <div
                      className={`flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-xl border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusConfig.label}</span>
                    </div>
                  </div>
                </div>

                {/* Body: 2 Columns Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column (5 cols): Recipient & Shipping Coordination */}
                  <div className="lg:col-span-5 space-y-3 text-xs">
                    {/* Customer Info Box */}
                    <div className="bg-stone-50/80 p-3.5 rounded-xl border border-stone-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-coffee-950 text-sm">
                          <User className="w-4 h-4 text-caramel" />
                          <span>{order.recipientName}</span>
                        </div>
                        <a
                          href={`tel:${order.recipientPhone}`}
                          className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{order.recipientPhone}</span>
                        </a>
                      </div>

                      {/* Address & Building */}
                      <div className="flex items-start gap-2 text-stone-600">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-coffee-900 font-semibold">
                            {[order.floorRoom, order.buildingName, order.companyName].filter(Boolean).join(" - ") || "Cửa hàng Cà Xòi"}
                          </div>
                          {order.deliveryAddress && (
                            <div className="text-stone-500 text-[11px] mt-0.5">{order.deliveryAddress}</div>
                          )}
                        </div>
                      </div>

                      {order.deliveryNotes && (
                        <div className="text-amber-900 bg-amber-50 border border-amber-200 p-2 rounded-lg text-[11px]">
                          <strong>Ghi chú giao:</strong> {order.deliveryNotes}
                        </div>
                      )}

                      {/* Google Maps Route Button */}
                      <a
                        href={getGoogleMapsDirectionsUrl(order)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg mt-1 transition-all"
                      >
                        <Navigation className="w-3.5 h-3.5 text-blue-600" />
                        <span>Mở dẫn đường Google Maps</span>
                        <ExternalLink className="w-3 h-3 text-blue-500" />
                      </a>
                    </div>
                  </div>

                  {/* Right Column (7 cols): Items breakdown, Total & Action Buttons */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                    {/* Order Items Table */}
                    <div className="bg-stone-50/70 rounded-xl border border-stone-200 overflow-hidden">
                      <div className="bg-stone-100/90 px-3 py-2 text-xs font-bold text-stone-600 flex items-center justify-between border-b border-stone-200">
                        <span>Danh sách thức uống ({totalCups} ly)</span>
                        <button
                          onClick={() => {
                            setStickerOrder(order);
                            setIsStickerModalOpen(true);
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>In Sticker Ly</span>
                        </button>
                      </div>
                      <div className="divide-y divide-stone-200/70 max-h-52 overflow-y-auto no-scrollbar bg-white">
                        {order.items.map((item) => (
                          <div key={item.id} className="p-3 text-xs flex items-start justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <div className="font-bold text-coffee-950 flex items-center gap-2">
                                <span>{item.productName}</span>
                                <span className="bg-stone-100 text-stone-700 border border-stone-200 text-[10px] px-1.5 py-0.2 rounded font-medium">
                                  {item.variantName}
                                </span>
                                {item.recipientLabel && (
                                  <span className="bg-pink-100 border border-pink-200 text-pink-700 text-[10px] px-1.5 rounded font-bold">
                                    {item.recipientLabel}
                                  </span>
                                )}
                              </div>
                              {item.options && item.options.length > 0 && (
                                <div className="text-stone-500 text-[11px]">
                                  {item.options.map((opt: any) => `${opt.optionName || opt.name}: ${opt.valueName || opt.choiceName}`).join(" • ")}
                                </div>
                              )}
                              {item.itemNotes && (
                                <div className="text-amber-800 text-[11px] italic">
                                  Ghi chú: {item.itemNotes}
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-coffee-950">
                                x{item.quantity} = {formatVND(item.totalPrice)}
                              </div>
                              <div className="text-[10px] text-stone-400 font-mono">
                                ({formatVND(item.unitPrice)}/ly)
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pricing Summary Footer */}
                      <div className="bg-stone-100/80 p-3 border-t border-stone-200 flex flex-wrap items-center justify-between text-xs gap-2">
                        <div className="space-x-3 text-stone-600 text-[11px]">
                          <span>Tạm tính: {formatVND(order.subtotalAmount)}</span>
                          {order.discountAmount > 0 && (
                            <span className="text-pink-600 font-semibold">Giảm: -{formatVND(order.discountAmount)}</span>
                          )}
                          <span>Ship: {formatVND(order.deliveryFee)}</span>
                        </div>
                        <div className="font-black text-caramel text-base">
                          Tổng cộng: {formatVND(order.totalAmount)}
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS TOOLBAR */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {/* Left: View details & cancel */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDetailModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-coffee-950 bg-stone-100 hover:bg-stone-200 border border-stone-300 px-3 py-1.5 rounded-xl transition-all"
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-500" />
                          <span>Chi tiết</span>
                        </button>

                        {order.status !== "CANCELLED" && order.status !== "COMPLETED" && (
                          <button
                            onClick={() => {
                              setOrderToCancel(order);
                              setIsCancelModalOpen(true);
                            }}
                            className="flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-xl transition-all"
                          >
                            <XCircle className="w-3 h-3 text-rose-500" />
                            <span>Hủy đơn</span>
                          </button>
                        )}
                      </div>

                      {/* Right: Step progression trigger */}
                      {nextAction && order.status !== "CANCELLED" && (
                        <button
                          onClick={() => {
                            handleUpdateStatus(order.id, nextAction.next);
                          }}
                          className={`flex items-center gap-2 text-xs font-black text-white px-4 py-2 rounded-xl shadow-sm transition-all active:scale-95 ${nextAction.color}`}
                        >
                          <nextAction.icon className="w-4 h-4" />
                          <span>{nextAction.label} &rarr;</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: SHIPPER DISPATCH & COORDINATION (LIGHT THEME) */}
      {isShipperModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-stone-200">
            <div className="bg-gradient-to-r from-coffee-950 via-coffee-900 to-coffee-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                <Truck className="w-5 h-5 text-orange-400" />
                <span>Điều phối Shipper đơn #{selectedOrder.orderCode}</span>
              </div>
              <button
                onClick={() => setIsShipperModalOpen(false)}
                className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-coffee-950">
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1">
                <div>
                  <strong>Người nhận:</strong> {selectedOrder.recipientName} ({selectedOrder.recipientPhone})
                </div>
                <div>
                  <strong>Địa chỉ giao:</strong> {getFullDestinationAddress(selectedOrder)}
                </div>
              </div>

              {/* Shipper Name */}
              <div className="space-y-1.5">
                <label className="font-bold text-coffee-900">Tên tài xế / Đơn vị giao:</label>
                <input
                  type="text"
                  value={shipperForm.shipperName}
                  onChange={(e) => setShipperForm({ ...shipperForm, shipperName: e.target.value })}
                  placeholder="Ví dụ: Shipper Tuấn - Cà Xòi hoặc Xanh SM / Grab"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-coffee-950 focus:outline-none focus:border-caramel focus:bg-white"
                />
                {/* Quick picker chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "Shipper Quán Cà Xòi",
                    "Xanh SM Delivery",
                    "Ahamove",
                    "GrabExpress",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setShipperForm({ ...shipperForm, shipperName: preset })}
                      className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-[10px] text-stone-700 border border-stone-200"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shipper Phone */}
              <div className="space-y-1.5">
                <label className="font-bold text-coffee-900">Số điện thoại Shipper:</label>
                <input
                  type="text"
                  value={shipperForm.shipperPhone}
                  onChange={(e) => setShipperForm({ ...shipperForm, shipperPhone: e.target.value })}
                  placeholder="Ví dụ: 0905 249 733"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-coffee-950 focus:outline-none focus:border-caramel focus:bg-white"
                />
              </div>

              {/* ETA */}
              <div className="space-y-1.5">
                <label className="font-bold text-coffee-900">Thời gian giao dự kiến:</label>
                <input
                  type="text"
                  value={shipperForm.estimatedDeliveryTime}
                  onChange={(e) => setShipperForm({ ...shipperForm, estimatedDeliveryTime: e.target.value })}
                  placeholder="Ví dụ: 15 - 20 phút hoặc 11:30"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-coffee-950 focus:outline-none focus:border-caramel focus:bg-white"
                />
              </div>

              {/* Delivery Fee */}
              <div className="space-y-1.5">
                <label className="font-bold text-coffee-900">Phí giao hàng (VNĐ):</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={shipperForm.deliveryFee}
                  onChange={(e) => setShipperForm({ ...shipperForm, deliveryFee: Number(e.target.value) || 0 })}
                  placeholder="Ví dụ: 15000 hoặc 0"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-coffee-950 font-bold focus:outline-none focus:border-caramel focus:bg-white"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-coffee-900">Ghi chú vận chuyển (Shipper & Khách):</label>
                <textarea
                  rows={2}
                  value={shipperForm.trackingNotes}
                  onChange={(e) => setShipperForm({ ...shipperForm, trackingNotes: e.target.value })}
                  placeholder="Ví dụ: Đã trả tiền trước, gửi quầy lễ tân tầng 1..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-coffee-950 focus:outline-none focus:border-caramel focus:bg-white"
                />
              </div>

              {/* Directions link */}
              <div className="pt-1">
                <a
                  href={getGoogleMapsDirectionsUrl(selectedOrder)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>Xem tuyến đường giao hàng trên Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsShipperModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveShipper}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Xác nhận & Bàn giao Shipper</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CANCEL ORDER REASON (LIGHT THEME) */}
      {isCancelModalOpen && orderToCancel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-rose-50">
              <div className="flex items-center gap-2 text-rose-800 font-bold">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Hủy đơn hàng #{orderToCancel.orderCode}</span>
              </div>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-coffee-950">
              <p className="text-stone-600 leading-relaxed">
                Bạn có chắc chắn muốn hủy đơn hàng này không? Hành động này sẽ chuyển trạng thái đơn sang <strong>ĐÃ HỦY</strong>.
              </p>

              <div className="space-y-1.5">
                <label className="font-bold text-coffee-900">Lý do hủy đơn:</label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ví dụ: Khách gọi báo hủy, hết nguyên liệu pha chế..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-coffee-950 focus:outline-none focus:border-rose-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Xác nhận Hủy Đơn</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: STICKER CUP PREVIEW (LIGHT THEME) */}
      {isStickerModalOpen && stickerOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-coffee-950 to-coffee-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                <Printer className="w-5 h-5 text-amber-300" />
                <span>Xem & In tem nhãn dán ly (#{stickerOrder.orderCode})</span>
              </div>
              <button
                onClick={() => setIsStickerModalOpen(false)}
                className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 bg-stone-50 flex-1">
              <p className="text-xs text-stone-600">
                Tem in sẵn sàng dán lên ly để Barista pha chế và Shipper phân loại theo tên từng người nhận:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stickerOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-center">
                    <CupStickerPreview
                      orderCode={stickerOrder.orderCode}
                      item={item}
                      createdAt={stickerOrder.createdAt}
                      onPrint={() => window.print()}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-between">
              <div className="text-xs text-stone-500">
                Tổng {stickerOrder.items.reduce((s, i) => s + i.quantity, 0)} tem nhãn
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsStickerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In tất cả tem nhãn</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ORDER DETAILS (LIGHT THEME) */}
      {isDetailModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-coffee-950 to-coffee-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                <FileText className="w-5 h-5 text-amber-300" />
                <span>Chi tiết đơn hàng #{selectedOrder.orderCode}</span>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-coffee-950 flex-1">
              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                <div>
                  <span className="text-stone-500">Khách hàng:</span>
                  <div className="font-bold text-coffee-950 text-sm mt-0.5">{selectedOrder.recipientName}</div>
                  <a href={`tel:${selectedOrder.recipientPhone}`} className="text-emerald-700 font-bold hover:underline">
                    {selectedOrder.recipientPhone}
                  </a>
                </div>
                <div>
                  <span className="text-stone-500">Địa chỉ giao:</span>
                  <div className="font-semibold text-coffee-950 mt-0.5">{getFullDestinationAddress(selectedOrder)}</div>
                </div>
              </div>

              {selectedOrder.shipperName && (
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl space-y-1">
                  <div className="font-bold text-orange-950 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-orange-600" />
                    <span>Thông tin Shipper</span>
                  </div>
                  <div>Tài xế: <strong>{selectedOrder.shipperName}</strong> ({selectedOrder.shipperPhone})</div>
                  {selectedOrder.estimatedDeliveryTime && <div>Ước tính giao: {selectedOrder.estimatedDeliveryTime}</div>}
                  {selectedOrder.trackingNotes && <div className="italic text-stone-600">{selectedOrder.trackingNotes}</div>}
                </div>
              )}

              <div className="space-y-2">
                <span className="font-bold text-coffee-900">Danh sách món:</span>
                <div className="divide-y divide-stone-200 border border-stone-200 rounded-xl overflow-hidden bg-white">
                  {selectedOrder.items.map((it) => (
                    <div key={it.id} className="p-3 flex justify-between">
                      <div>
                        <div className="font-bold text-coffee-950">
                          {it.quantity}x {it.productName} ({it.variantName})
                        </div>
                        {it.options && it.options.length > 0 && (
                          <div className="text-stone-500 text-[11px] mt-0.5">
                            {it.options.map((o: any) => `${o.optionName || o.name}: ${o.valueName || o.choiceName}`).join(" • ")}
                          </div>
                        )}
                        {it.recipientLabel && (
                          <div className="text-pink-600 font-semibold text-[11px]">
                            Người uống: {it.recipientLabel}
                          </div>
                        )}
                      </div>
                      <div className="font-bold text-coffee-950 text-right">
                        {formatVND(it.totalPrice)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1.5">
                <div className="flex justify-between text-stone-600">
                  <span>Tạm tính:</span>
                  <span>{formatVND(selectedOrder.subtotalAmount)}</span>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-pink-600 font-semibold">
                    <span>Khuyến mãi:</span>
                    <span>-{formatVND(selectedOrder.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>Phí giao hàng:</span>
                  <span>{formatVND(selectedOrder.deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-coffee-950 font-black text-sm pt-2 border-t border-stone-200">
                  <span>Tổng thanh toán:</span>
                  <span className="text-caramel font-black text-base">{formatVND(selectedOrder.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-stone-200 hover:bg-stone-300 text-stone-800"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
