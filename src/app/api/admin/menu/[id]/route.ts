import { NextResponse } from "next/server";
import {
  getProductsFromSqlite,
  updateProductInSqlite,
  deleteProductFromSqlite,
} from "@/lib/sqlite";
import { updateProductInMySql } from "@/lib/mysql";
import { parseProductTags } from "@/lib/utils";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const products = getProductsFromSqlite();
    const currentProduct = products.find((p) => p.id === id);

    if (!currentProduct) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy món trong thực đơn SQLite." },
        { status: 404 }
      );
    }

    const updatedProduct = {
      ...currentProduct,
      name: body.name !== undefined ? body.name.trim() : currentProduct.name,
      description: body.description !== undefined ? body.description.trim() : currentProduct.description,
      imageUrl: body.imageUrl !== undefined ? body.imageUrl.trim() : currentProduct.imageUrl,
      categoryId: body.categoryId !== undefined ? Number(body.categoryId) : currentProduct.categoryId,
      basePrice: body.basePrice !== undefined ? Number(body.basePrice) : currentProduct.basePrice,
      salePrice: body.salePrice !== undefined ? (body.salePrice ? Number(body.salePrice) : null) : currentProduct.salePrice,
      isAvailable: body.isAvailable !== undefined ? Boolean(body.isAvailable) : currentProduct.isAvailable,
      isFeatured: body.isFeatured !== undefined ? Boolean(body.isFeatured) : currentProduct.isFeatured,
      prepTimeMinutes: body.prepTimeMinutes !== undefined ? Number(body.prepTimeMinutes) : currentProduct.prepTimeMinutes,
      tags: body.tags !== undefined ? parseProductTags(body.tags) : currentProduct.tags,
      variants: body.variants !== undefined ? body.variants : currentProduct.variants,
    };

    // 1. Cập nhật trực tiếp vào SQLite (caxoi_cafe.db)
    const success = updateProductInSqlite(updatedProduct);
    if (!success) {
      return NextResponse.json(
        { success: false, message: "Lỗi cập nhật CSDL SQLite" },
        { status: 500 }
      );
    }

    // 2. Đồng bộ vào MySQL nếu có kết nối
    try {
      await updateProductInMySql(updatedProduct);
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật món "${updatedProduct.name}" vào SQLite thành công!`,
      data: updatedProduct,
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
