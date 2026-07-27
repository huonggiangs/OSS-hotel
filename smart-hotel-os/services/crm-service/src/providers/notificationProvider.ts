import type { NotificationChannel } from "../types/domain";

/**
 * Hợp đồng chung để gửi thông báo marketing qua bất kỳ kênh nào (SMS/Zalo/
 * Email...). CRM Service chỉ TẠO yêu cầu gửi qua interface này, không tự gọi
 * thẳng nhà cung cấp — đúng nguyên tắc tách biệt ở MODULE_CRM_MARKETING.md
 * mục 3 ("Notification Service điều phối gửi và retry; CRM Service chỉ tạo
 * yêu cầu gửi"). Ở bản demo/độc lập này, CRM Service tự đóng vai trò gọi
 * provider luôn (chưa tách Notification Service riêng — xem PROGRESS.md).
 */
export interface SendNotificationInput {
  channel: NotificationChannel;
  to: string; // số điện thoại hoặc email tuỳ channel
  content: string;
}

export interface SendNotificationResult {
  success: boolean;
  providerMessageId?: string;
  raw: unknown;
  errorMessage?: string;
}

export interface NotificationProvider {
  readonly name: string;
  send(input: SendNotificationInput): Promise<SendNotificationResult>;
}
