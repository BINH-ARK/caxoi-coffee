import { SignJWT, jwtVerify } from "jose";

export type Role = "SUPER_ADMIN" | "STORE_MANAGER" | "BARISTA" | "CASHIER";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  pin?: string;
}

export interface TokenPayload {
  sub: string;
  username: string;
  fullName: string;
  role: Role;
  tv?: number; // tokenVersion for immediate revocation on logout/password/role changes
  [key: string]: unknown;
}

export const COOKIE_NAME = "cafe_auth_token";

/**
 * Đọc khóa bí mật JWT từ biến môi trường; tuyệt đối không dùng fallback hardcoded.
 */
export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("Thiếu cấu hình bảo mật JWT_SECRET (bắt buộc tối thiểu 32 ký tự).");
  }
  return new TextEncoder().encode(secret);
}

// Sign JWT Token
export async function signAuthToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getJwtSecretKey());
}

// Verify JWT Token
export async function verifyAuthToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}
