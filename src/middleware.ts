import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "cafe_office_super_secure_jwt_secret_key_2026_change_in_prod";
const secretKey = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = "cafe_auth_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public customer routes & static assets
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/" ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/order/") ||
    pathname.startsWith("/group-order") ||
    pathname === "/api/menu" ||
    pathname === "/api/orders" ||
    pathname.startsWith("/api/orders/") ||
    pathname.startsWith("/api/group-orders") ||
    pathname.startsWith("/api/payments/webhook")
  ) {
    return NextResponse.next();
  }

  // 2. Check protected paths
  const isAdminRoute = pathname.startsWith("/admin");
  const isKdsRoute = pathname.startsWith("/kds");
  const isAdminApiRoute = pathname.startsWith("/api/admin");

  if (!isAdminRoute && !isKdsRoute && !isAdminApiRoute) {
    return NextResponse.next();
  }

  // 3. Extract and verify JWT from HttpOnly cookie
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
    const role = (payload as any).role;

    // 4. Role Enforcement (RBAC)
    if (isAdminRoute || isAdminApiRoute) {
      // Only SUPER_ADMIN and STORE_MANAGER can access /admin
      if (role !== "SUPER_ADMIN" && role !== "STORE_MANAGER") {
        if (isAdminApiRoute) {
          return NextResponse.json(
            { success: false, message: "Forbidden. Bạn không có quyền quản trị." },
            { status: 403 }
          );
        }
        // Redirect Barista/Cashier directly to KDS
        return NextResponse.redirect(new URL("/kds", request.url));
      }
    }

    if (isKdsRoute) {
      // BARISTA, CASHIER, STORE_MANAGER, SUPER_ADMIN can all view KDS
      if (!["BARISTA", "CASHIER", "STORE_MANAGER", "SUPER_ADMIN"].includes(role)) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }

    // Attach user role & ID to request headers for downstream handlers if needed
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", (payload as any).sub || "");
    requestHeaders.set("x-user-role", role || "");

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (err) {
    // Invalid or expired token
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
