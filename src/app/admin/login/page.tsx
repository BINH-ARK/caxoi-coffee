"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Coffee,
  Shield,
  KeyRound,
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  Touchpad,
  RefreshCw,
} from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "";

  const [activeTab, setActiveTab] = useState<"CREDENTIALS" | "PIN">("CREDENTIALS");

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const payload =
        activeTab === "PIN"
          ? { loginType: "PIN", pin: pin.trim() }
          : { loginType: "CREDENTIALS", username: username.trim(), password };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Đăng nhập thất bại");
      }

      const role = data.user.role;

      // Smart redirection
      if (redirectPath) {
        router.push(redirectPath);
      } else if (role === "BARISTA") {
        router.push("/kds");
      } else {
        router.push("/admin");
      }
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Có lỗi xảy ra khi đăng nhập.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Back to Customer Store */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-coffee-700 hover:text-caramel transition-colors bg-white px-3 py-1.5 rounded-xl border border-coffee-200 shadow-sm"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          <span>Về trang bán hàng (Khách)</span>
        </Link>
        <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
          🔐 Khu Vực Nội Bộ
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-coffee-100 shadow-xl overflow-hidden animate-fade-in">
        {/* Header Banner */}
        <div className="bg-coffee-950 bg-gradient-to-br from-coffee-950 via-coffee-900 to-coffee-800 text-white p-6 sm:p-7 text-center relative border-b border-coffee-800/60">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-pink-300 shadow-md bg-[#FFD1E3] mx-auto mb-3 relative">
            <Image
              src="/images/ca-xoi-logo.jpg"
              alt="Logo Cà Xòi"
              fill
              className="object-cover"
            />
          </div>
          <h1 className="text-xl font-black tracking-tight">Cổng Quản Trị & Pha Chế Cà Xòi</h1>
          <p className="text-xs text-pink-200 mt-1">Tỉnh như sáo, báo như Xòi • Đà Nẵng</p>
        </div>

      {/* Tab Switcher */}
      <div className="grid grid-cols-2 p-2 bg-coffee-50 border-b border-coffee-100">
        <button
          type="button"
          onClick={() => {
            setActiveTab("CREDENTIALS");
            setErrorMsg("");
          }}
          className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "CREDENTIALS"
              ? "bg-white text-coffee-900 shadow-sm"
              : "text-coffee-600 hover:text-coffee-900"
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Chủ quán & Quản lý</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("PIN");
            setErrorMsg("");
          }}
          className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "PIN"
              ? "bg-white text-coffee-900 shadow-sm"
              : "text-coffee-600 hover:text-coffee-900"
          }`}
        >
          <Touchpad className="w-3.5 h-3.5 text-caramel" />
          <span>Mã PIN</span>
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleLogin} className="p-6 space-y-4">
        {errorMsg && (
          <div className="bg-red-50 text-red-700 text-xs font-semibold p-3 rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {activeTab === "CREDENTIALS" ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-coffee-700 mb-1">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-coffee-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="VD: admin hoặc manager"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-coffee-700 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-coffee-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <label className="block text-xs font-bold text-coffee-700">
              Nhập mã PIN 4 số:
            </label>
            <input
              type="password"
              maxLength={4}
              required
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-44 mx-auto text-center font-mono text-2xl tracking-[0.5em] py-2 px-3 rounded-xl border-2 border-caramel/50 focus:outline-none focus:border-caramel bg-amber-50/50"
            />
            <p className="text-[11px] text-coffee-500">
              Dùng để mở khóa nhanh Tablet quầy bar trong 1 giây mà không cần gõ mật khẩu.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-coffee-800 hover:bg-coffee-900 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50"
        >
          <span>{isLoading ? "Đang xác thực..." : "Đăng Nhập"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="p-8 text-center text-xs text-coffee-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-caramel" />
            <span>Đang tải form đăng nhập...</span>
          </div>
        }
      >
        <LoginFormContent />
      </Suspense>
    </div>
  );
}

