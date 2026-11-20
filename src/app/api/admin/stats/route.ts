import { NextResponse } from "next/server";
import { getStatsFromSqlite } from "@/lib/sqlite";
import { requireStaffAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireStaffAuth(request, {
    anyPermissions: ["finance.view_revenue", "finance.view_analytics"],
  });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") || "TODAY").toUpperCase();

  // 100% Thực thi truy vấn SQL tính toán doanh thu & phân bổ giờ thực tế từ caxoi_cafe.db
  const stats = getStatsFromSqlite(range);

  return NextResponse.json({
    success: true,
    data: stats,
  });
}
