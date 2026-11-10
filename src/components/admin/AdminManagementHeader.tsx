"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Coffee,
  Shield,
  Settings,
  MonitorPlay,
  LogOut,
  ExternalLink,
  UserCheck,
  Building,
  Key,
  Database,
  TrendingUp,
  Tag,
  Truck,
} from "lucide-react";

interface AdminManagementHeaderProps {
  currentUser?: any;
  activeTab?: "DASHBOARD" | "MENU" | "RBAC" | "SETTINGS" | "DATABASE" | "PROMOTIONS" | "ORDERS";
  onTabChange?: (tab: "DASHBOARD" | "MENU" | "RBAC" | "SETTINGS" | "DATABASE" | "PROMOTIONS" | "ORDERS") => void;
  productCount?: number;
}

export default function AdminManagementHeader({
  currentUser: propUser,
  activeTab,
  onTabChange,
  productCount = 5,
}: AdminManagementHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(propUser || null);

  useEffect(() => {
    if (!propUser) {
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUser(data.user);
          }
        })
        .catch(() => {});
    } else {
      setUser(propUser);
    }
  }, [propUser]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return { title: "Chủ Quán (Toàn quyền)", color: "bg-rose-900/80 text-rose-200 border-rose-700/60" };
      case "STORE_MANAGER":
        return { title: "Quản Lý Cửa Hàng", color: "bg-blue-900/80 text-blue-200 border-blue-700/60" };
      case "BARISTA":
        return { title: "Nhân Viên Pha Chế", color: "bg-emerald-900/80 text-emerald-200 border-emerald-700/60" };
      case "CASHIER":
        return { title: "Thu Ngân", color: "bg-amber-900/80 text-amber-200 border-amber-700/60" };
      default:
        return { title: role || "Nhân viên", color: "bg-stone-800 text-stone-200 border-stone-700" };
    }
  };

  const roleInfo = getRoleLabel(user?.role);

  return (
    <header className="sticky top-0 z-40 bg-[#160B07] text-white border-b border-pink-900/30 shadow-md">
      {/* TIER 1: GLOBAL BRANDING & USER PROFILE ACTIONS (ALWAYS SINGLE ROW, NEVER WRAPPING) */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-pink-400/40 bg-[#FFD1E3] shrink-0 group-hover:scale-105 transition-transform shadow-sm">
              <Image
                src="/images/ca-xoi-logo.jpg"
                alt="Logo Cà Xòi"
                width={40}
                height={40}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-white flex items-center gap-1">
                  Cà Xòi
                  <span className="text-rose-400 text-xs">🐾</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-400/30">
                  Cổng Quản Trị
                </span>
              </div>
              <p className="text-[10px] text-pink-200/70 font-medium hidden sm:block">
                Tỉnh như sáo, báo như Xòi • Đà Nẵng
              </p>
            </div>
          </Link>
        </div>

        {/* Right: User Tools & Navigation Shortcuts */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Link to Customer Store */}
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl border border-white/10 transition-colors shadow-sm"
            title="Mở trang bán hàng dành cho khách (tab mới)"
          >
            <span>Trang Khách</span>
            <ExternalLink className="w-3.5 h-3.5 text-pink-300" />
          </Link>

          {/* KDS Barista Link */}
          <Link
            href="/kds"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
              pathname === "/kds"
                ? "bg-emerald-600 border-emerald-500 text-white"
                : "bg-emerald-950/50 hover:bg-emerald-900 border-emerald-700/50 text-emerald-200 hover:text-white"
            }`}
            title="Màn hình điều phối quầy bar pha chế KDS"
          >
            <MonitorPlay className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Barista KDS</span>
          </Link>

          {/* Logged in User Badge */}
          {user && (
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-xl border border-white/10">
              <UserCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <div className="text-left text-xs leading-tight">
                <span className="font-bold text-white block truncate max-w-[130px]">
                  {user.fullName || user.username}
                </span>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border inline-block ${roleInfo.color}`}>
                  {roleInfo.title}
                </span>
              </div>
            </div>
          )}

          {/* Log Out Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 px-3 py-1.5 rounded-xl transition-all shadow-sm hover:scale-[1.02] active:scale-95"
            title="Đăng xuất khỏi hệ thống quản trị"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline">Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* TIER 2: PRIMARY NAVIGATION TABS (DEDICATED FULL-WIDTH BAR WITH NO CROWDING) */}
      {pathname === "/admin" && onTabChange && (
        <div className="border-t border-white/10 bg-[#200F0A]/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-2">
            {/* 1. TỔNG QUAN & DOANH THU */}
            <button
              type="button"
              onClick={() => onTabChange("DASHBOARD")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "DASHBOARD"
                  ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40"
                  : "text-stone-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Doanh thu & Tổng quan</span>
            </button>

            {/* 2. ĐƠN HÀNG & VẬN CHUYỂN */}
            <button
              type="button"
              onClick={() => onTabChange("ORDERS")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "ORDERS"
                  ? "bg-orange-600 text-white shadow-md ring-2 ring-orange-400/40"
                  : "text-stone-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Truck className="w-4 h-4 text-orange-400" />
              <span>Đơn hàng & Vận chuyển</span>
            </button>

            {/* 3. THỰC ĐƠN */}
            <button
              type="button"
              onClick={() => onTabChange("MENU")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "MENU"
                  ? "bg-caramel text-white shadow-md ring-2 ring-caramel/40"
                  : "text-stone-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Coffee className="w-4 h-4 text-amber-300" />
              <span>Thực đơn ({productCount} món)</span>
            </button>

            {/* 4. KHUYẾN MÃI */}
            <button
              type="button"
              onClick={() => onTabChange("PROMOTIONS")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "PROMOTIONS"
                  ? "bg-pink-600 text-white shadow-md ring-2 ring-pink-400/40"
                  : "text-stone-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Tag className="w-4 h-4 text-pink-400" />
              <span>Khuyến mãi</span>
            </button>

            {/* PHÂN CÁCH NHÓM BÁN HÀNG VÀ NHÓM HỆ THỐNG */}
            <div className="h-4 w-px bg-white/20 mx-1 shrink-0 hidden sm:block" />

            {/* 5. PHÂN QUYỀN */}
            <button
              type="button"
              onClick={() => onTabChange("RBAC")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "RBAC"
                  ? "bg-caramel text-white shadow-md ring-2 ring-caramel/40"
                  : "text-stone-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Phân quyền (RBAC)</span>
            </button>

            {/* 6. VẬN HÀNH & NGÂN HÀNG */}
            <button
              type="button"
              onClick={() => onTabChange("SETTINGS")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "SETTINGS"
                  ? "bg-caramel text-white shadow-md ring-2 ring-caramel/40"
                  : "text-stone-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Settings className="w-4 h-4 text-stone-300" />
              <span>Vận hành & Ngân hàng</span>
            </button>

            {/* 7. SAO LƯU & CSDL */}
            <button
              type="button"
              onClick={() => onTabChange("DATABASE")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "DATABASE"
                  ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/40"
                  : "text-stone-300 hover:text-white hover:bg-white/10"
              }`}
              title="Sao lưu, Nhập dữ liệu & Quản trị CSDL SQLite"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Sao Lưu & CSDL</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
