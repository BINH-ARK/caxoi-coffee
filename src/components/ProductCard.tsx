"use client";

import Image from "next/image";
import { Plus, Flame, Sparkles, Clock, Ban } from "lucide-react";
import { Product } from "@/types";
import { formatVND } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export default function ProductCard({ product, onSelect }: ProductCardProps) {
  const isBestSeller = product.tags.includes("BEST_SELLER");
  const isNew = product.tags.includes("NEW");
  const isCombo = product.tags.includes("OFFICE_COMBO");

  return (
    <div
      onClick={() => product.isAvailable && onSelect(product)}
      className={`group relative bg-white rounded-2xl p-3 border border-coffee-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer ${
        !product.isAvailable ? "opacity-60 cursor-not-allowed" : "hover:border-coffee-300"
      }`}
    >
      <div>
        {/* Product Image & Badges */}
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-coffee-50 mb-3">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Tag Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {isBestSeller && (
              <span className="flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                <Flame className="w-3 h-3" /> Best Seller
              </span>
            )}
            {isNew && (
              <span className="flex items-center gap-1 bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                <Sparkles className="w-3 h-3" /> Món Mới
              </span>
            )}
            {isCombo && (
              <span className="flex items-center gap-1 bg-caramel/95 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                Combo Tiết Kiệm
              </span>
            )}
          </div>

          {!product.isAvailable && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center text-white font-semibold text-xs gap-1">
              <Ban className="w-4 h-4 text-red-400" /> Tạm hết món
            </div>
          )}

          <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> {product.prepTimeMinutes}p
          </div>
        </div>

        {/* Product Info */}
        <h3 className="font-bold text-coffee-900 text-sm sm:text-base leading-snug group-hover:text-caramel transition-colors">
          {product.name}
        </h3>
        <p className="text-coffee-500 text-xs mt-1 leading-relaxed">
          {product.description}
        </p>
        {/* Packaging / Variant Pills (Ly • 100ml • 250ml) */}
        {product.variants.length > 1 && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-pink-100/60">
            {product.variants.map((v) => (
              <span
                key={v.id}
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-pink-50 border border-pink-200/80 text-rose-700"
              >
                {v.sizeName.split(" (")[0]}: {formatVND((product.salePrice ?? product.basePrice) + v.extraPrice)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pricing & Add Button */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-coffee-50">
        <div>
          {(() => {
            const defaultVariant = product.variants.find((v) => v.isDefault) || product.variants[0];
            const extra = defaultVariant ? defaultVariant.extraPrice : 0;
            const currentPrice = (product.salePrice ?? product.basePrice) + extra;
            const originalPrice = product.basePrice + extra;

            return (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold text-sm sm:text-base text-coffee-800">
                    {formatVND(currentPrice)}
                  </span>
                  {product.salePrice && (
                    <span className="text-[11px] text-coffee-400 line-through">
                      {formatVND(originalPrice)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-coffee-400">
                  {defaultVariant ? defaultVariant.sizeName : (product.variants.length > 1 ? `${product.variants.length} kích cỡ` : "Size chuẩn")}
                </span>
              </>
            );
          })()}
        </div>

        {product.isAvailable && (
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-coffee-800 text-white flex items-center justify-center hover:bg-caramel transition-colors shadow-sm active:scale-95"
            aria-label={`Thêm ${product.name}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
