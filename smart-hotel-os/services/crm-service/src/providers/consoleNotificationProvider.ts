import { randomUUID } from "node:crypto";
import type { NotificationProvider, SendNotificationInput, SendNotificationResult } from "./notificationProvider";

/** Che bớt số điện thoại/email khi log — đồng nhất nguyên tắc che dữ liệu
 * nhạy cảm ở kiosk.md mục 12 và MODULE_CRM_MARKETING.md mục 4. */
function maskContact(to: string): string {
  if (to.includes("@")) {
    const [user, domain] = to.split("@");
    return `${user.slice(0, 1)}***@${domain}`;
  }
  return to.length > 3 ? `${"*".repeat(to.length - 3)}${to.slice(-3)}` : "***";
}

/**
 * Provider mặc định — chỉ LOG ra console, không gọi API nhà cung cấp SMS/
 * Zalo/Email thật nào (chưa có tài khoản/API key thật). Dùng để demo luồng
 * "tạo campaign -> gửi -> ghi log" chạy được đầu-cuối mà không cần credential.
 *
 * Khi có nhà cung cấp thật (vd. eSMS, Zalo OA API, SendGrid...), implement
 * một class mới theo đúng `NotificationProvider` rồi đăng ký ở
 * `src/providers/index.ts` — routes/campaigns.routes.ts KHÔNG cần sửa gì.
 */
export class ConsoleNotificationProvider implements NotificationProvider {
  readonly name = "console";

  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    const providerMessageId = `console-${randomUUID()}`;
    console.log(
      `[ConsoleNotificationProvider] Gửi ${input.channel} tới ${maskContact(input.to)}: "${input.content}" (messageId=${providerMessageId})`
    );
    return { success: true, providerMessageId, raw: { channel: input.channel, maskedTo: maskContact(input.to) } };
  }
}
