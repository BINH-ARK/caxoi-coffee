"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, Sparkles } from "lucide-react";

export const XANH_SM_ONELINK = "https://xanhsmngon.onelink.me/14WJ/u8vplbn5";

export default function XanhSmFloatingButton() {
  const pathname = usePathname();

  // Hide on admin or kds routes
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/kds")) {
    return null;
  }

  return (
    <aside aria-label="Kênh đặt món Xanh SM Ngon" className="fixed bottom-20 sm:bottom-6 left-4 z-40 group">
      <a
        href={XANH_SM_ONELINK}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-[#008F5D] hover:bg-[#00764D] text-white px-3.5 py-2.5 rounded-2xl shadow-xl border-2 border-emerald-300/40 transition-all duration-300 hover:scale-105 active:scale-95 text-xs font-bold backdrop-blur-sm"
        title="Đặt đồ uống Cà Xòi trên ứng dụng Xanh SM Ngon"
      >
        {/* Electric Bike Icon / Badge */}
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300"></span>
        </span>

        <span className="flex items-center gap-1">
          <span>Đặt qua</span>
          <strong className="text-emerald-100 font-black tracking-tight">Xanh SM Ngon</strong>
        </span>

        <ExternalLink className="w-3.5 h-3.5 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
      </a>
    </aside>
  );
}
