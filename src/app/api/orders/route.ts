import { NextResponse } from "next/server";
import { Order, OrderItemRecord, CartItem } from "@/types";
import {
  getOrdersFromSqlite,
  saveOrderToSqlite,
  getNextOrderSequence,
  getBusinessSettingsFromSqlite,
  getPromotionByCodeFromSqlite,
  calculatePromotionDiscount,
} from "@/lib/sqlite";
import { saveOrderToMySql } from "@/lib/mysql";
import { calculateShippingDistance } from "@/lib/googleMaps";
import { sendOrderNotificationEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const phone = searchParams.get("phone") || undefined;
  const orderType = searchParams.get("orderType") || undefined;
  const search = searchParams.get("search") || undefined;
  const date = searchParams.get("date") || undefined;

  // Lấy đơn hàng trực tiếp từ SQLite (caxoi_cafe.db)
  const orders = getOrdersFromSqlite({ status, phone, orderType, search, date });

  return NextResponse.json({
    success: true,
    data: orders,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderType = "OFFICE_DELIVERY",
      recipientName,
      recipientPhone,
      companyName,
      buildingName,
      floorRoom,
      deliveryAddress,
      deliveryNotes,
      scheduledType = "ASAP",
      scheduledTime,
      paymentMethod = "VIETQR_BANKING",
      items = [],
      promotionCode,
      groupSessionId,
    } = body;

    if (!recipientName || !recipientPhone) {
      return NextResponse.json(
        { success: false, message: "Họ tên và Số điện thoại là bắt buộc" },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Giỏ hàng không có sản phẩm" },
        { status: 400 }
      );
    }

    // Kiểm tra trạng thái quán từ CSDL SQLite
    const settings = getBusinessSettingsFromSqlite();
    if (settings.storeStatus === "CLOSED") {
      return NextResponse.json(
        { success: false, message: "Quán hiện đang đóng cửa. Xin quý khách vui lòng quay lại sau." },
        { status: 403 }
      );
    }

    // Đếm số đơn thực tế trong SQLite để tạo mã đơn
    const count = getNextOrderSequence();
    const orderCode = `CF2611-${String(count).padStart(3, "0")}`;
    const orderId = `ord-${Date.now()}`;

    // Tính toán tiền hàng
    let subtotalAmount = 0;
    let totalCups = 0;

    const orderItems: OrderItemRecord[] = items.map((cartItem: CartItem, idx: number) => {
      const quantity = cartItem.quantity || 1;
      totalCups += quantity;
      const unitPrice = cartItem.unitPrice;
      const totalPrice = unitPrice * quantity;
      subtotalAmount += totalPrice;

      return {
        id: `item-${orderId}-${idx + 1}`,
        orderId: orderId,
        productId: cartItem.product.id,
        productName: cartItem.product.name,
        variantName: cartItem.variant.sizeName,
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        recipientLabel: cartItem.recipientLabel || undefined,
        itemNotes: cartItem.notes || undefined,
        options: cartItem.selectedOptions.map((opt) => ({
          optionName: opt.optionName,
          valueName: opt.valueName,
          price: opt.extraPrice,
        })),
      };
    });

    // Tính phí ship (ưu tiên giá trị người dùng tự nhập từ payload, nếu không có mới tính mặc định)
    let deliveryFee = 0;
    if (orderType === "OFFICE_DELIVERY") {
      if (body.deliveryFee !== undefined && body.deliveryFee !== null && !isNaN(Number(body.deliveryFee))) {
        deliveryFee = Math.max(0, Number(body.deliveryFee));
      } else if (totalCups < settings.freeDeliveryMinCups) {
        const dest = buildingName || deliveryAddress || "Hải Châu, Đà Nẵng";
        const shipping = await calculateShippingDistance(dest, totalCups, false);
        deliveryFee = shipping.deliveryFee;
      }
    }

    let discountAmount = 0;
    if (promotionCode) {
      const promotion = getPromotionByCodeFromSqlite(promotionCode);
      if (promotion) {
        const calc = calculatePromotionDiscount(promotion, subtotalAmount, deliveryFee);
        if (calc.valid) {
          discountAmount = calc.discountAmount;
        }
      }
    }

    const totalAmount = Math.max(0, subtotalAmount + deliveryFee - discountAmount);

    const nowIso = new Date().toISOString();
    const newOrder: Order = {
      id: orderId,
      orderCode,
      orderType,
      status: paymentMethod === "VIETQR_BANKING" ? "PENDING_PAYMENT" : "CONFIRMED",
      paymentStatus: "UNPAID",
      paymentMethod,
      recipientName,
      recipientPhone,
      companyName,
      buildingName,
      floorRoom,
      deliveryAddress: deliveryAddress || `${floorRoom || ""} - ${buildingName || companyName || "Đà Nẵng"}`,
      deliveryNotes,
      scheduledType,
      scheduledTime,
      subtotalAmount,
      discountAmount,
      deliveryFee,
      totalAmount,
      promotionCode,
      groupSessionId,
      createdAt: nowIso,
      updatedAt: nowIso,
      items: orderItems,
    };

    // 1. Lưu đơn trực tiếp vào SQLite (caxoi_cafe.db)
    const sqliteSuccess = saveOrderToSqlite(newOrder);
    if (!sqliteSuccess) {
      console.error("[Orders API] Lỗi lưu đơn hàng vào SQLite!");
    }

    // 2. Dự phòng MySQL nếu có kết nối
    try {
      await saveOrderToMySql(newOrder);
    } catch {}

    // 3. Tự động gửi email thông báo cho Chủ quán & Barista (Chạy ngầm bất đồng bộ, không chặn phản hồi)
    try {
      const origin = new URL(request.url).origin;
      sendOrderNotificationEmail(newOrder, origin).catch((mailErr) => {
        console.error("[Orders API] Lỗi chạy ngầm gửi email:", mailErr);
      });
    } catch (e) {
      console.error("[Orders API] Lỗi kích hoạt gửi email:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Đặt đơn hàng thành công!",
      data: newOrder,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi tạo đơn hàng" },
      { status: 500 }
    );
  }
}
