"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, ShoppingBag, Users, Sparkles, Phone, Truck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatVND } from "@/lib/utils";
import CustomerOrderLookupModal from "@/components/CustomerOrderLookupModal";

export default function Header() {
  const pathname = usePathname();
  const { totalItems, totalPrice } = useCart();
  const [isLookupOpen, setIsLookupOpen] = useState(false);

  // Hide customer header on staff management routes
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/kds")) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-sm transition-all">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* Brand Logo & Slogan */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-11 h-11 rounded-2xl border border-pink-200 overflow-hidden shadow-sm group-hover:scale-105 transition-transform bg-[#FFD1E3] flex items-center justify-center relative">
              <Image
                src="/images/ca-xoi-logo.jpg"
                alt="Logo Cà Xòi"
                width={44}
                height={44}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl text-coffee-950 tracking-tight leading-none flex items-center gap-1">
                  Cà Xòi
                  <span className="text-rose-500 text-xs">🐾</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-rose-700 border border-pink-200">
                  Đà Nẵng
                </span>
              </div>
              <p className="text-[11px] text-rose-700 font-bold leading-tight mt-0.5">
                Tỉnh như sáo, báo như Xòi ☕
              </p>
            </div>
          </Link>

          {/* Customer Navigation Tabs */}
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/#menu"
              className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-coffee-700 hover:text-caramel px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-pink-50 transition-colors"
            >
              <Coffee className="w-4 h-4 text-caramel" />
              <span>Thực đơn</span>
            </Link>

            <Link
              href="/group-order"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-coffee-700 hover:text-caramel px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-pink-50 transition-colors"
              title="Đặt hàng nhóm cho văn phòng"
            >
              <Users className="w-4 h-4 text-caramel" />
              <span>Gom đơn phòng</span>
            </Link>

            {/* Tra cứu đơn hàng */}
            <button
              type="button"
              onClick={() => setIsLookupOpen(true)}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-coffee-700 hover:text-caramel px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-pink-50 transition-colors"
              title="Tra cứu tình trạng đơn hàng & giao hàng"
            >
              <Truck className="w-4 h-4 text-orange-600" />
              <span>Tra cứu đơn</span>
            </button>

            {/* Xanh SM Ngon Direct Link */}
            <a
              href="https://xanhsmngon.onelink.me/14WJ/u8vplbn5"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold bg-[#008F5D] hover:bg-[#00764D] text-white px-3 py-1.5 rounded-xl border border-emerald-400/50 shadow-sm transition-all hover:scale-105 active:scale-95"
              title="Mở ứng dụng Xanh SM Ngon để đặt món Cà Xòi giao bằng xe điện"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>Đặt Xanh SM</span>
            </a>

            {/* Hotline Quick Call */}
            <a
              href="tel:0905249733"
              className="hidden md:flex items-center gap-1.5 text-xs font-bold text-coffee-800 bg-pink-50 hover:bg-pink-100 border border-pink-200 px-3 py-2 rounded-xl transition-colors"
              title="Hotline Cà Xòi: 0905 249 733"
            >
              <Phone className="w-3.5 h-3.5 text-rose-600" />
              <span>0905.249.733</span>
            </a>

            {/* Cart Quick Button */}
            <Link
              href="/cart"
              className="relative flex items-center gap-2 bg-coffee-800 hover:bg-coffee-900 text-white px-3 sm:px-4 py-2 rounded-xl shadow-sm transition-all"
            >
              <ShoppingBag className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline text-xs font-medium">
                {totalItems > 0 ? formatVND(totalPrice) : "Giỏ hàng"}
              </span>
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-caramel text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {totalItems}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>

      {/* Customer Order Lookup Modal */}
      <CustomerOrderLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
      />
    </>
  );
}
