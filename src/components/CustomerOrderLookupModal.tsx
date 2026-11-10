"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  X,
  Truck,
  Phone,
  Clock,
  CheckCircle2,
  Coffee,
  MapPin,
  ExternalLink,
  Receipt,
  AlertCircle,
  Package,
} from "lucide-react";
import { Order } from "@/types";
import { formatVND } from "@/lib/utils";

interface CustomerOrderLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TRACKING_STEPS = [
  { key: "CONFIRMED", label: "Tiếp nhận", icon: CheckCircle2 },
  { key: "BREWING", label: "Pha chế", icon: Coffee },
  { key: "READY", label: "Sẵn sàng", icon: CheckCircle2 },
  { key: "DELIVERING", label: "Đang giao", icon: Truck },
  { key: "COMPLETED", label: "Hoàn tất", icon: CheckCircle2 },
];

export default function CustomerOrderLookupModal({
  isOpen,
  onClose,
}: CustomerOrderLookupModalProps) {
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedPhone = localStorage.getItem("caxoi_customer_phone");
      if (savedPhone) {
        setQuery(savedPhone);
        handleSearch(savedPhone);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    try {
      setLoading(true);
      setSearched(true);
      const isPhone = /^[0-9+]+$/.test(q);
      const url = isPhone
        ? `/api/orders?phone=${encodeURIComponent(q)}`
        : `/api/orders?search=${encodeURIComponent(q)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setOrders(data.data);
        if (isPhone) {
          localStorage.setItem("caxoi_customer_phone", q);
        }
      } else {
        setOrders([]);
      }
    } catch (e) {
      console.error("Lỗi tra cứu đơn:", e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStepIndex = (status: string) => {
    switch (status) {
      case "PENDING_PAYMENT":
        return 0;
      case "CONFIRMED":
        return 1;
      case "BREWING":
        return 2;
      case "READY":
        return 3;
      case "DELIVERING":
        return 4;
      case "COMPLETED":
        return 5;
      case "CANCELLED":
        return -1;
      default:
        return 1;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-coffee-950 via-coffee-900 to-coffee-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-300">
              <Truck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">Tra cứu đơn hàng & Vận chuyển</h3>
              <p className="text-xs text-rose-200">Theo dõi tiến độ pha chế và giao hàng theo thời gian thực</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-pink-50/60 border-b border-pink-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nhập Số điện thoại đặt hàng hoặc Mã đơn (CX-...)"
                className="w-full bg-white border border-stone-300 rounded-xl pl-9 pr-3 py-2 text-sm text-coffee-950 focus:outline-none focus:border-caramel shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-caramel hover:bg-caramel/90 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all disabled:opacity-50 shrink-0"
            >
              {loading ? "Đang tìm..." : "Tra cứu"}
            </button>
          </form>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 divide-y divide-gray-100 flex-1">
          {loading ? (
            <div className="py-12 text-center text-stone-500 text-sm">
              Đang tải thông tin đơn hàng...
            </div>
          ) : searched && orders.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Package className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-sm font-bold text-coffee-900">Không tìm thấy đơn hàng nào</p>
              <p className="text-xs text-stone-500">
                Vui lòng kiểm tra lại số điện thoại hoặc mã đơn hàng đã nhập
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const currentStep = getStepIndex(order.status);
              const isCancelled = order.status === "CANCELLED";

              return (
                <div key={order.id} className="pt-4 first:pt-0 space-y-3">
                  {/* Order Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-coffee-950 text-sm">
                          #{order.orderCode}
                        </span>
                        <span className="text-[11px] text-stone-500">
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
                      <div className="text-xs text-stone-600 mt-0.5">
                        Người nhận: <strong>{order.recipientName}</strong> ({order.recipientPhone})
                      </div>
                    </div>

                    <Link
                      href={`/order/${order.orderCode || order.id}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1 text-xs font-bold text-caramel hover:underline bg-caramel/10 border border-caramel/20 px-2.5 py-1 rounded-lg"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Xem hóa đơn & QR</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Shipment Progress Stepper */}
                  {isCancelled ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Đơn hàng đã hủy: {order.trackingNotes || "Theo yêu cầu"}</span>
                    </div>
                  ) : (
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                      <div className="grid grid-cols-5 gap-1 relative text-center">
                        {TRACKING_STEPS.map((step, idx) => {
                          const stepNumber = idx + 1;
                          const isPassed = currentStep >= stepNumber;
                          const isCurrent = currentStep === stepNumber;

                          return (
                            <div key={step.key} className="flex flex-col items-center">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                  isCurrent
                                    ? "bg-caramel text-white ring-4 ring-caramel/20 scale-110 shadow"
                                    : isPassed
                                    ? "bg-emerald-600 text-white"
                                    : "bg-stone-200 text-stone-400"
                                }`}
                              >
                                {isPassed && !isCurrent ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <step.icon className="w-4 h-4" />
                                )}
                              </div>
                              <span
                                className={`text-[10px] sm:text-xs mt-1.5 font-bold ${
                                  isCurrent
                                    ? "text-caramel"
                                    : isPassed
                                    ? "text-emerald-700"
                                    : "text-stone-400"
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Shipper Info Card (if assigned) */}
                      {order.shipperName && (
                        <div className="mt-3.5 pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2 text-stone-700">
                            <Truck className="w-4 h-4 text-orange-600" />
                            <span>
                              Tài xế giao: <strong>{order.shipperName}</strong>
                            </span>
                            {order.estimatedDeliveryTime && (
                              <span className="text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                                Dự kiến: {order.estimatedDeliveryTime}
                              </span>
                            )}
                          </div>
                          {order.shipperPhone && (
                            <a
                              href={`tel:${order.shipperPhone}`}
                              className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              <Phone className="w-3 h-3" />
                              <span>Gọi shipper: {order.shipperPhone}</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary of Items */}
                  <div className="text-xs text-stone-600 bg-white p-3 rounded-xl border border-stone-100 space-y-1">
                    {order.items.map((i) => (
                      <div key={i.id} className="flex justify-between">
                        <span>
                          {i.quantity}x {i.productName} ({i.variantName})
                          {i.recipientLabel && (
                            <span className="text-pink-600 font-semibold ml-1">
                              • {i.recipientLabel}
                            </span>
                          )}
                        </span>
                        <span className="font-semibold text-coffee-950">
                          {formatVND(i.totalPrice)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 mt-1 border-t border-stone-100 flex justify-between font-bold text-coffee-950">
                      <span>Tổng thanh toán:</span>
                      <span className="text-caramel font-black text-sm">
                        {formatVND(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-stone-500">
          <span>Hotline hỗ trợ: <strong>0905 249 733</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
