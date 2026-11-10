"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Product } from "@/types";
import CaXoiMascot from "./CaXoiMascot";
import { Sparkles, ExternalLink, Flame, Info } from "lucide-react";

interface CaXoiMenuBoardProps {
  products: Product[];
  onSelectProductVariant?: (product: Product, variantName: string) => void;
  activeCategoryId?: number;
  searchQuery?: string;
}

export default function CaXoiMenuBoard({
  products,
  onSelectProductVariant,
  activeCategoryId = 0,
  searchQuery = "",
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
        const isBestSeller = prod.tags.includes("BEST_SELLER") || prod.slug.includes("trung") || prod.slug.includes("bac-xiu");
        const isNew = prod.tags.includes("NEW") || prod.slug.includes("hue");

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
    <div className="w-full max-w-xl mx-auto my-3 sm:my-5 animate-fade-in">
      {/* Container mô phỏng bảng menu Cà Xòi đặc trưng */}
      <div className="relative rounded-[2.5rem] bg-[#FFD7E8] border-[6px] border-[#1E120A] shadow-2xl overflow-hidden pt-2 pb-6 px-3.5 sm:px-6">
        
        {/* Họa tiết lặp Watermark "Cà Xòi" nền hồng */}
        <div 
          className="absolute inset-0 select-none pointer-events-none opacity-20 text-[18px] sm:text-[22px] font-black text-[#E87A90] leading-snug tracking-wider overflow-hidden"
          style={{ fontFamily: "'Comfortaa', 'Nunito', sans-serif" }}
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="whitespace-nowrap -ml-4">
              Cà Xòi Cà Xòi Cà Xòi Cà Xòi Cà Xòi Cà Xòi Cà Xòi Cà Xòi
            </div>
          ))}
        </div>

        {/* Mèo Xòi nhô đầu nhìn xuống */}
        <div className="relative z-10 flex flex-col items-center pt-2">
          <CaXoiMascot size="lg" className="w-44 sm:w-52 drop-shadow-md" />
        </div>

        {/* Khung Bảng Chữ "MENU" 2 bên */}
        <div className="relative z-10 flex items-stretch justify-between gap-1 sm:gap-2 mt-[-10px]">
          {/* Cột chữ M - E - N - U trái */}
          <div className="flex flex-col items-center justify-around py-4 select-none shrink-0 w-6 sm:w-8">
            {["M", "E", "N", "U"].map((char, idx) => (
              <span
                key={idx}
                className="text-2xl sm:text-3xl font-black text-white"
                style={{
                  WebkitTextStroke: "2px #E87A90",
                  textShadow: "1px 1px 0px #E87A90",
                }}
              >
                {char}
              </span>
            ))}
          </div>

          {/* Bảng giá trung tâm */}
          <div className="flex-1 bg-white/80 backdrop-blur-md rounded-2xl p-2.5 sm:p-4 shadow-sm border border-pink-300/60">
            {/* Header Các Cột: Món Cà Xòi | Ly | 100ml | 250ml */}
            <div className="grid grid-cols-12 text-center text-xs sm:text-sm font-black text-[#4A2810] pb-2 border-b border-pink-200">
              <div className="col-span-6 sm:col-span-5 text-left pl-1">Món Cà Xòi</div>
              <div className="col-span-2">Ly</div>
              <div className="col-span-2">100ml</div>
              <div className="col-span-2 sm:col-span-3">250ml</div>
            </div>

            {/* Danh Sách Món */}
            {displayItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-rose-800/80 font-bold space-y-1">
                <div>🐾 Không tìm thấy món phù hợp trong mục này.</div>
                <div className="text-[10px] text-coffee-500 font-normal">Vui lòng thử chọn danh mục khác hoặc xóa từ khóa tìm kiếm.</div>
              </div>
            ) : (
              <div className="divide-y divide-pink-100">
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
                      className={`grid grid-cols-12 items-center py-2 sm:py-2.5 transition-all ${
                        !isAvailable ? "opacity-40" : "hover:bg-pink-50/70 rounded-xl"
                      }`}
                    >
                      {/* Cột Tên Món + Thumbnail Ảnh Tròn + Badge */}
                      <div
                        onClick={() => prod && onSelectProductVariant && onSelectProductVariant(prod, "Ly")}
                        className="col-span-6 sm:col-span-5 flex items-center gap-1.5 sm:gap-2.5 text-left pl-0.5 cursor-pointer group"
                        title={`Bấm để xem chi tiết & công thức pha ${displayName}`}
                      >
                        {/* Thumbnail ảnh tròn */}
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden bg-pink-100 shrink-0 border border-pink-300 shadow-xs relative group-hover:scale-105 transition-transform">
                          {prod?.imageUrl ? (
                            <Image
                              src={prod.imageUrl}
                              alt={displayName}
                              fill
                              className="object-cover"
                              sizes="36px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs">☕</div>
                          )}
                        </div>

                        {/* Tên món & Ghi chú nhỏ */}
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs sm:text-sm text-[#2E180B] truncate flex items-center gap-1 group-hover:text-rose-700 transition-colors">
                            <span className="truncate">{displayName}</span>
                            {item.isBestSeller && (
                              <span className="text-[10px] shrink-0" title="Món bán chạy nhất">🔥</span>
                            )}
                            {item.isNew && (
                              <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1 rounded shrink-0 hidden sm:inline" title="Món mới ra mắt">
                                Mới
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-[#8C5E43] truncate font-medium hidden sm:block">
                            {prod?.description ? (prod.description.length > 25 ? prod.description.slice(0, 25) + "..." : prod.description) : "Cà phê Cà Xòi đậm vị"}
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
                            className="px-2 sm:px-2.5 h-7 sm:h-8 rounded-full bg-gradient-to-r from-[#EF4444] to-[#E11D48] hover:from-[#DC2626] hover:to-[#BE123C] active:scale-90 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-0.5 shadow-md transition-all hover:ring-2 hover:ring-rose-300 cursor-pointer"
                            title={`Bấm để chọn ${displayName} - Ly chuẩn (${lyPrice}.000đ)`}
                          >
                            <span>{lyPrice}</span>
                            <span className="text-[9px] sm:text-[10px] font-bold opacity-90">k</span>
                          </button>
                        ) : (
                          <span className="text-coffee-300 text-xs font-bold select-none">-</span>
                        )}
                      </div>

                      {/* Nút Giá Chai 100ml */}
                      <div className="col-span-2 flex justify-center">
                        {has100 && p100Price !== null ? (
                          <button
                            type="button"
                            onClick={() => handlePillClick(item.slug, "100ml")}
                            disabled={!isAvailable}
                            className="px-2 sm:px-2.5 h-7 sm:h-8 rounded-full bg-gradient-to-r from-[#EF4444] to-[#E11D48] hover:from-[#DC2626] hover:to-[#BE123C] active:scale-90 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-0.5 shadow-md transition-all hover:ring-2 hover:ring-rose-300 cursor-pointer"
                            title={`Bấm để chọn ${displayName} - Chai rót 100ml (${p100Price}.000đ)`}
                          >
                            <span>{p100Price}</span>
                            <span className="text-[9px] sm:text-[10px] font-bold opacity-90">k</span>
                          </button>
                        ) : (
                          <span className="text-coffee-300 text-xs font-bold select-none">-</span>
                        )}
                      </div>

                      {/* Nút Giá Chai 250ml */}
                      <div className="col-span-2 sm:col-span-3 flex justify-center">
                        {has250 && p250Price !== null ? (
                          <button
                            type="button"
                            onClick={() => handlePillClick(item.slug, "250ml")}
                            disabled={!isAvailable}
                            className="px-2 sm:px-2.5 h-7 sm:h-8 rounded-full bg-gradient-to-r from-[#EF4444] to-[#E11D48] hover:from-[#DC2626] hover:to-[#BE123C] active:scale-90 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-0.5 shadow-md transition-all hover:ring-2 hover:ring-rose-300 cursor-pointer"
                            title={`Bấm để chọn ${displayName} - Chai rót 250ml (${p250Price}.000đ)`}
                          >
                            <span>{p250Price}</span>
                            <span className="text-[9px] sm:text-[10px] font-bold opacity-90">k</span>
                          </button>
                        ) : (
                          <span className="text-coffee-300 text-xs font-bold select-none">-</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dòng chú thích nhẹ nhàng */}
            <div className="pt-2 text-center text-[10px] sm:text-xs font-semibold text-rose-700/80 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Giá tính theo nghìn đồng (k). Bấm vào giá để chọn nhanh kích cỡ!</span>
            </div>
          </div>

          {/* Cột chữ M - E - N - U phải */}
          <div className="flex flex-col items-center justify-around py-4 select-none shrink-0 w-6 sm:w-8">
            {["M", "E", "N", "U"].map((char, idx) => (
              <span
                key={idx}
                className="text-2xl sm:text-3xl font-black text-white"
                style={{
                  WebkitTextStroke: "2px #E87A90",
                  textShadow: "1px 1px 0px #E87A90",
                }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>

        {/* Thanh chân bảng với biểu tượng dấu chân mèo */}
        <div className="relative z-10 flex items-center justify-around px-4 sm:px-8 pt-3 pb-1">
          <div className="w-9 sm:w-11 h-8 sm:h-9 rounded-full bg-white border-2 border-[#1E120A] flex items-center justify-center shadow-md">
            <span className="text-pink-400 font-bold text-xs">🐾</span>
          </div>
          <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#4A2810] bg-white/70 backdrop-blur-xs px-3 sm:px-4 py-1 rounded-full border border-pink-300/50">
            Cà Xòi • Trạm Cấp Cứu Buồn Ngủ
          </div>
          <div className="w-9 sm:w-11 h-8 sm:h-9 rounded-full bg-white border-2 border-[#1E120A] flex items-center justify-center shadow-md">
            <span className="text-pink-400 font-bold text-xs">🐾</span>
          </div>
        </div>
      </div>

      {/* Banner Đặt qua Xanh SM Ngon tối ưu */}
      <div className="mt-3.5 bg-gradient-to-r from-[#005B3B] via-[#007A50] to-[#008F5D] text-white p-3 sm:p-3.5 rounded-2xl shadow-md border border-emerald-400/30 flex flex-col sm:flex-row items-center justify-between gap-3">
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
          href="https://xanhsmngon.onelink.me/14WJ/u8vplbn5"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs px-3.5 py-2 rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 shrink-0"
        >
          <span>Mở App Đặt Món</span>
          <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
        </a>
      </div>
    </div>
  );
}
