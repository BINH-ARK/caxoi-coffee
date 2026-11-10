import { NextResponse } from "next/server";
import {
  getProductsFromSqlite,
  getCategoriesFromSqlite,
  getProductOptionsFromSqlite,
  getBusinessSettingsFromSqlite,
} from "@/lib/sqlite";
import { getProductsFromMySql } from "@/lib/mysql";

export const dynamic = "force-dynamic";

export async function GET() {
  // 1. Đọc thực đơn 100% từ SQLite (caxoi_cafe.db)
  let products = getProductsFromSqlite();
  let categories = getCategoriesFromSqlite();
  let options = getProductOptionsFromSqlite();
  let settings = getBusinessSettingsFromSqlite();

  // 2. Dự phòng sang MySQL nếu SQLite không có dữ liệu
  if (!products || products.length === 0) {
    try {
      const dbProducts = await getProductsFromMySql();
      if (dbProducts && dbProducts.length > 0) {
        products = dbProducts;
      }
    } catch {}
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        categories,
        products,
        options,
        settings,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
