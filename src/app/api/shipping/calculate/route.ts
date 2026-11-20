import { NextResponse } from "next/server";
import { calculateShippingDistance } from "@/lib/googleMaps";
import { getBusinessSettingsFromSqlite } from "@/lib/sqlite";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { destination, totalCups = 1, isTakeaway = false } = body;

    if (!destination || typeof destination !== "string" || !destination.trim()) {
      return NextResponse.json(
        { success: false, message: "Vui lòng cung cấp địa chỉ hoặc tên tòa nhà nhận hàng" },
        { status: 400 }
      );
    }

    if (destination.trim().length > 200) {
      return NextResponse.json(
        { success: false, message: "Địa chỉ giao hàng tối đa 200 ký tự." },
        { status: 400 }
      );
    }

    const settings = getBusinessSettingsFromSqlite();
    const cups = Math.max(1, Math.min(200, Math.floor(Number(totalCups) || 1)));

    const result = await calculateShippingDistance(destination, cups, Boolean(isTakeaway), {
      baseDeliveryFee: settings.baseDeliveryFee,
      freeDeliveryMinCups: settings.freeDeliveryMinCups,
      shippingFeeMode: settings.shippingFeeMode,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[Shipping Calculate Error]", error);
    return NextResponse.json(
      { success: false, message: "Lỗi tính toán khoảng cách giao hàng." },
      { status: 500 }
    );
  }
}
