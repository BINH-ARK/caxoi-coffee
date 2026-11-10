import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Chưa đăng nhập", user: null },
      { status: 401 }
    );
  }

  const payload = await verifyAuthToken(token);

  if (!payload) {
    return NextResponse.json(
      { success: false, message: "Phiên đăng nhập đã hết hạn", user: null },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: payload.sub,
      username: payload.username,
      fullName: payload.fullName,
      role: payload.role,
    },
  });
}
