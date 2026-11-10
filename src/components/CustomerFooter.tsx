"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Phone, MapPin, Coffee, ShieldCheck } from "lucide-react";

export default function CustomerFooter() {
  const pathname = usePathname();

  // Hide customer footer on management and staff pages
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/kds")) {
    return null;
  }

  return (
    <footer className="bg-coffee-950 text-coffee-300 py-8 px-4 border-t border-pink-900/40 text-xs">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand Info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-pink-400/40 bg-[#FFD1E3] shrink-0">
              <Image
                src="/images/ca-xoi-logo.jpg"
                alt="Logo Cà Xòi"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-bold text-sm text-white flex items-center gap-2">
                <span>🐾 Quán Cà Xòi</span>
                <span className="text-[10px] text-pink-300 bg-pink-900/50 px-2 py-0.5 rounded-full border border-pink-700/50">
                  Tỉnh như sáo, báo như Xòi
                </span>
              </p>
              <p className="mt-0.5 text-coffee-400">
                Trạm cấp cứu cơn buồn ngủ công sở ☕ • Giao siêu tốc Đà Nẵng - Gom đơn cả phòng, Cà Xòi bao giá!
              </p>
              <p className="mt-0.5 text-pink-300/80 font-medium">
                📍 Hải Châu • Thanh Khê • Ngũ Hành Sơn • 🛵 Xòi ship hoặc khách ghé lấy để gặp Xòi
              </p>
            </div>
          </div>

          {/* Contact & Hours */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 text-coffee-300 font-semibold shrink-0">
            <a
              href="https://xanhsmngon.onelink.me/14WJ/u8vplbn5"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 px-3.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
              title="Đặt món qua app Xanh SM Ngon"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Đặt Xanh SM Ngon</span>
            </a>
            <a
              href="tel:0905249733"
              className="bg-pink-950/60 hover:bg-pink-900 text-pink-200 border border-pink-800/60 px-3.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-rose-400" />
              <span>Hotline: 0905 249 733</span>
            </a>
            <span className="hidden sm:inline text-coffee-600">•</span>
            <span>07:00 - 18:30</span>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Staff Internal Portal Link */}
        <div className="pt-4 border-t border-coffee-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-coffee-500">
          <div>
            © {new Date().getFullYear()} Cà Xòi Café. Bảo lưu mọi quyền.
          </div>

          {/* Discreet Staff Portal Entry */}
          <div>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-coffee-500 hover:text-pink-300 bg-coffee-900/40 hover:bg-coffee-900 px-3 py-1.5 rounded-lg border border-coffee-800 transition-colors"
              title="Khu vực đăng nhập dành riêng cho Chủ quán, Quản lý & Barista"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Cổng Đăng Nhập Quản Trị & Pha Chế (Nội bộ)</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
