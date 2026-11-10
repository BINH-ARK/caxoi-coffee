export interface VietQRBank {
  id: string; // Mã viết tắt ngân hàng dùng cho VietQR (MB, VCB, TCB...)
  bin: string; // Mã định danh Napas BIN 6 số
  shortName: string; // Tên viết tắt thông dụng
  name: string; // Tên đầy đủ của ngân hàng
}

export const VIETQR_BANKS: VietQRBank[] = [
  { id: "MB", bin: "970422", shortName: "MBBank", name: "Ngân hàng TMCP Quân Đội" },
  { id: "VCB", bin: "970436", shortName: "Vietcombank", name: "Ngân hàng Ngoại Thương Việt Nam" },
  { id: "TCB", bin: "970407", shortName: "Techcombank", name: "Ngân hàng TMCP Kỹ Thương Việt Nam" },
  { id: "ICB", bin: "970415", shortName: "VietinBank", name: "Ngân hàng Công Thương Việt Nam" },
  { id: "BIDV", bin: "970418", shortName: "BIDV", name: "Ngân hàng Đầu tư & Phát triển Việt Nam" },
  { id: "ACB", bin: "970416", shortName: "ACB", name: "Ngân hàng TMCP Á Châu" },
  { id: "TPB", bin: "970423", shortName: "TPBank", name: "Ngân hàng TMCP Tiên Phong" },
  { id: "VPB", bin: "970432", shortName: "VPBank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng" },
  { id: "STB", bin: "970403", shortName: "Sacombank", name: "Ngân hàng Sài Gòn Thương Tín" },
  { id: "VIB", bin: "970441", shortName: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam" },
  { id: "HDB", bin: "970437", shortName: "HDBank", name: "Ngân hàng TMCP Phát triển TP.HCM" },
  { id: "SHB", bin: "970443", shortName: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội" },
  { id: "MSB", bin: "970426", shortName: "MSB", name: "Ngân hàng TMCP Hàng Hải Việt Nam" },
  { id: "OCB", bin: "970448", shortName: "OCB", name: "Ngân hàng TMCP Phương Đông" },
  { id: "SEAB", bin: "970440", shortName: "SeABank", name: "Ngân hàng TMCP Đông Nam Á" },
  { id: "CAKE", bin: "546034", shortName: "Cake by VPBank", name: "Ngân hàng số Cake by VPBank" },
  { id: "TIMO", bin: "963388", shortName: "Timo", name: "Ngân hàng số Timo by BVBank" },
];

export function getBankById(idOrBin: string): VietQRBank | undefined {
  const normalized = idOrBin?.trim().toUpperCase();
  return VIETQR_BANKS.find(
    (b) => b.id.toUpperCase() === normalized || b.bin === normalized || b.shortName.toUpperCase() === normalized
  );
}

export type VietQrTemplate = "compact2" | "compact" | "qr_only" | "print";

export interface VietQrOptions {
  bankId: string;
  accountNo: string;
  accountName: string;
  amount?: number;
  description?: string;
  template?: VietQrTemplate;
}

export function generateVietQrUrl({
  bankId,
  accountNo,
  accountName,
  amount = 0,
  description = "",
  template = "compact2",
}: VietQrOptions): string {
  const cleanBank = bankId?.trim().toUpperCase() || "MB";
  const cleanAcc = accountNo?.trim() || "999988886666";
  const cleanName = encodeURIComponent((accountName?.trim() || "CA XOI CAFE").toUpperCase());
  const cleanDesc = encodeURIComponent(description?.trim() || "");
  const numAmount = Math.max(0, Math.round(Number(amount) || 0));

  let url = `https://img.vietqr.io/image/${cleanBank}-${cleanAcc}-${template}.jpg?accountName=${cleanName}`;
  if (numAmount > 0) {
    url += `&amount=${numAmount}`;
  }
  if (cleanDesc) {
    url += `&addInfo=${cleanDesc}`;
  }
  return url;
}

export interface OperatingHoursStatus {
  isWithinHours: boolean;
  statusLabel: string;
  statusColor: "emerald" | "amber" | "red";
  openTime: string;
  closeTime: string;
  remainingMessage: string;
}

export function getOperatingHoursStatus(
  openTime: string = "07:00",
  closeTime: string = "18:30",
  currentDate = new Date()
): OperatingHoursStatus {
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);

  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
  const openMinutes = (isNaN(openH) ? 7 : openH) * 60 + (isNaN(openM) ? 0 : openM);
  const closeMinutes = (isNaN(closeH) ? 18 : closeH) * 60 + (isNaN(closeM) ? 30 : closeM);

  const isWithinHours = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  if (isWithinHours) {
    const diff = closeMinutes - currentMinutes;
    const hoursLeft = Math.floor(diff / 60);
    const minsLeft = diff % 60;
    const remainingMessage =
      hoursLeft > 0
        ? `Còn ${hoursLeft}h ${minsLeft}p trước giờ đóng cửa`
        : `Sắp đóng cửa trong ${minsLeft} phút nữa`;

    return {
      isWithinHours: true,
      statusLabel: "Trong khung giờ hoạt động",
      statusColor: "emerald",
      openTime,
      closeTime,
      remainingMessage,
    };
  } else {
    let nextOpenMsg = "";
    if (currentMinutes < openMinutes) {
      const wait = openMinutes - currentMinutes;
      const waitH = Math.floor(wait / 60);
      const waitM = wait % 60;
      nextOpenMsg = waitH > 0 ? `Mở cửa sau ${waitH}h ${waitM}p` : `Mở cửa sau ${waitM} phút`;
    } else {
      nextOpenMsg = `Mở cửa vào ${openTime} sáng mai`;
    }

    return {
      isWithinHours: false,
      statusLabel: "Ngoài giờ phục vụ",
      statusColor: "amber",
      openTime,
      closeTime,
      remainingMessage: nextOpenMsg,
    };
  }
}
