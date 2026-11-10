import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return "Vừa xong";
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export { generateVietQrUrl } from "./vietqr";

export const POPULAR_BUILDINGS = [
  "Software Park Đà Nẵng (02 Quang Trung, Hải Châu)",
  "FPT Complex Đà Nẵng (KĐT FPT City, Ngũ Hành Sơn)",
  "Indochina Riverside Towers (74 Bạch Đằng, Hải Châu)",
  "Tòa nhà Viettel Đà Nẵng (Nguyễn Văn Linh, Hải Châu)",
  "Vĩnh Trung Plaza (255 Hùng Vương, Thanh Khê)",
  "ACB Tower Đà Nẵng (218 Bạch Đằng, Hải Châu)",
  "Công viên Phần mềm số 2 (Software Park 2 - Thuận Phước)",
  "Tòa nhà Phi Long Technology (Nguyễn Văn Linh, Thanh Khê)",
  "Tòa nhà Bưu điện Đà Nẵng (155 Trần Phú, Hải Châu)",
  "Khu văn phòng Quận Hải Châu, Đà Nẵng",
  "Khu văn phòng Quận Thanh Khê, Đà Nẵng",
  "Khu văn phòng Quận Ngũ Hành Sơn, Đà Nẵng",
  "Khách ghé quán lấy trực tiếp (để gặp Xòi)",
];
