import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireStaffAuth } from "@/lib/serverAuth";
import { checkpointSqliteForDownload, exportLiveSqlDumpFromSqlite } from "@/lib/sqlite";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireStaffAuth(request, { roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") || "sqlite").toLowerCase(); // 'sqlite' | 'db' | 'sql' | 'mysql_sql'

  if (type === "sql") {
    const liveSql = exportLiveSqlDumpFromSqlite();
    return new NextResponse(liveSql, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="caxoi_cafe_live_dump.sql"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const dbDir = path.join(process.cwd(), "database");
  let targetFile = path.join(dbDir, "caxoi_cafe.sqlite");
  let contentType = "application/x-sqlite3";
  let downloadName = "caxoi_cafe.sqlite";

  if (type === "db") {
    checkpointSqliteForDownload();
    targetFile = path.join(dbDir, "caxoi_cafe.db");
    contentType = "application/x-sqlite3";
    downloadName = "caxoi_cafe.db";
  } else if (type === "sqlite") {
    checkpointSqliteForDownload();
    targetFile = path.join(dbDir, "caxoi_cafe.sqlite");
    contentType = "application/x-sqlite3";
    downloadName = "caxoi_cafe.sqlite";
  } else if (type === "mysql_sql") {
    targetFile = path.join(dbDir, "phpmyadmin_caxoi_cafe.sql");
    contentType = "text/plain; charset=utf-8";
    downloadName = "phpmyadmin_caxoi_cafe.sql";
  } else {
    return NextResponse.json(
      { success: false, message: "Loại tệp tải về không hợp lệ." },
      { status: 400 }
    );
  }

  if (!fs.existsSync(targetFile)) {
    return NextResponse.json(
      { success: false, message: "File không tồn tại" },
      { status: 404 }
    );
  }

  const fileBuffer = fs.readFileSync(targetFile);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Content-Length": fileBuffer.length.toString(),
      "Cache-Control": "no-store",
    },
  });
}
