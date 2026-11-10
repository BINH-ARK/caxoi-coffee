import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const ENV_PATH = path.join(process.cwd(), ".env");

function updateEnvVariable(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, "m");
  const formattedValue = value.includes(" ") && !value.startsWith('"') ? `"${value}"` : value;

  if (regex.test(content)) {
    return content.replace(regex, `${key}=${formattedValue}`);
  }
  return content.trimEnd() + `\n${key}=${formattedValue}\n`;
}

export async function GET() {
  try {
    const smtpUser = process.env.SMTP_USER || "";
    const smtpPass = process.env.SMTP_PASS || "";
    const smtpFrom = process.env.SMTP_FROM || `Cà Xòi Coffee & Tea ☕ <${smtpUser}>`;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = process.env.SMTP_PORT || "465";

    return NextResponse.json({
      success: true,
      data: {
        smtpUser,
        smtpPass,
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
  try {
    const body = await request.json();
    const { smtpUser, smtpPass, smtpFrom } = body;

    if (!smtpUser || !smtpUser.trim()) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập địa chỉ Gmail gửi thư (SMTP_USER)." },
        { status: 400 }
      );
    }

    const cleanUser = smtpUser.trim().toLowerCase();
    // Bỏ khoảng cách trong App Password nếu người dùng sao chép dạng "xxxx xxxx xxxx xxxx"
    const cleanPass = smtpPass ? smtpPass.replace(/\s+/g, "").trim() : (process.env.SMTP_PASS || "");

    if (!cleanPass) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập Mật khẩu ứng dụng 16 ký tự của Google (SMTP_PASS)." },
        { status: 400 }
      );
    }

    const fromName = smtpFrom?.trim() || `Cà Xòi Coffee & Tea ☕ <${cleanUser}>`;

    // 1. Cập nhật vào runtime process.env ngay lập tức
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "true";
    process.env.SMTP_USER = cleanUser;
    process.env.SMTP_PASS = cleanPass;
    process.env.SMTP_FROM = fromName;

    // 2. Ghi đè vào tệp tin .env
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
      message: `Đã lưu thành công tài khoản Gmail "${cleanUser}" vào file .env!`,
      data: {
        smtpUser: cleanUser,
        smtpPass: cleanPass,
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
