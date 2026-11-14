"use client";

import React from "react";
import { Sparkles, Save, RotateCcw, Image as ImageIcon, QrCode, ExternalLink } from "lucide-react";
import { BusinessSettings } from "@/types";
import { INITIAL_SETTINGS } from "@/lib/store";
import { getQrImageSrc, getTelHref } from "@/lib/utils";

interface HeroBannerSettingsCardProps {
  formData: BusinessSettings;
  isSaving: boolean;
  onChange: (field: keyof BusinessSettings, value: string) => void;
  onSave: () => void;
  onResetHeroDefaults: (defaults: Partial<BusinessSettings>) => void;
}

interface TextFieldConfig {
  field: keyof BusinessSettings;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  colSpan?: "full" | "half";
}

const HERO_COPY_FIELDS: ReadonlyArray<TextFieldConfig> = [
  { field: "heroBadgeBrand", label: "Nhãn thương hiệu (góc trên)", placeholder: "🐾 Quán Cà Xòi", colSpan: "half" },
  { field: "heroLocation", label: "Khu vực phục vụ", placeholder: "Hải Châu, Thanh Khê, Ngũ Hành Sơn, Đà Nẵng", colSpan: "half" },
  { field: "heroEyebrow", label: "Dòng giới thiệu trên Slogan", placeholder: "Trạm cấp cứu cơn buồn ngủ công sở ☕", colSpan: "half" },
  { field: "heroWatermarkText", label: "Chữ nền chìm (Watermark)", placeholder: "CÀ XÒI •", colSpan: "half" },
  { field: "heroHeadlinePrimary", label: "Slogan - Phần 1", placeholder: "“Tỉnh như sáo,", colSpan: "half" },
  { field: "heroHeadlineHighlight", label: "Slogan - Phần nổi bật (màu)", placeholder: "báo như Xòi”", colSpan: "half" },
  { field: "heroDescription", label: "Đoạn mô tả chính trang chủ", multiline: true, colSpan: "full" },
  { field: "heroServiceNote", label: "Nhãn hình thức giao / ghé lấy", placeholder: "🛵 Xòi ship hoặc khách ghé lấy để gặp Xòi", colSpan: "half" },
  { field: "hotline", label: "Số Hotline hiển thị (nút vàng)", placeholder: "0905.249.733", colSpan: "half" },
  { field: "heroPriceBadge1", label: "Thẻ giá 1 (Ly)", placeholder: "🥤 Ly: từ 13.000đ", colSpan: "half" },
  { field: "heroPriceBadge2", label: "Thẻ giá 2 (100ml)", placeholder: "🧴 Chai 100ml: từ 25.000đ", colSpan: "half" },
  { field: "heroPriceBadge3", label: "Thẻ giá 3 (250ml)", placeholder: "🍶 Chai 250ml: từ 47.000đ", colSpan: "half" },
  { field: "heroPrimaryCtaText", label: "Nút CTA chính (Gom đơn)", placeholder: "Gom đơn cả phòng (Cà Xòi bao giá)", colSpan: "half" },
  { field: "heroSecondaryCtaText", label: "Nút CTA phụ (Xem Menu)", placeholder: "Xem Bảng Menu Cà Xòi", colSpan: "half" },
];

const HERO_DEFAULT_SUBSET: Partial<BusinessSettings> = {
  heroBadgeBrand: INITIAL_SETTINGS.heroBadgeBrand,
  heroLocation: INITIAL_SETTINGS.heroLocation,
  heroEyebrow: INITIAL_SETTINGS.heroEyebrow,
  heroHeadlinePrimary: INITIAL_SETTINGS.heroHeadlinePrimary,
  heroHeadlineHighlight: INITIAL_SETTINGS.heroHeadlineHighlight,
  heroDescription: INITIAL_SETTINGS.heroDescription,
  heroServiceNote: INITIAL_SETTINGS.heroServiceNote,
  hotline: INITIAL_SETTINGS.hotline,
  heroPriceBadge1: INITIAL_SETTINGS.heroPriceBadge1,
  heroPriceBadge2: INITIAL_SETTINGS.heroPriceBadge2,
  heroPriceBadge3: INITIAL_SETTINGS.heroPriceBadge3,
  heroPrimaryCtaText: INITIAL_SETTINGS.heroPrimaryCtaText,
  heroSecondaryCtaText: INITIAL_SETTINGS.heroSecondaryCtaText,
  heroWatermarkText: INITIAL_SETTINGS.heroWatermarkText,
  heroLogoUrl: INITIAL_SETTINGS.heroLogoUrl,
  heroMascotTitle: INITIAL_SETTINGS.heroMascotTitle,
  heroMascotSubtitle: INITIAL_SETTINGS.heroMascotSubtitle,
  facebookUrl: INITIAL_SETTINGS.facebookUrl,
  qrFacebookTitle: INITIAL_SETTINGS.qrFacebookTitle,
  qrFacebookSubtitle: INITIAL_SETTINGS.qrFacebookSubtitle,
  xanhSmUrl: INITIAL_SETTINGS.xanhSmUrl,
  qrXanhSmTitle: INITIAL_SETTINGS.qrXanhSmTitle,
  qrXanhSmSubtitle: INITIAL_SETTINGS.qrXanhSmSubtitle,
};

export default function HeroBannerSettingsCard({
  formData,
  isSaving,
  onChange,
  onSave,
  onResetHeroDefaults,
}: HeroBannerSettingsCardProps) {
  const fbQrSrc = getQrImageSrc(formData.facebookUrl, "facebook");
  const xanhQrSrc = getQrImageSrc(formData.xanhSmUrl, "xanhsm");

  return (
    <section
      id="hero-content-editor"
      className="bg-white rounded-3xl p-5 sm:p-6 border border-pink-200/90 shadow-sm space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-pink-100 text-rose-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-coffee-950 uppercase tracking-wide">
              4. Nội dung Trang chủ & Khung Mã QR (Hình 1)
            </h3>
            <p className="text-xs text-coffee-500 mt-0.5">
              Chỉnh sửa toàn bộ chữ, thẻ giá, hotline, ảnh Mascot và link Facebook / Xanh SM (tự cập nhật mã QR quét).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onResetHeroDefaults(HERO_DEFAULT_SUBSET)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-coffee-600 bg-coffee-50 hover:bg-coffee-100 rounded-xl border border-coffee-200 transition-colors"
            title="Điền lại nội dung mặc định Hình 1 vào biểu mẫu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định Hình 1</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Đang lưu..." : "Lưu Trang Chủ & QR"}</span>
          </button>
        </div>
      </div>

      {/* Main 12-col editor + preview layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Copy, Prices, CTAs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {HERO_COPY_FIELDS.map((cfg) => {
              const value = String(formData[cfg.field] ?? "");
              return (
                <div
                  key={cfg.field}
                  className={cfg.colSpan === "full" ? "sm:col-span-2" : ""}
                >
                  <label className="block font-bold text-coffee-800 mb-1">
                    {cfg.label}
                  </label>
                  {cfg.multiline ? (
                    <textarea
                      rows={3}
                      value={value}
                      onChange={(e) => onChange(cfg.field, e.target.value)}
                      placeholder={cfg.placeholder}
                      className="w-full px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-coffee-900 font-medium leading-relaxed"
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => onChange(cfg.field, e.target.value)}
                      placeholder={cfg.placeholder}
                      className="w-full px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-coffee-900 font-semibold"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mascot & Dual QR Link Inputs */}
          <div className="bg-pink-50/50 rounded-2xl p-4 border border-pink-200/80 space-y-3.5 text-xs">
            <div className="font-bold text-coffee-900 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <ImageIcon className="w-4 h-4 text-rose-600" />
              <span>Thẻ Logo Mascot & 2 Ô Mã QR (Cột phải Hình 1)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-coffee-800 mb-1">
                  Đường dẫn ảnh Logo / Mascot
                </label>
                <input
                  type="text"
                  value={formData.heroLogoUrl || ""}
                  onChange={(e) => onChange("heroLogoUrl", e.target.value)}
                  placeholder="/images/ca-xoi-logo.jpg"
                  className="w-full px-3 py-2 rounded-xl border border-pink-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-coffee-900 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-coffee-800 mb-1">
                  Nhãn Mascot nổi bật
                </label>
                <input
                  type="text"
                  value={formData.heroMascotTitle || ""}
                  onChange={(e) => onChange("heroMascotTitle", e.target.value)}
                  placeholder="🐾 Mèo Xòi & Trái Xoài 🥭"
                  className="w-full px-3 py-2 rounded-xl border border-pink-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-coffee-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-coffee-800 mb-1">
                  Phụ đề dưới Mascot
                </label>
                <input
                  type="text"
                  value={formData.heroMascotSubtitle || ""}
                  onChange={(e) => onChange("heroMascotSubtitle", e.target.value)}
                  placeholder="Quán cà phê Internet • Đà Nẵng"
                  className="w-full px-3 py-2 rounded-xl border border-pink-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-coffee-900 font-medium"
                />
              </div>
            </div>

            {/* Facebook QR Settings */}
            <div className="bg-white rounded-xl p-3 border border-pink-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-coffee-950 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-blue-600" />
                  <span>Mã QR 1: Facebook Fanpage</span>
                </span>
                <a
                  href={formData.facebookUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  <span>Mở link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="url"
                value={formData.facebookUrl || ""}
                onChange={(e) => onChange("facebookUrl", e.target.value)}
                placeholder="https://www.facebook.com/..."
                className="w-full px-3 py-1.5 rounded-lg border border-coffee-200 font-mono text-[11px] text-coffee-900 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={formData.qrFacebookTitle || ""}
                  onChange={(e) => onChange("qrFacebookTitle", e.target.value)}
                  placeholder="Facebook Cà Xòi"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-coffee-200 text-coffee-900 font-bold text-[11px]"
                />
                <input
                  type="text"
                  value={formData.qrFacebookSubtitle || ""}
                  onChange={(e) => onChange("qrFacebookSubtitle", e.target.value)}
                  placeholder="Quét theo dõi"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-coffee-200 text-coffee-700 text-[11px]"
                />
              </div>
            </div>

            {/* Xanh SM QR Settings */}
            <div className="bg-white rounded-xl p-3 border border-emerald-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mã QR 2: Xòi chạy Xanh SM</span>
                </span>
                <a
                  href={formData.xanhSmUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                >
                  <span>Mở link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="url"
                value={formData.xanhSmUrl || ""}
                onChange={(e) => onChange("xanhSmUrl", e.target.value)}
                placeholder="https://xanhsmngon.onelink.me/..."
                className="w-full px-3 py-1.5 rounded-lg border border-emerald-200 font-mono text-[11px] text-coffee-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={formData.qrXanhSmTitle || ""}
                  onChange={(e) => onChange("qrXanhSmTitle", e.target.value)}
                  placeholder="Xòi chạy Xanh SM"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-950 font-bold text-[11px]"
                />
                <input
                  type="text"
                  value={formData.qrXanhSmSubtitle || ""}
                  onChange={(e) => onChange("qrXanhSmSubtitle", e.target.value)}
                  placeholder="Quét đặt giao"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-800 text-[11px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Mini Hero & QR Preview (5 cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 bg-gradient-to-br from-[#FFFDF9] via-[#FFF4F8] to-[#FFE7F0] rounded-3xl p-4 sm:p-5 border border-pink-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">
                Xem trước trực tiếp Hình 1
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-pink-200 font-bold text-coffee-700">
                Live Preview
              </span>
            </div>

            {/* Mini Left Copy Preview */}
            <div className="bg-white/75 rounded-2xl p-3.5 border border-pink-200/70 space-y-2 text-xs">
              <div className="inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-100 text-rose-900 text-[10px] font-bold">
                <span>{formData.heroBadgeBrand}</span>
                {formData.heroLocation && (
                  <>
                    <span>•</span>
                    <span>📍 {formData.heroLocation}</span>
                  </>
                )}
              </div>
              <p className="text-[10px] font-extrabold text-rose-600 uppercase">
                ✨ {formData.heroEyebrow}
              </p>
              <div className="text-lg font-black text-coffee-950 leading-tight">
                {formData.heroHeadlinePrimary}{" "}
                <span className="text-rose-600">{formData.heroHeadlineHighlight}</span>
              </div>
              <p className="text-[11px] text-coffee-700 line-clamp-3 leading-relaxed">
                {formData.heroDescription}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-bold">
                {formData.heroServiceNote && (
                  <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                    {formData.heroServiceNote}
                  </span>
                )}
                <a
                  href={getTelHref(formData.hotline)}
                  className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-950 border border-amber-300"
                >
                  📞 {formData.hotline}
                </a>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                {[formData.heroPriceBadge1, formData.heroPriceBadge2, formData.heroPriceBadge3]
                  .filter(Boolean)
                  .map((chip, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-lg bg-white border border-pink-200 text-coffee-900"
                    >
                      {chip}
                    </span>
                  ))}
              </div>
            </div>

            {/* Mini Right Mascot + Dual QR Card Preview */}
            <div className="bg-white/90 rounded-2xl p-3.5 border border-pink-200 shadow-sm flex flex-col items-center space-y-2.5">
              <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-pink-300/70 bg-[#FFD1E3]">
                <img
                  src={formData.heroLogoUrl || "/images/ca-xoi-logo.jpg"}
                  alt="Preview Mascot"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/ca-xoi-logo.jpg";
                  }}
                />
              </div>
              <div className="text-center space-y-0.5">
                <span className="inline-block bg-pink-100 text-coffee-950 font-black text-[11px] px-3 py-0.5 rounded-full">
                  {formData.heroMascotTitle}
                </span>
                {formData.heroMascotSubtitle && (
                  <p className="text-[10px] text-coffee-600 font-semibold">
                    {formData.heroMascotSubtitle}
                  </p>
                )}
              </div>

              <div className="w-full grid grid-cols-2 gap-2.5">
                <div className="bg-pink-50/80 border border-pink-200 rounded-xl p-2 flex flex-col items-center gap-1">
                  <div className="w-20 h-20 bg-white rounded-lg p-1.5 flex items-center justify-center border border-pink-100">
                    <img src={fbQrSrc} alt="QR Facebook Preview" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] font-black text-coffee-950 text-center leading-tight">
                    {formData.qrFacebookTitle}
                  </span>
                  <span className="text-[9px] text-coffee-600 text-center">
                    {formData.qrFacebookSubtitle}
                  </span>
                </div>

                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2 flex flex-col items-center gap-1">
                  <div className="w-20 h-20 bg-white rounded-lg p-1.5 flex items-center justify-center border border-emerald-100">
                    <img src={xanhQrSrc} alt="QR Xanh SM Preview" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] font-black text-emerald-950 text-center leading-tight">
                    {formData.qrXanhSmTitle}
                  </span>
                  <span className="text-[9px] text-emerald-700 text-center">
                    {formData.qrXanhSmSubtitle}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
