"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Users, Plus, ArrowRight, Building, Coffee, Sparkles, ShieldCheck, ArrowLeft } from "lucide-react";
import { POPULAR_BUILDINGS } from "@/lib/utils";

export default function GroupOrderIndexPage() {
  const router = useRouter();

  // Join Room State
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  // Create Room State
  const [hostName, setHostName] = useState("");
  const [hostPhone, setHostPhone] = useState("");
  const [buildingName, setBuildingName] = useState(POPULAR_BUILDINGS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    const cleanCode = joinCode.trim().toUpperCase().replace(/^#/, "");
    if (!cleanCode) {
      setJoinError("Vui lòng nhập mã phòng (VD: GRP-8823)");
      return;
    }
    router.push(`/group-order/${cleanCode}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!hostName.trim()) {
      setCreateError("Vui lòng nhập tên người đại diện gom đơn");
      return;
    }
    if (!hostPhone.trim() || !/^[0-9]{9,11}$/.test(hostPhone.trim())) {
      setCreateError("Vui lòng nhập số điện thoại hợp lệ (9-11 số)");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/group-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE",
          hostName: hostName.trim(),
          hostPhone: hostPhone.trim(),
          buildingName: buildingName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Không thể tạo phòng gom đơn");
      }

      router.push(`/group-order/${data.data.sessionCode}`);
    } catch (err: any) {
      setCreateError(err.message || "Có lỗi xảy ra");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-coffee-700 hover:text-caramel transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Về trang chủ Menu
        </Link>
      </div>

      {/* Hero Header Cà Xòi */}
      <div className="bg-gradient-to-br from-[#FFFDF9] via-[#FFF4F8] to-[#FFE7F0] rounded-3xl p-6 sm:p-8 text-coffee-950 shadow-sm relative overflow-hidden border border-pink-200/80">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-pink-300/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 items-center gap-6">
          <div className="sm:col-span-9 space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-pink-100 border border-pink-200 px-3 py-1 rounded-full text-xs font-semibold text-rose-800">
              <Users className="w-3.5 h-3.5 text-rose-600" /> 🐾 Gom đơn nhóm văn phòng Cà Xòi
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-coffee-950">
              Đặt Cà Phê Nhóm Cà Xòi
            </h1>
            <p className="text-sm text-coffee-800 leading-relaxed">
              Tạo phòng gom đơn chỉ trong 10 giây, gửi link cho đồng nghiệp tự chọn ly hoặc chai rót theo khẩu vị riêng (size, đường, đá, topping trứng muối), dán tem in tên từng người và tính sẵn tiền chia cho cả nhóm!
            </p>
          </div>

          {/* Right Logo Card */}
          <div className="sm:col-span-3 relative flex flex-col items-center justify-center p-3 bg-white/85 rounded-3xl border border-pink-200/80 shadow-sm mx-auto w-full max-w-[160px] sm:max-w-none">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-pink-300 shadow-md bg-[#FFD1E3] relative">
              <Image
                src="/images/ca-xoi-logo.jpg"
                alt="Logo Cà Xòi"
                fill
                className="object-cover"
              />
            </div>
            <span className="text-[11px] font-bold text-rose-800 mt-2">Cà Xòi • Đà Nẵng</span>
          </div>
        </div>
      </div>

      {/* Grid: Create New Room & Join Room */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Create Room */}
        <div className="bg-white rounded-3xl p-6 border border-coffee-100 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-coffee-900 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5 text-caramel" />
            </div>
            <div>
              <h2 className="text-base font-bold text-coffee-900">Tạo phòng gom đơn mới</h2>
              <p className="text-xs text-coffee-500">Dành cho người đại diện (Host) mở phòng</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            {createError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                {createError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-coffee-700 mb-1">
                Tên của bạn (Chủ phòng gom đơn) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Nguyễn Minh Tuấn, Chị Lan..."
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-coffee-700 mb-1">
                Số điện thoại người nhận <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="VD: 0908776655"
                value={hostPhone}
                onChange={(e) => setHostPhone(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-coffee-700 mb-1">
                Tòa nhà giao hàng
              </label>
              <select
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 bg-white"
              >
                {POPULAR_BUILDINGS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full bg-coffee-800 hover:bg-coffee-900 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isCreating ? (
                <span>Đang tạo phòng...</span>
              ) : (
                <>
                  <Users className="w-4 h-4 text-amber-300" />
                  <span>Tạo phòng & Lấy link gửi đồng nghiệp</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* 2. Join Room */}
        <div className="bg-white rounded-3xl p-6 border border-coffee-100 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-coffee-900 flex items-center justify-center font-bold">
                <Coffee className="w-5 h-5 text-caramel" />
              </div>
              <div>
                <h2 className="text-base font-bold text-coffee-900">Vào phòng bằng mã</h2>
                <p className="text-xs text-coffee-500">Nhập mã phòng do đồng nghiệp chia sẻ</p>
              </div>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              {joinError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                  {joinError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-coffee-700 mb-1">
                  Mã phòng gom đơn
                </label>
                <input
                  type="text"
                  placeholder="VD: GRP-8823"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full text-xs font-mono font-bold tracking-wider px-3.5 py-2.5 rounded-xl border border-coffee-200 uppercase focus:outline-none focus:ring-2 focus:ring-caramel/40"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-coffee-950 font-bold text-xs py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Vào phòng chọn món</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Value props */}
          <div className="pt-4 border-t border-coffee-100 space-y-2 text-xs text-coffee-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Mỗi ly được in tem tên riêng chính xác 100%</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Giao tận tầng & bàn làm việc trong 15-25 phút</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}