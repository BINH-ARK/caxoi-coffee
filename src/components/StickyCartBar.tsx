"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatVND, MIN_LY_ORDER, MIN_LY_MESSAGE } from "@/lib/utils";

export default function StickyCartBar() {
  const pathname = usePathname();
  const { totalItems, lyCount, totalPrice } = useCart();

  if (
    totalItems === 0 ||
    pathname === "/cart" ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/kds")
  ) {
    return null;
  }

  const needsMoreLy = lyCount > 0 && lyCount < MIN_LY_ORDER;

  return (
    <aside aria-label="Giỏ hàng tóm tắt" className="fixed bottom-3 left-4 right-4 max-w-xl mx-auto z-40 animate-slide-up space-y-1.5">
      {needsMoreLy && (
        <div className="bg-rose-50 text-rose-900 border border-rose-200 rounded-xl px-3 py-1.5 text-[11px] font-bold shadow-md flex items-center justify-between gap-2">
          <span>{MIN_LY_MESSAGE}</span>
          <span className="shrink-0 bg-rose-600 text-white px-2 py-0.5 rounded-full text-[10px]">
            {lyCount}/{MIN_LY_ORDER} ly
          </span>
        </div>
      )}
      <Link
        href="/cart"
        className="bg-coffee-900 text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between border border-amber-900/30 hover:bg-black transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-caramel flex items-center justify-center text-white font-bold shadow-md">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 bg-white text-coffee-900 text-[11px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow">
              {totalItems}
            </span>
          </div>
          <div>
            <div className="text-xs text-amber-200/90 font-medium">Giỏ hàng của bạn</div>
            <div className="text-base font-bold text-white tracking-tight">
              {formatVND(totalPrice)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold bg-white/10 group-hover:bg-caramel px-3.5 py-2 rounded-xl transition-colors">
          <span>{needsMoreLy ? `Xem giỏ (${lyCount}/${MIN_LY_ORDER} ly)` : "Xem giỏ & Đặt ngay"}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    </aside>
  );
}
