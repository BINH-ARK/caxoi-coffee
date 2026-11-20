import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { GroupSession, CartItem } from "@/types";
import {
  getGroupSessionFromSqlite,
  createGroupSessionInSqlite,
  addGroupItemToSqlite,
  lockGroupSessionInSqlite,
  removeGroupItemFromSqlite,
  getProductsFromSqlite,
  getProductOptionsFromSqlite,
} from "@/lib/sqlite";
import { resolveCartItemFromCatalog } from "@/lib/pricing";
import { maskPhone } from "@/lib/utils";
import { safeEqualStrings } from "@/lib/password";

export const dynamic = "force-dynamic";

function sanitizeGroupSession(session: GroupSession, isHost = false): GroupSession {
  return {
    ...session,
    hostPhone: isHost ? session.hostPhone : maskPhone(session.hostPhone),
    hostToken: undefined,
  };
}

function isMatchingHostToken(session: GroupSession, providedToken?: string | null): boolean {
  // Hỗ trợ tương thích phòng cũ chưa có hostToken
  if (!session.hostToken) return true;
  if (!providedToken) return false;
  return safeEqualStrings(session.hostToken, providedToken.trim());
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim().toUpperCase();
  const hostToken = (searchParams.get("hostToken") || request.headers.get("x-group-host-token") || "").trim();

  if (!code) {
    return NextResponse.json(
      { success: false, message: "Vui lòng cung cấp mã phòng đặt nhóm" },
      { status: 400 }
    );
  }

  const session = getGroupSessionFromSqlite(code);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Phòng đặt nhóm không tồn tại hoặc đã hết hạn" },
      { status: 404 }
    );
  }

  const isHost = Boolean(hostToken && session.hostToken && safeEqualStrings(session.hostToken, hostToken));

  return NextResponse.json({
    success: true,
    isHost,
    data: sanitizeGroupSession(session, isHost),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, sessionCode, hostName, hostPhone, buildingName, item, hostToken } = body;

    // Action 1: Tạo phòng đặt nhóm mới với mã ngẫu nhiên bảo mật 8 ký tự + hostToken bí mật
    if (action === "CREATE") {
      const cleanHostName = String(hostName || "").trim().slice(0, 100);
      const cleanHostPhone = String(hostPhone || "").trim().slice(0, 20);
      if (!cleanHostName || cleanHostPhone.replace(/[^\d]/g, "").length < 9) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập tên người đại diện và số điện thoại hợp lệ (tối thiểu 9 số)." },
          { status: 400 }
        );
      }

      const newCode = `GRP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      const generatedHostToken = crypto.randomBytes(16).toString("hex");
      const newSession: GroupSession = {
        id: `grp-${crypto.randomUUID()}`,
        sessionCode: newCode,
        hostName: cleanHostName,
        hostPhone: cleanHostPhone,
        hostToken: generatedHostToken,
        buildingName: buildingName ? String(buildingName).trim().slice(0, 200) : undefined,
        status: "OPEN",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
        createdAt: new Date().toISOString(),
        items: [],
      };

      const saved = createGroupSessionInSqlite(newSession);
      if (!saved) {
        return NextResponse.json(
          { success: false, message: "Không thể tạo phòng đặt nhóm lúc này. Vui lòng thử lại." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Tạo phòng đặt nhóm thành công",
        hostToken: generatedHostToken,
        data: newSession,
      });
    }

    // Action 2: Thêm món vào phòng (tính giá server-side từ SQLite, chặn phòng hết hạn/khóa)
    if (action === "ADD_ITEM") {
      const code = String(sessionCode || "").trim().toUpperCase();
      const session = getGroupSessionFromSqlite(code);
      if (!session) {
        return NextResponse.json({ success: false, message: "Phòng không tồn tại" }, { status: 404 });
      }

      if (session.status === "EXPIRED") {
        return NextResponse.json(
          { success: false, message: "Phòng đặt nhóm đã hết thời gian mở (3 giờ). Vui lòng tạo phòng mới." },
          { status: 400 }
        );
      }

      if (session.status !== "OPEN") {
        return NextResponse.json(
          { success: false, message: "Phòng đặt nhóm đã được chốt đơn để thanh toán." },
          { status: 400 }
        );
      }

      if (!item) {
        return NextResponse.json({ success: false, message: "Thiếu thông tin sản phẩm" }, { status: 400 });
      }

      const catalogProducts = getProductsFromSqlite();
      const catalogOptions = getProductOptionsFromSqlite();
      const resolved = resolveCartItemFromCatalog(item, catalogProducts, catalogOptions);
      if (!resolved.ok) {
        return NextResponse.json({ success: false, message: resolved.message }, { status: 400 });
      }

      const r = resolved.item;
      const authoritativeCartItem: CartItem = {
        cartItemId: `item-g-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        product: r.product,
        variant: r.variant,
        selectedOptions: r.selectedOptions,
        quantity: r.quantity,
        recipientLabel: r.recipientLabel,
        notes: r.notes,
        unitPrice: r.unitPrice,
        totalPrice: r.totalPrice,
      };

      const added = addGroupItemToSqlite(code, authoritativeCartItem);
      if (!added) {
        return NextResponse.json({ success: false, message: "Không thể thêm món vào phòng nhóm." }, { status: 500 });
      }

      const updatedSession = getGroupSessionFromSqlite(code);
      const isHost = Boolean(hostToken && session.hostToken && safeEqualStrings(session.hostToken, String(hostToken)));
      return NextResponse.json({
        success: true,
        message: "Đã thêm món vào phòng nhóm thành công",
        data: updatedSession ? sanitizeGroupSession(updatedSession, isHost) : null,
      });
    }

    // Action 3: Chốt & khóa phòng (yêu cầu hostToken của trưởng nhóm)
    if (action === "LOCK") {
      const code = String(sessionCode || "").trim().toUpperCase();
      const session = getGroupSessionFromSqlite(code);
      if (!session) {
        return NextResponse.json({ success: false, message: "Phòng không tồn tại" }, { status: 404 });
      }
      if (!isMatchingHostToken(session, hostToken || request.headers.get("x-group-host-token"))) {
        return NextResponse.json(
          { success: false, message: "Chỉ người tạo phòng (Host) mới có quyền chốt & khóa phòng đặt nhóm." },
          { status: 403 }
        );
      }
      if (session.status !== "OPEN") {
        return NextResponse.json(
          { success: false, message: "Phòng đặt nhóm không ở trạng thái mở." },
          { status: 400 }
        );
      }

      lockGroupSessionInSqlite(code);
      const updatedSession = getGroupSessionFromSqlite(code);

      return NextResponse.json({
        success: true,
        message: "Đã chốt đơn nhóm, sẵn sàng thanh toán",
        data: updatedSession ? sanitizeGroupSession(updatedSession, true) : null,
      });
    }

    // Action 4: Xóa món khỏi phòng (chỉ khi phòng OPEN & có hostToken hợp lệ)
    if (action === "REMOVE_ITEM") {
      const code = String(sessionCode || "").trim().toUpperCase();
      const { cartItemId } = body;
      const session = getGroupSessionFromSqlite(code);
      if (!session) {
        return NextResponse.json({ success: false, message: "Phòng không tồn tại" }, { status: 404 });
      }
      if (session.status !== "OPEN") {
        return NextResponse.json(
          { success: false, message: "Phòng đã khóa, không thể xóa món." },
          { status: 400 }
        );
      }
      if (!isMatchingHostToken(session, hostToken || request.headers.get("x-group-host-token"))) {
        return NextResponse.json(
          { success: false, message: "Chỉ người tạo phòng (Host) mới có quyền xóa món của thành viên." },
          { status: 403 }
        );
      }

      removeGroupItemFromSqlite(code, String(cartItemId || ""));
      const updatedSession = getGroupSessionFromSqlite(code);
      return NextResponse.json({
        success: true,
        data: updatedSession ? sanitizeGroupSession(updatedSession, true) : null,
      });
    }

    return NextResponse.json({ success: false, message: "Thao tác không hợp lệ" }, { status: 400 });
  } catch (error) {
    console.error("[Group Orders Error]", error);
    return NextResponse.json({ success: false, message: "Lỗi xử lý phòng đặt nhóm." }, { status: 500 });
  }
}
