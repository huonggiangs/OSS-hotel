import nodemailer from "nodemailer";

export type OnboardingEmailStatus = "SENT" | "NOT_CONFIGURED" | "FAILED";

export interface OnboardingEmailResult {
  status: OnboardingEmailStatus;
  error?: string;
  sentAt?: string;
}

/**
 * Gửi email bàn giao cơ sở. Không đưa mật khẩu tạm vào email; HQ hiển thị
 * mật khẩu đúng một lần để bàn giao qua kênh an toàn khác. Khi chưa có SMTP,
 * trả về trạng thái rõ ràng thay vì giả đã gửi.
 */
export async function sendOnboardingEmail(input: {
  recipient: string;
  ownerName: string;
  propertyName: string;
  username: string;
  pmsUrl: string;
}): Promise<OnboardingEmailResult> {
  const host = process.env.HQ_SMTP_HOST?.trim();
  const port = Number(process.env.HQ_SMTP_PORT ?? 587);
  const from = process.env.HQ_SMTP_FROM?.trim();
  if (!host || !from || !Number.isFinite(port)) {
    return { status: "NOT_CONFIGURED", error: "Chưa cấu hình HQ_SMTP_HOST/HQ_SMTP_FROM/HQ_SMTP_PORT." };
  }
  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: process.env.HQ_SMTP_SECURE === "true" || port === 465,
      auth: process.env.HQ_SMTP_USER ? { user: process.env.HQ_SMTP_USER, pass: process.env.HQ_SMTP_PASSWORD ?? "" } : undefined,
    });
    await transport.sendMail({
      from,
      to: input.recipient,
      subject: `Thông tin khởi tạo ${input.propertyName} — Smart Hotel OS`,
      text: [
        `Xin chào ${input.ownerName},`,
        "",
        `Cơ sở ${input.propertyName} đã được khởi tạo trên Smart Hotel OS.`,
        `Đăng nhập: ${input.pmsUrl}`,
        `Tên đăng nhập: ${input.username}`,
        "Mật khẩu tạm được bàn giao riêng bởi quản trị viên HQ; email này không chứa mật khẩu.",
        "Sau khi đăng nhập, vui lòng đổi mật khẩu và hoàn tất các bước cài đặt cơ sở.",
      ].join("\n"),
      html: `<p>Xin chào ${escapeHtml(input.ownerName)},</p><p>Cơ sở <strong>${escapeHtml(input.propertyName)}</strong> đã được khởi tạo trên Smart Hotel OS.</p><p>Đăng nhập: <a href="${escapeHtml(input.pmsUrl)}">${escapeHtml(input.pmsUrl)}</a><br>Tên đăng nhập: <strong>${escapeHtml(input.username)}</strong></p><p>Mật khẩu tạm được bàn giao riêng bởi quản trị viên HQ; email này không chứa mật khẩu.</p><p>Vui lòng đổi mật khẩu sau lần đăng nhập đầu tiên và hoàn tất các bước cài đặt cơ sở.</p>`,
    });
    return { status: "SENT", sentAt: new Date().toISOString() };
  } catch (err) {
    return { status: "FAILED", error: err instanceof Error ? err.message.slice(0, 500) : "SMTP gửi email thất bại." };
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
