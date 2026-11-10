import { NextResponse } from "next/server";
import { Product } from "@/types";
import {
  getProductsFromSqlite,
  createProductInSqlite,
  executeSqlSeedFile,
} from "@/lib/sqlite";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Reset action to restore pure Cà Xòi menu from SQL
    if (body.action === "RESET_CA_XOI_MENU") {
      executeSqlSeedFile();
      const products = getProductsFromSqlite();
      return NextResponse.json({
        success: true,
        message: "Đã khôi phục toàn bộ Thực đơn 5 món & 3 quy cách chuẩn Quán Cà Xòi từ SQLite!",
        data: products,
      });
    }

    const {
      name,
      categoryId = 1,
      description = "",
      basePrice,
      salePrice = null,
      imageUrl = "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
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

    if (!name || !basePrice) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên món và giá bán cơ bản." },
        { status: 400 }
      );
    }

    const id = `p-${Date.now()}`;
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");

    const newProduct: Product = {
      id,
      categoryId: Number(categoryId),
      name: name.trim(),
      slug,
      description: description.trim(),
      imageUrl,
      basePrice: Number(basePrice),
      salePrice: salePrice ? Number(salePrice) : null,
      isAvailable,
      isFeatured,
      prepTimeMinutes: Number(prepTimeMinutes),
      tags,
      variants,
    };

    // Lưu trực tiếp vào SQLite (caxoi_cafe.db)
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
