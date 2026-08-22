"use client";

import { useEffect, useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { api, isApiError } from "@/lib/api-client";
import type { ApiRoom, ApiRoomType } from "@/app/(pms)/price/page";

const STATUS_OPTIONS: { value: ApiRoom["status"]; label: string }[] = [
  { value: "VACANT", label: "Đang mở" },
  { value: "OCCUPIED", label: "Đã đặt" },
  { value: "DIRTY", label: "Chờ xử lý" },
  { value: "MAINTENANCE", label: "Ngừng hoạt động" },
];

// Modal "Thêm/Sửa phòng" — form thật, nối API thật (POST /api/v1/rooms khi tạo
// mới, PATCH /api/v1/rooms/:id khi sửa). Mã phòng/QR code KHÔNG còn là ô nhập —
// server tự sinh (xem roomsRepo.create) nên chỉ giữ dòng "Hệ thống tự động tạo".
// Khối Device/Bữa ăn giữ nguyên tĩnh (chưa có cột DB tương ứng, ngoài phạm vi).
export function AddRoomModal({
  onClose,
  onSaved,
  floors,
  initial,
}: {
  onClose: () => void;
  onSaved: () => void;
  floors: string[];
  initial?: ApiRoom;
}) {
  const isEdit = !!initial;
  const [number, setNumber] = useState(initial?.number ?? "");
  const [floor, setFloor] = useState(initial?.floor ?? floors[0] ?? "");
  const [roomTypeId, setRoomTypeId] = useState(initial?.room_type_id ?? "");
  const [status, setStatus] = useState<ApiRoom["status"]>(initial?.status ?? "VACANT");
  const [roomTypes, setRoomTypes] = useState<ApiRoomType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ items: ApiRoomType[] }>("/api/v1/room-types")
      .then((res) => {
        setRoomTypes(res.items);
        if (!roomTypeId && res.items[0]) setRoomTypeId(res.items[0].id);
      })
      .catch(() => setError("Không tải được danh sách loại phòng."))
      .finally(() => setLoadingTypes(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    if (!number.trim()) {
      setError("Vui lòng nhập tên/số phòng.");
      return;
    }
    if (!floor.trim()) {
      setError("Vui lòng chọn hoặc nhập tầng.");
      return;
    }
    if (!roomTypeId) {
      setError("Vui lòng chọn loại phòng.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        number: number.trim(),
        floor: floor.trim(),
        zone: initial?.zone ?? "Khu chính",
        roomTypeId,
        status,
      };
      if (isEdit && initial) {
        await api.patch(`/api/v1/rooms/${initial.id}`, body);
      } else {
        await api.post("/api/v1/rooms", body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không lưu được phòng.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? "Sửa phòng" : "Thêm phòng"}
      onClose={onClose}
      width={680}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Cancel</ButtonGhost>
          <ButtonPrimary onClick={handleSave}>{saving ? "Đang lưu..." : "Save"}</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        {error && <div className="rounded-lg bg-[#FDECEC] px-3 py-2 text-[12px] text-pms-danger">{error}</div>}

        <div>
          <label className="mb-1.5 block text-[12px]">
            Tên phòng <span className="text-pms-danger">*</span>
          </label>
          <input
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="VD: 101"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Tầng</label>
            <input
              className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary"
              list="floor-suggestions"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="VD: Tầng 1"
            />
            <datalist id="floor-suggestions">
              {floors.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">
              Loại phòng <span className="text-pms-danger">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
              disabled={loadingTypes}
            >
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Mã phòng</label>
            <AutoHint />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">QR code</label>
            <AutoHint />
          </div>
        </div>

        <div>
          <label className="mb-2 flex items-center gap-1.5 text-[12px]">
            Device <span className="cursor-pointer font-bold text-pms-primary">+</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <DeviceRow name="SN device A" on />
            <DeviceRow name="Acc device B" on={false} muted />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[12px]">Trạng thái</label>
          <select
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
            value={status}
            onChange={(e) => setStatus(e.target.value as ApiRoom["status"])}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-[12px]">Bữa ăn</label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2.5">
              <span className="h-3.5 w-3.5 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" />
              <div className="flex-1 rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">&nbsp;</div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-3.5 w-3.5 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" />
              <div className="flex-1 rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">&nbsp;</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function AutoHint() {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-pms-muted-2 px-3 py-2.5 text-[12px] text-pms-muted">
      <span className="h-3.5 w-3.5 rounded border-[1.5px] border-pms-muted-2" />
      Hệ thống tự động tạo
    </div>
  );
}
function DeviceRow({ name, on, muted }: { name: string; on: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-3.5 w-3.5 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" />
      <div className={`flex-1 rounded-lg border border-pms-border px-3 py-2.5 text-[13px] ${muted ? "text-pms-muted-2" : ""}`}>{name}</div>
      <div className="relative h-5 w-9 flex-shrink-0 rounded-full" style={{ background: on ? "#284AB1" : "#E6E8EC" }}>
        <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white" style={{ left: on ? "18px" : "2px" }} />
      </div>
    </div>
  );
}
