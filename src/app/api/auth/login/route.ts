import { NextResponse } from "next/server";
import { STAFF_USERS, signAuthToken, COOKIE_NAME } from "@/lib/auth";
import { findUserInSqlite } from "@/lib/sqlite";
import { findUserInMySql } from "@/lib/mysql";

// In-memory rate limiting tracker for login attempts
const failedAttemptsMap: Record<string, { count: number; lockedUntil: number }> = {};

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "local";
    const now = Date.now();

    // Check rate limit
    if (failedAttemptsMap[ip] && failedAttemptsMap[ip].lockedUntil > now) {
      const waitSecs = Math.ceil((failedAttemptsMap[ip].lockedUntil - now) / 1000);
      return NextResponse.json(
        {
          success: false,
          message: `Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau ${waitSecs} giây.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { username, password, pin, loginType = "CREDENTIALS" } = body;

    let matchedUser = null;

    if (loginType === "PIN") {
      // Barista tablet PIN unlock
      if (!pin) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập mã PIN 4 chữ số." },
          { status: 400 }
        );
      }
      // 1. Kiểm tra trong SQLite (DB Browser for SQLite)
      const sqliteUser = findUserInSqlite(pin, true);
      if (sqliteUser) {
        matchedUser = sqliteUser;
      } else {
        // 2. Kiểm tra MySQL nếu có
        const dbUser = await findUserInMySql(pin, true);
        if (dbUser) {
          matchedUser = dbUser;
        } else {
          matchedUser = STAFF_USERS.find((u) => u.pin === pin);
        }
      }
    } else {
      // Username & Password login
      if (!username || !password) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập tên đăng nhập và mật khẩu." },
          { status: 400 }
        );
      }
      // 1. Kiểm tra trong SQLite (DB Browser for SQLite)
      const sqliteUser = findUserInSqlite(username.trim(), false);
      if (sqliteUser && sqliteUser.plainPassword === password) {
        matchedUser = sqliteUser;
      } else {
        // 2. Kiểm tra MySQL nếu có
        const dbUser = await findUserInMySql(username.trim(), false);
        if (dbUser && dbUser.plainPassword === password) {
          matchedUser = dbUser;
        } else {
          matchedUser = STAFF_USERS.find(
            (u) =>
              u.username.toLowerCase() === username.trim().toLowerCase() &&
              u.plainPassword === password
          );
        }
      }
    }

    if (!matchedUser) {
      // Increment failed attempts
      if (!failedAttemptsMap[ip]) {
        failedAttemptsMap[ip] = { count: 1, lockedUntil: 0 };
      } else {
        failedAttemptsMap[ip].count += 1;
        if (failedAttemptsMap[ip].count >= 5) {
          failedAttemptsMap[ip].lockedUntil = now + 1000 * 60 * 3; // Lock 3 minutes
        }
      }

      return NextResponse.json(
        {
          success: false,
          message:
            loginType === "PIN"
              ? "Mã PIN quầy bar không chính xác."
              : "Tên đăng nhập hoặc mật khẩu không chính xác.",
        },
        { status: 401 }
      );
    }

    // Reset failed counter upon success
    delete failedAttemptsMap[ip];

    // Generate JWT
    const token = await signAuthToken({
      sub: matchedUser.id,
      username: matchedUser.username,
      fullName: matchedUser.fullName,
      role: matchedUser.role,
    });

    const response = NextResponse.json({
      success: true,
      message: `Đăng nhập thành công! Chào mừng ${matchedUser.fullName}`,
      user: {
        id: matchedUser.id,
        username: matchedUser.username,
        fullName: matchedUser.fullName,
        role: matchedUser.role,
      },
    });

    // Set secure HttpOnly cookie (auto-detect HTTPS)
    const isHttps = request.headers.get("x-forwarded-proto") === "https" || request.url.startsWith("https");
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi xử lý đăng nhập" },
      { status: 500 }
    );
  }
}
