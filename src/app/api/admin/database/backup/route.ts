import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  exportFullDatabaseToJson,
  createDatabaseBackupSnapshot,
  getSqliteDb,
} from "@/lib/sqlite";

export const dynamic = "force-dynamic";

/**
 * GET: Tải tệp sao lưu trực tiếp về máy tính (JSON / SQLite DB / SQL Script)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "json").toLowerCase();

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}h${pad(now.getMinutes())}`;

    const dbDir = path.join(process.cwd(), "database");

    // 1. Tải file JSON có cấu trúc
    if (format === "json") {
      const fullJson = exportFullDatabaseToJson();
      const jsonContent = JSON.stringify(fullJson, null, 2);
      const filename = `caxoi_cafe_backup_${dateStr}.json`;

      return new NextResponse(jsonContent, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // 2. Tải file SQLite (.db)
    if (format === "db" || format === "sqlite") {
      const targetDb = path.join(dbDir, "caxoi_cafe.db");
      if (!fs.existsSync(targetDb)) {
        return NextResponse.json({ success: false, message: "File database không tồn tại" }, { status: 404 });
      }

      // Checkpoint WAL để file .db chứa 100% dữ liệu mới nhất
      try {
        const db = getSqliteDb();
        db.pragma("wal_checkpoint(TRUNCATE)");
      } catch {}

      const fileBuffer = fs.readFileSync(targetDb);
      const filename = `caxoi_cafe_backup_${dateStr}.db`;

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/x-sqlite3",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": fileBuffer.length.toString(),
        },
      });
    }

    // 3. Tải file SQL Script (.sql)
    if (format === "sql") {
      const targetSql = path.join(dbDir, "sqlite_caxoi_cafe.sql");
      if (!fs.existsSync(targetSql)) {
        return NextResponse.json({ success: false, message: "File script SQL không tồn tại" }, { status: 404 });
      }

      const fileContent = fs.readFileSync(targetSql, "utf-8");
      const filename = `caxoi_cafe_backup_${dateStr}.sql`;

      return new NextResponse(fileContent, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "Định dạng không được hỗ trợ. Hãy chọn format=json, format=db hoặc format=sql" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Lỗi tải bản sao lưu: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Tạo một bản snapshot lưu trữ an toàn trên server
 */
export async function POST(request: Request) {
  try {
    let label = "manual";
    try {
      const body = await request.json();
      if (body?.label) label = body.label;
    } catch {}

    const result = await createDatabaseBackupSnapshot(label);
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Lỗi tạo bản sao lưu trên máy chủ: " + error.message },
      { status: 500 }
    );
  }
}
