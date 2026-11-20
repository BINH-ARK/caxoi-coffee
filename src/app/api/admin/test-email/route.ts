import { NextResponse } from "next/server";
import { testSmtpConnection } from "@/lib/mail";
import { requireStaffAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[^\s@<>()[\]\\,;:"\r\n]+@[^\s@<>()[\]\\,;:"\r\n]+\.[^\s@<>()[\]\\,;:"\r\n]+$/;

export async function POST(request: Request) {
  const auth = await requireStaffAuth(request, { roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const rawTarget = typeof body.targetEmail === "string" ? body.targetEmail.trim() : "";

    if (rawTarget && (!EMAIL_REGEX.test(rawTarget) || /[\r\n\0]/.test(rawTarget))) {
      return NextResponse.json(
        { success: false, message: "Địa chỉ email nhận thử không hợp lệ." },
        { status: 400 }
      );
    }

    const result = await testSmtpConnection(rawTarget || undefined);

    return NextResponse.json({
      success: result.success,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Lỗi kiểm tra kết nối email",
      },
      { status: 500 }
    );
  }
}
