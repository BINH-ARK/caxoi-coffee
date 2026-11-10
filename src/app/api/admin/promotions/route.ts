import { NextResponse } from "next/server";
import {
  getPromotionsFromSqlite,
  createPromotionInSqlite,
  updatePromotionInSqlite,
  togglePromotionInSqlite,
  deletePromotionInSqlite,
} from "@/lib/sqlite";

export const dynamic = "force-dynamic";

/**
 * GET: Lấy danh sách tất cả các mã khuyến mãi
 */
export async function GET() {
  try {
    const promotions = getPromotionsFromSqlite();
    return NextResponse.json({
      success: true,
      data: promotions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi lấy danh sách khuyến mãi" },
      { status: 500 }
    );
  }
}

/**
 * POST: Tạo mới mã khuyến mãi
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, discountType, discountValue, minOrderAmount, isActive, maxDiscountAmount } = body;

    const result = createPromotionInSqlite({
      code,
      name,
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount) || 0,
      isActive: isActive !== false,
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.promotion,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi tạo mã khuyến mãi" },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Cập nhật thông tin hoặc chuyển đổi trạng thái bật/tắt
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { action, id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Thiếu ID khuyến mãi" },
        { status: 400 }
      );
    }

    if (action === "TOGGLE") {
      const result = togglePromotionInSqlite(Number(id));
      if (!result.success) {
        return NextResponse.json(
          { success: false, message: result.message },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.promotion,
      });
    }

    if (action === "UPDATE") {
      const { code, name, discountType, discountValue, minOrderAmount, isActive, maxDiscountAmount } = body.data || body;
      const result = updatePromotionInSqlite(Number(id), {
        code,
        name,
        discountType,
        discountValue: discountValue !== undefined ? Number(discountValue) : undefined,
        minOrderAmount: minOrderAmount !== undefined ? Number(minOrderAmount) : undefined,
        isActive,
        maxDiscountAmount: maxDiscountAmount !== undefined ? (maxDiscountAmount ? Number(maxDiscountAmount) : null) : undefined,
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, message: result.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.promotion,
      });
    }

    return NextResponse.json(
      { success: false, message: "Hành động không hợp lệ" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi cập nhật mã khuyến mãi" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Xóa vĩnh viễn mã khuyến mãi
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");

    let id = idParam ? Number(idParam) : null;
    if (!id) {
      try {
        const body = await request.json();
        id = body.id ? Number(body.id) : null;
      } catch {}
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Thiếu ID mã khuyến mãi cần xóa" },
        { status: 400 }
      );
    }

    const result = deletePromotionInSqlite(id);
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi xóa mã khuyến mãi" },
      { status: 500 }
    );
  }
}
