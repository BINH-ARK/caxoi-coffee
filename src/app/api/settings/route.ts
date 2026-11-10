import { NextResponse } from "next/server";
import {
  getBusinessSettingsFromSqlite,
  updateBusinessSettingsInSqlite,
  toggleProductAvailabilityInSqlite,
  getProductsFromSqlite,
} from "@/lib/sqlite";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = getBusinessSettingsFromSqlite();
  return NextResponse.json({
    success: true,
    data: settings,
  });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    // 1. Nếu là thao tác bật/tắt còn hàng cho món
    if (body.toggleProductId) {
      const products = getProductsFromSqlite();
      const prod = products.find((p) => p.id === body.toggleProductId);
      if (prod) {
        const newAvailability = !prod.isAvailable;
        toggleProductAvailabilityInSqlite(prod.id, newAvailability);
        return NextResponse.json({
          success: true,
          message: `Đã đổi trạng thái món "${prod.name}" thành: ${newAvailability ? "Còn hàng" : "Tạm hết hàng"} (SQLite)`,
          data: { ...prod, isAvailable: newAvailability },
        });
      }
    }

    // 2. Cập nhật cấu hình vận hành vào bảng business_settings trong SQLite
    const updated = updateBusinessSettingsInSqlite(body);

    return NextResponse.json({
      success: true,
      message: "Cập nhật cấu hình quán vào CSDL SQLite thành công!",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi cập nhật cấu hình" },
      { status: 500 }
    );
  }
}
