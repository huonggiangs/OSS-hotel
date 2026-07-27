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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<{ items: ApiRoomOption[] }>("/api/v1/rooms")
      .then((res) => setRooms(res.items.filter((r) => r.status === "VACANT")))
      .catch(() => setRooms([]));
  }, []);

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
        deposit: deposit ? Number(deposit) : 0,
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
          <Field label="Tiền cọc" placeholder="0" value={deposit} onChange={setDeposit} />
        </div>
      </div>
    </Modal>
  );
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
