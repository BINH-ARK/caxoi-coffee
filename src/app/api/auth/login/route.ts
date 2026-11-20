import { NextResponse } from "next/server";
import { signAuthToken, COOKIE_NAME } from "@/lib/auth";
import { findUserInSqlite } from "@/lib/sqlite";
import { verifyPassword } from "@/lib/password";
import { getTrustedClientIp } from "@/lib/serverAuth";

interface AttemptRecord {
  count: number;
  lockedUntil: number;
  lastAttempt: number;
}

const failedAttemptsMap = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 1000 * 60 * 3; // 3 phút
const RECORD_TTL_MS = 1000 * 60 * 15; // Dọn sau 15 phút không hoạt động

function pruneExpiredAttempts(now: number) {
  if (failedAttemptsMap.size < 200) return;
  failedAttemptsMap.forEach((rec, key) => {
    if (now - rec.lastAttempt > RECORD_TTL_MS && rec.lockedUntil < now) {
      failedAttemptsMap.delete(key);
    }
  });
}

function recordFailure(key: string, now: number) {
  const existing = failedAttemptsMap.get(key);
  if (!existing || now - existing.lastAttempt > RECORD_TTL_MS) {
    failedAttemptsMap.set(key, { count: 1, lockedUntil: 0, lastAttempt: now });
  } else {
    existing.count += 1;
    existing.lastAttempt = now;
    if (existing.count >= MAX_ATTEMPTS) {
      existing.lockedUntil = now + LOCK_DURATION_MS;
    }
  }
}

export async function POST(request: Request) {
  try {
    const ip = getTrustedClientIp(request);
    const now = Date.now();
    pruneExpiredAttempts(now);

    const body = await request.json();
    const { username, password, pin, loginType = "CREDENTIALS" } = body;

    // Khóa theo tổ hợp IP + tài khoản (hoặc kênh PIN toàn cục) để chống brute-force & bypass X-Forwarded-For
    const ipKey = `ip:${ip}`;
    const subjectKey =
      loginType === "PIN"
        ? `pin:${ip}`
        : `user:${String(username || "").trim().toLowerCase()}`;
    const pinGlobalKey = loginType === "PIN" ? "pin:global" : null;

    const keysToCheck = [ipKey, subjectKey, ...(pinGlobalKey ? [pinGlobalKey] : [])];
    for (const k of keysToCheck) {
      const rec = failedAttemptsMap.get(k);
      if (rec && rec.lockedUntil > now) {
        const waitSecs = Math.ceil((rec.lockedUntil - now) / 1000);
        return NextResponse.json(
          {
            success: false,
            message: `Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau ${waitSecs} giây.`,
          },
          { status: 429 }
        );
      }
    }

    let matchedUser: {
      id: string;
      username: string;
      fullName: string;
      role: "SUPER_ADMIN" | "STORE_MANAGER" | "BARISTA" | "CASHIER";
      tokenVersion: number;
    } | null = null;

    if (loginType === "PIN") {
      const cleanPin = typeof pin === "string" ? pin.trim() : "";
      if (!/^\d{4,6}$/.test(cleanPin)) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập mã PIN KDS hợp lệ (4–6 chữ số)." },
          { status: 400 }
        );
      }
      // Chỉ chấp nhận PIN của BARISTA / CASHIER trong SQLite (tuyệt đối không fallback hardcoded, cấm SUPER_ADMIN/STORE_MANAGER)
      const sqliteUser = findUserInSqlite(cleanPin, true);
      if (sqliteUser) {
        matchedUser = sqliteUser;
      }
    } else {
      const cleanUser = typeof username === "string" ? username.trim() : "";
      const rawPassword = typeof password === "string" ? password : "";
      if (!cleanUser || !rawPassword) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập tên đăng nhập và mật khẩu." },
          { status: 400 }
        );
      }
      // Xác thực duy nhất với SQLite sử dụng băm scrypt + timingSafeEqual (không fallback STAFF_USERS)
      const sqliteUser = findUserInSqlite(cleanUser, false);
      if (sqliteUser && verifyPassword(rawPassword, sqliteUser.passwordHash)) {
        matchedUser = sqliteUser;
      }
    }

    if (!matchedUser) {
      recordFailure(ipKey, now);
      recordFailure(subjectKey, now);
      if (pinGlobalKey) recordFailure(pinGlobalKey, now);

      return NextResponse.json(
        {
          success: false,
          message:
            loginType === "PIN"
              ? "Mã PIN quầy bar không chính xác (hoặc vai trò không hỗ trợ đăng nhập bằng PIN)."
              : "Tên đăng nhập hoặc mật khẩu không chính xác.",
        },
        { status: 401 }
      );
    }

    failedAttemptsMap.delete(ipKey);
    failedAttemptsMap.delete(subjectKey);
    if (pinGlobalKey) failedAttemptsMap.delete(pinGlobalKey);

    const token = await signAuthToken({
      sub: matchedUser.id,
      username: matchedUser.username,
      fullName: matchedUser.fullName,
      role: matchedUser.role,
      tv: matchedUser.tokenVersion,
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

    const isSecureCookie =
      process.env.NODE_ENV === "production" ||
      request.url.startsWith("https://");
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 giờ
    });

    return response;
  } catch (error) {
    console.error("[Auth Login Error]", error);
    return NextResponse.json(
      { success: false, message: "Lỗi xử lý đăng nhập. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
