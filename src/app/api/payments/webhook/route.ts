import { NextResponse } from "next/server";
import { getOrderByIdFromSqlite, updatePaymentStatusInSqlite } from "@/lib/sqlite";
import { sendOrderNotificationEmail } from "@/lib/mail";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log("[VietQR Webhook Received]", payload);

    // Support both SePay, PayOS and direct test payloads
    const content = payload.content || payload.description || payload.orderCode || "";
    const transferAmount = Number(payload.transferAmount || payload.amount || 0);

    if (!content) {
      return NextResponse.json(
        { success: false, message: "Thiếu nội dung chuyển khoản" },
        { status: 400 }
      );
    }

    // Extract Order Code from content (e.g. CF2611-001 or CX-8801)
    const match =
      content.toUpperCase().match(/CF2611-\d{3}/i) ||
      content.toUpperCase().match(/CX-\d{4}/i) ||
      content.toUpperCase().match(/CF[\w-]+/i);

    const orderCode = match ? match[0].toUpperCase() : content.toUpperCase().trim();

    // Tìm kiếm đơn hàng trực tiếp trong CSDL SQLite
    const order = getOrderByIdFromSqlite(orderCode);

    if (!order) {
      return NextResponse.json(
        { success: false, message: `Không tìm thấy đơn hàng tương ứng với mã: ${orderCode} trong SQLite` },
        { status: 404 }
      );
    }

    // Verify amount (optional tolerance or exact match)
    if (transferAmount > 0 && transferAmount < order.totalAmount) {
      return NextResponse.json(
        {
          success: false,
          message: `Số tiền chuyển (${transferAmount}đ) không đủ so với tổng đơn (${order.totalAmount}đ)`,
        },
        { status: 400 }
      );
    }

    // Cập nhật trạng thái thanh toán trực tiếp vào SQLite
    const newStatus = order.status === "PENDING_PAYMENT" ? "CONFIRMED" : order.status;
    updatePaymentStatusInSqlite(order.id, "PAID", newStatus);

    const updatedOrder = getOrderByIdFromSqlite(order.id);

    // Gửi email thông báo đơn đã thanh toán thành công
    if (updatedOrder) {
      try {
        const origin = new URL(request.url).origin;
        sendOrderNotificationEmail(updatedOrder, origin).catch((e) =>
          console.error("[Webhook] Lỗi gửi mail xác nhận thanh toán:", e)
        );
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: `Đơn hàng ${order.orderCode} đã đối soát thanh toán thành công trong CSDL SQLite!`,
      data: {
        orderCode: updatedOrder?.orderCode,
        status: updatedOrder?.status,
        paymentStatus: updatedOrder?.paymentStatus,
        totalAmount: updatedOrder?.totalAmount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi xử lý webhook" },
      { status: 500 }
    );
  }
}
