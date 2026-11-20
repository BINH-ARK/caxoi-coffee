import { CartItem, Product, ProductOption, SelectedOptionItem } from "@/types";

export interface AuthoritativeResolvedItem {
  product: Product;
  variant: Product["variants"][number];
  selectedOptions: SelectedOptionItem[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  recipientLabel?: string;
  notes?: string;
}

/**
 * Tra cứu và tính lại toàn bộ giá món, size và topping trực tiếp từ CSDL SQLite.
 * Tuyệt đối không tin unitPrice, totalPrice hoặc extraPrice do trình duyệt gửi lên.
 */
export function resolveCartItemFromCatalog(
  rawItem: Partial<CartItem> & { productId?: string; variantId?: number; variantName?: string },
  catalogProducts: Product[],
  catalogOptions: ProductOption[]
): { ok: true; item: AuthoritativeResolvedItem } | { ok: false; message: string } {
  const productId = rawItem?.product?.id || rawItem?.productId;
  if (!productId || typeof productId !== "string") {
    return { ok: false, message: "Thiếu mã sản phẩm hợp lệ trong giỏ hàng." };
  }

  const product = catalogProducts.find((p) => p.id === productId);
  if (!product) {
    return { ok: false, message: `Sản phẩm (${productId}) không còn tồn tại trong thực đơn.` };
  }
  if (!product.isAvailable) {
    return { ok: false, message: `Món "${product.name}" hiện đang tạm hết hàng.` };
  }

  const rawQty = Number(rawItem.quantity);
  if (!Number.isInteger(rawQty) || rawQty < 1 || rawQty > 50) {
    return { ok: false, message: `Số lượng của món "${product.name}" phải là số nguyên từ 1 đến 50.` };
  }

  // Tìm quy cách/size hợp lệ theo ID hoặc tên size
  const reqVariantId = rawItem?.variant?.id ?? rawItem?.variantId;
  const reqSizeName = (rawItem?.variant?.sizeName ?? rawItem?.variantName ?? "").trim().toLowerCase();

  let variant = product.variants.find((v) => reqVariantId != null && v.id === Number(reqVariantId));
  if (!variant && reqSizeName) {
    variant = product.variants.find((v) => v.sizeName.trim().toLowerCase() === reqSizeName);
  }
  if (!variant) {
    variant = product.variants.find((v) => v.isDefault) || product.variants[0];
  }
  if (!variant) {
    return { ok: false, message: `Không tìm thấy quy cách hợp lệ cho món "${product.name}".` };
  }

  // Đối chiếu toàn bộ tùy chọn / topping với bảng giá SQLite
  const resolvedOptions: SelectedOptionItem[] = [];
  let optionsExtra = 0;
  const rawOptions = Array.isArray(rawItem.selectedOptions) ? rawItem.selectedOptions : [];

  for (const rawOpt of rawOptions) {
    const optName = String(rawOpt?.optionName || "").trim().toLowerCase();
    const valName = String(rawOpt?.valueName || "").trim().toLowerCase();
    if (!optName || !valName) continue;

    const matchedGroup = catalogOptions.find((g) => g.name.trim().toLowerCase() === optName);
    if (!matchedGroup) continue;
    const matchedVal = matchedGroup.values.find((v) => v.name.trim().toLowerCase() === valName);
    if (!matchedVal) continue;

    // Tránh trùng lặp tùy chọn cùng nhóm nếu là single-select
    if (
      !matchedGroup.isMultiple &&
      resolvedOptions.some((ro) => ro.optionName.trim().toLowerCase() === matchedGroup.name.trim().toLowerCase())
    ) {
      continue;
    }

    const authoritativeExtra = Math.max(0, Number(matchedVal.extraPrice) || 0);
    resolvedOptions.push({
      optionName: matchedGroup.name,
      valueName: matchedVal.name,
      extraPrice: authoritativeExtra,
    });
    optionsExtra += authoritativeExtra;
  }

  const base = Math.max(0, Number(product.salePrice ?? product.basePrice) || 0);
  const variantExtra = Math.max(0, Number(variant.extraPrice) || 0);
  const unitPrice = base + variantExtra + optionsExtra;
  const totalPrice = unitPrice * rawQty;

  return {
    ok: true,
    item: {
      product,
      variant,
      selectedOptions: resolvedOptions,
      quantity: rawQty,
      unitPrice,
      totalPrice,
      recipientLabel: rawItem.recipientLabel ? String(rawItem.recipientLabel).trim().slice(0, 80) : undefined,
      notes: rawItem.notes ? String(rawItem.notes).trim().slice(0, 200) : undefined,
    },
  };
}
