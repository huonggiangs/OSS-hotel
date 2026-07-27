import type {
  OtaAdapter,
  OtaBookingDTO,
  OtaPushResult,
  PullBookingsInput,
  PushInventoryInput,
  PushPriceInput,
} from "./otaAdapter";
import type { OtaProvider } from "../types/domain";

/**
 * Adapter giả lập — dùng vì dự án chưa có tài khoản OTA thật (Booking/Agoda/
 * Airbnb đều yêu cầu ký hợp đồng đối tác trước khi cấp API credentials).
 * Mọi lời gọi đều "thành công" ngay lập tức và được log ra console để có thể
 * quan sát luồng chạy khi demo/test — không gọi mạng thật, không cần API key.
 *
 * `pullBookings` không dùng trong luồng chính (service này ăn booking qua
 * webhook /webhooks/:provider/bookings), giữ lại để implement đủ interface
 * cho trường hợp một OTA thật chỉ hỗ trợ polling thay vì webhook.
 */
export class MockOtaAdapter implements OtaAdapter {
  constructor(public readonly provider: OtaProvider) {}

  async pushInventory(input: PushInventoryInput): Promise<OtaPushResult> {
    console.log(
      `[MockOtaAdapter:${this.provider}] pushInventory property=${input.propertyId} roomType=${input.roomTypeId} date=${input.date} availableRooms=${input.availableRooms}`
    );
    return {
      success: true,
      providerRef: `mock-inv-${this.provider}-${input.propertyId}-${input.roomTypeId}-${input.date}`,
      raw: { ok: true, echoed: input },
    };
  }

  async pushPrice(input: PushPriceInput): Promise<OtaPushResult> {
    console.log(
      `[MockOtaAdapter:${this.provider}] pushPrice property=${input.propertyId} roomType=${input.roomTypeId} date=${input.date} price=${input.price}`
    );
    return {
      success: true,
      providerRef: `mock-price-${this.provider}-${input.propertyId}-${input.roomTypeId}-${input.date}`,
      raw: { ok: true, echoed: input },
    };
  }

  async pullBookings(input: PullBookingsInput): Promise<OtaBookingDTO[]> {
    console.log(`[MockOtaAdapter:${this.provider}] pullBookings property=${input.propertyId} (mock trả về mảng rỗng, dùng webhook làm nguồn chính)`);
    return [];
  }

  verifyWebhookSignature(headers: Record<string, string | undefined>): boolean {
    // Mock: coi mọi request là hợp lệ, TRỪ KHI test cố tình gửi header giả lập
    // lỗi chữ ký — dùng để demo nhánh từ chối webhook không hợp lệ.
    return headers["x-mock-signature"] !== "invalid";
  }

  async cancelBooking(otaBookingId: string): Promise<OtaPushResult> {
    console.log(`[MockOtaAdapter:${this.provider}] cancelBooking otaBookingId=${otaBookingId} (mô phỏng huỷ booking thừa do overbooking)`);
    return { success: true, providerRef: `mock-cancel-${otaBookingId}`, raw: { ok: true } };
  }
}
