import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { FACEBOOK_FANPAGE_URL, XANH_SM_ONELINK } from "@/lib/utils";

export const dynamic = "force-dynamic";

const svgCache = new Map<string, string>();

function readLocalStaticQr(fileName: string): string | null {
  try {
    const filePath = path.join(process.cwd(), "public", "images", fileName);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }
  } catch {
    // Ignore local read failures and fall through
  }
  return null;
}

/**
 * GET /api/qr?url=...&color=140A06
 * Trả về mã QR SVG đồng bộ với liên kết Admin cấu hình, có fallback tệp tĩnh khi trùng URL mặc định.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = (searchParams.get("url") || "").trim();
  const rawColor = (searchParams.get("color") || "140A06").replace(/[^0-9a-fA-F]/g, "");
  const hexColor = rawColor.length === 6 ? rawColor : "140A06";

  if (!targetUrl) {
    return NextResponse.json({ success: false, message: "Thiếu tham số url" }, { status: 400 });
  }

  if (targetUrl === FACEBOOK_FANPAGE_URL) {
    const staticSvg = readLocalStaticQr("qr-facebook.svg");
    if (staticSvg) {
      return new NextResponse(staticSvg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  }

  if (targetUrl === XANH_SM_ONELINK) {
    const staticSvg = readLocalStaticQr("qr-xanhsm.svg");
    if (staticSvg) {
      return new NextResponse(staticSvg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ success: false, message: "URL phải bắt đầu bằng http:// hoặc https://" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ success: false, message: "URL không hợp lệ" }, { status: 400 });
  }

  const cacheKey = `${hexColor}:${parsed.toString()}`;
  const cached = svgCache.get(cacheKey);
  if (cached) {
    return new NextResponse(cached, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  try {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?format=svg&size=240x240&margin=1&ecc=M&color=${hexColor}&bgcolor=FFFFFF&data=${encodeURIComponent(parsed.toString())}`;
    const res = await fetch(qrApiUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const svgText = await res.text();
      if (svgText.includes("<svg")) {
        if (svgCache.size > 100) {
          svgCache.clear();
        }
        svgCache.set(cacheKey, svgText);
        return new NextResponse(svgText, {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }
  } catch (err) {
    console.warn("[QR API] Không thể tạo QR từ xa, dùng fallback cục bộ:", err);
  }

  const fallbackFile = hexColor.toUpperCase() === "005C3B" ? "qr-xanhsm.svg" : "qr-facebook.svg";
  const fallbackSvg = readLocalStaticQr(fallbackFile);
  if (fallbackSvg) {
    return new NextResponse(fallbackSvg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json({ success: false, message: "Không thể tạo mã QR" }, { status: 502 });
}
