import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "sqlite"; // 'sqlite' | 'sql' | 'mysql_sql'

  const dbDir = path.join(process.cwd(), "database");
  let targetFile = path.join(dbDir, "caxoi_cafe.sqlite");
  let contentType = "application/x-sqlite3";
  let downloadName = "caxoi_cafe.sqlite";

  if (type === "db") {
    targetFile = path.join(dbDir, "caxoi_cafe.db");
    contentType = "application/x-sqlite3";
    downloadName = "caxoi_cafe.db";
  } else if (type === "sql") {
    targetFile = path.join(dbDir, "sqlite_caxoi_cafe.sql");
    contentType = "text/plain; charset=utf-8";
    downloadName = "sqlite_caxoi_cafe.sql";
  } else if (type === "mysql_sql") {
    targetFile = path.join(dbDir, "phpmyadmin_caxoi_cafe.sql");
    contentType = "text/plain; charset=utf-8";
    downloadName = "phpmyadmin_caxoi_cafe.sql";
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
    },
  });
}
