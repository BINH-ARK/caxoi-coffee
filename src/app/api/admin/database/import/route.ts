import { NextResponse } from "next/server";
import { restoreDatabaseFromUploadedBuffer, getSqliteStatus } from "@/lib/sqlite";
import { requireStaffAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

/**
 * POST: Tiếp nhận tệp sao lưu JSON tải lên (.json) đã xác thực cấu trúc và tiến hành khôi phục CSDL
 */
export async function POST(request: Request) {
  const auth = await requireStaffAuth(request, { roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) === "MENU_ONLY" ? "MENU_ONLY" : "FULL";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn tệp tin sao lưu (.json) để nhập vào hệ thống." },
        { status: 400 }
      );
    }

    const filename = file.name || "backup.json";
    if (!filename.toLowerCase().endsWith(".json")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vì lý do an toàn chống thực thi mã độc, hệ thống chỉ hỗ trợ nhập/khôi phục trực tuyến từ tệp sao lưu .json được xuất bởi Cà Xòi.",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tệp tin tải lên bị rỗng (0 bytes)." },
        { status: 400 }
      );
    }

    // Giới hạn file tối đa 20MB cho bản sao lưu JSON
    if (buffer.length > 20 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "Kích thước tệp vượt quá giới hạn 20MB cho phép." },
        { status: 400 }
      );
    }

    const result = await restoreDatabaseFromUploadedBuffer(buffer, filename, mode);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    const sqliteStatus = getSqliteStatus();

    return NextResponse.json({
      success: true,
      message: result.message,
      stats: result.stats,
      sqlite: sqliteStatus,
    });
  } catch (error: any) {
    console.error("Lỗi xử lý import database:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi trong quá trình nhập dữ liệu: " + error.message },
      { status: 500 }
    );
  }
}
