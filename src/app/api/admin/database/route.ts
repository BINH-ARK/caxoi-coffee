import { NextResponse } from "next/server";
import { getSqliteStatus, executeSqlSeedFile, getSqliteDb } from "@/lib/sqlite";
import { checkMySqlConnection, getMySqlPool } from "@/lib/mysql";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sqliteStatus = getSqliteStatus();
    const mySqlStatus = await checkMySqlConnection();

    const dbDir = path.join(process.cwd(), "database");
    const sqliteFilePath = path.join(dbDir, "caxoi_cafe.db");
    const sqliteSqlPath = path.join(dbDir, "sqlite_caxoi_cafe.sql");
    const phpmyadminSqlPath = path.join(dbDir, "phpmyadmin_caxoi_cafe.sql");

    return NextResponse.json({
      success: true,
      activeEngine: "SQLITE", // SQLite is primary zero-config engine for DB Browser
      sqlite: {
        ...sqliteStatus,
        absolutePath: sqliteFilePath,
        sqlScriptPath: sqliteSqlPath,
        dbBrowserUrl: "https://sqlitebrowser.org",
        guide: [
          "1. Mở ứng dụng DB Browser for SQLite trên máy tính của bạn.",
          "2. Chọn menu File -> Open Database (Mở Cơ Sở Dữ Liệu).",
          "3. Chọn file 'database/caxoi_cafe.db' (hoặc 'database/caxoi_cafe.sqlite').",
          "4. Vào tab 'Browse Data' (Duyệt Dữ Liệu) để xem/sửa menu, giá bán, size, đơn hàng, cấu hình quán.",
          "5. Bấm 'Write Changes' (Ghi Các Thay Đổi) hoặc Ctrl+S. Website sẽ đọc dữ liệu thật từ SQL tức thì!",
        ],
      },
      mysql: {
        status: mySqlStatus,
        dumpFile: "database/phpmyadmin_caxoi_cafe.sql",
        dumpExists: fs.existsSync(phpmyadminSqlPath),
        phpMyAdminUrl: "http://localhost/phpmyadmin",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Lỗi đọc trạng thái cơ sở dữ liệu",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 1. Nạp lại CSDL SQLite chuẩn từ sqlite_caxoi_cafe.sql
    if (action === "RESEED_SQLITE" || action === "SYNC_FROM_SQL") {
      const ok = executeSqlSeedFile();
      if (!ok) {
        return NextResponse.json(
          { success: false, message: "Không thể nạp lại database từ file SQL" },
          { status: 500 }
        );
      }
      const sqliteStatus = getSqliteStatus();
      return NextResponse.json({
        success: true,
        message: "Đã nạp toàn bộ câu lệnh mới nhất từ file SQL vào CSDL SQLite thành công! Dữ liệu web đã cập nhật.",
        sqlite: sqliteStatus,
      });
    }

    // 2. Checkpoint WAL into main file
    if (action === "CHECKPOINT_SQLITE") {
      try {
        const db = getSqliteDb();
        db.pragma("wal_checkpoint(TRUNCATE)");
        const dbDir = path.join(process.cwd(), "database");
        fs.copyFileSync(
          path.join(dbDir, "caxoi_cafe.db"),
          path.join(dbDir, "caxoi_cafe.sqlite")
        );
        const sqliteStatus = getSqliteStatus();
        return NextResponse.json({
          success: true,
          message: "Đã checkpoint WAL và đồng bộ file caxoi_cafe.db & caxoi_cafe.sqlite!",
          sqlite: sqliteStatus,
        });
      } catch (err: any) {
        return NextResponse.json(
          { success: false, message: "Lỗi checkpoint: " + err.message },
          { status: 500 }
        );
      }
    }

    // 3. MySQL Actions
    if (action === "TEST_CONNECTION") {
      const status = await checkMySqlConnection();
      return NextResponse.json({
        success: true,
        message: status.connected
          ? "Kết nối MySQL / phpMyAdmin thành công!"
          : "Chưa kết nối được MySQL. (Bạn có thể dùng DB Browser for SQLite trực tiếp không cần XAMPP)",
        status,
      });
    }

    if (action === "SEED_SQL") {
      const pool = getMySqlPool();
      const sqlFilePath = path.join(process.cwd(), "database", "phpmyadmin_caxoi_cafe.sql");
      if (!fs.existsSync(sqlFilePath)) {
        return NextResponse.json(
          { success: false, message: "Không tìm thấy file phpmyadmin_caxoi_cafe.sql" },
          { status: 404 }
        );
      }

      const sqlContent = fs.readFileSync(sqlFilePath, "utf8");
      const statements = sqlContent
        .split(/;\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      let executed = 0;
      const conn = await pool.getConnection();
      try {
        for (const statement of statements) {
          if (statement.length > 5) {
            await conn.query(statement);
            executed++;
          }
        }
      } finally {
        conn.release();
      }

      const status = await checkMySqlConnection();
      return NextResponse.json({
        success: true,
        message: `Đã nạp thành công ${executed} câu lệnh SQL vào MySQL!`,
        status,
      });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Lỗi xử lý yêu cầu CSDL",
      },
      { status: 500 }
    );
  }
}
