import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireStaffAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const ENV_PATH = path.join(process.cwd(), ".env");
const EMAIL_REGEX = /^[^\s@<>()[\]\\,;:"\r\n]+@[^\s@<>()[\]\\,;:"\r\n]+\.[^\s@<>()[\]\\,;:"\r\n]+$/;

function hasControlChars(val: string): boolean {
  return /[\r\n\0]/.test(val);
}

function updateEnvVariable(content: string, key: string, value: string): string {
  const safeVal = value.replace(/[\r\n\0]/g, "");
  const regex = new RegExp(`^${key}=.*$`, "m");
  const escaped = safeVal.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const formattedValue = /[\s#"'$]/.test(safeVal) ? `"${escaped}"` : safeVal;

  if (regex.test(content)) {
    return content.replace(regex, `${key}=${formattedValue}`);
  }
  return content.trimEnd() + `\n${key}=${formattedValue}\n`;
}

export async function GET(request: Request) {
  const auth = await requireStaffAuth(request, { roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

  try {
    const smtpUser = process.env.SMTP_USER || "";
    const smtpPass = process.env.SMTP_PASS || "";
    const smtpFrom = process.env.SMTP_FROM || (smtpUser ? `Cà Xòi Coffee & Tea ☕ <${smtpUser}>` : "");
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = process.env.SMTP_PORT || "465";

    return NextResponse.json({
      success: true,
      data: {
        smtpUser,
        hasPassword: Boolean(smtpPass),
        smtpFrom,
        smtpHost,
        smtpPort,
        isConfigured: Boolean(smtpUser && smtpPass),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi đọc cấu hình email." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireStaffAuth(request, { roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const rawUser = typeof body.smtpUser === "string" ? body.smtpUser : "";
    const rawPass = typeof body.smtpPass === "string" ? body.smtpPass : "";
    const rawFrom = typeof body.smtpFrom === "string" ? body.smtpFrom : "";

    if (hasControlChars(rawUser) || hasControlChars(rawPass) || hasControlChars(rawFrom)) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu cấu hình email chứa ký tự điều khiển không hợp lệ." },
        { status: 400 }
      );
    }

    const cleanUser = rawUser.trim().toLowerCase();
    if (!cleanUser || !EMAIL_REGEX.test(cleanUser) || cleanUser.length > 120) {
      return NextResponse.json(
        { success: false, message: "Địa chỉ Gmail gửi thư (SMTP_USER) không hợp lệ." },
        { status: 400 }
      );
    }

    // Bỏ khoảng cách trong App Password nếu người dùng sao chép dạng "xxxx xxxx xxxx xxxx"
    const cleanPass = rawPass.trim()
      ? rawPass.replace(/\s+/g, "").trim()
      : process.env.SMTP_PASS || "";

    if (!cleanPass || cleanPass.length > 128) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập Mật khẩu ứng dụng 16 ký tự của Google (SMTP_PASS)." },
        { status: 400 }
      );
    }

    const fromName = (rawFrom.trim() || `Cà Xòi Coffee & Tea ☕ <${cleanUser}>`).slice(0, 180);

    // 1. Cập nhật vào runtime process.env ngay lập tức
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "true";
    process.env.SMTP_USER = cleanUser;
    process.env.SMTP_PASS = cleanPass;
    process.env.SMTP_FROM = fromName;

    // 2. Ghi đè an toàn vào tệp tin .env
    try {
      let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf-8") : "";

      content = updateEnvVariable(content, "SMTP_HOST", "smtp.gmail.com");
      content = updateEnvVariable(content, "SMTP_PORT", "465");
      content = updateEnvVariable(content, "SMTP_SECURE", "true");
      content = updateEnvVariable(content, "SMTP_USER", cleanUser);
      content = updateEnvVariable(content, "SMTP_PASS", cleanPass);
      content = updateEnvVariable(content, "SMTP_FROM", fromName);

      fs.writeFileSync(ENV_PATH, content, "utf-8");
      console.log("[Email Config API] Đã cập nhật cấu hình Gmail SMTP vào .env thành công!");
    } catch (fileErr: any) {
      console.error("[Email Config API] Lỗi ghi file .env:", fileErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Đã lưu thành công tài khoản Gmail "${cleanUser}"!`,
      data: {
        smtpUser: cleanUser,
        hasPassword: true,
        smtpFrom: fromName,
        isConfigured: true,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi lưu cấu hình email." },
      { status: 500 }
    );
  }
}
