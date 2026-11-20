import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  getBusinessSettingsFromSqlite,
  getOrderByIdFromSqlite,
  hasWebhookTransactionInSqlite,
  recordWebhookTransactionInSqlite,
  updatePaymentStatusInSqlite,
} from "@/lib/sqlite";
import { sendOrderNotificationEmail } from "@/lib/mail";
import { safeEqualStrings } from "@/lib/password";

function extractWebhookSecret(request: Request): string {
  const direct = request.headers.get("x-webhook-secret")?.trim();
  if (direct) return direct;

  const auth = request.headers.get("authorization")?.trim() || "";
  if (auth.toLowerCase().startsWith("apikey ")) {
    return auth.slice(7).trim();
  }
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return "";
}

export async function POST(request: Request) {
  try {
    // 1. Xác thực bắt buộc khóa bí mật Webhook (fail-closed nếu chưa cấu hình)
    const configuredSecret = process.env.WEBHOOK_SECRET_KEY?.trim();
    if (!configuredSecret || configuredSecret.length < 16) {
      return NextResponse.json(
        { success: false, message: "Cổng Webhook chưa được cấu hình khóa bảo mật WEBHOOK_SECRET_KEY." },
        { status: 503 }
      );
    }

    const incomingSecret = extractWebhookSecret(request);
    if (!incomingSecret || !safeEqualStrings(incomingSecret, configuredSecret)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Chữ ký / khóa bảo mật Webhook không hợp lệ." },
        { status: 401 }
      );
    }

    const payload = await request.json();

    // Hỗ trợ payload từ SePay, PayOS và cổng ngân hàng chuẩn
    const content = String(payload.content || payload.description || payload.orderCode || "").trim();
    const transferAmount = Number(payload.transferAmount ?? payload.amount);
    const gateway = String(payload.gateway || "VIETQR").slice(0, 40);
    const incomingAccount = payload.accountNumber ? String(payload.accountNumber).replace(/\s+/g, "") : "";
    const rawTxId =
      payload.id ||
      payload.referenceCode ||
      payload.transactionId ||
      payload.transaction_code;
    const txId = rawTxId
      ? String(rawTxId).slice(0, 120)
      : crypto
          .createHash("sha256")
          .update(`${gateway}|${content}|${transferAmount}|${incomingAccount}`)
          .digest("hex");

    if (!content) {
      return NextResponse.json(
        { success: false, message: "Thiếu nội dung chuyển khoản." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "Số tiền chuyển khoản không hợp lệ (bắt buộc > 0)." },
        { status: 400 }
      );
    }

    // Kiểm tra số tài khoản thụ hưởng nếu gateway có truyền lên
    const settings = getBusinessSettingsFromSqlite();
    const expectedAcc = (settings.vietqrAccountNo || "").replace(/\s+/g, "");
    if (incomingAccount && expectedAcc && incomingAccount !== expectedAcc) {
      return NextResponse.json(
        { success: false, message: "Số tài khoản thụ hưởng không khớp cấu hình quán." },
        { status: 400 }
      );
    }

    // Chống xử lý lặp giao dịch (Idempotency)
    if (hasWebhookTransactionInSqlite(txId)) {
      return NextResponse.json({
        success: true,
        idempotent: true,
        message: "Giao dịch đã được ghi nhận trước đó.",
      });
    }

    // Trích xuất mã đơn từ nội dung chuyển khoản
    const match =
      content.toUpperCase().match(/CF2611-\d{3,}/i) ||
      content.toUpperCase().match(/CX-\d{4,}/i) ||
      content.toUpperCase().match(/CF[\w-]+/i);

    const orderCode = match ? match[0].toUpperCase() : content.toUpperCase();
    const order = getOrderByIdFromSqlite(orderCode);

    if (!order) {
      return NextResponse.json(
        { success: false, message: `Không tìm thấy đơn hàng tương ứng với mã: ${orderCode}.` },
        { status: 404 }
      );
    }

    if (order.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, message: `Đơn hàng ${order.orderCode} đã bị hủy, không thể đối soát thanh toán.` },
        { status: 400 }
      );
    }

    if (order.paymentStatus === "PAID") {
      recordWebhookTransactionInSqlite(txId, order.id, order.orderCode, transferAmount, gateway);
      return NextResponse.json({
        success: true,
        idempotent: true,
        message: `Đơn hàng ${order.orderCode} đã được thanh toán trước đó.`,
        data: {
          orderCode: order.orderCode,
          status: order.status,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
        },
      });
    }

    if (order.totalAmount <= 0 || transferAmount < order.totalAmount) {
      return NextResponse.json(
        {
          success: false,
          message: `Số tiền chuyển (${transferAmount}đ) không đủ so với tổng đơn (${order.totalAmount}đ).`,
        },
        { status: 400 }
      );
    }

    const newStatus = order.status === "PENDING_PAYMENT" ? "CONFIRMED" : order.status;
    updatePaymentStatusInSqlite(order.id, "PAID", newStatus);
    recordWebhookTransactionInSqlite(txId, order.id, order.orderCode, transferAmount, gateway);

    const updatedOrder = getOrderByIdFromSqlite(order.id);
    if (updatedOrder) {
      sendOrderNotificationEmail(updatedOrder).catch((e) =>
        console.error("[Webhook] Lỗi gửi mail xác nhận thanh toán:", e)
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đơn hàng ${order.orderCode} đã đối soát thanh toán thành công!`,
      data: {
        orderCode: updatedOrder?.orderCode,
        status: updatedOrder?.status,
        paymentStatus: updatedOrder?.paymentStatus,
        totalAmount: updatedOrder?.totalAmount,
      },
    });
  } catch (error) {
    console.error("[Webhook Error]", error);
    return NextResponse.json(
      { success: false, message: "Lỗi xử lý webhook thanh toán." },
      { status: 500 }
    );
  }
}
