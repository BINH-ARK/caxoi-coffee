"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Product } from "@/types";
import { ExternalLink } from "lucide-react";
import WatermarkPattern from "@/components/WatermarkPattern";
import { XANH_SM_ONELINK } from "@/lib/utils";

interface CaXoiMenuBoardProps {
  products: Product[];
  onSelectProductVariant?: (product: Product, variantName: string) => void;
  activeCategoryId?: number;
  searchQuery?: string;
  xanhSmUrl?: string;
}

export default function CaXoiMenuBoard({
  products,
  onSelectProductVariant,
  activeCategoryId = 0,
  searchQuery = "",
  xanhSmUrl = XANH_SM_ONELINK,
}: CaXoiMenuBoardProps) {
  // Thứ tự sắp xếp chuẩn của 5 món Cà Xòi nguyên bản
  const defaultOrder = [
    { slug: "ca-he-den", defaultName: "Cà hê đen", ly: 13, p100: 25, p250: 50 },
    { slug: "ca-he-sua", defaultName: "Cà hê sữa", ly: 16, p100: 25, p250: 52 },
    { slug: "bac-xiuuuu", defaultName: "Bạc xĩuuuu", ly: 19, p100: 26, p250: 47 },
    { slug: "ca-he-mui-hue", defaultName: "Cà hê múi huệ", ly: 23, p100: 27, p250: 60 },
    { slug: "ca-he-trung-mui", defaultName: "Cà hê trứng múi", ly: 25, p100: 31, p250: 65 },
  ];

  // Helper tính giá chuẩn nghìn đồng (k) trực tiếp từ dữ liệu CSDL / SQL
  const getVariantPriceInThousands = (prod: Product | undefined, sizeName: string, fallbackK: number): number => {
    if (!prod) return fallbackK;
    // Đối với size Ly: lấy trực tiếp giá bán cơ bản (basePrice) hoặc salePrice
    if (sizeName.toLowerCase() === "ly") {
      const lyVariant = prod.variants?.find((v) => v.sizeName.toLowerCase() === "ly");
      const extra = lyVariant ? lyVariant.extraPrice : 0;
      const base = prod.salePrice ?? prod.basePrice;
      return Math.round((base + extra) / 1000);
    }
    // Đối với các size chai rót 100ml / 250ml
    const variant = prod.variants?.find(
      (v) => v.sizeName.toLowerCase() === sizeName.toLowerCase()
    );
    if (!variant) return fallbackK;
    const base = prod.salePrice ?? prod.basePrice;
    const total = base + variant.extraPrice;
    return Math.round(total / 1000);
  };

  const handlePillClick = (slug: string, variantName: string) => {
    const prod = products.find((p) => p.slug === slug || p.id === slug);
    if (prod && onSelectProductVariant) {
      onSelectProductVariant(prod, variantName);
    }
  };

  // Lọc sản phẩm theo danh mục và tìm kiếm nếu có
  const filteredList = useMemo(() => {
    return products.filter((p) => {
      if (activeCategoryId !== 0 && p.categoryId !== activeCategoryId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, activeCategoryId, searchQuery]);

  // Xây dựng danh sách hiển thị tự động từ database
  const displayItems = useMemo(() => {
    if (!filteredList || filteredList.length === 0) return [];

    return [...filteredList]
      .sort((a, b) => {
        const idxA = defaultOrder.findIndex((d) => d.slug === a.slug || d.slug === a.id);
        const idxB = defaultOrder.findIndex((d) => d.slug === b.slug || d.slug === b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      })
      .map((prod) => {
        const ref = defaultOrder.find((d) => d.slug === prod.slug || d.slug === prod.id);
        const isBestSeller = prod.tags.includes("BEST_SELLER");
        const isNew = prod.tags.includes("NEW");

        return {
          slug: prod.slug,
          displayName: prod.name,
          prod,
          isBestSeller,
          isNew,
          fallbackLy: ref?.ly || Math.round(prod.basePrice / 1000),
          fallback100: ref?.p100 || Math.round((prod.basePrice + 10000) / 1000),
          fallback250: ref?.p250 || Math.round((prod.basePrice + 35000) / 1000),
        };
      });
  }, [filteredList]);

  return (
    <div className="w-full animate-fade-in">
      {/* Nền hồng full màn hình (100% width & min-h full viewport), chữ Cà Xòi chìm phủ tràn viền */}
      <div className="relative w-full min-h-[calc(100vh-114px)] flex flex-col justify-center bg-gradient-to-b from-[#FFD7E8] via-[#FFDDF0] to-[#FFD2E6] overflow-hidden pt-6 sm:pt-10 pb-8 sm:pb-12 px-3 sm:px-8 lg:px-12">
        {/* Họa tiết chữ "Cà Xòi" chìm phủ khắp 100% nền vùng menu */}
        <WatermarkPattern
          patternId="menu-caxoi-watermark"
          text="Cà Xòi"
          color="#E87A90"
          opacity={0.25}
          tileWidth={160}
          tileHeight={78}
          fontSize={24}
          letterSpacing="0.06em"
          fontFamily="'Comfortaa', 'Nunito', sans-serif"
        />

        {/* Ảnh Mèo Xòi thật ngó xuống phía trên khung menu trắng */}
        <div className="relative z-20 flex flex-col items-center -mb-5 sm:-mb-7 lg:-mb-8 pointer-events-none">
          <div className="relative w-36 sm:w-44 lg:w-52 aspect-[717/746] drop-shadow-[0_10px_18px_rgba(131,24,67,0.22)]">
            <Image
              src="/images/meo-xoi-real.png"
              alt="Mèo Xòi - Boss Quán Cà Xòi"
              fill
              className="object-contain"
              sizes="(max-width: 640px) 144px, (max-width: 1024px) 176px, 208px"
              priority
            />
          </div>
        </div>

        {/* Khung Menu trung tâm + chữ M E N U 2 bên */}
        <div className="relative z-10 w-full max-w-6xl mx-auto flex items-stretch justify-center gap-3 sm:gap-7 lg:gap-10">
          {/* Cột chữ M - E - N - U trái */}
          <div className="hidden sm:flex flex-col items-center justify-around py-8 select-none shrink-0 w-10 lg:w-14">
            {["M", "E", "N", "U"].map((char, idx) => (
              <span
                key={idx}
                className="text-3xl sm:text-4xl lg:text-5xl font-black text-white drop-shadow-[0_2px_8px_rgba(232,122,144,0.7)]"
                style={{
                  WebkitTextStroke: "2px #E87A90",
                }}
              >
                {char}
              </span>
            ))}
          </div>

          {/* Khung trắng nổi bóng hoàn toàn, không dùng viền */}
          <div className="flex-1 bg-white rounded-3xl p-4 sm:p-8 lg:p-10 pt-8 sm:pt-10 lg:pt-12 shadow-[0_24px_60px_-12px_rgba(157,23,77,0.25),0_10px_28px_-6px_rgba(0,0,0,0.08)]">
            {/* Header Các Cột: Món Cà Xòi | Ly | 100ml | 250ml */}
            <div className="grid grid-cols-12 text-center text-xs sm:text-sm lg:text-base font-black text-[#4A2810] pb-3 border-b border-pink-100">
              <div className="col-span-6 text-left pl-1">Món Cà Xòi</div>
              <div className="col-span-2">Ly</div>
              <div className="col-span-2">100ml</div>
              <div className="col-span-2">250ml</div>
            </div>

            {/* Danh Sách Món (Không kèm chú thích phụ) */}
            {displayItems.length === 0 ? (
              <div className="py-10 text-center text-sm text-rose-800/80 font-bold">
                🐾 Không tìm thấy món phù hợp trong mục này.
              </div>
            ) : (
              <div className="divide-y divide-pink-100/80">
                {displayItems.map((item) => {
                  const prod = item.prod;
                  const isAvailable = prod ? prod.isAvailable : true;
                  const displayName = item.displayName;

                  // Kiểm tra các quy cách size có sẵn
                  const hasLy = prod?.variants?.some((v) => v.sizeName.toLowerCase() === "ly") ?? (item.fallbackLy > 0);
                  const has100 = prod?.variants?.some((v) => v.sizeName.toLowerCase() === "100ml") ?? (item.fallback100 > 0);
                  const has250 = prod?.variants?.some((v) => v.sizeName.toLowerCase() === "250ml") ?? (item.fallback250 > 0);

                  // Giá động theo nghìn đồng (k)
                  const lyPrice = hasLy ? getVariantPriceInThousands(prod, "Ly", item.fallbackLy) : null;
                  const p100Price = has100 ? getVariantPriceInThousands(prod, "100ml", item.fallback100) : null;
                  const p250Price = has250 ? getVariantPriceInThousands(prod, "250ml", item.fallback250) : null;

                  return (
                    <div
                      key={item.slug}
                      className={`grid grid-cols-12 items-center py-3 sm:py-4 transition-all ${
                        !isAvailable ? "opacity-40" : "hover:bg-pink-50/60 rounded-xl px-1 sm:px-2"
                      }`}
                    >
                      {/* Cột Tên Món + Thumbnail Ảnh Tròn + Badge */}
                      <div
                        onClick={() => prod && onSelectProductVariant && onSelectProductVariant(prod, "Ly")}
                        className="col-span-6 flex items-center gap-2.5 sm:gap-4 text-left pl-0.5 cursor-pointer group"
                        title={`Bấm để chọn ${displayName}`}
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl overflow-hidden bg-pink-100 shrink-0 shadow-sm relative group-hover:scale-105 transition-transform">
                          {prod?.imageUrl ? (
                            <Image
                              src={prod.imageUrl}
                              alt={displayName}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 40px, 56px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs">☕</div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs sm:text-base lg:text-lg text-[#2E180B] flex items-center gap-1.5 flex-wrap group-hover:text-rose-700 transition-colors leading-snug">
                            <span>{displayName}</span>
                            {item.isBestSeller && (
                              <span className="text-xs sm:text-sm shrink-0" title="Món bán chạy nhất">🔥</span>
                            )}
                            {item.isNew && (
                              <span className="text-[10px] sm:text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded shrink-0 hidden sm:inline" title="Món mới ra mắt">
                                Mới
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Nút Giá Size Ly */}
                      <div className="col-span-2 flex justify-center">
                        {hasLy && lyPrice !== null ? (
                          <button
                            type="button"
                            onClick={() => handlePillClick(item.slug, "Ly")}
                            disabled={!isAvailable}
                            className="px-3 sm:px-5 lg:px-6 h-8 sm:h-10 lg:h-11 rounded-full bg-gradient-to-r from-[#EF4444] to-[#E11D48] hover:from-[#DC2626] hover:to-[#BE123C] active:scale-90 text-white font-black text-xs sm:text-sm lg:text-base flex items-center justify-center gap-0.5 shadow-md transition-all hover:ring-2 hover:ring-rose-300 cursor-pointer"
                            title={`Bấm để chọn ${displayName} • Ly (${lyPrice}.000đ, đặt từ 5 ly)`}
                          >
                            <span>{lyPrice}</span>
                            <span className="text-[10px] sm:text-xs font-bold opacity-90">k</span>
                          </button>
                        ) : (
                          <span className="text-coffee-300 text-sm font-bold select-none">•</span>
                        )}
                      </div>

                      {/* Nút Giá Chai 100ml */}
                      <div className="col-span-2 flex justify-center">
                        {has100 && p100Price !== null ? (
                          <button
                            type="button"
                            onClick={() => handlePillClick(item.slug, "100ml")}
                            disabled={!isAvailable}
                            className="px-3 sm:px-5 lg:px-6 h-8 sm:h-10 lg:h-11 rounded-full bg-gradient-to-r from-[#EF4444] to-[#E11D48] hover:from-[#DC2626] hover:to-[#BE123C] active:scale-90 text-white font-black text-xs sm:text-sm lg:text-base flex items-center justify-center gap-0.5 shadow-md transition-all hover:ring-2 hover:ring-rose-300 cursor-pointer"
                            title={`Bấm để chọn ${displayName} • Chai rót 100ml (${p100Price}.000đ)`}
                          >
                            <span>{p100Price}</span>
                            <span className="text-[10px] sm:text-xs font-bold opacity-90">k</span>
                          </button>
                        ) : (
                          <span className="text-coffee-300 text-sm font-bold select-none">•</span>
                        )}
                      </div>

                      {/* Nút Giá Chai 250ml */}
                      <div className="col-span-2 flex justify-center">
                        {has250 && p250Price !== null ? (
                          <button
                            type="button"
                            onClick={() => handlePillClick(item.slug, "250ml")}
                            disabled={!isAvailable}
                            className="px-3 sm:px-5 lg:px-6 h-8 sm:h-10 lg:h-11 rounded-full bg-gradient-to-r from-[#EF4444] to-[#E11D48] hover:from-[#DC2626] hover:to-[#BE123C] active:scale-90 text-white font-black text-xs sm:text-sm lg:text-base flex items-center justify-center gap-0.5 shadow-md transition-all hover:ring-2 hover:ring-rose-300 cursor-pointer"
                            title={`Bấm để chọn ${displayName} • Chai rót 250ml (${p250Price}.000đ)`}
                          >
                            <span>{p250Price}</span>
                            <span className="text-[10px] sm:text-xs font-bold opacity-90">k</span>
                          </button>
                        ) : (
                          <span className="text-coffee-300 text-sm font-bold select-none">•</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cột chữ M - E - N - U phải */}
          <div className="hidden sm:flex flex-col items-center justify-around py-8 select-none shrink-0 w-10 lg:w-14">
            {["M", "E", "N", "U"].map((char, idx) => (
              <span
                key={idx}
                className="text-3xl sm:text-4xl lg:text-5xl font-black text-white drop-shadow-[0_2px_8px_rgba(232,122,144,0.7)]"
                style={{
                  WebkitTextStroke: "2px #E87A90",
                }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>

        {/* Thanh chân bảng nổi bóng mềm, không viền đen */}
        <div className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-around px-4 sm:px-8 pt-6 sm:pt-8 pb-1">
          <div className="w-11 h-10 rounded-full bg-white flex items-center justify-center shadow-md">
            <span className="text-pink-500 font-bold text-base">🐾</span>
          </div>
          <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#4A2810] bg-white/95 px-5 py-2 rounded-full shadow-md">
            Cà Xòi • Trạm Cấp Cứu Buồn Ngủ
          </div>
          <div className="w-11 h-10 rounded-full bg-white flex items-center justify-center shadow-md">
            <span className="text-pink-500 font-bold text-base">🐾</span>
          </div>
        </div>
      </div>

      {/* Banner Đặt qua Xanh SM Ngon tối ưu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-5">
        <div className="bg-gradient-to-r from-[#005B3B] via-[#007A50] to-[#008F5D] text-white p-3.5 sm:p-4 rounded-2xl shadow-md border border-emerald-400/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20 text-lg shadow-inner">
              🛵
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-emerald-100">Cà Xòi đã có mặt trên</span>
                <strong className="text-white font-black text-xs uppercase tracking-wide">Xanh SM Ngon</strong>
                <span className="text-[9px] bg-emerald-300 text-emerald-950 font-black px-1.5 py-0.5 rounded-full">
                  GIAO XE ĐIỆN
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/80 mt-0.5">
                Giao siêu tốc toàn Đà Nẵng bằng xe điện GSM, nhận nhiều ưu đãi độc quyền
              </p>
            </div>
          </div>
          <a
            href={xanhSmUrl || XANH_SM_ONELINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs px-3.5 py-2 rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 shrink-0"
          >
            <span>Mở App Đặt Món</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
          </a>
        </div>
      </div>
    </div>
  );
}
