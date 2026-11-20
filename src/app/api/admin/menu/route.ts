import { NextResponse } from "next/server";
import { Product } from "@/types";
import {
  getProductsFromSqlite,
  createProductInSqlite,
  resetMenuTablesOnlyInSqlite,
} from "@/lib/sqlite";
import { requireStaffAuth } from "@/lib/serverAuth";
import { sanitizeImageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DEFAULT_COFFEE_IMG =
  "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Reset action to restore pure Cà Xòi menu ONLY (preserves orders, users, promotions, settings)
    if (body.action === "RESET_CA_XOI_MENU") {
      const adminAuth = await requireStaffAuth(request, { roles: ["SUPER_ADMIN"] });
      if (!adminAuth.ok) return adminAuth.response;

      const ok = resetMenuTablesOnlyInSqlite();
      if (!ok) {
        return NextResponse.json(
          { success: false, message: "Không thể khôi phục thực đơn chuẩn từ tệp SQL." },
          { status: 500 }
        );
      }
      const products = getProductsFromSqlite();
      return NextResponse.json({
        success: true,
        message: "Đã khôi phục Thực đơn chuẩn Quán Cà Xòi (giữ nguyên toàn bộ đơn hàng, doanh thu và tài khoản)!",
        data: products,
      });
    }

    const auth = await requireStaffAuth(request, { permission: "menu.edit_pricing" });
    if (!auth.ok) return auth.response;

    const {
      name,
      categoryId = 1,
      description = "",
      basePrice,
      salePrice = null,
      imageUrl = DEFAULT_COFFEE_IMG,
      prepTimeMinutes = 5,
      tags = ["NEW"],
      variants = [
        { id: 1, sizeName: "Ly", extraPrice: 0, isDefault: true },
        { id: 2, sizeName: "100ml", extraPrice: 8000, isDefault: false },
        { id: 3, sizeName: "250ml", extraPrice: 35000, isDefault: false },
      ],
      isAvailable = true,
      isFeatured = false,
    } = body;

    const cleanName = typeof name === "string" ? name.trim() : "";
    const parsedBasePrice = Number(basePrice);
    if (!cleanName || !Number.isFinite(parsedBasePrice) || parsedBasePrice < 0) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên món và giá bán cơ bản hợp lệ." },
        { status: 400 }
      );
    }

    const parsedSalePrice =
      salePrice !== null && salePrice !== undefined && salePrice !== ""
        ? Number(salePrice)
        : null;
    if (parsedSalePrice !== null && (!Number.isFinite(parsedSalePrice) || parsedSalePrice < 0)) {
      return NextResponse.json(
        { success: false, message: "Giá khuyến mãi không hợp lệ." },
        { status: 400 }
      );
    }

    const id = `p-${Date.now()}`;
    const slug = cleanName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");

    const newProduct: Product = {
      id,
      categoryId: Number(categoryId) || 1,
      name: cleanName,
      slug,
      description: typeof description === "string" ? description.trim() : "",
      imageUrl: sanitizeImageUrl(typeof imageUrl === "string" ? imageUrl : "", DEFAULT_COFFEE_IMG),
      basePrice: Math.round(parsedBasePrice),
      salePrice: parsedSalePrice !== null ? Math.round(parsedSalePrice) : null,
      isAvailable: Boolean(isAvailable),
      isFeatured: Boolean(isFeatured),
      prepTimeMinutes: Math.max(1, Math.min(60, Number(prepTimeMinutes) || 5)),
      tags: Array.isArray(tags) ? tags : ["NEW"],
      variants: Array.isArray(variants) ? variants : [],
    };

    const success = createProductInSqlite(newProduct);
    if (!success) {
      return NextResponse.json(
        { success: false, message: "Lỗi ghi dữ liệu món mới vào CSDL SQLite" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đã thêm món mới "${newProduct.name}" vào CSDL SQLite thành công!`,
      data: newProduct,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi tạo món mới" },
      { status: 500 }
    );
  }
}
