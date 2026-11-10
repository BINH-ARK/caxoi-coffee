import { NextResponse } from "next/server";
import {
  listDatabaseBackupSnapshots,
  restoreDatabaseFromBackupSnapshot,
  deleteBackupSnapshot,
  getSqliteStatus,
} from "@/lib/sqlite";

export const dynamic = "force-dynamic";

/**
 * GET: Lấy danh sách các tệp sao lưu (Snapshots) đang lưu trên máy chủ
 */
export async function GET() {
  try {
    const backups = listDatabaseBackupSnapshots();
    return NextResponse.json({ success: true, backups });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Lỗi lấy danh sách sao lưu: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Khôi phục CSDL từ một bản sao lưu có sẵn trên server
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, filename, mode = "FULL" } = body;

    if (action === "RESTORE") {
      if (!filename) {
        return NextResponse.json(
          { success: false, message: "Thiếu tên file sao lưu cần khôi phục." },
          { status: 400 }
        );
      }

      const result = await restoreDatabaseFromBackupSnapshot(filename, mode);
      if (!result.success) {
        return NextResponse.json(result, { status: 500 });
      }

      const sqliteStatus = getSqliteStatus();
      return NextResponse.json({
        success: true,
        message: result.message,
        sqlite: sqliteStatus,
      });
    }

    return NextResponse.json(
      { success: false, message: "Hành động không hợp lệ" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Lỗi khôi phục sao lưu: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Xóa một bản sao lưu trên server
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let filename = searchParams.get("filename");

    if (!filename) {
      try {
        const body = await request.json();
        filename = body?.filename;
      } catch {}
    }

    if (!filename) {
      return NextResponse.json(
        { success: false, message: "Thiếu tên file sao lưu cần xóa." },
        { status: 400 }
      );
    }

    const result = deleteBackupSnapshot(filename);
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    const backups = listDatabaseBackupSnapshots();
    return NextResponse.json({
      success: true,
      message: result.message,
      backups,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Lỗi xóa bản sao lưu: " + error.message },
      { status: 500 }
    );
  }
}
