"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { api, isApiError } from "@/lib/api-client";
import type { ApiRoomType } from "@/app/(pms)/price/page";

// Modal "Thêm/Sửa loại phòng" — form thật, nối API thật
// (POST /api/v1/room-types khi tạo mới, PATCH /api/v1/room-types/:id khi sửa).
// Đã bỏ 2 trường "Tầng và phòng"/"Số lượng phòng" khỏi bản thiết kế gốc vì
// không có cột DB tương ứng — loại phòng không sở hữu phòng cụ thể lúc tạo,
// phòng được thêm riêng ở "Danh sách phòng" (nút "Thêm phòng").
export function AddRoomTypeModal({
  onClose,
  onSaved,
  initial,
}: {
  onClose: () => void;
  onSaved: () => void;
  initial?: ApiRoomType;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [basePrice, setBasePrice] = useState(initial ? Number(initial.base_price) : 0);
  const [capacity, setCapacity] = useState(initial?.capacity ?? 2);
  const [bedsBig, setBedsBig] = useState(initial?.beds_big ?? 1);
  const [bedsSmall, setBedsSmall] = useState(initial?.beds_small ?? 0);
  const [areaM2, setAreaM2] = useState<string>(initial?.area_m2 ?? "");
  const [pricingMethod, setPricingMethod] = useState<"PER_NIGHT" | "PER_HOUR">(
    (initial?.pricing_method as "PER_NIGHT" | "PER_HOUR") ?? "PER_NIGHT"
  );
  const [discountPercent, setDiscountPercent] = useState(initial ? Number(initial.discount_percent) : 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("Vui lòng nhập tên loại phòng.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        basePrice,
        capacity,
        bedsBig,
        bedsSmall,
        areaM2: areaM2 === "" ? null : Number(areaM2),
        pricingMethod,
        discountPercent,
      };
      if (isEdit && initial) {
        await api.patch(`/api/v1/room-types/${initial.id}`, body);
      } else {
        await api.post("/api/v1/room-types", body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không lưu được loại phòng.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? "Sửa loại phòng" : "Thêm loại phòng"}
      onClose={onClose}
      width={640}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Cancel</ButtonGhost>
          <ButtonPrimary onClick={handleSave}>{saving ? "Đang lưu..." : "Save"}</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        {error && <div className="rounded-lg bg-[#FDECEC] px-3 py-2 text-[12px] text-pms-danger">{error}</div>}

        <TextField label="Loại phòng" required value={name} onChange={setName} placeholder="Tên loại phòng" />

        <div className="rounded-lg bg-pms-divider px-3 py-2.5 text-[12px] text-pms-muted">
          Phòng cụ thể được thêm riêng ở "Danh sách phòng" (nút "+ Thêm" bên dưới) — loại phòng chỉ là cấu hình dùng chung.
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Stepper label="Số lượng giường lớn" value={bedsBig} onChange={setBedsBig} />
          <Stepper label="Số lượng giường nhỏ" value={bedsSmall} onChange={setBedsSmall} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Stepper label="Sức chứa tối đa (Người)" value={capacity} onChange={setCapacity} min={1} />
          <NumberField label="Diện tích (m2)" value={areaM2} onChange={setAreaM2} placeholder="VD: 25" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Giá cơ bản"
            required
            value={String(basePrice)}
            onChange={(v) => setBasePrice(Number(v) || 0)}
            placeholder="0"
          />
          <div>
            <label className="mb-1.5 block text-[12px]">
              Cách tính giá <span className="text-pms-danger">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
              value={pricingMethod}
              onChange={(e) => setPricingMethod(e.target.value as "PER_NIGHT" | "PER_HOUR")}
            >
              <option value="PER_NIGHT">Theo đêm</option>
              <option value="PER_HOUR">Theo giờ</option>
            </select>
          </div>
        </div>
        <NumberField
          label="Giảm giá (%)"
          value={String(discountPercent)}
          onChange={(v) => setDiscountPercent(Math.max(0, Math.min(100, Number(v) || 0)))}
          placeholder="0"
        />
      </div>
    </Modal>
  );
}

function TextField({
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px]">
        {label} {required && <span className="text-pms-danger">*</span>}
      </label>
      <input
        className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function NumberField({
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px]">
        {label} {required && <span className="text-pms-danger">*</span>}
      </label>
      <input
        type="number"
        className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function Stepper({
  label,
  required,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  required?: boolean;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px]">
        {label} {required && <span className="text-pms-danger">*</span>}
      </label>
      <div className="flex items-center justify-between rounded-lg border border-pms-border px-3 py-2">
        <span className="cursor-pointer text-[13px]" onClick={() => onChange(Math.max(min, value - 1))}>
          −
        </span>
        <span className="text-[13px]">{value}</span>
        <span className="cursor-pointer text-[13px]" onClick={() => onChange(value + 1)}>
          +
        </span>
      </div>
    </div>
  );
}
