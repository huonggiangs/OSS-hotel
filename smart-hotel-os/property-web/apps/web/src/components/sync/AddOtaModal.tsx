"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

export interface OtaConnection {
  id: string;
  provider: string;
  propertyCode: string;
  apiKeyEncrypted: unknown | null;
  hasApiKey: boolean;
  syncRooms: boolean;
  syncRates: boolean;
  syncAvailability: boolean;
  status: "ACTIVE" | "PAUSED";
}

const PROVIDER_OPTIONS = ["Booking.com", "Agoda", "Airbnb", "Traveloka", "Expedia", "Khác"];

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `conn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Modal "Thêm kênh OTA mới" / "Sửa kênh OTA" — form thật, lưu 1 kết nối OTA
// (provider, mã cơ sở trên kênh đó, API Key, các loại dữ liệu muốn đồng bộ).
// LƯU Ý PHẠM VI: modal này chỉ LƯU CẤU HÌNH kết nối (để hiển thị/tham khảo và
// chuẩn bị sẵn cho tích hợp thật sau này) — KHÔNG gọi API thật của
// Booking.com/Agoda/Airbnb để đồng bộ trực tiếp. Muốn đồng bộ thật cần trở
// thành đối tác được kênh đó cấp phép (hợp đồng + cấp credential riêng), nằm
// ngoài phạm vi có thể tự làm khi chưa có credential đối tác thật — giống lý
// do smart-hotel-os/services/channel-manager-service dùng MockOtaAdapter.
export function AddOtaModal({
  onClose,
  onSave,
  initial,
}: {
  onClose: () => void;
  onSave: (connection: Omit<OtaConnection, "apiKeyEncrypted" | "hasApiKey"> & { apiKey: string }) => void;
  initial?: OtaConnection;
}) {
  const isKhac = !!initial && !PROVIDER_OPTIONS.slice(0, -1).includes(initial.provider);
  const [provider, setProvider] = useState(isKhac ? "Khác" : initial?.provider ?? "Booking.com");
  const [customProvider, setCustomProvider] = useState(isKhac ? initial?.provider ?? "" : "");
  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode ?? "");
  const [apiKey, setApiKey] = useState("");
  const [syncRooms, setSyncRooms] = useState(initial?.syncRooms ?? true);
  const [syncRates, setSyncRates] = useState(initial?.syncRates ?? true);
  const [syncAvailability, setSyncAvailability] = useState(initial?.syncAvailability ?? true);

  function handleSave() {
    const finalProvider = provider === "Khác" ? customProvider.trim() : provider;
    if (!finalProvider) return;
    onSave({
      id: initial?.id ?? newId(),
      provider: finalProvider,
      propertyCode: propertyCode.trim(),
      apiKey,
      syncRooms,
      syncRates,
      syncAvailability,
      status: initial?.status ?? "ACTIVE",
    });
  }

  return (
    <Modal
      title={initial ? `Sửa kênh bán: ${initial.provider}` : "Thêm kênh bán mới"}
      onClose={onClose}
      width={440}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={handleSave}>Lưu</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <p className="m-0 rounded-lg bg-[#F4F5F6] p-3 text-[11.5px] leading-relaxed text-pms-muted">
          Đây là nơi lưu cấu hình kết nối (mã cơ sở, mã kết nối, loại dữ liệu muốn đồng bộ) cho từng kênh bán. Hệ thống
          chưa kết nối trực tiếp với các kênh này — việc đó cần trở thành đối tác được từng kênh cấp phép
          (hợp đồng + thông tin xác thực riêng).
        </p>
        <div>
          <label className="mb-1.5 block text-[12px]">Kênh bán</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full rounded-lg border border-pms-border bg-white px-3 py-2.5 text-[13px]"
          >
            {PROVIDER_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        {provider === "Khác" && (
          <div>
            <label className="mb-1.5 block text-[12px]">Tên kênh bán</label>
            <input
              value={customProvider}
              onChange={(e) => setCustomProvider(e.target.value)}
              placeholder="Nhập tên kênh bán"
              className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
            />
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-[12px]">Mã cơ sở trên kênh này</label>
          <input
            value={propertyCode}
            onChange={(e) => setPropertyCode(e.target.value)}
            placeholder="Nhập mã cơ sở do kênh bán cấp"
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">
            Mã kết nối {initial?.hasApiKey && <span className="text-pms-muted">(đã lưu — để trống nếu không đổi)</span>}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={initial?.hasApiKey ? "•••••••• (giữ nguyên nếu để trống)" : "Nhập mã kết nối"}
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
          />
        </div>
        <div>
          <label className="mb-2 block text-[12px]">Dữ liệu đồng bộ</label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={syncRooms} onChange={(e) => setSyncRooms(e.target.checked)} />
              Đồng bộ phòng
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={syncRates} onChange={(e) => setSyncRates(e.target.checked)} />
              Đồng bộ giá
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={syncAvailability} onChange={(e) => setSyncAvailability(e.target.checked)} />
              Đồng bộ tình trạng phòng trống
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}
