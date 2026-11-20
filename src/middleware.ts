import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "cafe_auth_token";

function getEdgeJwtSecretKey(): Uint8Array | null {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isKdsRoute = pathname.startsWith("/kds");
  const isAdminApiRoute = pathname.startsWith("/api/admin");

  if (!isAdminRoute && !isKdsRoute && !isAdminApiRoute) {
    return NextResponse.next();
  }

  const secretKey = getEdgeJwtSecretKey();
  if (!secretKey) {
    if (isAdminApiRoute) {
      return NextResponse.json(
        { success: false, message: "Lỗi cấu hình bảo mật máy chủ (JWT_SECRET)." },
        { status: 500 }
      );
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (isAdminApiRoute) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Vui lòng đăng nhập." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, secretKey);
    const role = String(payload.role || "");

    if (isAdminRoute || isAdminApiRoute) {
      if (role !== "SUPER_ADMIN" && role !== "STORE_MANAGER") {
        if (isAdminApiRoute) {
          return NextResponse.json(
            { success: false, message: "Forbidden. Bạn không có quyền quản trị." },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL("/kds", request.url));
      }
    }

    if (isKdsRoute) {
      if (!["BARISTA", "CASHIER", "STORE_MANAGER", "SUPER_ADMIN"].includes(role)) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    if (isAdminApiRoute) {
      return NextResponse.json(
        { success: false, message: "Session expired. Vui lòng đăng nhập lại." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/kds",
    "/kds/:path*",
    "/api/admin",
    "/api/admin/:path*",
  ],
};
