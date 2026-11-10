"use client";

import Image from "next/image";
import { Coffee, Printer } from "lucide-react";
import { OrderItemRecord } from "@/types";

interface CupStickerProps {
  orderCode: string;
  item: OrderItemRecord;
  createdAt?: string;
  onPrint?: () => void;
}

export default function CupStickerPreview({ orderCode, item, createdAt, onPrint }: CupStickerProps) {
  const timeFormatted = createdAt
    ? new Date(createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-white border-2 border-dashed border-gray-400 p-3 rounded-xl w-64 text-black font-mono shadow-sm text-xs relative select-none">
      {/* Print Trigger */}
      {onPrint && (
        <button
          onClick={onPrint}
          className="absolute top-2 right-2 text-gray-500 hover:text-black p-1 hover:bg-gray-100 rounded"
          title="In tem dán ly"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Header with Mini Logo */}
      <div className="flex items-center gap-2 border-b border-black pb-1.5 mb-1.5">
        <div className="w-7 h-7 rounded-lg overflow-hidden border border-black/30 shrink-0 bg-[#FFD1E3]">
          <Image
            src="/images/ca-xoi-logo.jpg"
            alt="Logo Cà Xòi"
            width={28}
            height={28}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="font-black text-[11px] tracking-tight">CÀ XÒI • ĐÀ NẴNG</span>
            <span className="text-[10px] text-gray-600">{timeFormatted}</span>
          </div>
          <p className="text-[9px] text-gray-600 truncate">Tỉnh như sáo, báo như Xòi</p>
        </div>
      </div>

      {/* Order & Recipient Bar */}
      <div className="flex items-center justify-between bg-black text-white px-1.5 py-0.5 rounded text-[11px] font-bold mb-1.5">
        <span>{orderCode}</span>
        <span>{item.recipientLabel ? `[ ${item.recipientLabel} ]` : "Khách lẻ"}</span>
      </div>

      {/* Item & Variant */}
      <div className="font-bold text-sm leading-tight text-black mb-1">
        {item.productName}
      </div>
      <div className="text-[11px] font-bold text-gray-800 mb-1">
        Size: {item.variantName}
      </div>

      {/* Options & Modifiers */}
      {item.options && item.options.length > 0 && (
        <div className="space-y-0.5 border-t border-dotted border-gray-400 pt-1 text-[11px]">
          {item.options.map((opt, i) => (
            <div key={i} className="flex justify-between text-gray-700">
              <span>• {opt.valueName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {item.itemNotes && (
        <div className="mt-1 pt-1 border-t border-gray-300 text-[10px] italic text-red-600">
          * Note: {item.itemNotes}
        </div>
      )}

      {/* Footer barcode line */}
      <div className="mt-2 pt-1 border-t border-black text-center text-[9px] text-gray-500 tracking-widest uppercase">
        * ENJOY YOUR COFFEE *
      </div>
    </div>
  );
}
