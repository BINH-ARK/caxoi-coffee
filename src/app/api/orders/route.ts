import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { Order, OrderItemRecord } from "@/types";
import {
  getOrdersFromSqlite,
  saveOrderToSqlite,
  getBusinessSettingsFromSqlite,
  getPromotionByCodeFromSqlite,
  calculatePromotionDiscount,
  getProductsFromSqlite,
  getProductOptionsFromSqlite,
} from "@/lib/sqlite";
import { calculateShippingDistance } from "@/lib/googleMaps";
import { sendOrderNotificationEmail } from "@/lib/mail";
import { getMinLyValidationError, maskAddress, maskPhone } from "@/lib/utils";
import { getAuthenticatedStaff } from "@/lib/serverAuth";
import { resolveCartItemFromCatalog } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const ALLOWED_ORDER_TYPES = new Set(["OFFICE_DELIVERY", "TAKEAWAY", "GROUP_ORDER"]);
const ALLOWED_PAYMENT_METHODS = new Set(["VIETQR_BANKING", "COD", "EWALLET"]);

function sanitizePublicOrder(o: Order): Order {
  return {
    ...o,
    recipientPhone: maskPhone(o.recipientPhone),
    deliveryAddress: o.deliveryAddress ? maskAddress(o.deliveryAddress) : undefined,
    floorRoom: undefined,
    shipperPhone: o.shipperPhone ? maskPhone(o.shipperPhone) : undefined,
    trackingToken: undefined,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const orderType = searchParams.get("orderType") || undefined;
  const phone = searchParams.get("phone")?.trim() || undefined;
  const search = searchParams.get("search")?.trim() || undefined;
  const date = searchParams.get("date") || undefined;

  // 1. Nhân viên có quyền orders.view -> trả toàn bộ dữ liệu theo bộ lọc
  const staff = await getAuthenticatedStaff(request);
  if (staff && (staff.role === "SUPER_ADMIN" || staff.permissions.includes("orders.view"))) {
    const orders = getOrdersFromSqlite({ status, orderType, phone, search, date });
    return NextResponse.json({
      success: true,
      data: orders.map((o) => ({ ...o, trackingToken: undefined })),
    });
  }

  // 2. Khách hàng chưa đăng nhập -> CHỈ cho tra cứu theo đúng SĐT (9-11 số) hoặc đúng Mã đơn
  const rawQuery = phone || search || "";
  const digitsOnly = rawQuery.replace(/[^\d]/g, "");
  const isExactPhone = /^[0-9+\s.-]{9,15}$/.test(rawQuery) && digitsOnly.length >= 9 && digitsOnly.length <= 11;
  const isExactOrderCode = /^(CF[\w-]+|CX-\d+|ord-[\w-]+)$/i.test(rawQuery);

  if (!isExactPhone && !isExactOrderCode) {
    return NextResponse.json(
      {
        success: false,
        message: "Vui lòng nhập chính xác Số điện thoại (9–11 số) hoặc Mã đơn hàng (VD: CF2611-001) để tra cứu.",
      },
      { status: 401 }
    );
  }

  const orders = getOrdersFromSqlite({
    exactPhone: isExactPhone ? digitsOnly : undefined,
    exactOrderCode: isExactOrderCode ? rawQuery : undefined,
    limit: 10,
  });

  return NextResponse.json({
    success: true,
    data: orders.map(sanitizePublicOrder),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderType: rawOrderType = "OFFICE_DELIVERY",
      paymentMethod: rawPaymentMethod = "VIETQR_BANKING",
      recipientName,
      recipientPhone,
      companyName,
      buildingName,
      floorRoom,
      deliveryAddress,
      deliveryNotes,
      scheduledType: rawScheduledType = "ASAP",
      scheduledTime,
      promotionCode,
      groupSessionId,
      items,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Giỏ hàng đang trống. Vui lòng chọn ít nhất 1 món." },
        { status: 400 }
      );
    }

    if (items.length > 50) {
      return NextResponse.json(
        { success: false, message: "Đơn hàng tối đa 50 dòng sản phẩm." },
        { status: 400 }
      );
    }

    const cleanName = String(recipientName || "").trim().slice(0, 100);
    const cleanPhone = String(recipientPhone || "").trim().slice(0, 20);
    if (!cleanName || cleanPhone.replace(/[^\d]/g, "").length < 9) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên người nhận và số điện thoại hợp lệ (tối thiểu 9 số)." },
        { status: 400 }
      );
    }

    const orderType = ALLOWED_ORDER_TYPES.has(rawOrderType) ? rawOrderType : "OFFICE_DELIVERY";
    const paymentMethod = ALLOWED_PAYMENT_METHODS.has(rawPaymentMethod) ? rawPaymentMethod : "VIETQR_BANKING";
    const scheduledType = rawScheduledType === "PREORDER" ? "PREORDER" : "ASAP";

    // Kiểm tra trạng thái mở cửa từ SQLite (chặn cả CLOSED và PAUSED)
    const settings = getBusinessSettingsFromSqlite();
    if (settings.storeStatus === "CLOSED") {
      return NextResponse.json(
        { success: false, message: "Quán hiện đang đóng cửa. Xin quý khách vui lòng quay lại sau." },
        { status: 403 }
      );
    }
    if (settings.storeStatus === "PAUSED") {
      return NextResponse.json(
        {
          success: false,
          message:
            settings.storeStatusMessage ||
            "Quán đang tạm dừng nhận đơn trực tuyến giờ cao điểm. Vui lòng thử lại sau ít phút.",
        },
        { status: 403 }
      );
    }

    // 1. Đối chiếu & tính lại toàn bộ giá món, size, topping từ SQLite (không tin unitPrice client)
    const catalogProducts = getProductsFromSqlite();
    const catalogOptions = getProductOptionsFromSqlite();

    const orderId = `ord-${crypto.randomUUID()}`;
    let subtotalAmount = 0;
    let totalCups = 0;
    const orderItems: OrderItemRecord[] = [];

    for (let idx = 0; idx < items.length; idx++) {
      const resolved = resolveCartItemFromCatalog(items[idx], catalogProducts, catalogOptions);
      if (!resolved.ok) {
        return NextResponse.json({ success: false, message: resolved.message }, { status: 400 });
      }
      const r = resolved.item;
      totalCups += r.quantity;
      subtotalAmount += r.totalPrice;

      orderItems.push({
        id: `item-${orderId}-${idx + 1}`,
        orderId,
        productId: r.product.id,
        productName: r.product.name,
        variantName: r.variant.sizeName,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        totalPrice: r.totalPrice,
        recipientLabel: r.recipientLabel,
        itemNotes: r.notes,
        options: r.selectedOptions.map((opt) => ({
          optionName: opt.optionName,
          valueName: opt.valueName,
          price: opt.extraPrice,
        })),
      });
    }

    // 2. Ràng buộc tối thiểu 5 ly nếu đơn hàng có chọn quy cách "Ly" (dựa trên dữ liệu đã xác thực server)
    const minLyError = getMinLyValidationError(orderItems);
    if (minLyError) {
      return NextResponse.json({ success: false, message: minLyError }, { status: 400 });
    }

    // 3. Tính phí giao hàng hoàn toàn phía server dựa theo chế độ Admin cấu hình (AUTO hoặc MANUAL_ZERO)
    let deliveryFee = 0;
    const isDeliveryOrder = orderType === "OFFICE_DELIVERY" || orderType === "GROUP_ORDER";
    if (isDeliveryOrder && settings.shippingFeeMode === "AUTO") {
      const dest = String(buildingName || deliveryAddress || "Hải Châu, Đà Nẵng").trim();
      const shipping = await calculateShippingDistance(dest, totalCups, false, {
        baseDeliveryFee: settings.baseDeliveryFee,
        freeDeliveryMinCups: settings.freeDeliveryMinCups,
        shippingFeeMode: settings.shippingFeeMode,
      });
      deliveryFee = shipping.deliveryFee;
    }

    // 4. Tính mã khuyến mãi phía server (chỉ lưu mã nếu thực sự hợp lệ & giảm > 0)
    let discountAmount = 0;
    let appliedPromotionCode: string | undefined = undefined;
    if (promotionCode && typeof promotionCode === "string" && promotionCode.trim()) {
      const promotion = getPromotionByCodeFromSqlite(promotionCode.trim());
      if (promotion) {
        const calc = calculatePromotionDiscount(promotion, subtotalAmount, deliveryFee);
        if (calc.valid && calc.discountAmount > 0) {
          discountAmount = calc.discountAmount;
          appliedPromotionCode = promotion.code;
        }
      }
    }

    const totalAmount = Math.max(0, subtotalAmount + deliveryFee - discountAmount);
    const nowIso = new Date().toISOString();
    const trackingToken = crypto.randomBytes(16).toString("hex");

    const cleanCompany = companyName ? String(companyName).trim().slice(0, 120) : undefined;
    const cleanBuilding = buildingName ? String(buildingName).trim().slice(0, 200) : undefined;
    const cleanFloor = floorRoom ? String(floorRoom).trim().slice(0, 80) : undefined;
    const cleanAddr = deliveryAddress
      ? String(deliveryAddress).trim().slice(0, 250)
      : [cleanFloor, cleanBuilding || cleanCompany || "Đà Nẵng"].filter(Boolean).join(" - ");
    const cleanNotes = deliveryNotes ? String(deliveryNotes).trim().slice(0, 300) : undefined;

    const newOrder: Order = {
      id: orderId,
      orderCode: "", // Được sinh nguyên tử trong saveOrderToSqlite transaction
      orderType,
      status: paymentMethod === "VIETQR_BANKING" ? "PENDING_PAYMENT" : "CONFIRMED",
      paymentStatus: "UNPAID",
      paymentMethod,
      recipientName: cleanName,
      recipientPhone: cleanPhone,
      companyName: cleanCompany,
      buildingName: cleanBuilding,
      floorRoom: cleanFloor,
      deliveryAddress: cleanAddr,
      deliveryNotes: cleanNotes,
      scheduledType,
      scheduledTime: scheduledTime ? String(scheduledTime).trim().slice(0, 30) : undefined,
      subtotalAmount,
      discountAmount,
      deliveryFee,
      totalAmount,
      promotionCode: appliedPromotionCode,
      groupSessionId: groupSessionId ? String(groupSessionId).trim().slice(0, 64) : undefined,
      trackingToken,
      createdAt: nowIso,
      updatedAt: nowIso,
      items: orderItems,
    };

    const sqliteSuccess = saveOrderToSqlite(newOrder);
    if (!sqliteSuccess) {
      return NextResponse.json(
        { success: false, message: "Không thể lưu đơn hàng vào cơ sở dữ liệu. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    // Tự động gửi email thông báo cho Chủ quán & Barista (chạy ngầm, không chặn phản hồi)
    sendOrderNotificationEmail(newOrder).catch((err) => {
      console.error("[Orders API] Lỗi gửi mail ngầm:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Đặt hàng thành công!",
      data: newOrder,
    });
  } catch (error) {
    console.error("[Orders POST Error]", error);
    return NextResponse.json(
      { success: false, message: "Lỗi xử lý đặt hàng. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
