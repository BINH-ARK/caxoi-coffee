import { NextResponse } from "next/server";
import { GroupSession, CartItem } from "@/types";
import {
  getGroupSessionFromSqlite,
  createGroupSessionInSqlite,
  addGroupItemToSqlite,
  lockGroupSessionInSqlite,
  removeGroupItemFromSqlite,
} from "@/lib/sqlite";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.toUpperCase();

  if (!code) {
    return NextResponse.json(
      { success: false, message: "Vui lòng cung cấp mã phòng đặt nhóm" },
      { status: 400 }
    );
  }

  const session = getGroupSessionFromSqlite(code);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Phòng đặt nhóm không tồn tại trong CSDL SQLite hoặc đã hết hạn" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: session,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, sessionCode, hostName, hostPhone, buildingName, item } = body;

    // Action 1: Create a new group room in SQLite
    if (action === "CREATE") {
      if (!hostName || !hostPhone) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập tên người đại diện và số điện thoại" },
          { status: 400 }
        );
      }

      // Generate 6-char session code: GRP-XXXX
      const randDigits = Math.floor(1000 + Math.random() * 9000);
      const newCode = `GRP-${randDigits}`;
      const newSession: GroupSession = {
        id: `grp-${Date.now()}`,
        sessionCode: newCode,
        hostName,
        hostPhone,
        buildingName,
        status: "OPEN",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(), // 3 hours
        createdAt: new Date().toISOString(),
        items: [],
      };

      createGroupSessionInSqlite(newSession);

      return NextResponse.json({
        success: true,
        message: "Tạo phòng đặt nhóm vào SQLite thành công",
        data: newSession,
      });
    }

    // Action 2: Add item to existing room
    if (action === "ADD_ITEM") {
      const code = sessionCode?.toUpperCase();
      const session = getGroupSessionFromSqlite(code);
      if (!session) {
        return NextResponse.json(
          { success: false, message: "Phòng không tồn tại trong SQLite" },
          { status: 404 }
        );
      }

      if (session.status !== "OPEN") {
        return NextResponse.json(
          { success: false, message: "Phòng đặt nhóm đã bị khóa để thanh toán" },
          { status: 400 }
        );
      }

      if (!item) {
        return NextResponse.json(
          { success: false, message: "Thiếu thông tin sản phẩm" },
          { status: 400 }
        );
      }

      const itemWithId: CartItem = {
        ...item,
        cartItemId: item.cartItemId || `item-g-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };

      addGroupItemToSqlite(code, itemWithId);
      const updatedSession = getGroupSessionFromSqlite(code);

      return NextResponse.json({
        success: true,
        message: "Đã thêm món vào CSDL phòng nhóm SQLite",
        data: updatedSession,
      });
    }

    // Action 3: Lock room (prepare for host checkout)
    if (action === "LOCK") {
      const code = sessionCode?.toUpperCase();
      const session = getGroupSessionFromSqlite(code);
      if (!session) {
        return NextResponse.json({ success: false, message: "Phòng không tồn tại" }, { status: 404 });
      }

      lockGroupSessionInSqlite(code);
      const updatedSession = getGroupSessionFromSqlite(code);

      return NextResponse.json({
        success: true,
        message: "Đã chốt đơn nhóm trong SQLite, sẵn sàng thanh toán",
        data: updatedSession,
      });
    }

    // Action 4: Remove item
    if (action === "REMOVE_ITEM") {
      const code = sessionCode?.toUpperCase();
      const { cartItemId } = body;
      removeGroupItemFromSqlite(code, cartItemId);
      const updatedSession = getGroupSessionFromSqlite(code);
      return NextResponse.json({ success: true, data: updatedSession });
    }

    return NextResponse.json({ success: false, message: "Thao tác không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
