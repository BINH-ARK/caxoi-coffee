"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Building,
  Clock,
  Phone,
  CreditCard,
  QrCode,
  Save,
  RotateCcw,
  Download,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Check,
  Send,
  Zap,
  Coffee,
  Truck,
  Flame,
  Info,
} from "lucide-react";
import { BusinessSettings } from "@/types";
import { formatVND } from "@/lib/utils";
import {
  VIETQR_BANKS,
  getBankById,
  generateVietQrUrl,
  getOperatingHoursStatus,
  VietQrTemplate,
} from "@/lib/vietqr";

interface OperatingAndVietQrSettingsProps {
  initialSettings: BusinessSettings;
  onSettingsUpdated: (newSettings: BusinessSettings) => void;
  onShowMessage: (msg: string) => void;
}

export default function OperatingAndVietQrSettings({
  initialSettings,
  onSettingsUpdated,
  onShowMessage,
}: OperatingAndVietQrSettingsProps) {
  // Form State
  const [formData, setFormData] = useState<BusinessSettings>({ ...initialSettings });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Live QR Generator State
  const [testAmount, setTestAmount] = useState<number>(0);
  const [testMemo, setTestMemo] = useState<string>("CA XOI TEST");
  const [qrTemplate, setQrTemplate] = useState<VietQrTemplate>("compact2");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);

  // Webhook Test Simulation
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<string | null>(null);

  // Current system time for live operating hours calculation
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Sync if initialSettings prop changes
  useEffect(() => {
    setFormData({ ...initialSettings });
  }, [initialSettings]);

  // Compute operational status
  const hoursStatus = getOperatingHoursStatus(formData.openTime, formData.closeTime, currentTime);

  // Selected bank metadata
  const selectedBank = getBankById(formData.vietqrBankId);

  // Live VietQR preview URL
  const previewQrUrl = generateVietQrUrl({
    bankId: formData.vietqrBankId || "MB",
    accountNo: formData.vietqrAccountNo || "999988886666",
    accountName: formData.vietqrAccountName || "CA XOI CAFE",
    amount: testAmount,
    description: testMemo,
    template: qrTemplate,
  });

  // Handle Form Input Changes
  const handleInputChange = (field: keyof BusinessSettings, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Submit Settings Update
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      // Validate inputs
      if (!formData.storeName.trim()) {
        throw new Error("Vui lòng nhập tên quán.");
      }
      if (!formData.hotline.trim()) {
        throw new Error("Vui lòng nhập hotline liên hệ.");
      }
      if (!formData.vietqrAccountNo.trim()) {
        throw new Error("Vui lòng nhập số tài khoản VietQR thụ hưởng.");
      }
      if (!formData.vietqrAccountName.trim()) {
        throw new Error("Vui lòng nhập tên chủ tài khoản.");
      }

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Lỗi khi cập nhật cấu hình.");
      }

      setSaveSuccess(true);
      onSettingsUpdated(data.data);
      onShowMessage("✅ Đã lưu cấu hình vận hành và cổng thanh toán VietQR thành công!");
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err.message || "Có lỗi xảy ra khi lưu");
    } finally {
      setIsSaving(false);
    }
  };

  // Quick store status change
  const handleQuickStatusChange = async (newStatus: "OPEN" | "CLOSED" | "PAUSED") => {
    let msg = formData.storeStatusMessage;
    if (newStatus === "OPEN") {
      msg = `Quán đang mở cửa phục vụ (${formData.openTime} - ${formData.closeTime}) - Giao nhanh văn phòng 15-25 phút`;
    } else if (newStatus === "PAUSED") {
      msg = "Quán đang quá tải đơn giờ cao điểm - Tạm dừng nhận đơn trực tuyến 15 phút";
    } else {
      msg = `Quán đã đóng cửa - Hẹn gặp lại quý khách vào ${formData.openTime} sáng mai`;
    }

    const updated = {
      ...formData,
      storeStatus: newStatus,
      storeStatusMessage: msg,
    };
    setFormData(updated);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeStatus: newStatus,
          storeStatusMessage: msg,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSettingsUpdated(data.data);
        onShowMessage(`Đã cập nhật trạng thái quán: ${newStatus === "OPEN" ? "Mở cửa" : newStatus === "PAUSED" ? "Tạm dừng" : "Đóng cửa"}`);
      }
    } catch (e) {
      console.error("Status update error", e);
    }
  };

  // Sync status automatically with operating hours
  const handleApplyHoursAutoStatus = () => {
    const isNowOpen = hoursStatus.isWithinHours;
    handleQuickStatusChange(isNowOpen ? "OPEN" : "CLOSED");
  };

  // Copy QR Link
  const handleCopyQrLink = () => {
    navigator.clipboard.writeText(previewQrUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Copy Account Number
  const handleCopyAccountNo = () => {
    navigator.clipboard.writeText(formData.vietqrAccountNo);
    setCopiedAcc(true);
    setTimeout(() => setCopiedAcc(false), 2000);
  };

  // Download QR Code Image
  const handleDownloadQr = async () => {
    try {
      const res = await fetch(previewQrUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `VietQR-${formData.vietqrBankId}-${formData.vietqrAccountNo}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(previewQrUrl, "_blank");
    }
  };

  // Webhook Test Simulation
  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    setWebhookResult(null);
    try {
      const res = await fetch("/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway: formData.vietqrBankId || "MB",
          content: "CF2611-001 NGUYEN VAN A CHUYEN KHOAN",
          transferAmount: 110000,
          accountNumber: formData.vietqrAccountNo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhookResult("✅ Đối soát Webhook thành công! Đơn CF2611-001 đã chuyển sang trạng thái ĐÃ THANH TOÁN.");
      } else {
        setWebhookResult(`ℹ️ Kết quả: ${data.message}`);
      }
    } catch {
      setWebhookResult("❌ Không thể kết nối cổng Webhook.");
    } finally {
      setIsTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-coffee-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-caramel flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5 text-caramel" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-coffee-900 leading-tight">
                Cấu hình Vận hành & Cổng Thanh toán VietQR
              </h2>
              <p className="text-xs text-coffee-500 mt-0.5">
                Chỉnh sửa thông tin quán, giờ mở cửa/đóng cửa và tự động tạo mã VietQR thật chuẩn Napas 247.
              </p>
            </div>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setFormData({ ...initialSettings })}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-coffee-600 bg-coffee-50 hover:bg-coffee-100 rounded-xl transition-all border border-coffee-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-caramel hover:bg-caramel-dark rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu Tất Cả Cấu Hình</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Cấu hình vận hành và cổng thanh toán VietQR đã được lưu thành công vào hệ thống!</span>
        </div>
      )}
      {saveError && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* 2-COLUMN MAIN EDITING GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: STORE INFO & OPERATING HOURS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* BOX 1: STORE INFO & OPERATING HOURS */}
          <div className="bg-white rounded-3xl p-5 border border-coffee-100 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-coffee-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-caramel" />
                <h3 className="text-sm font-bold text-coffee-900 uppercase tracking-wide">
                  1. Thông tin Cửa hàng & Giờ Vận hành
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-coffee-500 bg-coffee-50 px-2 py-0.5 rounded-md border border-coffee-100">
                Cho phép chỉnh sửa
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Store Name & Hotline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-coffee-800 mb-1">
                    Tên quán / Thương hiệu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.storeName}
                      onChange={(e) => handleInputChange("storeName", e.target.value)}
                      placeholder="VD: Cà Xòi - Cà Phê Mèo & Chai Rót Văn Phòng"
                      className="w-full pl-3 pr-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 text-coffee-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-coffee-800 mb-1">
                    Hotline hỗ trợ CSKH <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.hotline}
                      onChange={(e) => handleInputChange("hotline", e.target.value)}
                      placeholder="VD: 0901 234 567"
                      className="w-full pl-3 pr-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 text-coffee-900 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* OPERATING HOURS SECTION */}
              <div className="bg-coffee-50/70 p-4 rounded-2xl border border-coffee-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-caramel" />
                    <span className="font-bold text-coffee-900 text-xs">
                      Cập nhật giờ mở cửa - đóng cửa quán
                    </span>
                  </div>
                  {/* Real-time status pill */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      hoursStatus.isWithinHours
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        hoursStatus.isWithinHours ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                      }`}
                    />
                    <span>{hoursStatus.statusLabel}</span>
                  </div>
                </div>

                {/* Time Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-white p-3 rounded-xl border border-coffee-200 shadow-2xs">
                    <label className="block text-[11px] font-bold text-coffee-700 mb-1 flex items-center justify-between">
                      <span>Giờ bắt đầu mở cửa:</span>
                      <span className="text-caramel font-mono font-bold">{formData.openTime}</span>
                    </label>
                    <input
                      type="time"
                      value={formData.openTime}
                      onChange={(e) => handleInputChange("openTime", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-coffee-200 bg-coffee-50/40 text-coffee-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-caramel/40"
                    />
                    <p className="text-[10px] text-coffee-400 mt-1">Bắt đầu nhận đơn và chuẩn bị máy pha</p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-coffee-200 shadow-2xs">
                    <label className="block text-[11px] font-bold text-coffee-700 mb-1 flex items-center justify-between">
                      <span>Giờ chốt đóng cửa:</span>
                      <span className="text-caramel font-mono font-bold">{formData.closeTime}</span>
                    </label>
                    <input
                      type="time"
                      value={formData.closeTime}
                      onChange={(e) => handleInputChange("closeTime", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-coffee-200 bg-coffee-50/40 text-coffee-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-caramel/40"
                    />
                    <p className="text-[10px] text-coffee-400 mt-1">Dừng nhận đơn mới trực tuyến</p>
                  </div>
                </div>

                {/* Hours Info & Auto status button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-coffee-200/60">
                  <div className="text-[11px] text-coffee-600 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-caramel shrink-0" />
                    <span>{hoursStatus.remainingMessage}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyHoursAutoStatus}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-caramel hover:text-caramel-dark underline self-start sm:self-auto"
                    title="Đổi trạng thái quán sang Mở cửa hoặc Đóng cửa theo đúng giờ đồng hồ"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Áp dụng trạng thái theo giờ thực tế</span>
                  </button>
                </div>
              </div>

              {/* Current Store Status Quick Selector */}
              <div>
                <label className="block font-bold text-coffee-800 mb-1.5">
                  Trạng thái phục vụ hiện tại (Hiển thị cho khách đặt hàng):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickStatusChange("OPEN")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      formData.storeStatus === "OPEN"
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span>Đang Mở Cửa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickStatusChange("PAUSED")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      formData.storeStatus === "PAUSED"
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                        : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Tạm Dừng (Quá tải)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickStatusChange("CLOSED")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      formData.storeStatus === "CLOSED"
                        ? "bg-stone-700 text-white border-stone-800 shadow-sm"
                        : "bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200"
                    }`}
                  >
                    <span>Đã Đóng Cửa</span>
                  </button>
                </div>
              </div>

              {/* Status Message */}
              <div>
                <label className="block font-bold text-coffee-800 mb-1">
                  Thông báo hiển thị thanh Banner ngoài trang chủ:
                </label>
                <input
                  type="text"
                  value={formData.storeStatusMessage}
                  onChange={(e) => handleInputChange("storeStatusMessage", e.target.value)}
                  placeholder="VD: Quán đang phục vụ bình thường - Giao trong 15-25 phút"
                  className="w-full px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 text-coffee-900 font-medium"
                />
              </div>

              {/* OPERATIONAL METRICS: DELIVERY & CAPACITY */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="bg-coffee-50 p-2.5 rounded-xl border border-coffee-100">
                  <span className="text-[10px] text-coffee-500 font-medium block">Phí ship cơ bản</span>
                  <input
                    type="number"
                    step={1000}
                    value={formData.baseDeliveryFee}
                    onChange={(e) => handleInputChange("baseDeliveryFee", Number(e.target.value))}
                    className="w-full font-bold text-xs bg-transparent border-b border-coffee-200 focus:outline-none focus:border-caramel py-0.5"
                  />
                  <span className="text-[10px] text-coffee-400">{formatVND(formData.baseDeliveryFee)}</span>
                </div>

                <div className="bg-coffee-50 p-2.5 rounded-xl border border-coffee-100">
                  <span className="text-[10px] text-coffee-500 font-medium block">Freeship từ</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={formData.freeDeliveryMinCups}
                      onChange={(e) => handleInputChange("freeDeliveryMinCups", Number(e.target.value))}
                      className="w-12 font-bold text-xs bg-transparent border-b border-coffee-200 focus:outline-none focus:border-caramel py-0.5"
                    />
                    <span className="text-[11px] font-bold text-coffee-700">ly</span>
                  </div>
                  <span className="text-[10px] text-coffee-400">Đơn văn phòng</span>
                </div>

                <div className="bg-coffee-50 p-2.5 rounded-xl border border-coffee-100">
                  <span className="text-[10px] text-coffee-500 font-medium block">Lead time pha</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={formData.prepLeadTimeMinutes}
                      onChange={(e) => handleInputChange("prepLeadTimeMinutes", Number(e.target.value))}
                      className="w-12 font-bold text-xs bg-transparent border-b border-coffee-200 focus:outline-none focus:border-caramel py-0.5"
                    />
                    <span className="text-[11px] font-bold text-coffee-700">phút/ly</span>
                  </div>
                  <span className="text-[10px] text-coffee-400">Thời gian pha chế</span>
                </div>

                <div className="bg-coffee-50 p-2.5 rounded-xl border border-coffee-100">
                  <span className="text-[10px] text-coffee-500 font-medium block">Công suất KDS</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={formData.maxSlotCapacityCups}
                      onChange={(e) => handleInputChange("maxSlotCapacityCups", Number(e.target.value))}
                      className="w-12 font-bold text-xs bg-transparent border-b border-coffee-200 focus:outline-none focus:border-caramel py-0.5"
                    />
                    <span className="text-[11px] font-bold text-coffee-700">ly/15p</span>
                  </div>
                  <span className="text-[10px] text-coffee-400">Giới hạn nhận</span>
                </div>
              </div>
            </div>
          </div>

          {/* BOX 2: VIETQR BENEFICIARY ACCOUNT SETTINGS */}
          <div className="bg-white rounded-3xl p-5 border border-coffee-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-coffee-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-caramel" />
                <h3 className="text-sm font-bold text-coffee-900 uppercase tracking-wide">
                  2. Tài khoản VietQR Thụ Hưởng
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Chuẩn Napas 247
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Bank Selector */}
              <div>
                <label className="block font-bold text-coffee-800 mb-1">
                  Ngân hàng thụ hưởng <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.vietqrBankId}
                  onChange={(e) => handleInputChange("vietqrBankId", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-coffee-200 bg-white focus:outline-none focus:ring-2 focus:ring-caramel/40 text-coffee-900 font-semibold"
                >
                  {VIETQR_BANKS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.shortName} - {b.name} (Mã VietQR: {b.id})
                    </option>
                  ))}
                </select>
                {selectedBank && (
                  <p className="text-[11px] text-coffee-500 mt-1 flex items-center gap-1.5">
                    <span className="font-bold text-coffee-700">{selectedBank.shortName}</span>
                    <span>• Mã Napas BIN: <span className="font-mono font-bold text-coffee-800">{selectedBank.bin}</span></span>
                    <span>• {selectedBank.name}</span>
                  </p>
                )}
              </div>

              {/* Account Number & Account Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-coffee-800 mb-1">
                    Số tài khoản ngân hàng <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.vietqrAccountNo}
                      onChange={(e) => handleInputChange("vietqrAccountNo", e.target.value.replace(/\s+/g, ""))}
                      placeholder="VD: 999988886666"
                      className="w-full px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 text-caramel font-mono font-bold text-sm tracking-wider"
                    />
                  </div>
                  <p className="text-[10px] text-coffee-400 mt-1">Số tài khoản nhận tiền chuyển khoản của quán</p>
                </div>

                <div>
                  <label className="block font-bold text-coffee-800 mb-1">
                    Tên chủ tài khoản (In hoa không dấu) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.vietqrAccountName}
                      onChange={(e) => handleInputChange("vietqrAccountName", e.target.value.toUpperCase())}
                      placeholder="VD: CA XOI CAFE"
                      className="w-full px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 text-coffee-900 font-bold uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-coffee-400 mt-1">Khớp với tên trên app ngân hàng</p>
                </div>
              </div>

              {/* Bottom Quick Action for Saving */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveSettings()}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-coffee-800 hover:bg-coffee-900 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Thay Đổi Ngân Hàng & Vận Hành</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE REAL VIETQR CODE GENERATOR & TESTER (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-white rounded-3xl p-5 border border-amber-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-caramel" />
                <h3 className="text-sm font-bold text-coffee-900 uppercase tracking-wide">
                  3. Gen Mã VietQR Thật
                </h3>
              </div>
              <span className="text-[10px] font-bold text-caramel bg-white px-2 py-0.5 rounded-full border border-amber-300 shadow-2xs flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Live Preview</span>
              </span>
            </div>

            <p className="text-xs text-coffee-600">
              Mã QR thật cập nhật tức thì theo thông tin ngân hàng thụ hưởng. Quét được ngay bằng bất kỳ ứng dụng ngân hàng nào.
            </p>

            {/* REAL VIETQR CARD PREVIEW */}
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-amber-200 shadow-md">
              <div className="relative group overflow-hidden rounded-xl border border-amber-100">
                <Image
                  src={previewQrUrl}
                  alt={`VietQR ${formData.vietqrBankId} ${formData.vietqrAccountNo}`}
                  width={240}
                  height={240}
                  className="rounded-xl mx-auto shadow-sm object-contain transition-transform duration-300 group-hover:scale-102"
                  unoptimized
                />
              </div>

              {/* Bank quick summary */}
              <div className="mt-3 text-center space-y-0.5">
                <div className="text-xs font-bold text-coffee-900">
                  {selectedBank?.shortName || formData.vietqrBankId} •{" "}
                  <span className="font-mono text-caramel">{formData.vietqrAccountNo}</span>
                </div>
                <div className="text-[11px] font-bold text-coffee-700 uppercase tracking-wide">
                  {formData.vietqrAccountName}
                </div>
                {testAmount > 0 && (
                  <div className="text-xs font-extrabold text-caramel">
                    Số tiền: {formatVND(testAmount)}
                  </div>
                )}
                {testMemo && (
                  <div className="text-[10px] text-coffee-500 font-mono">
                    Nội dung: {testMemo}
                  </div>
                )}
              </div>
            </div>

            {/* QR CONTROLS: TEMPLATE SELECTOR */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-coffee-700 text-[11px]">
                Kiểu khung hiển thị VietQR (Template):
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: "compact2", label: "Chuẩn đẹp (Có Logo)" },
                  { key: "compact", label: "Gọn (Compact)" },
                  { key: "qr_only", label: "Chỉ mã QR" },
                  { key: "print", label: "Khổ in để bàn" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setQrTemplate(t.key as VietQrTemplate)}
                    className={`py-1.5 px-2.5 rounded-lg border text-[11px] font-semibold transition-all text-left ${
                      qrTemplate === t.key
                        ? "bg-caramel text-white border-caramel shadow-2xs font-bold"
                        : "bg-white text-coffee-700 border-coffee-200 hover:bg-amber-50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TEST AMOUNT & TEST MEMO */}
            <div className="space-y-2 pt-1 border-t border-amber-200/60 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-coffee-700 text-[11px]">
                  Số tiền kiểm tra (VND):
                </label>
                <div className="flex gap-1">
                  {[0, 10000, 29000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTestAmount(amt)}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                        testAmount === amt
                          ? "bg-caramel text-white border-caramel"
                          : "bg-white text-coffee-600 border-coffee-200 hover:bg-coffee-50"
                      }`}
                    >
                      {amt === 0 ? "Tùy ý" : `${amt / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="number"
                step={5000}
                min={0}
                value={testAmount}
                onChange={(e) => setTestAmount(Math.max(0, Number(e.target.value)))}
                placeholder="0 (Khách tự nhập tiền)"
                className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white font-mono text-xs font-bold text-coffee-900 focus:outline-none focus:ring-1 focus:ring-caramel"
              />

              <div>
                <label className="block font-bold text-coffee-700 text-[11px] mb-1">
                  Nội dung chuyển khoản (Memo / AddInfo):
                </label>
                <input
                  type="text"
                  value={testMemo}
                  onChange={(e) => setTestMemo(e.target.value)}
                  placeholder="VD: CF2611-001"
                  className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white font-mono text-xs text-coffee-900 focus:outline-none focus:ring-1 focus:ring-caramel"
                />
              </div>
            </div>

            {/* ACTION BUTTONS: DOWNLOAD, COPY, OPEN */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-coffee-800 hover:bg-coffee-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải ảnh mã QR</span>
              </button>

              <button
                type="button"
                onClick={handleCopyQrLink}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-amber-50 text-coffee-800 border border-amber-300 rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Đã chép link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-caramel" />
                    <span>Chép link ảnh QR</span>
                  </>
                )}
              </button>
            </div>

            {/* WEBHOOK SIMULATOR BOX */}
            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-coffee-900 flex items-center gap-1.5 text-[11px]">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Kiểm tra Webhook Đối Soát Tự Động</span>
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                  Auto Check 2s
                </span>
              </div>
              <p className="text-[11px] text-coffee-500 leading-relaxed">
                Thử nghiệm gửi tín hiệu thanh toán giả lập tới webhook để kiểm tra luồng chuyển trạng thái tự động sang KDS pha chế:
              </p>

              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={isTestingWebhook}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-coffee-800 border border-amber-300 rounded-xl font-bold text-xs transition-colors"
              >
                {isTestingWebhook ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin text-caramel" />
                    <span>Đang gửi đối soát...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-caramel" />
                    <span>Bắn giao dịch thanh toán thử nghiệm (Webhook)</span>
                  </>
                )}
              </button>

              {webhookResult && (
                <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200 text-[11px] font-semibold text-coffee-800">
                  {webhookResult}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
