import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  const response = NextResponse.json({
    success: true,
    message: "Đã đăng xuất an toàn.",
  });

  const isHttps = request.headers.get("x-forwarded-proto") === "https" || request.url.startsWith("https");
  // Clear cookie
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
