"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Database,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  FileCode2,
  Server,
  Layers,
  HelpCircle,
  Play,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Copy,
  Download,
  FolderOpen,
  Check,
  Cpu,
  Table,
  Zap,
  Upload,
  FileText,
  Trash2,
  History,
  HardDrive,
  Sliders,
  FileSpreadsheet,
} from "lucide-react";

interface BackupFile {
  filename: string;
  format: "db" | "json" | "sql";
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  isAutoPreRestore: boolean;
}

export default function DatabaseManager() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Backup & Import states
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<{
    name: string;
    sizeFormatted: string;
    format: string;
    summary?: any;
  } | null>(null);
  const [importMode, setImportMode] = useState<"FULL" | "MENU_ONLY">("FULL");
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal confirm state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "RESTORE_UPLOAD" | "RESTORE_SNAPSHOT" | "DELETE_SNAPSHOT";
    targetFilename?: string;
  }>({ isOpen: false, type: "RESTORE_UPLOAD" });

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/database");
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      setLoadingBackups(true);
      const res = await fetch("/api/admin/database/backups");
      const result = await res.json();
      if (result.success && Array.isArray(result.backups)) {
        setBackups(result.backups);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchBackups();
  }, []);

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const notifyChange = () => {
    try {
      localStorage.setItem("caxoi_menu_updated", Date.now().toString());
      window.dispatchEvent(new Event("caxoi_menu_updated"));
    } catch {}
  };

  const handlePostAction = async (action: string, successMsg?: string) => {
    try {
      setActionLoading(action);
      setMessage(null);
      const res = await fetch("/api/admin/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (result.success) {
        setMessage({ text: "✅ " + (successMsg || result.message), type: "success" });
        await fetchStatus();
        await fetchBackups();
        notifyChange();
      } else {
        setMessage({ text: "❌ " + result.message, type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: "Lỗi thực thi: " + e.message, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  // 1. Tạo snapshot sao lưu trên server
  const handleCreateSnapshot = async () => {
    try {
      setActionLoading("CREATE_SNAPSHOT");
      setMessage(null);
      const res = await fetch("/api/admin/database/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "manual" }),
      });
      const result = await res.json();
      if (result.success) {
        setMessage({ text: "✅ " + result.message, type: "success" });
        await fetchBackups();
        await fetchStatus();
      } else {
        setMessage({ text: "❌ " + result.message, type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: "Lỗi tạo sao lưu: " + e.message, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  // 2. Xóa snapshot trên server
  const handleDeleteSnapshot = async (filename: string) => {
    try {
      setActionLoading(`DELETE_${filename}`);
      const res = await fetch(`/api/admin/database/backups?filename=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (result.success) {
        setMessage({ text: "✅ " + result.message, type: "success" });
        await fetchBackups();
      } else {
        setMessage({ text: "❌ " + result.message, type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: "Lỗi xóa file: " + e.message, type: "error" });
    } finally {
      setActionLoading(null);
      setConfirmModal({ isOpen: false, type: "DELETE_SNAPSHOT" });
    }
  };

  // 3. Khôi phục từ snapshot trên server
  const handleRestoreSnapshot = async (filename: string) => {
    try {
      setIsImporting(true);
      setMessage({ text: `Đang khôi phục từ bản sao lưu "${filename}"...`, type: "info" });
      const res = await fetch("/api/admin/database/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESTORE", filename, mode: importMode }),
      });
      const result = await res.json();
      if (result.success) {
        setMessage({ text: "✅ " + result.message, type: "success" });
        await fetchStatus();
        await fetchBackups();
        notifyChange();
      } else {
        setMessage({ text: "❌ " + result.message, type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: "Lỗi khôi phục: " + e.message, type: "error" });
    } finally {
      setIsImporting(false);
      setConfirmModal({ isOpen: false, type: "RESTORE_SNAPSHOT" });
    }
  };

  // 4. File selection & preview
  const processSelectedFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const validExts = ["db", "sqlite", "json", "sql"];
    if (!validExts.includes(ext)) {
      setMessage({
        text: `Tệp "${file.name}" không hợp lệ. Vui lòng chọn tệp .db, .sqlite, .json hoặc .sql`,
        type: "error",
      });
      return;
    }

    setSelectedFile(file);
    const sizeKb = Math.round(file.size / 1024);
    const sizeFormatted = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

    let formatName = ext.toUpperCase();
    if (ext === "db" || ext === "sqlite") formatName = "SQLite Database";
    if (ext === "json") formatName = "JSON Data";
    if (ext === "sql") formatName = "SQL Script";

    // Phân tích sơ bộ nếu là JSON
    if (ext === "json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          const tables = parsed.tables || parsed;
          setFilePreview({
            name: file.name,
            sizeFormatted,
            format: formatName,
            summary: {
              products: tables.products?.length ?? "Chưa rõ",
              categories: tables.categories?.length ?? "Chưa rõ",
              orders: tables.orders?.length ?? "Chưa rõ",
              options: tables.product_options?.length ?? "Chưa rõ",
            },
          });
        } catch {
          setFilePreview({ name: file.name, sizeFormatted, format: formatName });
        }
      };
      reader.readAsText(file);
    } else {
      setFilePreview({ name: file.name, sizeFormatted, format: formatName });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // 5. Thực hiện Import từ file tải lên
  const handleExecuteImportUploaded = async () => {
    if (!selectedFile) return;

    try {
      setIsImporting(true);
      setMessage({ text: `Đang tải lên và khôi phục dữ liệu từ "${selectedFile.name}"...`, type: "info" });

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("mode", importMode);

      const res = await fetch("/api/admin/database/import", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (result.success) {
        setMessage({ text: "✅ " + result.message, type: "success" });
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await fetchStatus();
        await fetchBackups();
        notifyChange();
      } else {
        setMessage({ text: "❌ " + result.message, type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: "Lỗi trong quá trình nhập dữ liệu: " + e.message, type: "error" });
    } finally {
      setIsImporting(false);
      setConfirmModal({ isOpen: false, type: "RESTORE_UPLOAD" });
    }
  };

  const sqlite = data?.sqlite;
  const mysql = data?.mysql;

  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER */}
      <div className="bg-gradient-to-r from-coffee-950 via-[#221008] to-coffee-900 rounded-3xl p-6 text-white border border-caramel/30 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-caramel/20 via-pink-500/10 to-transparent rounded-full -mr-24 -mt-24 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-caramel text-white flex items-center justify-center shrink-0 shadow-lg shadow-caramel/30 border border-amber-300/40">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Sao Lưu (Backup) & Nhập Dữ Liệu (Import)
                </h2>
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  SQLite WAL Engine
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                  Tự động sao lưu dự phòng
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl leading-relaxed">
                Quản lý toàn diện dữ liệu quán Cà Xòi: Tải về các bản sao lưu định dạng <strong>JSON, SQLite (.db)</strong> hoặc <strong>SQL</strong>, nhập dữ liệu từ máy tính và khôi phục an toàn không lo mất dữ liệu.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCreateSnapshot}
              disabled={actionLoading !== null || isImporting}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-caramel hover:from-amber-600 hover:to-caramel-hover text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-caramel/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              title="Lưu một bản chụp dữ liệu hiện tại vào thư mục sao lưu của hệ thống"
            >
              <Zap className={`w-4 h-4 text-white ${actionLoading === "CREATE_SNAPSHOT" ? "animate-spin" : ""}`} />
              <span>⚡ Tạo Bản Sao Lưu Ngay</span>
            </button>

            <button
              type="button"
              onClick={() => handlePostAction("CHECKPOINT_SQLITE", "Đã checkpoint và đồng bộ dữ liệu vào file!")}
              disabled={actionLoading !== null || isImporting}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border border-white/10 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-amber-400 ${actionLoading === "CHECKPOINT_SQLITE" ? "animate-spin" : ""}`} />
              <span>Ghi nhật ký WAL (Checkpoint)</span>
            </button>
          </div>
        </div>

        {/* Message notification */}
        {message && (
          <div
            className={`mt-5 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
              message.type === "success"
                ? "bg-emerald-900/60 text-emerald-200 border border-emerald-500/40"
                : message.type === "info"
                ? "bg-blue-900/60 text-blue-200 border border-blue-500/40"
                : "bg-rose-900/60 text-rose-200 border border-rose-500/40"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : message.type === "info" ? (
              <RefreshCw className="w-4 h-4 shrink-0 text-blue-400 animate-spin" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Fast Path Copy Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-stone-300 overflow-hidden">
            <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold shrink-0">Đường dẫn tệp SQLite trên máy:</span>
            <code className="bg-black/40 px-2 py-1 rounded-lg text-amber-300 font-mono text-[11px] truncate select-all border border-white/10">
              {sqlite?.absolutePath || "database/caxoi_cafe.db"}
            </code>
          </div>

          <button
            type="button"
            onClick={() => handleCopyPath(sqlite?.absolutePath || "database/caxoi_cafe.db")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/15 shrink-0 self-start sm:self-auto"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Đã sao chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-300" />
                <span>Sao chép đường dẫn</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN SECTION: BACKUP & IMPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ============================================================== */}
        {/* CỘT 1: XUẤT & SAO LƯU DỮ LIỆU (BACKUP) */}
        {/* ============================================================== */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-caramel border border-amber-200 flex items-center justify-center font-bold">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-coffee-900">📦 Sao Lưu Dữ Liệu (Backup)</h3>
                  <p className="text-xs text-coffee-500">Tải tệp sao lưu về máy tính hoặc lưu bản chụp trên hệ thống</p>
                </div>
              </div>
            </div>

            {/* 3 Quick Download Cards */}
            <div className="space-y-2.5">
              {/* Option A: JSON Backup */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 hover:border-amber-300 transition-all flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-coffee-900 flex items-center gap-1.5">
                      <span>Tệp Cấu Trúc JSON (.json)</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">Khuyên dùng</span>
                    </h4>
                    <p className="text-[11px] text-coffee-500">
                      Đầy đủ 16 bảng (Món, size, topping, độ ngọt, đá, đơn hàng, phân quyền). Đọc & sửa được.
                    </p>
                  </div>
                </div>
                <a
                  href="/api/admin/database/backup?format=json"
                  className="px-3 py-1.5 bg-coffee-800 hover:bg-coffee-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 shadow-xs active:scale-95"
                  download
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải JSON</span>
                </a>
              </div>

              {/* Option B: SQLite Database */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 hover:border-amber-300 transition-all flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-coffee-900 flex items-center gap-1.5">
                      <span>Tệp CSDL SQLite Nguyên Bản (.db)</span>
                    </h4>
                    <p className="text-[11px] text-coffee-500">
                      Tệp nhị phân hoàn chỉnh, mở trực tiếp bằng DB Browser for SQLite hoặc di chuyển server.
                    </p>
                  </div>
                </div>
                <a
                  href="/api/admin/database/backup?format=db"
                  className="px-3 py-1.5 bg-coffee-800 hover:bg-coffee-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 shadow-xs active:scale-95"
                  download
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải .db</span>
                </a>
              </div>

              {/* Option C: SQL Script */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 hover:border-amber-300 transition-all flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                    <FileCode2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-coffee-900 flex items-center gap-1.5">
                      <span>Tệp Mã Nguồn SQL (.sql)</span>
                    </h4>
                    <p className="text-[11px] text-coffee-500">
                      Tệp lệnh CREATE TABLE và INSERT dữ liệu chuẩn cho SQLite.
                    </p>
                  </div>
                </div>
                <a
                  href="/api/admin/database/backup?format=sql"
                  className="px-3 py-1.5 bg-coffee-800 hover:bg-coffee-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 shadow-xs active:scale-95"
                  download
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải .sql</span>
                </a>
              </div>
            </div>

            {/* Server Snapshots History */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-coffee-900">
                  <History className="w-4 h-4 text-caramel" />
                  <span>Các Bản Sao Lưu Đã Lưu Trên Máy Chủ ({backups.length})</span>
                </div>
                <button
                  type="button"
                  onClick={fetchBackups}
                  disabled={loadingBackups}
                  className="text-[11px] text-caramel hover:underline font-semibold flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingBackups ? "animate-spin" : ""}`} />
                  <span>Làm mới</span>
                </button>
              </div>

              {backups.length === 0 ? (
                <div className="p-6 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-xs text-coffee-500">
                  Chưa có bản sao lưu nào được lưu trên máy chủ. Hãy bấm <strong>"⚡ Tạo Bản Sao Lưu Ngay"</strong> ở góc trên để tạo bản lưu trữ đầu tiên!
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {backups.map((b) => (
                    <div
                      key={b.filename}
                      className="p-2.5 rounded-xl bg-stone-50/80 border border-stone-200 hover:border-coffee-200 flex items-center justify-between gap-2 text-xs transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                              b.format === "db"
                                ? "bg-emerald-100 text-emerald-800"
                                : b.format === "json"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {b.format}
                          </span>
                          <span className="font-bold text-coffee-900 truncate block text-[11px]" title={b.filename}>
                            {b.filename}
                          </span>
                          {b.isAutoPreRestore && (
                            <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded font-semibold shrink-0">
                              Dự phòng
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-coffee-500 flex items-center gap-2 mt-0.5">
                          <span>{new Date(b.createdAt).toLocaleString("vi-VN")}</span>
                          <span>•</span>
                          <span className="font-semibold text-coffee-700">{b.sizeFormatted}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              type: "RESTORE_SNAPSHOT",
                              targetFilename: b.filename,
                            });
                          }}
                          disabled={isImporting}
                          className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold transition-colors"
                          title="Khôi phục CSDL về trạng thái của bản sao lưu này"
                        >
                          Khôi phục
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSnapshot(b.filename)}
                          disabled={actionLoading !== null}
                          className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa bản sao lưu này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CỘT 2: NHẬP & KHÔI PHỤC DỮ LIỆU (IMPORT / RESTORE) */}
        {/* ============================================================== */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-coffee-900">📥 Nhập Dữ Liệu (Import / Restore)</h3>
                  <p className="text-xs text-coffee-500">Tải tệp sao lưu từ máy tính để cập nhật hoặc khôi phục CSDL</p>
                </div>
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-caramel bg-amber-50/60 scale-[1.01]"
                  : selectedFile
                  ? "border-emerald-300 bg-emerald-50/30"
                  : "border-stone-200 hover:border-caramel/50 bg-stone-50/50 hover:bg-stone-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".db,.sqlite,.json,.sql"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processSelectedFile(e.target.files[0]);
                  }
                }}
              />

              <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 mx-auto flex items-center justify-center text-caramel shadow-xs mb-3">
                <Upload className="w-6 h-6" />
              </div>

              <h4 className="text-xs font-bold text-coffee-900">
                {selectedFile ? selectedFile.name : "Kéo thả tệp tin vào đây hoặc bấm để chọn"}
              </h4>
              <p className="text-[11px] text-coffee-500 mt-1">
                Hỗ trợ các định dạng: <strong className="text-coffee-700">.json, .db, .sqlite, .sql</strong> (Tối đa 50MB)
              </p>
            </div>

            {/* File Preview Card */}
            {filePreview && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2 text-xs animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-emerald-950">Đã chọn tệp: {filePreview.name}</span>
                  </div>
                  <span className="font-semibold text-emerald-800 text-[11px] bg-emerald-100 px-2 py-0.5 rounded-full">
                    {filePreview.sizeFormatted} ({filePreview.format})
                  </span>
                </div>

                {filePreview.summary && (
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 text-center">
                    <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-coffee-500 block">Món</span>
                      <span className="font-bold text-coffee-900">{filePreview.summary.products}</span>
                    </div>
                    <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-coffee-500 block">Danh mục</span>
                      <span className="font-bold text-coffee-900">{filePreview.summary.categories}</span>
                    </div>
                    <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-coffee-500 block">Tùy chọn</span>
                      <span className="font-bold text-coffee-900">{filePreview.summary.options}</span>
                    </div>
                    <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-coffee-500 block">Đơn hàng</span>
                      <span className="font-bold text-coffee-900">{filePreview.summary.orders}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Restore Mode Radio Selector */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-coffee-900 block">Chế Độ Khôi Phục Dữ Liệu:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    importMode === "FULL"
                      ? "border-caramel bg-amber-50/70 font-semibold text-coffee-900 ring-1 ring-caramel/30"
                      : "border-stone-200 bg-stone-50/50 hover:bg-stone-50 text-coffee-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="FULL"
                    checked={importMode === "FULL"}
                    onChange={() => setImportMode("FULL")}
                    className="mt-0.5 text-caramel focus:ring-caramel"
                  />
                  <div>
                    <span className="font-bold block text-xs">Toàn bộ CSDL (Full Restore)</span>
                    <span className="text-[10px] text-coffee-500 block leading-tight mt-0.5">
                      Khôi phục toàn diện thực đơn, đơn hàng, cài đặt và tài khoản.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    importMode === "MENU_ONLY"
                      ? "border-caramel bg-amber-50/70 font-semibold text-coffee-900 ring-1 ring-caramel/30"
                      : "border-stone-200 bg-stone-50/50 hover:bg-stone-50 text-coffee-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="MENU_ONLY"
                    checked={importMode === "MENU_ONLY"}
                    onChange={() => setImportMode("MENU_ONLY")}
                    className="mt-0.5 text-caramel focus:ring-caramel"
                  />
                  <div>
                    <span className="font-bold block text-xs">Chỉ Thực Đơn & Giá Bán</span>
                    <span className="text-[10px] text-coffee-500 block leading-tight mt-0.5">
                      Chỉ cập nhật món, size, topping, độ ngọt & đá. Giữ nguyên đơn hàng.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Safety assurance note */}
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2 text-xs text-coffee-800">
              <ShieldCheck className="w-4 h-4 text-caramel shrink-0 mt-0.5" />
              <div>
                <strong className="text-coffee-950">Bảo vệ an toàn tự động:</strong> Trước khi ghi đè, hệ thống sẽ tự động sao lưu bản hiện tại vào thư mục <code>database/backups/</code>, bạn có thể bấm khôi phục lại bất kỳ lúc nào nếu muốn hoàn tác!
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!selectedFile) return;
                  setConfirmModal({ isOpen: true, type: "RESTORE_UPLOAD" });
                }}
                disabled={!selectedFile || isImporting}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang Khôi Phục Dữ Liệu...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>🚀 Tiến Hành Khôi Phục Dữ Liệu</span>
                  </>
                )}
              </button>

              {selectedFile && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setFilePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-coffee-700 rounded-2xl text-xs font-bold transition-all"
                >
                  Hủy
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. STATS & SPECS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Specs Box */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-caramel" />
              <h3 className="font-black text-sm text-coffee-900">Thông Số Kỹ Thuật SQLite</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-coffee-500 font-medium">Chế độ ghi nhật ký:</span>
                <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {sqlite?.journalMode || "WAL (Đọc/Ghi đồng thời)"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-coffee-500 font-medium">Khóa ngoại (Foreign Keys):</span>
                <span className="font-bold text-coffee-900">BẬT (ON)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-coffee-500 font-medium">Đồng bộ (Synchronous):</span>
                <span className="font-bold text-coffee-900">NORMAL (Tốc độ cao)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-coffee-500 font-medium">Bộ nhớ đệm RAM:</span>
                <span className="font-bold text-coffee-900">64 MB RAM Cache</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-coffee-500 font-medium">Kích thước file CSDL:</span>
                <span className="font-black text-caramel">{sqlite?.fileSizeFormatted || "168 KB"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-coffee-500 font-medium">Tệp SQL sửa lần cuối:</span>
                <span className="font-bold text-coffee-800 text-[11px]">{sqlite?.sqlFileLastModified || "Mới nhất"}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100">
            <span className="text-[11px] text-coffee-600 block leading-tight">
              Tự động phát hiện khi bạn chỉnh sửa và lưu tệp <code className="bg-stone-100 px-1 py-0.5 rounded font-bold text-caramel">database/sqlite_caxoi_cafe.sql</code>!
            </span>
          </div>
        </div>

        {/* Database Tables Summary */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-caramel" />
                <h3 className="font-black text-sm text-coffee-900">Dữ Liệu Trong Các Bảng SQLite</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Nạp lại cấu trúc gốc sẽ khôi phục 5 món Cà Xòi và các kích cỡ chuẩn. Bạn có chắc muốn thực hiện?")) {
                    handlePostAction("RESEED_SQLITE");
                  }
                }}
                disabled={actionLoading !== null || isImporting}
                className="text-[11px] font-bold text-caramel hover:text-amber-800 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${actionLoading === "RESEED_SQLITE" ? "animate-spin" : ""}`} />
                <span>Khôi phục CSDL gốc</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/60 text-center hover:bg-pink-50/40 transition-colors">
                <span className="text-[10px] uppercase font-bold text-coffee-500 block">Sản Phẩm (Món)</span>
                <span className="text-xl font-black text-coffee-900 mt-1 block">
                  {sqlite?.tables?.productsCount ?? 5}
                </span>
                <span className="text-[9px] text-emerald-600 font-semibold">5 món Cà Xòi</span>
              </div>

              <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/60 text-center hover:bg-pink-50/40 transition-colors">
                <span className="text-[10px] uppercase font-bold text-coffee-500 block">Quy Cách / Size</span>
                <span className="text-xl font-black text-coffee-900 mt-1 block">
                  {sqlite?.tables?.variantsCount ?? 10}
                </span>
                <span className="text-[9px] text-coffee-600 font-semibold">Ly, 100ml, 250ml</span>
              </div>

              <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/60 text-center hover:bg-pink-50/40 transition-colors">
                <span className="text-[10px] uppercase font-bold text-coffee-500 block">Tài Khoản</span>
                <span className="text-xl font-black text-coffee-900 mt-1 block">
                  {sqlite?.tables?.usersCount ?? 4}
                </span>
                <span className="text-[9px] text-coffee-600 font-semibold">Chủ quán, Barista...</span>
              </div>

              <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/60 text-center hover:bg-pink-50/40 transition-colors">
                <span className="text-[10px] uppercase font-bold text-coffee-500 block">Đơn Hàng Đã Lưu</span>
                <span className="text-xl font-black text-coffee-900 mt-1 block">
                  {sqlite?.tables?.ordersCount ?? 5}
                </span>
                <span className="text-[9px] text-coffee-600 font-semibold">Đồng bộ realtime</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/60 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-coffee-800">
              <span className="font-bold text-emerald-900">Không xung đột file:</span> Bạn có thể vừa mở website nhận đơn của khách, vừa mở <strong>DB Browser for SQLite</strong> chỉnh sửa giá món, tên món hoặc duyệt đơn hàng. Mỗi khi bấm <code>Write Changes</code> trong DB Browser, giao diện website sẽ tự nhận dữ liệu mới ngay lập tức!
            </div>
          </div>
        </div>
      </div>

      {/* 4. STEP-BY-STEP USER GUIDE FOR DB BROWSER FOR SQLITE */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
              📖
            </div>
            <div>
              <h3 className="font-black text-base text-coffee-900">
                Hướng Dẫn Sử Dụng Với DB Browser for SQLite
              </h3>
              <p className="text-xs text-coffee-500">
                Thao tác quản lý trực quan tệp tin CSDL bằng phần mềm máy tính
              </p>
            </div>
          </div>

          <a
            href="https://sqlitebrowser.org"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-caramel hover:text-amber-800 flex items-center gap-1 shrink-0"
          >
            <span>Trang chủ sqlitebrowser.org</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-caramel text-white font-black text-xs flex items-center justify-center">1</span>
              <span className="font-bold text-xs text-coffee-900">Mở DB Browser</span>
            </div>
            <p className="text-xs text-coffee-600">
              Khởi động phần mềm <strong>DB Browser for SQLite</strong> trên máy tính của bạn.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-caramel text-white font-black text-xs flex items-center justify-center">2</span>
              <span className="font-bold text-xs text-coffee-900">Open Database</span>
            </div>
            <p className="text-xs text-coffee-600">
              Bấm nút <strong>Open Database</strong> hoặc Ctrl+O, điều hướng đến file:
              <br />
              <code className="text-[10px] bg-white px-1 py-0.5 rounded border text-caramel font-bold break-all">
                database/caxoi_cafe.db
              </code>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-caramel text-white font-black text-xs flex items-center justify-center">3</span>
              <span className="font-bold text-xs text-coffee-900">Duyệt & Sửa Dữ Liệu</span>
            </div>
            <p className="text-xs text-coffee-600">
              Vào tab <strong>Browse Data</strong> (Duyệt Dữ Liệu), chọn bảng <code className="font-bold">products</code> hoặc <code className="font-bold">product_variants</code> để sửa giá hoặc tên món.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-caramel text-white font-black text-xs flex items-center justify-center">4</span>
              <span className="font-bold text-xs text-coffee-900">Lưu Thay Đổi</span>
            </div>
            <p className="text-xs text-coffee-600">
              Bấm nút <strong>Write Changes</strong> (hoặc phím tắt <code>Ctrl+S</code>). Dữ liệu sẽ lưu ngay vào web tức thì!
            </p>
          </div>
        </div>
      </div>

      {/* MODAL XÁC NHẬN AN TOÀN TRƯỚC KHI KHÔI PHỤC */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-coffee-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-caramel mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-black text-base text-coffee-950">
                {confirmModal.type === "RESTORE_UPLOAD"
                  ? "Xác Nhận Khôi Phục Từ Tệp Tải Lên"
                  : confirmModal.type === "RESTORE_SNAPSHOT"
                  ? `Khôi Phục Từ "${confirmModal.targetFilename}"`
                  : "Xác Nhận Xóa Bản Sao Lưu"}
              </h3>
              <p className="text-xs text-coffee-600 leading-relaxed">
                {confirmModal.type === "DELETE_SNAPSHOT" ? (
                  <>Bạn có chắc chắn muốn xóa bản sao lưu này khỏi máy chủ? Thao tác này không thể hoàn tác.</>
                ) : (
                  <>
                    Dữ liệu hiện tại sẽ được cập nhật theo chế độ:{" "}
                    <strong>{importMode === "FULL" ? "Toàn bộ CSDL" : "Chỉ Thực đơn & Bảng giá"}</strong>.
                    <br />
                    <span className="text-emerald-700 font-semibold block mt-1">
                      🛡️ Hệ thống sẽ tự động tạo 1 bản backup dự phòng ngay trước khi khôi phục.
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, type: "RESTORE_UPLOAD" })}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-coffee-800 text-xs font-bold transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.type === "RESTORE_UPLOAD") {
                    handleExecuteImportUploaded();
                  } else if (confirmModal.type === "RESTORE_SNAPSHOT" && confirmModal.targetFilename) {
                    handleRestoreSnapshot(confirmModal.targetFilename);
                  } else if (confirmModal.type === "DELETE_SNAPSHOT" && confirmModal.targetFilename) {
                    handleDeleteSnapshot(confirmModal.targetFilename);
                  }
                }}
                className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold transition-all shadow-sm ${
                  confirmModal.type === "DELETE_SNAPSHOT"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-coffee-900 hover:bg-coffee-800"
                }`}
              >
                {confirmModal.type === "DELETE_SNAPSHOT" ? "Xác nhận xóa" : "Xác nhận khôi phục"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
