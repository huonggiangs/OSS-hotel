import type { OtaProvider } from "../types/domain";

/**
 * Hợp đồng chung cho mọi kênh OTA. Mỗi kênh (Booking.com/Agoda/Airbnb...) là
 * MỘT adapter riêng — không giả định các kênh dùng chung một giao thức
 * (MODULE_CHANNEL_MANAGER_BOOKING.md mục A.1, đồng nhất nguyên tắc "không bịa
 * SDK" của kiosk.md mục 21).
 *
 * Hiện tại chỉ có `MockOtaAdapter` (mockOtaAdapter.ts) vì chưa có tài khoản
 * OTA thật để lấy credentials. Khi có credential thật cho một kênh, tạo file
 * mới (vd. `bookingComAdapter.ts`) implement đúng interface này rồi đăng ký ở
 * `index.ts` — core logic (routes, repositories, overbooking check) KHÔNG cần
 * sửa gì.
 */

export interface PushInventoryInput {
  propertyId: string;
  roomTypeId: string;
  date: string; // YYYY-MM-DD
  availableRooms: number;
  credentials: Record<string, unknown>;
}

export interface PushPriceInput {
  propertyId: string;
  roomTypeId: string;
  date: string;
  price: number;
  credentials: Record<string, unknown>;
}

export interface OtaPushResult {
  success: boolean;
  providerRef?: string;
  raw: unknown;
  errorMessage?: string;
}

export interface PullBookingsInput {
  propertyId: string;
  credentials: Record<string, unknown>;
  sinceIso?: string;
}

export interface OtaBookingDTO {
  otaBookingId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  roomsRequested: number;
  guestName: string;
  raw: unknown;
}

export interface OtaAdapter {
  readonly provider: OtaProvider;

  /** Đẩy tồn phòng của một ngày sang OTA. */
  pushInventory(input: PushInventoryInput): Promise<OtaPushResult>;

  /** Đẩy giá của một ngày sang OTA. */
  pushPrice(input: PushPriceInput): Promise<OtaPushResult>;

  /** Kéo danh sách booking mới từ OTA (dùng cho polling, bổ sung cho webhook). */
  pullBookings(input: PullBookingsInput): Promise<OtaBookingDTO[]>;

  /** Xác thực webhook đến từ đúng OTA (chữ ký HMAC hoặc token tuỳ kênh). */
  verifyWebhookSignature(headers: Record<string, string | undefined>, rawBody: unknown, credentials: Record<string, unknown>): boolean;

  /** Yêu cầu OTA huỷ/đóng băng một booking — dùng khi phát hiện overbooking (mục A.3). */
  cancelBooking(otaBookingId: string, credentials: Record<string, unknown>): Promise<OtaPushResult>;
}
