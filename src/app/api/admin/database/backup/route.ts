import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  exportFullDatabaseToJson,
  exportLiveSqlDumpFromSqlite,
  createDatabaseBackupSnapshot,
  checkpointSqliteForDownload,
} from "@/lib/sqlite";
import { requireStaffAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

/**
 * GET: Tải tệp sao lưu trực tiếp về máy tính (JSON / SQLite DB / Live SQL Dump)
 */
export async function GET(request: Request) {
  const auth = await requireStaffAuth(request, { roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

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
          "Cache-Control": "no-store",
        },
      });
    }

    // 2. Tải file SQLite (.db) sau khi WAL checkpoint
    if (format === "db" || format === "sqlite") {
      checkpointSqliteForDownload();

      const targetDb = path.join(dbDir, "caxoi_cafe.db");
      if (!fs.existsSync(targetDb)) {
        return NextResponse.json({ success: false, message: "File database không tồn tại" }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(targetDb);
      const filename = `caxoi_cafe_backup_${dateStr}.db`;

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/x-sqlite3",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": fileBuffer.length.toString(),
          "Cache-Control": "no-store",
        },
      });
    }

    // 3. Tải file SQL Dump TỪ DỮ LIỆU THỰC TẾ trong SQLite (không dùng file seed tĩnh)
    if (format === "sql") {
      const liveSql = exportLiveSqlDumpFromSqlite();
      const filename = `caxoi_cafe_backup_${dateStr}.sql`;

      return new NextResponse(liveSql, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
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
  const auth = await requireStaffAuth(request, { roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

  try {
    let label = "manual";
    try {
      const body = await request.json();
      if (typeof body?.label === "string" && body.label.trim()) {
        label = body.label.trim().slice(0, 40);
      }
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
