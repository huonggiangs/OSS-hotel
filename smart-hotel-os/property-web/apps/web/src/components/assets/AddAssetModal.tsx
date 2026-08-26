"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

export interface AssetItem {
  id: string;
  stt: number;
  name: string;
  code: string;
  room: string;
  value: string;
  qty: number;
  unit: string;
  depMonths: number;
  depValue: string;
  status: string;
  fg: string;
}

export interface AssetRoomOption {
  id: string;
  number: string;
  floor: string;
  zone: string;
}

// 3 trạng thái hợp lệ + màu hiển thị tương ứng — khớp đúng 3 trạng thái đã có
// trong dữ liệu mẫu ban đầu. Người dùng CHỌN từ danh sách này (không được gõ
// màu tuỳ ý) để tránh dữ liệu rác/không nhất quán.
const STATUS_OPTIONS: { label: string; fg: string }[] = [
  { label: "Đang dùng", fg: "#00C853" },
  { label: "Cần kiểm tra", fg: "#946200" },
  { label: "Hỏng", fg: "#CC2F42" },
];

const UNIT_OPTIONS = ["Cái", "Bộ", "Khác"];

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Modal "Thêm tài sản mới" / "Sửa tài sản" — ĐÃ NỐI THẬT: form điều khiển đầy
// đủ toàn bộ cột hiển thị ở bảng tài sản, lưu thật vào property_settings nhóm
// "assets" (qua onSave truyền từ trang cha).
export function AddAssetModal({
  onClose,
  onSave,
  initial,
  nextStt,
  rooms,
}: {
  onClose: () => void;
  onSave: (item: AssetItem) => void;
  initial?: AssetItem;
  nextStt: number;
  rooms: AssetRoomOption[];
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [room, setRoom] = useState(initial?.room ?? "Khu vực chung");
  const [value, setValue] = useState(initial?.value ?? "");
  const [qty, setQty] = useState(initial?.qty ?? 1);
  const isCustomUnit = !!initial && !UNIT_OPTIONS.slice(0, -1).includes(initial.unit);
  const [unit, setUnit] = useState(isCustomUnit ? "Khác" : initial?.unit ?? "Cái");
  const [customUnit, setCustomUnit] = useState(isCustomUnit ? initial?.unit ?? "" : "");
  const [depMonths, setDepMonths] = useState(initial?.depMonths ?? 12);
  const [depValue, setDepValue] = useState(initial?.depValue ?? "");
  const [status, setStatus] = useState(initial?.status ?? STATUS_OPTIONS[0].label);

  function handleSave() {
    if (!name.trim()) return;
    const finalUnit = unit === "Khác" ? customUnit.trim() || "Khác" : unit;
    const statusOption = STATUS_OPTIONS.find((s) => s.label === status) ?? STATUS_OPTIONS[0];
    onSave({
      id: initial?.id ?? newId(),
      stt: initial?.stt ?? nextStt,
      name: name.trim(),
      code: code.trim(),
      room: room.trim(),
      value: value.trim(),
      qty,
      unit: finalUnit,
      depMonths,
      depValue: depValue.trim(),
      status: statusOption.label,
      fg: statusOption.fg,
    });
  }

  return (
    <Modal
      title={initial ? "Sửa tài sản" : "Thêm tài sản mới"}
      onClose={onClose}
      width={600}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Cancel</ButtonGhost>
          <ButtonPrimary onClick={handleSave}>{initial ? "Lưu" : "Tạo tài sản"}</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-[12px]">Tên tài sản</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Điều hòa 12.000BTU" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Mã tài sản</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: ABCD1236" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Đơn vị tính</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full rounded-lg border border-pms-border bg-white px-3 py-2.5 text-[13px]">
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            {unit === "Khác" && (
              <input
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder="Nhập đơn vị tính"
                className="mt-2 w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
              />
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Giá trị</label>
            <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="VD: 10.000.000đ" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Số lượng</label>
            <input
              type="number"
              min={0}
              value={qty}
              onChange={(e) => setQty(Math.max(0, Number(e.target.value) || 0))}
              placeholder="VD: 12"
              className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Thời gian khấu hao</label>
            <div className="flex items-center gap-2.5 rounded-lg border border-pms-border px-2.5 py-1.5">
              <span
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-pms-divider font-bold text-pms-muted"
                onClick={() => setDepMonths((m) => Math.max(0, m - 1))}
              >
                −
              </span>
              <span className="flex-1 text-center text-[13px]">{depMonths}</span>
              <span
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-pms-divider font-bold text-pms-muted"
                onClick={() => setDepMonths((m) => m + 1)}
              >
                +
              </span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Giá trị khấu hao</label>
            <input value={depValue} onChange={(e) => setDepValue(e.target.value)} placeholder="VD: 12.000.000đ" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Phòng lắp đặt</label>
            <select value={room} onChange={(e) => setRoom(e.target.value)} className="w-full rounded-lg border border-pms-border bg-white px-3 py-2.5 text-[13px]">
              <option value="">Chọn phòng lắp đặt</option>
              <option value="Khu vực chung">Khu vực chung</option>
              {room && room !== "Khu vực chung" && !rooms.some((item) => item.number === room) && <option value={room}>{room} (dữ liệu cũ)</option>}
              {rooms.map((item) => <option key={item.id} value={item.number}>Phòng {item.number} · Tầng {item.floor} · {item.zone}</option>)}
            </select>
            {rooms.length === 0 && <p className="mb-0 mt-1 text-[11px] text-pms-danger">Chưa có phòng. Hãy tạo phòng trước khi thêm tài sản.</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Trạng thái</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-pms-border bg-white px-3 py-2.5 text-[13px]">
              {STATUS_OPTIONS.map((s) => (
                <option key={s.label} value={s.label}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}
