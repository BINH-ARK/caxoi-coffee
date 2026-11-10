import { NextResponse } from "next/server";
import {
  getOrderByIdFromSqlite,
  updateOrderStatusInSqlite,
  getBusinessSettingsFromSqlite,
} from "@/lib/sqlite";
import { updateOrderStatusInMySql } from "@/lib/mysql";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const order = getOrderByIdFromSqlite(id);

  if (!order) {
    return NextResponse.json(
      { success: false, message: "Không tìm thấy đơn hàng trong CSDL SQLite" },
      { status: 404 }
    );
  }

  const settings = getBusinessSettingsFromSqlite();

  return NextResponse.json({
    success: true,
    data: order,
    settings,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json();

  const currentOrder = getOrderByIdFromSqlite(id);
  if (!currentOrder) {
    return NextResponse.json(
      { success: false, message: "Không tìm thấy đơn hàng" },
      { status: 404 }
    );
  }

  const targetStatus = body.status || currentOrder.status;

  updateOrderStatusInSqlite(currentOrder.id, targetStatus, {
    baristaNotes: body.baristaNotes,
    paymentStatus: body.paymentStatus,
    shipperName: body.shipperName,
    shipperPhone: body.shipperPhone,
    estimatedDeliveryTime: body.estimatedDeliveryTime,
    trackingNotes: body.trackingNotes,
    deliveryNotes: body.deliveryNotes,
    deliveryFee: body.deliveryFee !== undefined ? Number(body.deliveryFee) : undefined,
  });

  try {
    if (body.status) {
      await updateOrderStatusInMySql(currentOrder.id, body.status);
    }
  } catch {}

  const updatedOrder = getOrderByIdFromSqlite(id);

  return NextResponse.json({
    success: true,
    message: "Cập nhật đơn hàng trong SQLite thành công",
    data: updatedOrder,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const reason = searchParams.get("reason") || "Hủy bởi quản trị viên";

  const currentOrder = getOrderByIdFromSqlite(id);
  if (!currentOrder) {
    return NextResponse.json(
      { success: false, message: "Không tìm thấy đơn hàng" },
      { status: 404 }
    );
  }

  updateOrderStatusInSqlite(currentOrder.id, "CANCELLED", {
    trackingNotes: reason,
  });

  try {
    await updateOrderStatusInMySql(currentOrder.id, "CANCELLED");
  } catch {}

  const updatedOrder = getOrderByIdFromSqlite(id);

  return NextResponse.json({
    success: true,
    message: "Hủy đơn hàng thành công",
    data: updatedOrder,
  });
}
