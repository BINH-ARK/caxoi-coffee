#!/bin/bash
# ==============================================================================
# CÀ XÒI COFFEE - SCRIPT KHỞI CHẠY TỐI ƯU CHO MACBOOK APPLE SILICON (M1/M2/M3/M4)
# Cũng tương thích với macOS Intel (x86_64)
# Sử dụng: ./scripts/start-mac.sh  hoặc  npm run start:mac
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# 1. Tự động nạp PATH chuẩn cho Apple Silicon Homebrew (/opt/homebrew/bin), Intel, nvm & .local/bin
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$HOME/.local/bin:$PATH"

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
fi

ARCH="$(uname -m)"
OS="$(uname -s)"

echo "============================================================"
echo " ☕ CÀ XÒI COFFEE - KHỞI CHẠY HỆ THỐNG TRÊN MACOS"
echo "============================================================"
echo " • Hệ điều hành : $OS ($ARCH)"

if [ "$OS" = "Darwin" ] && [ "$ARCH" = "arm64" ]; then
  echo " • Chip         : Apple Silicon (M1/M2/M3/M4 Native arm64)"
elif [ "$OS" = "Darwin" ]; then
  if [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" = "1" ]; then
    echo " ⚠️  Lưu ý: Terminal đang chạy qua Rosetta 2. Khuyên dùng Terminal Native (arm64)."
  else
    echo " • Chip         : Intel Mac (x86_64)"
  fi
fi

# 2. Kiểm tra Node.js & npm
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "❌ Chưa tìm thấy Node.js!"
  echo "👉 Trên MacBook chip M1/M2/M3/M4, cài đặt nhanh bằng Homebrew:"
  echo "   brew install node@22"
  exit 1
fi

NODE_ARCH="$(node -p 'process.arch')"
NODE_VER="$(node -v)"
echo " • Node.js      : $NODE_VER (arch: $NODE_ARCH)"

if [ "$ARCH" = "arm64" ] && [ "$NODE_ARCH" != "arm64" ]; then
  echo " ⚠️  Node.js hiện tại là bản $NODE_ARCH. Bạn nên cài Node arm64 (brew install node@22) để đạt hiệu năng tối đa trên chip M."
fi

# 3. Tạo .env từ .env.example nếu chưa có
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  echo " 📄 Chưa có file .env -> Đang tạo từ .env.example..."
  cp .env.example .env
fi

# 4. Kiểm tra và cài đặt dependencies chuẩn kiến trúc máy
NEED_INSTALL=0
if [ ! -d "node_modules" ]; then
  NEED_INSTALL=1
elif [ "$OS" = "Darwin" ] && [ "$NODE_ARCH" = "arm64" ] && [ ! -d "node_modules/@next/swc-darwin-arm64" ]; then
  echo " 🔄 Phát hiện node_modules chưa có SWC cho Apple Silicon (arm64), đang đồng bộ lại..."
  NEED_INSTALL=1
elif [ "$OS" = "Darwin" ] && [ "$NODE_ARCH" = "x64" ] && [ ! -d "node_modules/@next/swc-darwin-x64" ] && [ ! -d "node_modules/next/node_modules/@next/swc-darwin-x64" ]; then
  echo " 🔄 Phát hiện node_modules chưa có SWC cho x64, đang đồng bộ lại..."
  NEED_INSTALL=1
fi

if [ "$NEED_INSTALL" = "1" ]; then
  echo " 📦 Đang cài đặt thư viện npm cho kiến trúc $NODE_ARCH..."
  npm install
fi

# 5. Kiểm tra module native SQLite (better-sqlite3)
echo " 🗄️  Kiểm tra kết nối module SQLite..."
if ! node -e 'const DB = require("better-sqlite3"); const db = new DB("database/caxoi_cafe.db"); db.close();' >/dev/null 2>&1; then
  echo " 🔧 Đang biên dịch lại better-sqlite3 cho Node $NODE_VER ($NODE_ARCH)..."
  npm rebuild better-sqlite3
fi
echo " ✅ SQLite sẵn sàng!"

# 6. Khởi chạy server Next.js
echo ""
echo " 🚀 Đang khởi chạy server tại: http://localhost:3000"
echo "    - Trang khách hàng : http://localhost:3000"
echo "    - Quản trị Admin   : http://localhost:3000/admin"
echo "    - Màn hình Barista : http://localhost:3000/kds"
echo "============================================================"
exec npm run dev
