import { NextResponse } from "next/server";
import {
  getProductsFromSqlite,
  updateProductInSqlite,
  deleteProductFromSqlite,
} from "@/lib/sqlite";
import { parseProductTags, sanitizeImageUrl } from "@/lib/utils";
import { requireStaffAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Phân quyền chi tiết: chỉ bật/tắt còn hàng -> menu.toggle_availability; sửa giá/thông tin -> menu.edit_pricing
    const bodyKeys = Object.keys(body || {});
    const isAvailabilityToggleOnly =
      bodyKeys.length > 0 && bodyKeys.every((k) => k === "isAvailable");

    const auth = isAvailabilityToggleOnly
      ? await requireStaffAuth(request, {
          anyPermissions: ["menu.toggle_availability", "menu.edit_pricing"],
        })
      : await requireStaffAuth(request, { permission: "menu.edit_pricing" });
    if (!auth.ok) return auth.response;

    const products = getProductsFromSqlite();
    const currentProduct = products.find((p) => p.id === id);

    if (!currentProduct) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy món trong thực đơn SQLite." },
        { status: 404 }
      );
    }

    const nextBasePrice =
      body.basePrice !== undefined ? Number(body.basePrice) : currentProduct.basePrice;
    if (!Number.isFinite(nextBasePrice) || nextBasePrice < 0) {
      return NextResponse.json(
        { success: false, message: "Giá bán cơ bản không hợp lệ." },
        { status: 400 }
      );
    }

    const nextSalePrice: number | null =
      body.salePrice !== undefined
        ? body.salePrice !== null && body.salePrice !== ""
          ? Number(body.salePrice)
          : null
        : currentProduct.salePrice ?? null;
    if (nextSalePrice !== null && (!Number.isFinite(nextSalePrice) || nextSalePrice < 0)) {
      return NextResponse.json(
        { success: false, message: "Giá khuyến mãi không hợp lệ." },
        { status: 400 }
      );
    }

    const updatedProduct = {
      ...currentProduct,
      name:
        typeof body.name === "string" && body.name.trim()
          ? body.name.trim()
          : currentProduct.name,
      description:
        typeof body.description === "string"
          ? body.description.trim()
          : currentProduct.description,
      imageUrl:
        typeof body.imageUrl === "string"
          ? sanitizeImageUrl(body.imageUrl, currentProduct.imageUrl)
          : currentProduct.imageUrl,
      categoryId:
        body.categoryId !== undefined ? Number(body.categoryId) || currentProduct.categoryId : currentProduct.categoryId,
      basePrice: Math.round(nextBasePrice),
      salePrice: nextSalePrice !== null ? Math.round(nextSalePrice) : null,
      isAvailable:
        body.isAvailable !== undefined ? Boolean(body.isAvailable) : currentProduct.isAvailable,
      isFeatured:
        body.isFeatured !== undefined ? Boolean(body.isFeatured) : currentProduct.isFeatured,
      prepTimeMinutes:
        body.prepTimeMinutes !== undefined
          ? Math.max(1, Math.min(60, Number(body.prepTimeMinutes) || currentProduct.prepTimeMinutes))
          : currentProduct.prepTimeMinutes,
      tags: body.tags !== undefined ? parseProductTags(body.tags) : currentProduct.tags,
      variants: Array.isArray(body.variants) ? body.variants : currentProduct.variants,
    };

    const success = updateProductInSqlite(updatedProduct);
    if (!success) {
      return NextResponse.json(
        { success: false, message: "Lỗi cập nhật CSDL SQLite" },
        { status: 500 }
      );
    }

    // Đọc lại từ SQLite để trả về đúng ID variant vừa lưu
    const refreshed = getProductsFromSqlite().find((p) => p.id === id) || updatedProduct;

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật món "${refreshed.name}" vào SQLite thành công!`,
      data: refreshed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi cập nhật sản phẩm" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireStaffAuth(request, { permission: "menu.edit_pricing" });
  if (!auth.ok) return auth.response;

  try {
    const { id } = params;
    const success = deleteProductFromSqlite(id);
    if (!success) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy món hoặc lỗi xóa trong CSDL SQLite" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã xóa món khỏi thực đơn SQLite thành công.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
