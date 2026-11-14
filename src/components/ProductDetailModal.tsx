"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { X, Plus, Minus, Check, Tag } from "lucide-react";
import { Product, ProductVariant, ProductOption, CartItem, SelectedOptionItem } from "@/types";
import { formatVND, MIN_LY_ORDER, MIN_LY_MESSAGE } from "@/lib/utils";

interface ProductDetailModalProps {
  product: Product | null;
  options: ProductOption[];
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
  defaultRecipientLabel?: string;
  initialVariantName?: string;
  existingLyCount?: number;
}

export default function ProductDetailModal({
  product,
  options,
  onClose,
  onAddToCart,
  defaultRecipientLabel = "",
  initialVariantName,
  existingLyCount = 0,
}: ProductDetailModalProps) {
  if (!product) return null;

  // Selected Variant (Size)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(() => {
    if (initialVariantName) {
      const found = product.variants.find(
        (v) => v.sizeName.toLowerCase() === initialVariantName.toLowerCase()
      );
      if (found) return found;
    }
    return product.variants.find((v) => v.isDefault) || product.variants[0];
  });

  // Selected Options
  // Map of optionId -> array of value names
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<number, string[]>>(() => {
    const initial: Record<number, string[]> = {};
    options.forEach((opt) => {
      const defaultVal = opt.values.find((v) => v.isDefault);
      if (defaultVal) {
        initial[opt.id] = [defaultVal.name];
      } else {
        initial[opt.id] = [];
      }
    });
    return initial;
  });

  const [quantity, setQuantity] = useState(1);
  const [quantityDraft, setQuantityDraft] = useState("1");
  const [recipientLabel, setRecipientLabel] = useState(defaultRecipientLabel);
  const [notes, setNotes] = useState("");

  const applyQuantity = (next: number) => {
    const clamped = Math.max(1, Math.min(50, next));
    setQuantity(clamped);
    setQuantityDraft(String(clamped));
  };

  // Handle single select (Radio)
  const handleSingleSelect = (optionId: number, valueName: string) => {
    setSelectedOptionsMap((prev) => ({
      ...prev,
      [optionId]: [valueName],
    }));
  };

  // Handle multiple select (Checkbox)
  const handleToggleMultiple = (optionId: number, valueName: string) => {
    setSelectedOptionsMap((prev) => {
      const current = prev[optionId] || [];
      if (current.includes(valueName)) {
        return { ...prev, [optionId]: current.filter((v) => v !== valueName) };
      } else {
        return { ...prev, [optionId]: [...current, valueName] };
      }
    });
  };

  // Calculate Unit Price
  const { unitPrice, selectedOptionsList } = useMemo(() => {
    const base = product.salePrice ?? product.basePrice;
    let extra = selectedVariant.extraPrice;

    const list: SelectedOptionItem[] = [];

    options.forEach((opt) => {
      const selectedValues = selectedOptionsMap[opt.id] || [];
      selectedValues.forEach((valName) => {
        const valObj = opt.values.find((v) => v.name === valName);
        if (valObj) {
          extra += valObj.extraPrice;
          list.push({
            optionName: opt.name,
            valueName: valObj.name,
            extraPrice: valObj.extraPrice,
          });
        }
      });
    });

    return {
      unitPrice: base + extra,
      selectedOptionsList: list,
    };
  }, [product, selectedVariant, selectedOptionsMap, options]);

  const handleConfirmAdd = () => {
    const cartItem: CartItem = {
      cartItemId: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      product,
      variant: selectedVariant,
      selectedOptions: selectedOptionsList,
      quantity,
      recipientLabel: recipientLabel.trim() || undefined,
      notes: notes.trim() || undefined,
      unitPrice,
      totalPrice: unitPrice * quantity,
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Modal Container */}
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-coffee-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative">
          <div className="relative w-full h-48 sm:h-56 bg-coffee-100">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />
          </div>

          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors z-10"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 left-4 right-10 text-white">
            <h2 className="text-xl font-bold leading-tight">{product.name}</h2>
            <p className="text-xs text-amber-200 mt-1 leading-relaxed">{product.description}</p>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {/* 1. Size / Variant Selection */}
          {product.variants.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-coffee-500 mb-2">
                Chọn kích cỡ (Bắt buộc)
              </label>
              <div className={`grid gap-2 ${product.variants.length === 1 ? "grid-cols-1" : product.variants.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                {product.variants.map((v) => {
                  const isSelected = selectedVariant.id === v.id;
                  const variantPrice = (product.salePrice ?? product.basePrice) + v.extraPrice;
                  const isLyVariant = v.sizeName.trim().toLowerCase() === "ly";
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`py-2 px-2.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-caramel bg-amber-50/60 ring-2 ring-caramel/30 text-coffee-900"
                          : "border-coffee-200 hover:border-coffee-300 text-coffee-700 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="text-xs font-semibold">{v.sizeName}</span>
                        {isLyVariant && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 whitespace-nowrap">
                            Từ 5 ly
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-coffee-600 mt-1 font-bold">
                        {formatVND(variantPrice)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedVariant.sizeName.trim().toLowerCase() === "ly" &&
                existingLyCount + quantity < MIN_LY_ORDER && (
                  <div className="mt-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3 py-2 text-[11px] font-semibold leading-snug flex items-center justify-between gap-2">
                    <span>{MIN_LY_MESSAGE}</span>
                    <span className="shrink-0 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {existingLyCount + quantity}/{MIN_LY_ORDER} ly
                    </span>
                  </div>
                )}
            </div>
          )}

          {/* 2. Options (Đường, Đá, Sữa, Toppings) */}
          {options.map((opt) => {
            const isMultiple = opt.isMultiple;
            const currentSelected = selectedOptionsMap[opt.id] || [];

            return (
              <div key={opt.id} className="pt-2 border-t border-coffee-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-coffee-500">
                    {opt.name} {opt.isRequired && <span className="text-red-500">*</span>}
                  </label>
                  <span className="text-[11px] text-coffee-400">
                    {isMultiple ? "Chọn nhiều" : "Chọn 1"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {opt.values.map((val) => {
                    const isChecked = currentSelected.includes(val.name);

                    return (
                      <button
                        key={val.id}
                        type="button"
                        onClick={() =>
                          isMultiple
                            ? handleToggleMultiple(opt.id, val.name)
                            : handleSingleSelect(opt.id, val.name)
                        }
                        className={`py-2.5 px-3 rounded-xl text-left text-xs border transition-all flex items-center justify-between gap-2 ${
                          isChecked
                            ? "border-caramel bg-amber-50/80 font-semibold text-coffee-900"
                            : "border-coffee-200 hover:border-coffee-300 text-coffee-700 bg-white"
                        }`}
                      >
                        <span className="leading-snug min-w-0 break-words">{val.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {val.extraPrice > 0 && (
                            <span className="text-[10px] text-caramel font-bold whitespace-nowrap">
                              +{formatVND(val.extraPrice)}
                            </span>
                          )}
                          {isChecked && <Check className="w-3.5 h-3.5 text-caramel ml-1" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 3. Personalized Drink Label (Tên người uống in tem ly) */}
          <div className="pt-2 border-t border-coffee-100">
            <label className="block text-xs font-bold text-coffee-700 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-caramel" />
              Tên người uống (In tem dán ly)
            </label>
            <input
              type="text"
              placeholder="VD: Anh Nam Lead, Chị Lan Kế toán..."
              value={recipientLabel}
              onChange={(e) => setRecipientLabel(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
            />
          </div>

          {/* 4. Special Notes */}
          <div>
            <label className="block text-xs font-semibold text-coffee-600 mb-1">
              Ghi chú riêng cho Barista
            </label>
            <input
              type="text"
              placeholder="VD: Cho nhiều bọt sữa, tách riêng đá..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
            />
          </div>
        </div>

        {/* Modal Footer (Quantity & Add Button) */}
        <div className="p-4 bg-coffee-50/80 border-t border-coffee-100 flex items-center justify-between gap-3">
          {/* Quantity Stepper (1 - 50) */}
          <div className="flex items-center gap-1.5 bg-white rounded-xl border border-coffee-200 p-1" title="Chọn số lượng từ 1 đến 50">
            <button
              type="button"
              onClick={() => applyQuantity(quantity - 1)}
              disabled={quantity <= 1}
              className="w-7 h-7 rounded-lg text-coffee-700 hover:bg-coffee-100 flex items-center justify-center disabled:opacity-30"
              aria-label="Giảm số lượng"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min={1}
              max={50}
              value={quantityDraft}
              onChange={(e) => {
                const raw = e.target.value;
                setQuantityDraft(raw);
                const parsed = parseInt(raw, 10);
                if (!Number.isNaN(parsed) && parsed >= 1) {
                  setQuantity(Math.min(50, parsed));
                }
              }}
              onBlur={() => {
                const parsed = parseInt(quantityDraft, 10);
                applyQuantity(Number.isNaN(parsed) ? 1 : parsed);
              }}
              className="w-9 text-center text-sm font-bold text-coffee-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Số lượng (tối đa 50)"
            />
            <button
              type="button"
              onClick={() => applyQuantity(quantity + 1)}
              disabled={quantity >= 50}
              className="w-7 h-7 rounded-lg text-coffee-700 hover:bg-coffee-100 flex items-center justify-center disabled:opacity-30"
              aria-label="Tăng số lượng"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleConfirmAdd}
            className="flex-1 bg-coffee-800 hover:bg-coffee-900 text-white font-bold py-2.5 px-4 rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-between text-sm"
          >
            <span>Thêm vào giỏ</span>
            <span className="text-amber-200">{formatVND(unitPrice * quantity)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
