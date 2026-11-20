import { NextResponse } from "next/server";
import {
  getBusinessSettingsFromSqlite,
  updateBusinessSettingsInSqlite,
  toggleProductAvailabilityInSqlite,
  getProductsFromSqlite,
} from "@/lib/sqlite";
import { requireStaffAuth } from "@/lib/serverAuth";
import { BusinessSettings } from "@/types";
import {
  FACEBOOK_FANPAGE_URL,
  XANH_SM_ONELINK,
  sanitizeExternalUrl,
  sanitizeImageUrl,
} from "@/lib/utils";
import { VIETQR_BANKS } from "@/lib/vietqr";

export const dynamic = "force-dynamic";

const ALLOWED_STORE_STATUSES = new Set(["OPEN", "CLOSED", "PAUSED"]);
const ALLOWED_SHIPPING_MODES = new Set(["AUTO", "MANUAL_ZERO"]);
const VALID_BANK_IDS = new Set(VIETQR_BANKS.map((b) => b.id.toUpperCase()));

const STRING_SETTING_KEYS: ReadonlyArray<keyof BusinessSettings> = [
  "storeName",
  "storeStatusMessage",
  "hotline",
  "openTime",
  "closeTime",
  "vietqrAccountNo",
  "vietqrAccountName",
  "heroBadgeBrand",
  "heroLocation",
  "heroEyebrow",
  "heroHeadlinePrimary",
  "heroHeadlineHighlight",
  "heroDescription",
  "heroServiceNote",
  "heroPriceBadge1",
  "heroPriceBadge2",
  "heroPriceBadge3",
  "heroPrimaryCtaText",
  "heroSecondaryCtaText",
  "heroWatermarkText",
  "heroMascotTitle",
  "heroMascotSubtitle",
  "qrFacebookTitle",
  "qrFacebookSubtitle",
  "qrXanhSmTitle",
  "qrXanhSmSubtitle",
];

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

    // 1. Thao tác bật/tắt còn hàng cho món -> yêu cầu quyền menu.toggle_availability
    if (body.toggleProductId) {
      const auth = await requireStaffAuth(request, { permission: "menu.toggle_availability" });
      if (!auth.ok) return auth.response;

      const products = getProductsFromSqlite();
      const prod = products.find((p) => p.id === body.toggleProductId);
      if (!prod) {
        return NextResponse.json({ success: false, message: "Không tìm thấy sản phẩm." }, { status: 404 });
      }
      const newAvailability = !prod.isAvailable;
      toggleProductAvailabilityInSqlite(prod.id, newAvailability);
      return NextResponse.json({
        success: true,
        message: `Đã đổi trạng thái món "${prod.name}" thành: ${newAvailability ? "Còn hàng" : "Tạm hết hàng"} (SQLite)`,
        data: { ...prod, isAvailable: newAvailability },
      });
    }

    // 2. Nếu chỉ đổi trạng thái tạm dừng khẩn cấp -> cho phép quyền system.emergency_pause hoặc system.settings
    const keys = Object.keys(body || {});
    const isEmergencyStatusOnly =
      keys.length > 0 &&
      keys.every((k) => k === "storeStatus" || k === "storeStatusMessage");

    const auth = await requireStaffAuth(
      request,
      isEmergencyStatusOnly
        ? { anyPermissions: ["system.emergency_pause", "system.settings"] }
        : { permission: "system.settings" }
    );
    if (!auth.ok) return auth.response;

    // Allowlist & sanitize chặt chẽ mọi trường cấu hình
    const sanitizedUpdates: Partial<BusinessSettings> = {};

    for (const key of STRING_SETTING_KEYS) {
      if (body[key] !== undefined && body[key] !== null) {
        (sanitizedUpdates as any)[key] = String(body[key]).trim().slice(0, 600);
      }
    }

    if (body.storeStatus !== undefined) {
      const st = String(body.storeStatus).toUpperCase();
      if (!ALLOWED_STORE_STATUSES.has(st)) {
        return NextResponse.json({ success: false, message: "Trạng thái quán không hợp lệ." }, { status: 400 });
      }
      sanitizedUpdates.storeStatus = st as BusinessSettings["storeStatus"];
    }

    if (body.shippingFeeMode !== undefined) {
      const mode = String(body.shippingFeeMode).toUpperCase();
      if (!ALLOWED_SHIPPING_MODES.has(mode)) {
        return NextResponse.json({ success: false, message: "Chế độ phí ship không hợp lệ." }, { status: 400 });
      }
      sanitizedUpdates.shippingFeeMode = mode as BusinessSettings["shippingFeeMode"];
    }

    if (body.vietqrBankId !== undefined) {
      const bankId = String(body.vietqrBankId).trim().toUpperCase();
      if (!VALID_BANK_IDS.has(bankId)) {
        return NextResponse.json({ success: false, message: "Mã ngân hàng VietQR không hợp lệ." }, { status: 400 });
      }
      sanitizedUpdates.vietqrBankId = bankId;
    }

    if (body.baseDeliveryFee !== undefined) {
      sanitizedUpdates.baseDeliveryFee = Math.max(0, Math.min(500000, Number(body.baseDeliveryFee) || 0));
    }
    if (body.freeDeliveryMinCups !== undefined) {
      sanitizedUpdates.freeDeliveryMinCups = Math.max(0, Math.min(100, Math.floor(Number(body.freeDeliveryMinCups) || 0)));
    }
    if (body.maxSlotCapacityCups !== undefined) {
      sanitizedUpdates.maxSlotCapacityCups = Math.max(5, Math.min(500, Math.floor(Number(body.maxSlotCapacityCups) || 30)));
    }
    if (body.prepLeadTimeMinutes !== undefined) {
      sanitizedUpdates.prepLeadTimeMinutes = Math.max(1, Math.min(60, Math.floor(Number(body.prepLeadTimeMinutes) || 5)));
    }

    if (body.facebookUrl !== undefined) {
      sanitizedUpdates.facebookUrl = sanitizeExternalUrl(String(body.facebookUrl), FACEBOOK_FANPAGE_URL);
    }
    if (body.xanhSmUrl !== undefined) {
      sanitizedUpdates.xanhSmUrl = sanitizeExternalUrl(String(body.xanhSmUrl), XANH_SM_ONELINK);
    }
    if (body.heroLogoUrl !== undefined) {
      sanitizedUpdates.heroLogoUrl = sanitizeImageUrl(String(body.heroLogoUrl), "/images/ca-xoi-logo.jpg");
    }

    const updated = updateBusinessSettingsInSqlite(sanitizedUpdates);

    return NextResponse.json({
      success: true,
      message: "Cập nhật cấu hình quán vào CSDL SQLite thành công!",
      data: updated,
    });
  } catch (error) {
    console.error("[Settings PATCH Error]", error);
    return NextResponse.json(
      { success: false, message: "Lỗi cập nhật cấu hình quán." },
      { status: 500 }
    );
  }
}
