"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Phone, MapPin, Coffee, ShieldCheck } from "lucide-react";
import { XANH_SM_ONELINK, getTelHref } from "@/lib/utils";
import { useBusinessSettings } from "@/lib/useBusinessSettings";

export default function CustomerFooter() {
  const pathname = usePathname();
  const settings = useBusinessSettings();

  // Hide customer footer on management and staff pages
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/kds")) {
    return null;
  }

  return (
    <footer className="bg-gradient-to-b from-[#FFF8FA] to-[#FFF0F5] text-coffee-700 py-8 px-4 border-t border-pink-200/80 text-xs">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand Info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-pink-300 bg-[#FFD1E3] shrink-0 shadow-sm">
              <Image
                src={settings.heroLogoUrl || "/images/ca-xoi-logo.jpg"}
                alt="Logo Cà Xòi"
                width={48}
                height={48}
                unoptimized
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-bold text-sm text-coffee-950 flex items-center gap-2">
                <span>{settings.heroBadgeBrand}</span>
                <span className="text-[10px] text-rose-700 bg-pink-100 px-2 py-0.5 rounded-full border border-pink-200">
                  {`${settings.heroHeadlinePrimary} ${settings.heroHeadlineHighlight}`.replace(/[“”"]/g, "")}
                </span>
              </p>
              <p className="mt-0.5 text-coffee-700">
                {settings.heroEyebrow} • {settings.heroPrimaryCtaText}
              </p>
              <p className="mt-0.5 text-rose-700 font-medium">
                📍 {settings.heroLocation} • {settings.heroServiceNote}
              </p>
            </div>
          </div>

          {/* Contact & Hours */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 text-coffee-700 font-semibold shrink-0">
            <a
              href={settings.xanhSmUrl || XANH_SM_ONELINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              title="Đặt món qua app Xanh SM Ngon"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Đặt Xanh SM Ngon</span>
            </a>
            <a
              href={getTelHref(settings.hotline)}
              className="bg-white hover:bg-pink-50 text-rose-800 border border-pink-200 px-3.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Phone className="w-3.5 h-3.5 text-rose-600" />
              <span>Hotline: {settings.hotline}</span>
            </a>
            <span className="hidden sm:inline text-pink-300">•</span>
            <span className="text-coffee-700">{settings.openTime} đến {settings.closeTime}</span>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Staff Internal Portal Link */}
        <div className="pt-4 border-t border-pink-200/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-coffee-600">
          <div>
            © {new Date().getFullYear()} Cà Xòi Café. Bảo lưu mọi quyền.
          </div>

          {/* Discreet Staff Portal Entry */}
          <div>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-coffee-700 hover:text-rose-700 bg-white hover:bg-pink-50 px-3 py-1.5 rounded-lg border border-pink-200 shadow-sm transition-colors"
              title="Khu vực đăng nhập dành riêng cho Chủ quán, Quản lý & Barista"
            >
              <Lock className="w-3 h-3 text-amber-600" />
              <span>Cổng Đăng Nhập Quản Trị & Pha Chế (Nội bộ)</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
