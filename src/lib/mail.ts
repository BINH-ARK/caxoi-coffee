import nodemailer from "nodemailer";
import { Order } from "@/types";
import { getNotificationStaffEmails } from "@/lib/sqlite";

/**
 * Cấu hình kết nối SMTP máy chủ gửi mail (Mặc định tối ưu cho Google Gmail)
 */
function getMailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE !== "false"; // 465 = true, 587 = false
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false, // Tránh lỗi self-signed cert trên môi trường dev
    },
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

/**
 * Tạo giao diện HTML Email tối ưu thương hiệu Cà Xòi Coffee
 * Tương thích 100% ứng dụng Gmail trên iPhone, iPad, Android và Web Desktop
 */
export function generateOrderEmailHtml(order: Order, baseUrl = "http://localhost:3000"): string {
  const isTakeaway = order.orderType === "TAKEAWAY";
  const typeText = isTakeaway ? "🛍️ Khách Tự Đến Lấy (Takeaway)" : "🛵 Giao Tận Nơi Văn Phòng";
  const typeBg = isTakeaway ? "#E0F2FE" : "#FEF3C7";
  const typeColor = isTakeaway ? "#0369A1" : "#92400E";

  const paymentText =
    order.paymentMethod === "VIETQR_BANKING"
      ? order.paymentStatus === "PAID"
        ? "✅ ĐÃ THANH TOÁN (VietQR Banking)"
        : "⏳ CHỜ QUÉT MÃ VIETQR (Chưa nhận tiền)"
      : "💵 TIỀN MẶT KHI NHẬN HÀNG (COD)";

  const paymentBg = order.paymentStatus === "PAID" ? "#D1FAE5" : "#FEF9C3";
  const paymentColor = order.paymentStatus === "PAID" ? "#065F46" : "#854D0E";

  const kdsUrl = `${baseUrl}/kds`;
  const adminUrl = `${baseUrl}/admin`;
  const orderUrl = `${baseUrl}/order/${order.id}`;

  const itemsHtml = order.items
    .map((item, idx) => {
      const optionsHtml =
        item.options && item.options.length > 0
          ? item.options
              .map(
                (opt) =>
                  `<span style="display:inline-block;background-color:#F5EBE1;color:#78350F;padding:2px 8px;border-radius:6px;font-size:11px;margin-right:4px;margin-top:3px;font-weight:600;">${opt.optionName}: ${opt.valueName}</span>`
              )
              .join("")
          : "";

      const notesHtml = item.itemNotes
        ? `<div style="margin-top:4px;font-size:11px;color:#DC2626;font-style:italic;">⚠️ Ghi chú món: ${item.itemNotes}</div>`
        : "";

      const recipientHtml = item.recipientLabel
        ? `<div style="margin-top:3px;font-size:11px;color:#0284C7;font-weight:bold;">🏷️ Tên in tem ly: ${item.recipientLabel}</div>`
        : "";

      return `
        <tr style="border-bottom:1px solid #F3EDE6;">
          <td style="padding:12px 10px;vertical-align:top;width:30px;color:#A89F91;font-weight:bold;">#${idx + 1}</td>
          <td style="padding:12px 10px;vertical-align:top;">
            <div style="font-size:14px;font-weight:bold;color:#2C1810;">
              ${item.productName}
              <span style="display:inline-block;background-color:#2C1810;color:#FDE68A;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px;font-weight:bold;">${item.variantName}</span>
            </div>
            ${optionsHtml ? `<div style="margin-top:4px;">${optionsHtml}</div>` : ""}
            ${recipientHtml}
            ${notesHtml}
          </td>
          <td style="padding:12px 10px;vertical-align:top;text-align:center;font-weight:bold;font-size:14px;color:#2C1810;">
            x${item.quantity}
          </td>
          <td style="padding:12px 10px;vertical-align:top;text-align:right;font-weight:bold;font-size:13px;color:#92400E;white-space:nowrap;">
            ${formatCurrency(item.totalPrice)}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đơn Hàng Mới #${order.orderCode} - Cà Xòi Coffee</title>
</head>
<body style="margin:0;padding:0;background-color:#F5EBE1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2C1810;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F5EBE1;padding:20px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width:620px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(44,24,16,0.12);border:1px solid #E6D5C3;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #2C1810 0%, #4A2818 100%);padding:28px 24px;text-align:center;border-bottom:4px solid #D4A373;">
              <div style="font-size:24px;line-height:28px;margin-bottom:6px;">☕ 🍵 🥐</div>
              <h1 style="margin:0;font-size:22px;color:#FFFFFF;letter-spacing:0.5px;font-weight:800;text-transform:uppercase;">
                CÀ XÒI COFFEE & TEA
              </h1>
              <p style="margin:4px 0 0;font-size:12px;color:#FDE68A;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
                Thông Báo Đơn Hàng Mới Cho Quầy Bar & Quản Lý
              </p>
            </td>
          </tr>

          <!-- Order Status Bar -->
          <tr>
            <td style="padding:18px 24px;background-color:#FAF5F0;border-bottom:1px solid #EFE4D6;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size:11px;color:#78350F;text-transform:uppercase;font-weight:bold;letter-spacing:0.5px;">MÃ ĐƠN HÀNG</span>
                    <div style="font-size:22px;font-weight:900;color:#92400E;letter-spacing:0.5px;">#${order.orderCode}</div>
                    <div style="font-size:11px;color:#8C7B6E;margin-top:2px;">Đặt lúc: ${formatDateTime(order.createdAt)}</div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;padding:6px 12px;border-radius:30px;background-color:${typeBg};color:${typeColor};font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">
                      ${typeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer & Delivery Info -->
          <tr>
            <td style="padding:20px 24px;">
              <div style="font-size:13px;font-weight:800;color:#2C1810;text-transform:uppercase;margin-bottom:12px;border-bottom:2px solid #F3EDE6;padding-bottom:6px;">
                👤 Thông Tin Người Nhận
              </div>
              <table width="100%" cellspacing="0" cellpadding="4" style="font-size:13px;color:#4A3828;">
                <tr>
                  <td style="width:110px;color:#8C7B6E;font-weight:bold;">Khách hàng:</td>
                  <td style="font-weight:bold;color:#2C1810;font-size:14px;">${order.recipientName}</td>
                </tr>
                <tr>
                  <td style="color:#8C7B6E;font-weight:bold;">Điện thoại:</td>
                  <td>
                    <a href="tel:${order.recipientPhone}" style="color:#D97706;font-weight:bold;text-decoration:none;font-size:14px;">
                      📞 ${order.recipientPhone} (Bấm gọi ngay)
                    </a>
                  </td>
                </tr>
                ${
                  !isTakeaway
                    ? `
                <tr>
                  <td style="color:#8C7B6E;font-weight:bold;vertical-align:top;">Địa chỉ giao:</td>
                  <td style="font-weight:600;color:#2C1810;">
                    ${order.floorRoom ? `Tầng/Phòng: <strong>${order.floorRoom}</strong> - ` : ""}
                    ${order.deliveryAddress || `${order.buildingName || order.companyName || "Đà Nẵng"}`}
                  </td>
                </tr>
                `
                    : ""
                }
                ${
                  order.deliveryNotes
                    ? `
                <tr>
                  <td style="color:#DC2626;font-weight:bold;vertical-align:top;">Ghi chú giao:</td>
                  <td style="color:#DC2626;font-weight:600;background-color:#FEF2F2;padding:6px;border-radius:6px;">
                    ${order.deliveryNotes}
                  </td>
                </tr>
                `
                    : ""
                }
              </table>
            </td>
          </tr>

          <!-- Drinks Order Items List (Critical for Barista) -->
          <tr>
            <td style="padding:0 24px 20px;">
              <div style="font-size:13px;font-weight:800;color:#2C1810;text-transform:uppercase;margin-bottom:8px;border-bottom:2px solid #F3EDE6;padding-bottom:6px;">
                🥤 Chi Tiết Đồ Uống Cần Pha Chế (${order.items.length} món)
              </div>
              <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                <thead>
                  <tr style="background-color:#F5EBE1;color:#78350F;font-size:11px;text-transform:uppercase;font-weight:bold;">
                    <th style="padding:8px 10px;text-align:left;border-radius:8px 0 0 8px;">STT</th>
                    <th style="padding:8px 10px;text-align:left;">Món & Công Thức Yêu Cầu</th>
                    <th style="padding:8px 10px;text-align:center;">SL</th>
                    <th style="padding:8px 10px;text-align:right;border-radius:0 8px 8px 0;">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Payment Summary -->
          <tr>
            <td style="padding:16px 24px;background-color:#FAF5F0;border-top:1px solid #EFE4D6;border-bottom:1px solid #EFE4D6;">
              <table width="100%" cellspacing="0" cellpadding="4" style="font-size:13px;color:#4A3828;">
                <tr>
                  <td>Tiền hàng:</td>
                  <td align="right" style="font-weight:600;">${formatCurrency(order.subtotalAmount)}</td>
                </tr>
                ${
                  order.deliveryFee > 0
                    ? `
                <tr>
                  <td>Phí giao hàng:</td>
                  <td align="right" style="font-weight:600;">${formatCurrency(order.deliveryFee)}</td>
                </tr>
                `
                    : ""
                }
                ${
                  order.discountAmount > 0
                    ? `
                <tr>
                  <td style="color:#059669;">Giảm giá (${order.promotionCode || "Khuyến mãi"}):</td>
                  <td align="right" style="font-weight:bold;color:#059669;">-${formatCurrency(order.discountAmount)}</td>
                </tr>
                `
                    : ""
                }
                <tr style="border-top:1px dashed #D6C2AF;">
                  <td style="padding-top:8px;font-size:15px;font-weight:bold;color:#2C1810;">TỔNG THANH TOÁN:</td>
                  <td align="right" style="padding-top:8px;font-size:18px;font-weight:900;color:#92400E;">${formatCurrency(order.totalAmount)}</td>
                </tr>
              </table>

              <div style="margin-top:12px;padding:10px 14px;border-radius:10px;background-color:${paymentBg};color:${paymentColor};font-size:12px;font-weight:bold;text-align:center;">
                ${paymentText}
              </div>
            </td>
          </tr>

          <!-- Quick Action Buttons -->
          <tr>
            <td style="padding:24px;text-align:center;">
              <div style="font-size:12px;color:#8C7B6E;margin-bottom:12px;font-weight:bold;">
                THAO TÁC XỬ LÝ NHANH TRÊN HỆ THỐNG:
              </div>
              <table align="center" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:0 6px;">
                    <a href="${kdsUrl}" target="_blank" style="display:inline-block;background-color:#92400E;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:bold;padding:12px 20px;border-radius:12px;box-shadow:0 4px 12px rgba(146,64,14,0.3);">
                      ☕ Mở KDS Pha Chế
                    </a>
                  </td>
                  <td style="padding:0 6px;">
                    <a href="${adminUrl}" target="_blank" style="display:inline-block;background-color:#2C1810;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:bold;padding:12px 20px;border-radius:12px;box-shadow:0 4px 12px rgba(44,24,16,0.3);">
                      📋 Trang Quản Trị Đơn
                    </a>
                  </td>
                </tr>
              </table>
              <div style="margin-top:12px;">
                <a href="${orderUrl}" target="_blank" style="font-size:11px;color:#B45309;text-decoration:underline;">
                  Xem trang theo dõi đơn hàng của khách hàng
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#2C1810;color:#C7B8A8;padding:20px 24px;text-align:center;font-size:11px;line-height:1.6;border-top:1px solid #4A2818;">
              <div style="font-weight:bold;color:#FDE68A;font-size:12px;margin-bottom:4px;">
                CÀ XÒI COFFEE & TEA
              </div>
              <div>Cà phê đậm vị - Giao tận nơi văn phòng & Cơ quan công sở</div>
              <div style="color:#8C7B6E;margin-top:8px;">
                Email này được hệ thống tự động gửi tới Chủ quán & Barista đã đăng ký tài khoản.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Gửi email thông báo đơn hàng mới cho toàn bộ Chủ quán và Barista đã đăng ký Gmail
 * Chạy bất đồng bộ an toàn, không bao giờ làm gián đoạn luồng tạo đơn của khách
 */
export async function sendOrderNotificationEmail(
  order: Order,
  baseUrl = "http://localhost:3000"
): Promise<{ success: boolean; sentTo: string[]; error?: string }> {
  try {
    // 1. Lấy danh sách email nhân viên hợp lệ từ SQLite
    const staffList = getNotificationStaffEmails();
    if (!staffList || staffList.length === 0) {
      console.log("[Mail Service] Không có tài khoản Chủ quán hay Barista nào có email.");
      return { success: false, sentTo: [], error: "NO_STAFF_EMAILS" };
    }

    const recipientEmails = Array.from(new Set(staffList.map((s) => s.email)));
    console.log(`[Mail Service] Tìm thấy ${recipientEmails.length} email nhận thông báo:`, recipientEmails);

    // 2. Khởi tạo kết nối transporter
    const transporter = getMailTransporter();
    if (!transporter) {
      console.log(
        "[Mail Service] Chưa cấu hình SMTP_USER / SMTP_PASS trong .env. Vui lòng thêm vào file .env để kích hoạt gửi mail."
      );
      return { success: false, sentTo: [], error: "SMTP_NOT_CONFIGURED" };
    }

    // 3. Chuẩn bị nội dung email
    const fromAddress = process.env.SMTP_FROM || `"Cà Xòi Coffee ☕" <${process.env.SMTP_USER}>`;
    const subject =
      order.paymentStatus === "PAID"
        ? `☕ [ĐÃ THANH TOÁN] Đơn hàng #${order.orderCode} từ ${order.recipientName} (${formatCurrency(order.totalAmount)})`
        : `🔔 [ĐƠN MỚI] Đơn hàng #${order.orderCode} từ ${order.recipientName} - ${order.orderType === "TAKEAWAY" ? "Khách lấy mang đi" : "Giao văn phòng"}`;

    const htmlContent = generateOrderEmailHtml(order, baseUrl);

    // 4. Gửi email
    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipientEmails.join(", "),
      subject,
      html: htmlContent,
    });

    console.log(`[Mail Service] ✅ Đã gửi email thông báo đơn #${order.orderCode} thành công! MessageId:`, info.messageId);
    return { success: true, sentTo: recipientEmails };
  } catch (error: any) {
    console.error("[Mail Service] ❌ Lỗi gửi email thông báo đơn hàng:", error.message);
    return { success: false, sentTo: [], error: error.message };
  }
}

/**
 * Kiểm tra kết nối SMTP và gửi email test thử nghiệm
 */
export async function testSmtpConnection(targetEmail?: string): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = getMailTransporter();
    if (!transporter) {
      return {
        success: false,
        message: "Chưa cấu hình tài khoản gửi thư (SMTP_USER hoặc SMTP_PASS) trong file .env.",
      };
    }

    // Kiểm tra kết nối
    await transporter.verify();

    // Nếu có email nhận thì gửi 1 email test thử nghiệm
    if (targetEmail) {
      const fromAddress = process.env.SMTP_FROM || `"Cà Xòi Coffee Test ☕" <${process.env.SMTP_USER}>`;
      await transporter.sendMail({
        from: fromAddress,
        to: targetEmail,
        subject: "☕ [Test Kết Nối] Hệ thống gửi mail Cà Xòi Coffee hoạt động tốt!",
        html: `
          <div style="font-family:sans-serif;padding:20px;background:#F5EBE1;color:#2C1810;border-radius:12px;">
            <h2 style="color:#92400E;">🎉 Chúc mừng! Kết nối Gmail SMTP thành công!</h2>
            <p>Hệ thống thông báo đơn hàng của <strong>Cà Xòi Coffee & Tea</strong> đã sẵn sàng tự động gửi mail khi có khách đặt đơn.</p>
            <p style="font-size:12px;color:#8C7B6E;">Thời gian kiểm tra: ${new Date().toLocaleString("vi-VN")}</p>
          </div>
        `,
      });
    }

    return {
      success: true,
      message: targetEmail
        ? `Kết nối SMTP thành công và đã gửi thư thử nghiệm đến ${targetEmail}!`
        : "Kết nối đến máy chủ Google Gmail SMTP thành công 100%!",
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi kết nối SMTP: ${err.message}`,
    };
  }
}
