"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  DollarSign,
  ShoppingBag,
  Coffee,
  Clock,
  TrendingUp,
  RefreshCw,
  Download,
  Flame,
  Award,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  Layers,
  Filter,
} from "lucide-react";
import { formatVND } from "@/lib/utils";

interface DashboardOverviewManagerProps {
  initialStats?: any;
  settings?: any;
  onNavigateToOrders?: () => void;
  onNavigateToMenu?: () => void;
}

type TimeRange = "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "THIS_MONTH" | "ALL";

export default function DashboardOverviewManager({
  initialStats,
  settings: propSettings,
  onNavigateToOrders,
  onNavigateToMenu,
}: DashboardOverviewManagerProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("TODAY");
  const [stats, setStats] = useState<any>(initialStats || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredHour, setHoveredHour] = useState<any | null>(null);
  const [actionNotice, setActionNotice] = useState<string>("");

  // Tải dữ liệu theo mốc thời gian đã chọn
  const fetchStats = async (range: TimeRange = timeRange, showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?range=${range}`);
      const data = await res.json();
      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Lỗi tải số liệu thống kê:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats(timeRange, false);
  }, [timeRange]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStats(timeRange, false);
    setActionNotice("Đã cập nhật số liệu mới nhất!");
    setTimeout(() => setActionNotice(""), 3000);
  };

  // Xuất báo cáo doanh thu ra file CSV hỗ trợ tiếng Việt (UTF-8 BOM)
  const handleExportCSV = () => {
    if (!stats) return;

    const rangeLabels: Record<TimeRange, string> = {
      TODAY: "Hom_nay",
      YESTERDAY: "Hom_qua",
      LAST_7_DAYS: "7_ngay_qua",
      THIS_MONTH: "Thang_nay",
      ALL: "Toan_thoi_gian",
    };

    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "BÁO CÁO DOANH THU & HIỆU SUẤT - CÀ XÒI COFFEE\n";
    csvContent += `Thời gian xuất,${new Date().toLocaleString("vi-VN")}\n`;
    csvContent += `Kỳ thống kê,${rangeLabels[timeRange]}\n\n`;

    csvContent += "1. CHỈ SỐ TỔNG QUAN\n";
    csvContent += `Tổng doanh thu (VNĐ),${stats.totalRevenue || 0}\n`;
    csvContent += `Tổng số đơn hàng,${stats.totalOrders || 0}\n`;
    csvContent += `Tổng số ly bán ra,${stats.totalCupsSold || 0}\n`;
    csvContent += `Giá trị trung bình/đơn (AOV),${stats.averageOrderValue || 0}\n`;
    csvContent += `Tỷ lệ hoàn thành đơn,${stats.completionRate || 0}%\n`;
    csvContent += `Doanh thu VietQR (VNĐ),${stats.vietqrRevenue || 0}\n`;
    csvContent += `Doanh thu Tiền mặt COD (VNĐ),${stats.codRevenue || 0}\n\n`;

    csvContent += "2. TOP MÓN BÁN CHẠY NHẤT\n";
    csvContent += "Xếp hạng,Tên món uống,Số ly đã bán,Tổng doanh thu (VNĐ),Tỷ trọng (%)\n";
    if (stats.topProducts && stats.topProducts.length > 0) {
      stats.topProducts.forEach((p: any) => {
        csvContent += `Hạng ${p.rank},"${p.name}",${p.count},${p.revenue},${p.percentage}%\n`;
      });
    }
    csvContent += "\n";

    csvContent += "3. PHÂN BỔ ĐƠN HÀNG THEO KHUNG GIỜ\n";
    csvContent += "Khung giờ,Số lượng đơn,Doanh thu (VNĐ),Ghi chú\n";
    if (stats.hourlyDistribution && stats.hourlyDistribution.length > 0) {
      stats.hourlyDistribution.forEach((h: any) => {
        csvContent += `${h.hour},${h.count},${h.revenue},${h.isPeak ? "Giờ cao điểm" : ""}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BaoCao_DoanhThu_CaXoi_${rangeLabels[timeRange]}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setActionNotice("Đã xuất file báo cáo CSV thành công!");
    setTimeout(() => setActionNotice(""), 3500);
  };

  const currentSettings = stats?.storeSettings || propSettings;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. THANH ĐIỀU KHIỂN & BỘ LỌC THỜI GIAN (HEADER TOOLBAR) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-coffee-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black text-coffee-900 tracking-tight flex items-center gap-2">
              <span>Doanh Thu & Hiệu Suất Quán</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Live Data
              </span>
            </h1>
          </div>
          <p className="text-xs text-coffee-500 font-medium mt-0.5">
            Phân tích số liệu hóa đơn, giờ cao điểm và sản phẩm bán chạy nhất Cà Xòi Coffee.
          </p>
        </div>

        {/* Cụm Bộ Lọc & Nút Thao Tác */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Bộ chọn thời gian */}
          <div className="bg-coffee-50/80 p-1 rounded-2xl border border-coffee-100/80 flex items-center gap-1 text-xs font-bold overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setTimeRange("TODAY")}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                timeRange === "TODAY"
                  ? "bg-caramel text-white shadow-xs"
                  : "text-coffee-700 hover:text-coffee-900 hover:bg-white/80"
              }`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("YESTERDAY")}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                timeRange === "YESTERDAY"
                  ? "bg-caramel text-white shadow-xs"
                  : "text-coffee-700 hover:text-coffee-900 hover:bg-white/80"
              }`}
            >
              Hôm qua
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("LAST_7_DAYS")}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                timeRange === "LAST_7_DAYS"
                  ? "bg-caramel text-white shadow-xs"
                  : "text-coffee-700 hover:text-coffee-900 hover:bg-white/80"
              }`}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("THIS_MONTH")}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                timeRange === "THIS_MONTH"
                  ? "bg-caramel text-white shadow-xs"
                  : "text-coffee-700 hover:text-coffee-900 hover:bg-white/80"
              }`}
            >
              Tháng này
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("ALL")}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                timeRange === "ALL"
                  ? "bg-caramel text-white shadow-xs"
                  : "text-coffee-700 hover:text-coffee-900 hover:bg-white/80"
              }`}
            >
              Toàn thời gian
            </button>
          </div>

          {/* Nút Làm mới (Refresh) */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-coffee-800 bg-white hover:bg-coffee-50 border border-coffee-200 transition-all shadow-xs active:scale-95 disabled:opacity-50"
            title="Làm mới số liệu tức thì"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-coffee-600 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          {/* Nút Xuất Báo Cáo CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 border border-emerald-600 transition-all shadow-xs active:scale-95"
            title="Tải bảng tính báo cáo doanh thu Excel / CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="bg-emerald-50 text-emerald-800 text-xs font-bold p-3 rounded-2xl border border-emerald-200 animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 2. CỤM 5 THẺ CHỈ SỐ THÔNG MINH (EXECUTIVE KPI CARDS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* THẺ 1: TỔNG DOANH THU */}
        <div className="bg-gradient-to-br from-white to-[#FDFBF7] rounded-3xl p-4 sm:p-5 border border-coffee-100 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-coffee-600">Tổng doanh thu</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black text-coffee-950 tracking-tight">
              {formatVND(stats?.totalRevenue || 0)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{stats?.totalOrders > 0 ? "Doanh số thực tế" : "Chưa có đơn"}</span>
            </div>
          </div>
          <div className="text-[10px] text-coffee-500 pt-2 border-t border-coffee-100/60 flex items-center justify-between">
            <span>QR: {formatVND(stats?.vietqrRevenue || 0)}</span>
            <span>Tiền mặt: {formatVND(stats?.codRevenue || 0)}</span>
          </div>
        </div>

        {/* THẺ 2: TỔNG SỐ ĐƠN HÀNG */}
        <div className="bg-gradient-to-br from-white to-[#FDFBF7] rounded-3xl p-4 sm:p-5 border border-coffee-100 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-coffee-600">Tổng số đơn</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black text-coffee-950 tracking-tight">
              {stats?.totalOrders || 0} <span className="text-sm font-bold text-coffee-600">đơn</span>
            </div>
            <div className="text-[11px] text-blue-600 font-bold mt-1">
              Tỷ lệ hoàn thành: {stats?.completionRate || 100}%
            </div>
          </div>
          <div className="text-[10px] text-coffee-500 pt-2 border-t border-coffee-100/60 flex items-center justify-between">
            <span>{stats?.completedCount || 0} xong</span>
            <span>{stats?.newOrdersCount || 0} mới • {stats?.brewingCount || 0} pha</span>
          </div>
        </div>

        {/* THẺ 3: TỔNG SỐ LY BÁN RA */}
        <div className="bg-gradient-to-br from-white to-[#FDFBF7] rounded-3xl p-4 sm:p-5 border border-coffee-100 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-coffee-600">Tổng ly bán ra</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black text-coffee-950 tracking-tight">
              {stats?.totalCupsSold || 0} <span className="text-sm font-bold text-coffee-600">ly</span>
            </div>
            <div className="text-[11px] text-amber-700 font-bold mt-1">
              TB {stats?.totalOrders > 0 ? (stats.totalCupsSold / stats.totalOrders).toFixed(1) : 0} ly / đơn
            </div>
          </div>
          <div className="text-[10px] text-coffee-500 pt-2 border-t border-coffee-100/60 flex items-center justify-between">
            <span>Sức mua ổn định</span>
            <span>{stats?.topProducts?.[0]?.name ? "Best: " + stats.topProducts[0].name.slice(0, 8) : "Cà Xòi"}</span>
          </div>
        </div>

        {/* THẺ 4: GIÁ TRỊ TRUNG BÌNH ĐƠN (AOV) */}
        <div className="bg-gradient-to-br from-white to-[#FDFBF7] rounded-3xl p-4 sm:p-5 border border-coffee-100 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-coffee-600">Giá trị TB / đơn</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black text-coffee-950 tracking-tight">
              {formatVND(stats?.averageOrderValue || 0)}
            </div>
            <div className="text-[11px] text-purple-700 font-bold mt-1">
              Chỉ số chi tiêu (AOV)
            </div>
          </div>
          <div className="text-[10px] text-coffee-500 pt-2 border-t border-coffee-100/60 flex items-center justify-between">
            <span>Đã gồm Topping & Size</span>
            <span className="text-purple-600 font-bold">Chất lượng</span>
          </div>
        </div>

        {/* THẺ 5: CÔNG SUẤT QUẦY BAR & TẢI KDS */}
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-white to-[#FDFBF7] rounded-3xl p-4 sm:p-5 border border-coffee-100 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-coffee-600">Công suất quầy bar</span>
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black text-coffee-950 tracking-tight">
              {currentSettings?.maxSlotCapacityCups || 30}{" "}
              <span className="text-xs font-bold text-coffee-600">ly/15p</span>
            </div>
            <div className="text-[11px] text-orange-700 font-bold mt-1">
              Lead time: {currentSettings?.prepLeadTimeMinutes || 5} phút/ly
            </div>
          </div>
          <div className="text-[10px] text-coffee-500 pt-2 border-t border-coffee-100/60 flex items-center justify-between">
            <span>Trạng thái: {currentSettings?.storeStatus === "OPEN" ? "Nhận đơn" : "Tạm dừng"}</span>
            <span className="text-emerald-600 font-bold">Quầy Bar KDS</span>
          </div>
        </div>
      </div>

      {/* 3. KHU VỰC PHÂN TÍCH CHÍNH: BIỂU ĐỒ CỘT KHUNG GIỜ & TOP MÓN BÁN CHẠY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI: BIỂU ĐỒ CỘT THEO KHUNG GIỜ (HISTOGRAM TIMELINE) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-coffee-100 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-coffee-100 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-coffee-950 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-caramel" />
                  <span>Phân Bổ Đơn Theo Khung Giờ (07h - 22h)</span>
                </h2>
                <p className="text-[11px] text-coffee-500 mt-0.5">
                  Rê chuột vào cột để xem chi tiết số đơn và doanh thu từng giờ.
                </p>
              </div>

              {/* Tag Khung giờ cao điểm tự động */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold shrink-0">
                <Flame className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span className="truncate max-w-[220px]">{stats?.peakHourLabel || "Khung giờ cao điểm"}</span>
              </div>
            </div>
          </div>

          {/* Canvas Biểu Đồ Cột Trực Quan (Interactive Histogram) */}
          <div className="pt-2">
            <div className="relative">
              {/* Tooltip hiển thị khi rê chuột vào cột */}
              {hoveredHour && (
                <div className="absolute top-0 right-0 z-20 bg-coffee-950 text-white text-[11px] p-2.5 rounded-2xl shadow-xl border border-white/20 animate-fade-in pointer-events-none">
                  <div className="font-black text-amber-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Khung giờ: {hoveredHour.hour}
                  </div>
                  <div className="text-white mt-1">
                    Số lượng: <span className="font-bold text-amber-200">{hoveredHour.count} đơn</span>
                  </div>
                  <div className="text-emerald-300 font-bold">
                    Doanh thu: {formatVND(hoveredHour.revenue)}
                  </div>
                  {hoveredHour.isPeak && (
                    <div className="text-[10px] text-rose-300 font-black mt-0.5 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-rose-400" /> Giờ vàng cao điểm nhất
                    </div>
                  )}
                </div>
              )}

              {/* Dãy các cột từ 07:00 đến 22:00 */}
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 sm:gap-1 items-end h-56 pt-8 pb-2 px-1 bg-gradient-to-b from-[#FDFBF7] to-white rounded-2xl border border-coffee-100/70">
                {stats?.hourlyDistribution &&
                  stats.hourlyDistribution.map((item: any) => {
                    const maxOrders = Math.max(stats.maxHourlyCount || 1, 1);
                    const heightPercent = item.count > 0 ? Math.max(18, Math.round((item.count / maxOrders) * 100)) : 6;

                    return (
                      <div
                        key={item.hour}
                        onMouseEnter={() => setHoveredHour(item)}
                        onMouseLeave={() => setHoveredHour(null)}
                        className="flex flex-col items-center h-full justify-end group cursor-pointer"
                      >
                        {/* Nhãn số đơn phía trên cột nếu có đơn */}
                        <div
                          className={`text-[10px] font-black transition-transform group-hover:scale-110 mb-1 ${
                            item.isPeak
                              ? "text-rose-600 font-black"
                              : item.count > 0
                              ? "text-coffee-800"
                              : "text-transparent"
                          }`}
                        >
                          {item.count > 0 ? `${item.count}` : ""}
                        </div>

                        {/* Thân Cột */}
                        <div className="w-full max-w-[24px] bg-coffee-100/50 rounded-t-lg h-full flex flex-col justify-end p-0.5 overflow-hidden">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t-md transition-all duration-500 shadow-xs group-hover:opacity-90 ${
                              item.isPeak
                                ? "bg-gradient-to-t from-orange-600 via-amber-500 to-amber-400 ring-2 ring-amber-300/60 animate-pulse"
                                : item.count > 0
                                ? "bg-gradient-to-t from-coffee-800 to-caramel"
                                : "bg-coffee-200/50"
                            }`}
                          />
                        </div>

                        {/* Nhãn giờ bên dưới cột */}
                        <span
                          className={`text-[9px] font-mono mt-1.5 truncate ${
                            item.isPeak
                              ? "font-black text-caramel scale-105"
                              : item.count > 0
                              ? "font-bold text-coffee-800"
                              : "text-coffee-400"
                          }`}
                        >
                          {item.hour.split(":")[0]}h
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Chú thích phía dưới biểu đồ */}
          <div className="pt-2 border-t border-coffee-100 flex flex-wrap items-center justify-between text-xs text-coffee-600 gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-gradient-to-t from-orange-600 to-amber-400 inline-block" />
                <span className="text-[11px] font-bold">Khung giờ cao điểm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-gradient-to-t from-coffee-800 to-caramel inline-block" />
                <span className="text-[11px]">Giờ bán thường</span>
              </div>
            </div>
            <span className="text-[10px] text-coffee-500 italic">
              * Dựa trên hóa đơn thực tế phát sinh trong hệ thống.
            </span>
          </div>
        </div>

        {/* CỘT PHẢI: TOP 5 MÓN BÁN CHẠY NHẤT (BEST SELLERS RANKING) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-coffee-100 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-coffee-100 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-coffee-950 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Top 5 Món Uống Bán Chạy Nhất</span>
              </h2>
              <p className="text-[11px] text-coffee-500 mt-0.5">
                Xếp hạng theo sản lượng ly đã pha và phục vụ khách.
              </p>
            </div>
            {onNavigateToMenu && (
              <button
                type="button"
                onClick={onNavigateToMenu}
                className="text-xs font-bold text-caramel hover:text-caramel-dark flex items-center gap-0.5 hover:underline"
              >
                <span>Xem menu</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Danh sách 5 Món Bán Chạy Kèm Ảnh & Progress Bar */}
          <div className="space-y-3">
            {stats?.topProducts && stats.topProducts.length > 0 ? (
              stats.topProducts.map((p: any, idx: number) => {
                const isFirst = idx === 0;
                const isSecond = idx === 1;
                const isThird = idx === 2;

                return (
                  <div
                    key={p.productId || idx}
                    className={`p-3 rounded-2xl border transition-all ${
                      isFirst
                        ? "bg-amber-50/50 border-amber-200/80 shadow-xs"
                        : "bg-white hover:bg-coffee-50/40 border-coffee-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Huy hiệu xếp hạng */}
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                          isFirst
                            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white ring-2 ring-amber-300"
                            : isSecond
                            ? "bg-gradient-to-br from-stone-300 to-stone-500 text-white"
                            : isThird
                            ? "bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100"
                            : "bg-coffee-100 text-coffee-800"
                        }`}
                      >
                        {isFirst ? "🥇" : isSecond ? "🥈" : isThird ? "🥉" : idx + 1}
                      </div>

                      {/* Ảnh Thumbnail món */}
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-coffee-100 border border-coffee-200/70 shrink-0 relative">
                        {p.imageUrl ? (
                          <Image
                            src={p.imageUrl}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-caramel">
                            <Coffee className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Thông tin món */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-bold text-coffee-950 text-xs sm:text-sm truncate">
                            {p.name}
                          </h3>
                          <span className="font-black text-coffee-950 text-xs sm:text-sm shrink-0">
                            {formatVND(p.revenue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-coffee-500 mt-0.5">
                          <span>{p.count} ly đã bán</span>
                          <span className="font-bold text-emerald-700">{p.percentage}% doanh thu</span>
                        </div>

                        {/* Thanh tỷ trọng đóng góp doanh thu */}
                        <div className="w-full bg-coffee-100/70 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div
                            style={{ width: `${Math.min(100, p.percentage || 10)}%` }}
                            className={`h-full rounded-full ${
                              isFirst ? "bg-amber-500" : "bg-caramel"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-coffee-400 text-xs">
                Chưa có dữ liệu món uống phát sinh trong kỳ này.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-coffee-100 flex items-center justify-between text-xs text-coffee-500">
            <span>Tổng số: {stats?.topProducts?.length || 0} sản phẩm tiêu biểu</span>
            <span className="text-[11px] font-bold text-amber-800">Cà Xòi Đặc Sản</span>
          </div>
        </div>
      </div>

      {/* 4. PHÂN TÍCH PHƯƠNG THỨC THANH TOÁN & QUY TRÌNH ĐƠN HÀNG */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KHỐI 1: TỶ TRỌNG PHƯƠNG THỨC THANH TOÁN */}
        <div className="bg-white rounded-3xl p-5 border border-coffee-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-coffee-100 pb-3">
            <h3 className="text-sm font-bold text-coffee-950 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Phương Thức Thanh Toán</span>
            </h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Đối soát VietQR
            </span>
          </div>

          <div className="space-y-3">
            {/* VietQR Chuyển Khoản */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                    QR
                  </div>
                  <div>
                    <span className="font-bold text-coffee-950 block">Chuyển Khoản VietQR</span>
                    <span className="text-[11px] text-coffee-500">
                      {stats?.vietqrOrdersCount || 0} đơn đã thanh toán
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-800 block">
                    {formatVND(stats?.vietqrRevenue || 0)}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    {stats?.totalRevenue > 0
                      ? Math.round(((stats.vietqrRevenue || 0) / stats.totalRevenue) * 100)
                      : 0}
                    % tổng thu
                  </span>
                </div>
              </div>
            </div>

            {/* Tiền mặt COD */}
            <div className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-100">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-[10px]">
                    COD
                  </div>
                  <div>
                    <span className="font-bold text-coffee-950 block">Tiền Mặt Trực Tiếp (COD)</span>
                    <span className="text-[11px] text-coffee-500">
                      {stats?.codOrdersCount || 0} đơn thanh toán tiền mặt
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-amber-900 block">
                    {formatVND(stats?.codRevenue || 0)}
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold">
                    {stats?.totalRevenue > 0
                      ? Math.round(((stats.codRevenue || 0) / stats.totalRevenue) * 100)
                      : 0}
                    % tổng thu
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KHỐI 2: TÌNH TRẠNG VẬN HÀNH & TIẾN ĐỘ ĐƠN HÀNG */}
        <div className="bg-white rounded-3xl p-5 border border-coffee-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-coffee-100 pb-3">
            <h3 className="text-sm font-bold text-coffee-950 flex items-center gap-2">
              <Layers className="w-4 h-4 text-caramel" />
              <span>Tiến Độ Đơn Hàng & Vận Hành Quầy Bar</span>
            </h3>
            {onNavigateToOrders && (
              <button
                type="button"
                onClick={onNavigateToOrders}
                className="text-xs font-bold text-caramel hover:text-caramel-dark flex items-center gap-0.5 hover:underline"
              >
                <span>Xem chi tiết</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {/* Bước 1: Mới nhận */}
            <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100">
              <span className="text-[10px] font-bold text-blue-700 block uppercase">Đơn mới</span>
              <span className="text-xl font-black text-blue-900 block mt-1">
                {stats?.newOrdersCount || 0}
              </span>
              <span className="text-[10px] text-blue-600">Chờ xác nhận</span>
            </div>

            {/* Bước 2: Đang pha */}
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
              <span className="text-[10px] font-bold text-amber-700 block uppercase">Đang pha</span>
              <span className="text-xl font-black text-amber-900 block mt-1">
                {stats?.brewingCount || 0}
              </span>
              <span className="text-[10px] text-amber-600">Quầy Barista</span>
            </div>

            {/* Bước 3: Đang giao */}
            <div className="p-3 rounded-2xl bg-orange-50/60 border border-orange-100">
              <span className="text-[10px] font-bold text-orange-700 block uppercase">Đang giao</span>
              <span className="text-xl font-black text-orange-900 block mt-1">
                {stats?.readyCount || 0}
              </span>
              <span className="text-[10px] text-orange-600">Shipper / Bàn</span>
            </div>

            {/* Bước 4: Hoàn thành */}
            <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-700 block uppercase">Hoàn tất</span>
              <span className="text-xl font-black text-emerald-900 block mt-1">
                {stats?.completedCount || 0}
              </span>
              <span className="text-[10px] text-emerald-600">Đã phục vụ</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-coffee-50/60 border border-coffee-100 flex items-center justify-between text-xs text-coffee-600">
            <span>Đơn đã hủy trong kỳ: <strong className="text-rose-600">{stats?.cancelledCount || 0} đơn</strong></span>
            <span className="text-[11px] font-bold text-emerald-700">Tỷ lệ hủy: {stats?.totalOrders > 0 ? ((stats.cancelledCount || 0) / (stats.totalOrders + (stats.cancelledCount || 0)) * 100).toFixed(1) : 0}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
