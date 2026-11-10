import { NextResponse } from "next/server";
import { testSmtpConnection } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { targetEmail } = body;

    const result = await testSmtpConnection(targetEmail);

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
