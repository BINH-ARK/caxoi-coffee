import { NextResponse } from "next/server";
import { getAuthenticatedStaff } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const staff = await getAuthenticatedStaff(request);

  if (!staff) {
    return NextResponse.json(
      { success: false, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn", user: null },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: staff.id,
      username: staff.username,
      fullName: staff.fullName,
      role: staff.role,
      permissions: staff.permissions,
    },
  });
}
