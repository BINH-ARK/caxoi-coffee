import { NextResponse } from "next/server";
import { calculateShippingDistance } from "@/lib/googleMaps";

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

    const result = await calculateShippingDistance(
      destination,
      Number(totalCups) || 1,
      Boolean(isTakeaway)
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi tính toán khoảng cách giao hàng" },
      { status: 500 }
    );
  }
}
