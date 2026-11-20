import crypto from "node:crypto";

const SCRYPT_PREFIX = "scrypt$";
const KEY_LENGTH = 64;

/**
 * Băm mật khẩu / PIN bằng scrypt với 16-byte random salt.
 */
export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plain, salt, KEY_LENGTH).toString("hex");
  return `${SCRYPT_PREFIX}${salt}$${derived}`;
}

/**
 * Kiểm tra xem chuỗi đã ở định dạng scrypt hay chưa.
 */
export function isScryptHash(value?: string | null): boolean {
  return typeof value === "string" && value.startsWith(SCRYPT_PREFIX) && value.split("$").length === 3;
}

/**
 * Đối chiếu mật khẩu dạng constant-time với chuỗi băm scrypt.
 */
export function verifyPassword(plain: string, storedHash?: string | null): boolean {
  if (!plain || !storedHash || !isScryptHash(storedHash)) {
    return false;
  }
  const parts = storedHash.split("$");
  const salt = parts[1];
  const expectedHex = parts[2];
  if (!salt || !expectedHex) return false;

  try {
    const derived = crypto.scryptSync(plain, salt, KEY_LENGTH);
    const expected = Buffer.from(expectedHex, "hex");
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * So sánh chuỗi bí mật kiểu constant-time (chống timing attack).
 */
export function safeEqualStrings(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
