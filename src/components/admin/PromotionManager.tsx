"use client";

import React, { useState, useEffect } from "react";
import {
  Tag,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Copy,
  Check,
  Percent,
  DollarSign,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { formatVND } from "@/lib/utils";
import { Promotion, DiscountType } from "@/types";

interface PromotionManagerProps {
  currentUser?: any;
  onShowMessage?: (msg: string) => void;
}

export default function PromotionManager({
  currentUser,
  onShowMessage,
}: PromotionManagerProps) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Modal create/edit states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderAmount: number;
    maxDiscountAmount: number | null;
    isActive: boolean;
  }>({
    code: "",
    name: "",
    discountType: "PERCENTAGE",
    discountValue: 15,
    minOrderAmount: 50000,
    maxDiscountAmount: null,
    isActive: true,
  });

  // RBAC Permission check
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const isStoreManager = currentUser?.role === "STORE_MANAGER";
  const canManage = isSuperAdmin || isStoreManager || !currentUser; // fallback if session not yet resolved

  const showNotification = (text: string, isError = false) => {
    if (isError) {
      setErrorMsg(text);
      setTimeout(() => setErrorMsg(""), 4000);
    } else {
      setMsg(text);
      if (onShowMessage) onShowMessage(text);
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const fetchPromotions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/promotions");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPromotions(data.data);
      }
    } catch {
      showNotification("Lỗi tải danh sách mã khuyến mãi", true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenCreateModal = () => {
    setFormData({
      code: "",
      name: "",
      discountType: "PERCENTAGE",
      discountValue: 15,
      minOrderAmount: 50000,
      maxDiscountAmount: null,
      isActive: true,
    });
    setIsEditMode(false);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Promotion) => {
    setFormData({
      code: p.code,
      name: p.name,
      discountType: p.discountType,
      discountValue: p.discountValue,
      minOrderAmount: p.minOrderAmount,
      maxDiscountAmount: p.maxDiscountAmount || null,
      isActive: p.isActive,
    });
    setIsEditMode(true);
    setEditingId(p.id);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (p: Promotion) => {
    if (!canManage) {
      showNotification("Bạn không có quyền thay đổi trạng thái voucher", true);
      return;
    }
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE",
          id: p.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || "Cập nhật trạng thái thành công");
        setPromotions((prev) =>
          prev.map((item) => (item.id === p.id ? data.data : item))
        );
      } else {
        showNotification(data.message || "Lỗi thao tác", true);
      }
    } catch {
      showNotification("Lỗi kết nối máy chủ", true);
    }
  };

  const handleDelete = async (p: Promotion) => {
    if (!canManage) {
      showNotification("Bạn không có quyền xóa mã khuyến mãi", true);
      return;
    }
    if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn mã "${p.code}" không?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/promotions?id=${p.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Đã xóa thành công mã ${p.code}`);
        setPromotions((prev) => prev.filter((item) => item.id !== p.id));
      } else {
        showNotification(data.message || "Không thể xóa mã", true);
      }
    } catch {
      showNotification("Lỗi kết nối máy chủ khi xóa", true);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      showNotification("Mã khuyến mãi không được để trống", true);
      return;
    }
    if (!formData.name.trim()) {
      showNotification("Tên chương trình không được để trống", true);
      return;
    }
    if (formData.discountValue <= 0) {
      showNotification("Mức giảm giá phải lớn hơn 0", true);
      return;
    }
    if (formData.discountType === "PERCENTAGE" && formData.discountValue > 100) {
      showNotification("Phần trăm giảm giá không được vượt quá 100%", true);
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditMode && editingId) {
        const res = await fetch("/api/admin/promotions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UPDATE",
            id: editingId,
            data: formData,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showNotification(data.message || "Cập nhật mã thành công");
          setPromotions((prev) =>
            prev.map((item) => (item.id === editingId ? data.data : item))
          );
          setIsModalOpen(false);
        } else {
          showNotification(data.message || "Lỗi cập nhật", true);
        }
      } else {
        const res = await fetch("/api/admin/promotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (data.success) {
          showNotification(data.message || "Tạo mã khuyến mãi thành công");
          setPromotions((prev) => [...prev, data.data]);
          setIsModalOpen(false);
        } else {
          showNotification(data.message || "Lỗi tạo mã", true);
        }
      }
    } catch {
      showNotification("Lỗi kết nối khi gửi dữ liệu", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCount = promotions.length;
  const activeCount = promotions.filter((p) => p.isActive).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="space-y-6">
      {/* TOAST MESSAGES */}
      {msg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold">{msg}</span>
          </div>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-sm font-semibold">{errorMsg}</span>
          </div>
        </div>
      )}

      {/* HEADER & QUICK STATS */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-coffee-100 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-coffee-100 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-coffee-900 flex items-center gap-2.5">
              <span className="p-2 bg-pink-100 text-pink-600 rounded-xl">
                <Tag className="w-5 h-5" />
              </span>
              Quản Lý Khuyến Mãi & Voucher
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Tạo và quản lý các mã giảm giá cho đơn hàng văn phòng, ưu đãi freeship và chiết khấu theo %
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchPromotions}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-coffee-200 text-coffee-700 hover:bg-coffee-50 transition-colors disabled:opacity-50"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            {canManage && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 bg-caramel hover:bg-caramel/90 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Voucher Mới</span>
              </button>
            )}
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-pink-50 to-pink-100/50 p-4 rounded-2xl border border-pink-200/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-pink-700 font-medium">Tổng Voucher</p>
              <p className="text-xl font-black text-pink-900">{totalCount}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-2xl border border-emerald-200/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-emerald-700 font-medium">Đang Hoạt Động</p>
              <p className="text-xl font-black text-emerald-900">{activeCount}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-stone-50 to-stone-100 p-4 rounded-2xl border border-stone-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-600 font-medium">Tạm Ẩn / Ngưng</p>
              <p className="text-xl font-black text-stone-800">{inactiveCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* PROMOTIONS LIST TABLE */}
      <div className="bg-white rounded-3xl border border-coffee-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-coffee-100 flex items-center justify-between">
          <h3 className="font-bold text-coffee-900 text-sm sm:text-base flex items-center gap-2">
            <span>Danh Sách Mã Giảm Giá Đang Lưu Trữ</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-coffee-100 text-coffee-700">
              {promotions.length} mã
            </span>
          </h3>

          {!canManage && (
            <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1 font-medium">
              <ShieldAlert className="w-3.5 h-3.5" /> Chế độ chỉ xem
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-stone-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-caramel" />
            <p className="text-xs">Đang tải danh sách khuyến mãi từ SQLite...</p>
          </div>
        ) : promotions.length === 0 ? (
          <div className="p-12 text-center text-stone-400 space-y-2">
            <Tag className="w-8 h-8 mx-auto text-stone-300" />
            <p className="text-sm font-semibold text-stone-600">Chưa có mã khuyến mãi nào</p>
            <p className="text-xs text-stone-400">Bấm "Thêm Voucher Mới" để tạo chương trình đầu tiên.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF6F3] text-coffee-800 uppercase font-black text-[10px] tracking-wider border-b border-coffee-100">
                <tr>
                  <th className="py-3 px-4">Mã Voucher</th>
                  <th className="py-3 px-4">Tên Chương Trình</th>
                  <th className="py-3 px-4">Mức Giảm</th>
                  <th className="py-3 px-4">Đơn Tối Thiểu</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-50 font-medium text-stone-700">
                {promotions.map((p) => {
                  const isCopied = copiedCode === p.code;
                  return (
                    <tr key={p.id} className="hover:bg-pink-50/30 transition-colors">
                      {/* Code Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl text-rose-800 font-mono font-black text-xs shadow-xs">
                          <span>{p.code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(p.code)}
                            title="Sao chép mã"
                            className="text-rose-400 hover:text-rose-700 transition-colors ml-1"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Name & details */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <p className="font-bold text-coffee-900">{p.name}</p>
                        {p.discountType === "PERCENTAGE" && p.maxDiscountAmount && (
                          <p className="text-[10px] text-stone-400 mt-0.5">
                            Giảm tối đa: {formatVND(p.maxDiscountAmount)}
                          </p>
                        )}
                      </td>

                      {/* Discount Type & Value */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {p.discountType === "PERCENTAGE" ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-xl font-bold">
                            <Percent className="w-3 h-3 text-amber-600" />
                            Giảm {p.discountValue}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl font-bold">
                            <DollarSign className="w-3 h-3 text-emerald-600" />
                            Giảm {formatVND(p.discountValue)}
                          </span>
                        )}
                      </td>

                      {/* Min Order */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-stone-600">
                        {p.minOrderAmount > 0 ? (
                          <span>Từ {formatVND(p.minOrderAmount)}</span>
                        ) : (
                          <span className="text-stone-400 italic">Không giới hạn</span>
                        )}
                      </td>

                      {/* Toggle status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p)}
                          disabled={!canManage}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border ${
                            p.isActive
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-300 hover:bg-emerald-500/20"
                              : "bg-stone-100 text-stone-500 border-stone-300 hover:bg-stone-200"
                          } disabled:cursor-not-allowed`}
                          title={canManage ? "Bấm để bật/tắt kích hoạt" : undefined}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              p.isActive ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                            }`}
                          />
                          <span>{p.isActive ? "Đang bật" : "Tạm ngưng"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        {canManage ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(p)}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-coffee-900 hover:bg-coffee-100 transition-colors"
                              title="Chỉnh sửa voucher"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Xóa voucher"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-stone-300 text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREATE / EDIT PROMOTION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-coffee-100 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-coffee-100 pb-3">
              <h3 className="font-bold text-coffee-900 text-base flex items-center gap-2">
                <Tag className="w-5 h-5 text-caramel" />
                <span>{isEditMode ? `Chỉnh Sửa Mã: ${formData.code}` : "Tạo Mã Khuyến Mãi Mới"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Mã code */}
              <div>
                <label className="block text-xs font-bold text-coffee-800 mb-1">
                  Mã Voucher (Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: CAXOI20, FREESHIP..."
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, "") })
                  }
                  className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 uppercase"
                />
                <p className="text-[10px] text-stone-400 mt-1">Viết hoa, viết liền không dấu (VD: BANMOI15)</p>
              </div>

              {/* Tên chương trình */}
              <div>
                <label className="block text-xs font-bold text-coffee-800 mb-1">
                  Tên Chương Trình / Mô Tả <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Giảm 20% cho đơn đầu tiên của dân văn phòng"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                />
              </div>

              {/* Loại giảm giá */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-coffee-800 mb-1">
                    Loại Giảm Giá
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountType: e.target.value as DiscountType,
                      })
                    }
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 bg-white"
                  >
                    <option value="PERCENTAGE">Theo Phần Trăm (%)</option>
                    <option value="FIXED">Số Tiền Cố Định (VNĐ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-coffee-800 mb-1">
                    Mức Giảm <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={formData.discountType === "PERCENTAGE" ? 100 : 10000000}
                    required
                    value={formData.discountValue || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, discountValue: Number(e.target.value) })
                    }
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 font-bold"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    {formData.discountType === "PERCENTAGE" ? "Nhập từ 1 đến 100" : "Nhập số tiền VNĐ"}
                  </p>
                </div>
              </div>

              {/* Đơn tối thiểu & Giảm tối đa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-coffee-800 mb-1">
                    Đơn Tối Thiểu (VNĐ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={formData.minOrderAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, minOrderAmount: Number(e.target.value) })
                    }
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Để 0đ nếu không yêu cầu</p>
                </div>

                {formData.discountType === "PERCENTAGE" && (
                  <div>
                    <label className="block text-xs font-bold text-coffee-800 mb-1">
                      Giảm Tối Đa (VNĐ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      placeholder="Không giới hạn"
                      value={formData.maxDiscountAmount || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxDiscountAmount: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">Trần giảm tiền tối đa</p>
                  </div>
                )}
              </div>

              {/* Trạng thái kích hoạt */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-caramel focus:ring-caramel"
                  />
                  <span className="text-xs font-bold text-coffee-900">
                    Kích hoạt voucher ngay bây giờ
                  </span>
                </label>
              </div>

              {/* Actions footer */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-coffee-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-caramel text-white hover:bg-caramel/90 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Đang lưu..." : isEditMode ? "Lưu Thay Đổi" : "Tạo Mã"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
