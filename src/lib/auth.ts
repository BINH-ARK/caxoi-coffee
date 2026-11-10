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
  [key: string]: any;
}

const JWT_SECRET = process.env.JWT_SECRET || "cafe_office_super_secure_jwt_secret_key_2026_change_in_prod";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export const COOKIE_NAME = "cafe_auth_token";

// Standard staff directory matching seeds.sql
export const STAFF_USERS: (AuthUser & { passwordHash?: string; plainPassword?: string })[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    username: "admin",
    plainPassword: "Admin@123456",
    fullName: "Quản Trị Viên (Chủ Quán)",
    role: "SUPER_ADMIN",
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    username: "manager",
    plainPassword: "Manager@123",
    fullName: "Lê Cửa Hàng Trưởng",
    role: "STORE_MANAGER",
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    username: "barista1",
    plainPassword: "Barista@123",
    pin: "8823", // 4-digit PIN for quick touch unlock on KDS tablets
    fullName: "Nguyễn Văn Barista",
    role: "BARISTA",
  },
  {
    id: "a0000000-0000-0000-0000-000000000004",
    username: "cashier1",
    plainPassword: "Cashier@123",
    pin: "6688",
    fullName: "Trần Thu Ngân",
    role: "CASHIER",
  },
];

// Sign JWT Token
export async function signAuthToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey);
}

// Verify JWT Token
export async function verifyAuthToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}
