"use client";

import { useEffect, useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { api, isApiError } from "@/lib/api-client";

interface ApiRoomOption {
  id: string;
  number: string;
  status: string;
  room_type_name: string;
  room_type_price: string;
}

interface BookingPolicyData {
  enabled?: boolean;
  percent?: number;
}

const CHANNEL_OPTIONS = [
  { value: "DIRECT", label: "Trực tiếp" },
  { value: "BOOKING_COM", label: "Booking.com" },
  { value: "AGODA", label: "Agoda" },
  { value: "AIRBNB", label: "Airbnb" },
  { value: "TRAVELOKA", label: "Traveloka" },
  { value: "OTHER", label: "Khác" },
];

// Modal "Thêm mới hợp đồng" — ĐÃ NỐI API THẬT: tạo khách hàng (nếu chưa có) rồi tạo
// hợp đồng (POST /api/v1/customers → POST /api/v1/bookings). Khác với bản pixel-perfect
// ban đầu (toàn bộ ô là placeholder tĩnh, xem `showAddBooking` bản gốc) — đây là màn
// hình được yêu cầu ưu tiên nối API thật nên các ô bắt buộc đã có state/logic thật;
// đơn giản hoá so với bản gốc (bỏ bước chọn riêng "Loại phòng" trước "Phòng", chọn
// thẳng phòng còn trống) — ghi rõ quyết định này trong PROGRESS.md.
export function AddBookingModal({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const [rooms, setRooms] = useState<ApiRoomOption[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [roomId, setRoomId] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [channel, setChannel] = useState("DIRECT");
  const [deposit, setDeposit] = useState("");
  const [qrPayload, setQrPayload] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [policy, setPolicy] = useState<BookingPolicyData>({ enabled: true, percent: 30 });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<{ items: ApiRoomOption[] }>("/api/v1/rooms")
      .then((res) => setRooms(res.items.filter((r) => r.status === "VACANT")))
      .catch(() => setRooms([]));
    api.get<{ data: BookingPolicyData }>("/api/v1/settings/booking_policy").then((res) => setPolicy({ enabled: true, percent: 30, ...res.data })).catch(() => undefined);
  }, []);

  const selectedRoom = rooms.find((room) => room.id === roomId);
  const nights = checkin && checkout ? Math.max(1, Math.ceil((new Date(`${checkout}T00:00:00`).getTime() - new Date(`${checkin}T00:00:00`).getTime()) / 86_400_000)) : 0;
  const totalPrice = selectedRoom && nights ? Number(selectedRoom.room_type_price) * nights : 0;
  const suggestedDeposit = policy.enabled && totalPrice > 0 ? Math.round(totalPrice * Math.min(100, Math.max(0, Number(policy.percent) || 0)) / 100) : 0;

  function readQrPayload() {
    const parsed = parseVietnamIdQr(qrPayload);
    if (!parsed) {
      setError("Không nhận diện được dữ liệu QR căn cước. Máy đọc QR dạng bàn phím cần đặt con trỏ vào ô này rồi quét lại.");
      return;
    }
    setFullName(parsed.fullName || fullName);
    setIdentityNumber(parsed.identityNumber || identityNumber);
    setPermanentAddress(parsed.address || permanentAddress);
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    if (!fullName.trim() || !roomId || !checkin || !checkout) {
      setError("Vui lòng nhập đủ họ tên khách, phòng, ngày nhận/trả phòng.");
      return;
    }
    setSubmitting(true);
    try {
      const customer = await api.post<{ id: string }>("/api/v1/customers", { fullName, phone: phone || undefined });
      await api.post("/api/v1/bookings", {
        customerId: customer.id,
        roomId,
        channel,
        checkinDate: checkin,
        checkoutDate: checkout,
        totalPrice,
        ...(deposit ? { deposit: Number(deposit) } : {}),
        guestDetails: identityNumber || permanentAddress ? { identityType: "CCCD", identityNumber: identityNumber || null, permanentAddress: permanentAddress || null } : undefined,
      });
      onCreated?.();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Tạo hợp đồng thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Thêm mới hợp đồng"
      onClose={onClose}
      width={540}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={handleSubmit}>{submitting ? "Đang tạo..." : "Tạo hợp đồng"}</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        {error && <p className="rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">{error}</p>}
        <Field label="Họ và tên khách" placeholder="Nhập họ tên đầy đủ" value={fullName} onChange={setFullName} />
        <Field label="Số điện thoại" placeholder="Số điện thoại" value={phone} onChange={setPhone} />
        <div className="rounded-lg border border-dashed border-pms-primary/50 bg-pms-primary-soft/30 p-3">
          <label className="mb-1.5 block text-[12px] font-semibold">Đọc QR căn cước (tuỳ chọn)</label>
          <p className="mb-2 text-[11px] text-pms-muted">Máy đọc QR USB hoạt động như bàn phím: đặt con trỏ vào ô, quét mã rồi bấm “Điền thông tin”.</p>
          <div className="flex gap-2"><input value={qrPayload} onChange={(e) => setQrPayload(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); readQrPayload(); } }} placeholder="Dán hoặc quét chuỗi QR căn cước" className="min-w-0 flex-1 rounded-lg border border-pms-border px-3 py-2 text-[12px]" /><button type="button" onClick={readQrPayload} className="shrink-0 rounded-lg border border-pms-primary px-3 py-2 text-[12px] font-semibold text-pms-primary">Điền thông tin</button></div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2"><Field label="Số căn cước" placeholder="Tự điền từ QR" value={identityNumber} onChange={setIdentityNumber} /><Field label="Địa chỉ thường trú" placeholder="Tự điền từ QR" value={permanentAddress} onChange={setPermanentAddress} /></div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Phòng (chỉ hiện phòng trống)</label>
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary"
          >
            <option value="">— Chọn phòng —</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.number} · {r.room_type_name} · {Number(r.room_type_price).toLocaleString("vi-VN")}đ
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Nhận phòng</label>
            <input
              type="date"
              value={checkin}
              onChange={(e) => setCheckin(e.target.value)}
              className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Trả phòng</label>
            <input
              type="date"
              value={checkout}
              onChange={(e) => setCheckout(e.target.value)}
              className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Kênh đặt</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary"
            >
              {CHANNEL_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div><Field label="Tiền cọc" placeholder={suggestedDeposit ? suggestedDeposit.toLocaleString("vi-VN") : "0"} value={deposit} onChange={setDeposit} />{suggestedDeposit > 0 && !deposit && <p className="m-0 mt-1 text-[11px] text-pms-primary">Tự tính {suggestedDeposit.toLocaleString("vi-VN")}đ ({policy.percent ?? 0}% theo chính sách cơ sở)</p>}</div>
        </div>
        {totalPrice > 0 && <p className="m-0 text-[12px] text-pms-muted">Tổng tiền phòng dự kiến: <b className="text-pms-text">{totalPrice.toLocaleString("vi-VN")}đ</b> · {nights} đêm</p>}
      </div>
    </Modal>
  );
}

function parseVietnamIdQr(raw: string): { identityNumber: string; fullName: string; address: string } | null {
  const value = raw.trim();
  if (!value) return null;
  const parts = value.split(/[|;]/).map((part) => part.trim());
  const identityNumber = parts.find((part) => /^\d{9,12}$/.test(part)) ?? "";
  if (!identityNumber) return null;
  const identityIndex = parts.indexOf(identityNumber);
  const fullName = parts[identityIndex + 2] && !/^\d/.test(parts[identityIndex + 2]) ? parts[identityIndex + 2] : parts.find((part) => /^[A-ZÀ-Ỹ][A-ZÀ-Ỹ ]{2,}$/i.test(part)) ?? "";
  const address = parts.slice(identityIndex + 4).filter((part) => part && !/^\d{6,8}$/.test(part)).join(", ");
  return { identityNumber, fullName, address };
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px]">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary"
      />
    </div>
  );
}
