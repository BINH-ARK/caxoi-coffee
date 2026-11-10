import { NextResponse } from "next/server";
import {
  getProductOptionsFromSqlite,
  createOptionValueInSqlite,
  updateOptionValueInSqlite,
  deleteOptionValueInSqlite,
} from "@/lib/sqlite";

export async function GET() {
  try {
    const options = getProductOptionsFromSqlite();
    return NextResponse.json({ success: true, data: options });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi lấy danh sách tùy chọn" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { optionId, name, extraPrice = 0, isDefault = false } = body;

    if (!optionId || !name?.trim()) {
      return NextResponse.json(
        { success: false, message: "Thiếu optionId hoặc tên tùy chọn." },
        { status: 400 }
      );
    }

    const success = createOptionValueInSqlite({
      optionId: Number(optionId),
      name: name.trim(),
      extraPrice: Number(extraPrice) || 0,
      isDefault: Boolean(isDefault),
    });

    if (!success) {
      return NextResponse.json(
        { success: false, message: "Không thể thêm tùy chọn vào SQLite." },
        { status: 500 }
      );
    }

    const updatedOptions = getProductOptionsFromSqlite();
    return NextResponse.json({
      success: true,
      message: `Đã thêm tùy chọn "${name.trim()}" thành công!`,
      data: updatedOptions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi xử lý yêu cầu" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, extraPrice, isDefault, displayOrder } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Thiếu ID tùy chọn cần sửa." },
        { status: 400 }
      );
    }

    const success = updateOptionValueInSqlite(Number(id), {
      name,
      extraPrice,
      isDefault,
      displayOrder,
    });

    if (!success) {
      return NextResponse.json(
        { success: false, message: "Không thể cập nhật tùy chọn trong SQLite." },
        { status: 500 }
      );
    }

    const updatedOptions = getProductOptionsFromSqlite();
    return NextResponse.json({
      success: true,
      message: "Đã cập nhật tùy chọn thành công!",
      data: updatedOptions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi xử lý yêu cầu" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");

    let id = idParam ? Number(idParam) : null;
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id ? Number(body.id) : null;
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Thiếu ID tùy chọn cần xóa." },
        { status: 400 }
      );
    }

    const success = deleteOptionValueInSqlite(id);
    if (!success) {
      return NextResponse.json(
        { success: false, message: "Không thể xóa tùy chọn khỏi SQLite." },
        { status: 500 }
      );
    }

    const updatedOptions = getProductOptionsFromSqlite();
    return NextResponse.json({
      success: true,
      message: "Đã xóa tùy chọn thành công!",
      data: updatedOptions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi xử lý yêu cầu" },
      { status: 500 }
    );
  }
}
