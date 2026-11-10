"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Coffee,
  CheckCircle2,
  Clock,
  Printer,
  Volume2,
  VolumeX,
  RefreshCw,
  ArrowRight,
  Building,
  ArrowLeft,
  X,
  Lock,
  LogOut,
  ExternalLink,
  LayoutDashboard,
  Truck,
  Phone,
} from "lucide-react";
import { Order, OrderItemRecord, OrderStatus } from "@/types";
import { formatVND } from "@/lib/utils";
import CupStickerPreview from "@/components/CupStickerPreview";

export default function KdsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const previousOrderCountRef = useRef<number>(0);

  // Sticker Print Modal
  const [activePrintOrder, setActivePrintOrder] = useState<Order | null>(null);

  // Authenticate user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          router.push("/admin/login?redirect=/kds");
        } else {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {
        router.push("/admin/login?redirect=/kds");
      });
  }, [router]);

  const handleLockTablet = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login?redirect=/kds");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  // Web Audio chime function
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.warn("Audio Context not allowed yet", e);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.success) {
        const newOrders: Order[] = data.data;

        // Check if there are newly arrived orders
        if (previousOrderCountRef.current > 0 && newOrders.length > previousOrderCountRef.current) {
          playChime();
        }
        previousOrderCountRef.current = newOrders.length;
        setOrders(newOrders);
      }
    } catch (e) {
      console.error("KDS fetch orders error", e);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3500);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter orders
  const filtered = orders.filter((o) => {
    if (filterType === "ALL") return true;
    return o.orderType === filterType;
  });

  // Categorize into 4 columns: Đơn mới tiếp nhận > Đang Pha Chế > Đang giao > Sẵn sàng giao
  const newOrders = filtered.filter(
    (o) => o.status === "CONFIRMED" || o.status === "PENDING_PAYMENT"
  );
  const brewingOrders = filtered.filter((o) => o.status === "BREWING");
  const deliveringOrders = filtered.filter((o) => o.status === "DELIVERING");
  const readyOrders = filtered.filter((o) => o.status === "READY");
  const completedOrders = filtered.filter((o) => o.status === "COMPLETED").slice(0, 5);

  const calculateMinutesSince = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60));
    return Math.max(0, diff);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col">
      {/* KDS Header Bar */}
      <header className="bg-stone-950 px-4 py-2.5 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-pink-400/40 bg-[#FFD1E3] shrink-0">
            <Image
              src="/images/ca-xoi-logo.jpg"
              alt="Logo Cà Xòi"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
              <span>🐾 BARISTA KDS • Quầy Pha Chế Cà Xòi</span>
            </h1>
            <p className="text-[10px] text-pink-300 font-semibold">
              Tỉnh như sáo, báo như Xòi • Trạm cấp cứu công sở Đà Nẵng
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Link to Admin if Super Admin or Manager */}
          {(currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "STORE_MANAGER") && (
            <Link
              href="/admin"
              className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold flex items-center gap-1 transition-all"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-caramel" />
              <span>Quản trị</span>
            </Link>
          )}

          {/* Link to Customer Store */}
          <Link
            href="/"
            target="_blank"
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-pink-200 border border-stone-700 text-xs font-semibold flex items-center gap-1 transition-all"
            title="Mở trang bán hàng dành cho khách (tab mới)"
          >
            <span>Trang Khách</span>
            <ExternalLink className="w-3 h-3 text-pink-300" />
          </Link>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              soundEnabled
                ? "bg-stone-800 border-amber-500/50 text-amber-300"
                : "bg-stone-800 border-stone-700 text-stone-500"
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? "Chuông: Bật" : "Chuông: Tắt"}</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => {
              setIsRefreshing(true);
              fetchOrders().then(() => setIsRefreshing(false));
            }}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-all"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>

          {/* Current Staff User */}
          {currentUser && (
            <div className="hidden sm:flex items-center gap-1.5 bg-stone-800/80 px-2.5 py-1 rounded-xl border border-stone-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-stone-200">{currentUser.fullName || currentUser.username}</span>
            </div>
          )}

          {/* Quick Lock Tablet */}
          <button
            type="button"
            onClick={handleLockTablet}
            className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800/60 transition-all flex items-center gap-1 text-xs font-bold"
            title="Đăng xuất / Khóa Tablet ca làm việc"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Khóa ca</span>
          </button>
        </div>
      </header>

      {/* Filter Chips Bar */}
      <div className="bg-stone-900 px-4 py-2 border-b border-stone-800 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs text-stone-400 font-semibold shrink-0">Lọc đơn:</span>
        <button
          type="button"
          onClick={() => setFilterType("ALL")}
          className={`text-xs px-3 py-1 rounded-lg font-bold transition-all ${
            filterType === "ALL"
              ? "bg-amber-500 text-black"
              : "bg-stone-800 text-stone-300 hover:bg-stone-700"
          }`}
        >
          Tất cả ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType("OFFICE_DELIVERY")}
          className={`text-xs px-3 py-1 rounded-lg font-bold transition-all ${
            filterType === "OFFICE_DELIVERY"
              ? "bg-amber-500 text-black"
              : "bg-stone-800 text-stone-300 hover:bg-stone-700"
          }`}
        >
          Giao văn phòng
        </button>
        <button
          type="button"
          onClick={() => setFilterType("TAKEAWAY")}
          className={`text-xs px-3 py-1 rounded-lg font-bold transition-all ${
            filterType === "TAKEAWAY"
              ? "bg-amber-500 text-black"
              : "bg-stone-800 text-stone-300 hover:bg-stone-700"
          }`}
        >
          Khách đến lấy
        </button>
        <button
          type="button"
          onClick={() => setFilterType("GROUP_ORDER")}
          className={`text-xs px-3 py-1 rounded-lg font-bold transition-all ${
            filterType === "GROUP_ORDER"
              ? "bg-amber-500 text-black"
              : "bg-stone-800 text-stone-300 hover:bg-stone-700"
          }`}
        >
          Đơn nhóm
        </button>
      </div>

      {/* 4-Column Kanban Board: Đơn mới tiếp nhận > Đang Pha Chế > Đang giao > Sẵn sàng giao */}
      <div className="flex-1 p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 overflow-y-auto">
        {/* COLUMN 1: ĐƠN MỚI TIẾP NHẬN */}
        <div className="flex flex-col bg-stone-950/80 rounded-2xl border border-stone-800 overflow-hidden">
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <h2 className="text-sm font-bold text-amber-300">
                1. ĐƠN MỚI TIẾP NHẬN
              </h2>
            </div>
            <span className="bg-amber-500 text-black text-xs font-black px-2 py-0.5 rounded-full">
              {newOrders.length}
            </span>
          </div>

          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            {newOrders.length === 0 ? (
              <p className="text-center text-xs text-stone-500 py-10">Không có đơn mới</p>
            ) : (
              newOrders.map((order) => {
                const mins = calculateMinutesSince(order.createdAt);
                return (
                  <div
                    key={order.id}
                    className="bg-stone-900 rounded-xl p-3.5 border border-stone-700 shadow-md space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                      <div>
                        <span className="font-mono text-base font-black text-amber-300">
                          #{order.orderCode}
                        </span>
                        <div className="text-[11px] text-stone-400 font-medium">
                          {order.orderType === "OFFICE_DELIVERY" ? "🏢 Giao tòa nhà" : "🚶 Lấy tại quầy"}
                        </div>
                      </div>

                      {/* SLA Timer */}
                      <div
                        className={`px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${
                          mins > 10
                            ? "bg-red-500/20 text-red-400 border border-red-500/40"
                            : mins > 5
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-stone-800 text-stone-300"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{mins}p trước</span>
                      </div>
                    </div>

                    {/* Customer & Location */}
                    <div className="text-xs space-y-0.5 text-stone-300">
                      <div className="font-bold text-white">
                        {order.recipientName} ({order.recipientPhone})
                      </div>
                      {order.buildingName && (
                        <div className="text-stone-400 flex items-center gap-1">
                          <Building className="w-3 h-3 text-amber-400" />
                          <span>{order.buildingName} - {order.floorRoom}</span>
                        </div>
                      )}
                      {order.deliveryNotes && (
                        <div className="text-[11px] text-amber-200 italic">
                          Note: {order.deliveryNotes}
                        </div>
                      )}
                    </div>

                    {/* Drink items */}
                    <div className="bg-stone-950 p-2.5 rounded-lg space-y-2 border border-stone-800">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-xs">
                          <div className="font-bold text-white flex items-center justify-between">
                            <span>
                              {item.quantity}x {item.productName} ({item.variantName})
                            </span>
                            {item.recipientLabel && (
                              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                                {item.recipientLabel}
                              </span>
                            )}
                          </div>
                          {item.options && item.options.length > 0 && (
                            <div className="text-[11px] text-stone-400 pl-2 mt-0.5">
                              {item.options.map((o) => o.valueName).join(" • ")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Payment Pending Alert for Barista */}
                    {order.status === "PENDING_PAYMENT" && (
                      <div className="bg-amber-400/15 text-amber-300 border border-amber-400/30 px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                        <span>Chờ khách quét mã QR VietQR (Chưa thanh toán)</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setActivePrintOrder(order)}
                        className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs font-bold flex items-center gap-1"
                        title="In tem ly"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">In tem</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, "BREWING")}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs py-2 px-3 rounded-lg shadow transition-all flex items-center justify-center gap-1"
                      >
                        <span>
                          {order.status === "PENDING_PAYMENT" ? "Xác nhận & Pha chế" : "Bắt đầu pha chế"}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: ĐANG PHA CHẾ (BREWING) */}
        <div className="flex flex-col bg-stone-950/80 rounded-2xl border border-stone-800 overflow-hidden">
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
              <h2 className="text-sm font-bold text-blue-300">
                2. ĐANG PHA CHẾ (BREWING)
              </h2>
            </div>
            <span className="bg-blue-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
              {brewingOrders.length}
            </span>
          </div>

          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            {brewingOrders.length === 0 ? (
              <p className="text-center text-xs text-stone-500 py-10">Quầy bar đang trống</p>
            ) : (
              brewingOrders.map((order) => {
                const mins = calculateMinutesSince(order.createdAt);
                return (
                  <div
                    key={order.id}
                    className="bg-stone-900 rounded-xl p-3.5 border border-blue-500/40 shadow-md space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                      <span className="font-mono text-base font-black text-blue-300">
                        #{order.orderCode}
                      </span>
                      <span className="text-xs text-stone-400">{mins}p</span>
                    </div>

                    <div className="text-xs font-bold text-white">
                      {order.recipientName} ({order.recipientPhone})
                    </div>

                    <div className="bg-stone-950 p-2.5 rounded-lg space-y-2 border border-stone-800">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-xs">
                          <div className="font-bold text-white flex items-center justify-between">
                            <span>
                              {item.quantity}x {item.productName} ({item.variantName})
                            </span>
                            {item.recipientLabel && (
                              <span className="text-[10px] bg-blue-400/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">
                                {item.recipientLabel}
                              </span>
                            )}
                          </div>
                          {item.options && item.options.length > 0 && (
                            <div className="text-[11px] text-stone-400 pl-2 mt-0.5">
                              {item.options.map((o) => o.valueName).join(" • ")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActivePrintOrder(order)}
                          className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs font-bold flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">In tem</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.id, "DELIVERING")}
                          className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs py-2 px-2.5 rounded-lg shadow transition-all flex items-center justify-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Giao Shipper (Đang giao)</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, "READY")}
                        className="w-full bg-teal-700/80 hover:bg-teal-600 text-white font-bold text-xs py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 border border-teal-600/40"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Pha xong • Sẵn sàng giao / lấy</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 3: ĐANG GIAO */}
        <div className="flex flex-col bg-stone-950/80 rounded-2xl border border-stone-800 overflow-hidden">
          <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
              <h2 className="text-sm font-bold text-orange-300 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-orange-400" />
                <span>3. ĐANG GIAO</span>
              </h2>
            </div>
            <span className="bg-orange-500 text-black text-xs font-black px-2 py-0.5 rounded-full">
              {deliveringOrders.length}
            </span>
          </div>

          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            {deliveringOrders.length === 0 ? (
              <p className="text-center text-xs text-stone-500 py-10">Không có đơn đang giao</p>
            ) : (
              deliveringOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-stone-900 rounded-xl p-3.5 border border-orange-500/40 shadow space-y-2.5"
                >
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <span className="font-mono text-base font-black text-orange-300">
                      #{order.orderCode}
                    </span>
                    <span className="text-[11px] font-bold text-orange-300 bg-orange-950/80 border border-orange-800 px-2 py-0.5 rounded">
                      Shipper đang giao
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-stone-300">
                    <div className="flex items-center justify-between">
                      <strong className="text-white text-sm">{order.recipientName}</strong>
                      <a
                        href={`tel:${order.recipientPhone}`}
                        className="text-emerald-400 hover:underline font-bold"
                      >
                        {order.recipientPhone}
                      </a>
                    </div>
                    <div className="text-stone-400 flex items-center gap-1 text-[11px]">
                      <Building className="w-3 h-3 text-orange-400 shrink-0" />
                      <span>{[order.floorRoom, order.buildingName, order.companyName].filter(Boolean).join(" - ") || order.deliveryAddress || "Địa chỉ khách"}</span>
                    </div>
                    {order.shipperName && (
                      <div className="bg-stone-950 p-2 rounded text-[11px] border border-stone-800 text-stone-300">
                        <div>Tài xế: <strong className="text-orange-300">{order.shipperName}</strong> {order.shipperPhone && `(${order.shipperPhone})`}</div>
                        {order.estimatedDeliveryTime && <div className="text-stone-400">ETA: {order.estimatedDeliveryTime}</div>}
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-stone-400 bg-stone-950/50 p-2 rounded border border-stone-800/80">
                    {order.items.length} món • Tổng: <strong className="text-amber-300">{formatVND(order.totalAmount)}</strong>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.id, "READY")}
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs py-2 px-3 rounded-lg shadow transition-all flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Đã đến nơi • Sẵn sàng giao &rarr;</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.id, "COMPLETED")}
                      className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-[11px] py-1.5 rounded-lg transition-colors border border-stone-700"
                    >
                      Khách đã nhận (Hoàn tất)
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 4: SẴN SÀNG GIAO */}
        <div className="flex flex-col bg-stone-950/80 rounded-2xl border border-stone-800 overflow-hidden">
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h2 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>4. SẴN SÀNG GIAO</span>
              </h2>
            </div>
            <span className="bg-emerald-500 text-black text-xs font-black px-2 py-0.5 rounded-full">
              {readyOrders.length}
            </span>
          </div>

          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            {readyOrders.length === 0 ? (
              <p className="text-center text-xs text-stone-500 py-10">Chưa có đơn chờ giao</p>
            ) : (
              readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-stone-900 rounded-xl p-3.5 border border-emerald-500/40 shadow space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-black text-emerald-300">
                      #{order.orderCode}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      {order.orderType === "TAKEAWAY" ? "Chờ khách lấy" : "Sẵn sàng giao"}
                    </span>
                  </div>

                  <div className="text-xs text-stone-300 space-y-0.5">
                    <div>
                      <strong className="text-white text-sm">{order.recipientName}</strong> • {order.recipientPhone}
                    </div>
                    <div className="text-stone-400 text-[11px]">
                      {[order.floorRoom, order.buildingName, order.companyName].filter(Boolean).join(" - ") || "Tại quầy Cà Xòi"}
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-400 bg-stone-950/50 p-2 rounded border border-stone-800">
                    {order.items.length} món • Tổng: <strong className="text-amber-300">{formatVND(order.totalAmount)}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(order.id, "COMPLETED")}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2 px-3 rounded-lg transition-all shadow flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác nhận Khách đã nhận (Hoàn tất)</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* PRINT CUP STICKERS MODAL */}
      {activePrintOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <div>
                <h3 className="font-bold text-white text-base">
                  In Tem Dán Ly (Cup Labels) - Đơn #{activePrintOrder.orderCode}
                </h3>
                <p className="text-xs text-stone-400">
                  Khổ tiêu chuẩn 50x30mm • In dán lên từng cốc trước khi giao cho khách
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePrintOrder(null)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sticker Preview Grid */}
            <div className="flex-1 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-4 justify-items-center">
              {activePrintOrder.items.map((item, idx) => (
                <CupStickerPreview
                  key={idx}
                  orderCode={activePrintOrder.orderCode}
                  item={item}
                  createdAt={activePrintOrder.createdAt}
                  onPrint={() => window.print()}
                />
              ))}
            </div>

            <div className="border-t border-stone-800 pt-3 flex items-center justify-between">
              <span className="text-xs text-stone-400">
                Tổng {activePrintOrder.items.reduce((sum, i) => sum + i.quantity, 0)} tem ly
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-5 py-2.5 rounded-xl shadow flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Gửi lệnh in ra máy in quầy</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
