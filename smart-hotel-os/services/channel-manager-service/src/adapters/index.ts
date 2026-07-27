import type { OtaAdapter } from "./otaAdapter";
import { MockOtaAdapter } from "./mockOtaAdapter";
import type { OtaProvider } from "../types/domain";
import { Errors } from "../utils/errors";

const ADAPTERS: Record<OtaProvider, OtaAdapter> = {
  booking: new MockOtaAdapter("booking"),
  agoda: new MockOtaAdapter("agoda"),
  airbnb: new MockOtaAdapter("airbnb"),
};

/**
 * Registry trung tâm — đây là NƠI DUY NHẤT cần sửa khi cắm adapter thật.
 * Ví dụ khi có credential Booking.com thật:
 *   ADAPTERS.booking = new BookingComAdapter();
 * Toàn bộ routes/repositories gọi qua `getOtaAdapter(provider)`, không import
 * trực tiếp MockOtaAdapter ở nơi khác.
 */
export function getOtaAdapter(provider: string): OtaAdapter {
  const adapter = ADAPTERS[provider as OtaProvider];
  if (!adapter) {
    throw Errors.validation({ ota_provider: `Không hỗ trợ kênh '${provider}'. Chỉ hỗ trợ: booking, agoda, airbnb.` });
  }
  return adapter;
}

export const SUPPORTED_PROVIDERS: OtaProvider[] = ["booking", "agoda", "airbnb"];
