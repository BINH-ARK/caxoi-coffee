import { NextResponse } from "next/server";
import { COOKIE_NAME, Role, verifyAuthToken } from "@/lib/auth";
import { getAuthUserByIdFromSqlite } from "@/lib/sqlite";

export interface AuthenticatedStaff {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  tokenVersion: number;
  permissions: string[];
}

export function extractCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

export function getTrustedClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  const forwarded = request.headers.get("x-forwarded-for")?.trim();
  if (forwarded) {
    // Ưu tiên IP cuối cùng do reverse proxy thêm vào thay vì prefix dễ giả mạo từ client
    const hops = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (hops.length > 0) {
      return hops[hops.length - 1].slice(0, 64);
    }
  }
  return "local";
}

/**
 * Trả về thông tin nhân viên đã xác thực (đối chiếu trực tiếp is_active & token_version trong SQLite).
 */
export async function getAuthenticatedStaff(request: Request): Promise<AuthenticatedStaff | null> {
  const token = extractCookieValue(request, COOKIE_NAME);
  if (!token) return null;

  const payload = await verifyAuthToken(token);
  if (!payload || !payload.sub) return null;

  const dbUser = getAuthUserByIdFromSqlite(payload.sub);
  if (!dbUser || !dbUser.isActive) return null;

  const tokenTv = typeof payload.tv === "number" ? payload.tv : 1;
  if (tokenTv !== dbUser.tokenVersion) return null;
  if (payload.role !== dbUser.role) return null;

  return dbUser;
}

/**
 * Bảo vệ bắt buộc cho mọi API nội bộ (chặn 401 chưa đăng nhập và 403 không đủ quyền RBAC).
 */
export async function requireStaffAuth(
  request: Request,
  options?: {
    roles?: Role[];
    permission?: string;
    anyPermissions?: string[];
  }
): Promise<
  | { ok: true; staff: AuthenticatedStaff }
  | { ok: false; response: NextResponse }
> {
  const staff = await getAuthenticatedStaff(request);
  if (!staff) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại." },
        { status: 401 }
      ),
    };
  }

  if (options?.roles && !options.roles.includes(staff.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Bạn không có vai trò phù hợp để thực hiện thao tác này." },
        { status: 403 }
      ),
    };
  }

  if (staff.role !== "SUPER_ADMIN") {
    if (options?.permission && !staff.permissions.includes(options.permission)) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, message: `Bạn không có quyền [${options.permission}] để thực hiện thao tác này.` },
          { status: 403 }
        ),
      };
    }
    if (
      options?.anyPermissions &&
      options.anyPermissions.length > 0 &&
      !options.anyPermissions.some((perm) => staff.permissions.includes(perm))
    ) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, message: "Bạn không có quyền thực hiện thao tác này." },
          { status: 403 }
        ),
      };
    }
  }

  return { ok: true, staff };
}
