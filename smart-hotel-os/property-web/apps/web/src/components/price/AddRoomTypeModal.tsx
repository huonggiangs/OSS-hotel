"use client";

import { useEffect, useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { api, isApiError } from "@/lib/api-client";
import type { ApiRoomType } from "@/app/(pms)/price/page";

interface ApiRate {
  rate_key: RateKey;
  label: string;
  amount: string;
  minimum_units: number;
  active: boolean;
}
type RateKey = "HOUR" | "NIGHT" | "DAY" | "WEEK" | "MONTH" | "WEEKEND" | "HOLIDAY";
interface FlexibleRate {
  rateKey: RateKey;
  label: string;
  amount: number;
  minimumUnits: number;
  active: boolean;
}
interface ApiDynamicPricing {
  enabled: boolean;
  vacancy_days: number;
  vacancy_discount_percent: string;
  low_occupancy_percent: number;
  low_occupancy_adjustment_percent: string;
  high_occupancy_percent: number;
  high_occupancy_adjustment_percent: string;
  minimum_price: string | null;
}
interface DynamicPricing {
  enabled: boolean;
  vacancyDays: number;
  vacancyDiscountPercent: number;
  lowOccupancyPercent: number;
  lowOccupancyAdjustmentPercent: number;
  highOccupancyPercent: number;
  highOccupancyAdjustmentPercent: number;
  minimumPrice: number | null;
}

const RATE_DEFINITIONS: { rateKey: RateKey; label: string; minimumUnits: number }[] = [
  { rateKey: "HOUR", label: "Theo giờ", minimumUnits: 1 },
  { rateKey: "NIGHT", label: "Qua đêm", minimumUnits: 1 },
  { rateKey: "DAY", label: "Theo ngày", minimumUnits: 1 },
  { rateKey: "WEEK", label: "Theo tuần", minimumUnits: 1 },
  { rateKey: "MONTH", label: "Theo tháng", minimumUnits: 1 },
  { rateKey: "WEEKEND", label: "Cuối tuần", minimumUnits: 1 },
  { rateKey: "HOLIDAY", label: "Ngày lễ", minimumUnits: 1 },
];
const DEFAULT_DYNAMIC_PRICING: DynamicPricing = {
  enabled: false,
  vacancyDays: 7,
  vacancyDiscountPercent: 20,
  lowOccupancyPercent: 30,
  lowOccupancyAdjustmentPercent: -20,
  highOccupancyPercent: 80,
  highOccupancyAdjustmentPercent: 30,
  minimumPrice: null,
};

function defaultRates(basePrice: number, pricingMethod: "PER_NIGHT" | "PER_HOUR"): FlexibleRate[] {
  return RATE_DEFINITIONS.map((definition) => ({
    ...definition,
    amount: definition.rateKey === (pricingMethod === "PER_HOUR" ? "HOUR" : "NIGHT") ? basePrice : 0,
    active: definition.rateKey === (pricingMethod === "PER_HOUR" ? "HOUR" : "NIGHT"),
  }));
}

export function AddRoomTypeModal({ onClose, onSaved, initial, assignedRoomCount = 0 }: { onClose: () => void; onSaved: () => void; initial?: ApiRoomType; assignedRoomCount?: number }) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [basePrice, setBasePrice] = useState(initial ? Number(initial.base_price) : 0);
  const [capacity, setCapacity] = useState(initial?.capacity ?? 2);
  const [bedsBig, setBedsBig] = useState(initial?.beds_big ?? 1);
  const [bedsSmall, setBedsSmall] = useState(initial?.beds_small ?? 0);
  const [areaM2, setAreaM2] = useState<string>(initial?.area_m2 ?? "");
  const [pricingMethod, setPricingMethod] = useState<"PER_NIGHT" | "PER_HOUR">((initial?.pricing_method as "PER_NIGHT" | "PER_HOUR") ?? "PER_NIGHT");
  const [discountPercent, setDiscountPercent] = useState(initial ? Number(initial.discount_percent) : 0);
  const [rates, setRates] = useState<FlexibleRate[]>(defaultRates(initial ? Number(initial.base_price) : 0, (initial?.pricing_method as "PER_NIGHT" | "PER_HOUR") ?? "PER_NIGHT"));
  const [ratesLoading, setRatesLoading] = useState(Boolean(initial));
  const [dynamicPricing, setDynamicPricing] = useState<DynamicPricing>(DEFAULT_DYNAMIC_PRICING);
  const [dynamicPricingLoading, setDynamicPricingLoading] = useState(Boolean(initial));
  const [applyRoomPrices, setApplyRoomPrices] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initial) return;
    Promise.all([
      api.get<{ items: ApiRate[] }>(`/api/v1/room-types/${initial.id}/rates`),
      api.get<{ item: ApiDynamicPricing | null }>(`/api/v1/room-types/${initial.id}/dynamic-pricing`),
    ])
      .then(([ratesResponse, dynamicResponse]) => {
        const byKey = new Map(ratesResponse.items.map((rate) => [rate.rate_key, rate]));
        setRates(RATE_DEFINITIONS.map((definition) => {
          const saved = byKey.get(definition.rateKey);
          return saved ? { rateKey: saved.rate_key, label: saved.label, amount: Number(saved.amount), minimumUnits: saved.minimum_units, active: saved.active } : { ...definition, amount: 0, active: false };
        }));
        const savedDynamic = dynamicResponse.item;
        if (savedDynamic) {
          setDynamicPricing({
            enabled: savedDynamic.enabled,
            vacancyDays: savedDynamic.vacancy_days,
            vacancyDiscountPercent: Number(savedDynamic.vacancy_discount_percent),
            lowOccupancyPercent: savedDynamic.low_occupancy_percent,
            lowOccupancyAdjustmentPercent: Number(savedDynamic.low_occupancy_adjustment_percent),
            highOccupancyPercent: savedDynamic.high_occupancy_percent,
            highOccupancyAdjustmentPercent: Number(savedDynamic.high_occupancy_adjustment_percent),
            minimumPrice: savedDynamic.minimum_price === null ? null : Number(savedDynamic.minimum_price),
          });
        }
      })
      .catch((err) => setError(isApiError(err) ? err.message : "Không tải được bảng giá linh hoạt."))
      .finally(() => {
        setRatesLoading(false);
        setDynamicPricingLoading(false);
      });
    /*
     * Kept as a separate comment block so the dependency is explicit: the modal
     * is remounted for each selected type, and the initial record is immutable.
     */
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [initial]);

  function updateRate(rateKey: RateKey, patch: Partial<FlexibleRate>) {
    setRates((current) => current.map((rate) => rate.rateKey === rateKey ? { ...rate, ...patch } : rate));
  }

  async function handleSave() {
    if (!name.trim()) return setError("Vui lòng nhập tên loại phòng.");
    if (rates.some((rate) => !Number.isFinite(rate.amount) || rate.amount < 0 || !Number.isInteger(rate.minimumUnits) || rate.minimumUnits < 1)) {
      return setError("Kiểm tra lại giá và số đơn vị tối thiểu của bảng giá linh hoạt.");
    }
    if (
      !Number.isInteger(dynamicPricing.vacancyDays) ||
      dynamicPricing.vacancyDays < 1 ||
      dynamicPricing.vacancyDiscountPercent < 0 ||
      dynamicPricing.vacancyDiscountPercent > 100 ||
      dynamicPricing.lowOccupancyPercent >= dynamicPricing.highOccupancyPercent ||
      dynamicPricing.lowOccupancyAdjustmentPercent > 0 ||
      dynamicPricing.highOccupancyAdjustmentPercent < 0 ||
      (dynamicPricing.minimumPrice !== null && dynamicPricing.minimumPrice < 0)
    ) {
      return setError("Kiểm tra lại các ngưỡng và mức điều chỉnh của giá động.");
    }
    setSaving(true);
    setError(null);
    try {
      // Giá loại phòng là nguồn chung. Bỏ chọn nghĩa là chỉ lưu mô tả, không
      // được âm thầm thay bảng giá hoặc quy tắc đang dùng của các phòng cũ.
      const body = {
        name: name.trim(), capacity, bedsBig, bedsSmall, areaM2: areaM2 === "" ? null : Number(areaM2),
        ...(!isEdit || applyRoomPrices ? { basePrice, pricingMethod, discountPercent } : {}),
      };
      const roomType = isEdit && initial ? await api.patch<ApiRoomType>(`/api/v1/room-types/${initial.id}`, body) : await api.post<ApiRoomType>("/api/v1/room-types", body);
      if (!isEdit || applyRoomPrices) {
        await api.put(`/api/v1/room-types/${roomType.id}/rates`, { items: rates });
        await api.put(`/api/v1/room-types/${roomType.id}/dynamic-pricing`, dynamicPricing);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không lưu được loại phòng hoặc bảng giá.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Sửa loại phòng & giá linh hoạt" : "Thêm loại phòng & giá linh hoạt"} onClose={onClose} width={720} footer={<><ButtonGhost onClick={onClose}>Hủy</ButtonGhost><ButtonPrimary onClick={handleSave}>{saving ? "Đang lưu..." : "Lưu"}</ButtonPrimary></>}>
      <div className="flex flex-col gap-4 px-6 py-5">
        {error && <div className="rounded-lg bg-[#FDECEC] px-3 py-2 text-[12px] text-pms-danger">{error}</div>}
        <TextField label="Loại phòng" required value={name} onChange={setName} placeholder="Tên loại phòng" />
        <div className="grid grid-cols-2 gap-4"><Stepper label="Số lượng giường lớn" value={bedsBig} onChange={setBedsBig} /><Stepper label="Số lượng giường nhỏ" value={bedsSmall} onChange={setBedsSmall} /></div>
        <div className="grid grid-cols-2 gap-4"><Stepper label="Sức chứa tối đa (người)" value={capacity} onChange={setCapacity} min={1} /><NumberField label="Diện tích (m²)" value={areaM2} onChange={setAreaM2} placeholder="VD: 25" /></div>
        <div className="grid grid-cols-2 gap-4"><NumberField label="Giá cơ bản (tương thích báo giá cũ)" required value={String(basePrice)} onChange={(value) => setBasePrice(Number(value) || 0)} placeholder="0" /><div><label className="mb-1.5 block text-[12px]">Loại giá cơ bản</label><select className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" value={pricingMethod} onChange={(event) => setPricingMethod(event.target.value as "PER_NIGHT" | "PER_HOUR")}><option value="PER_NIGHT">Theo đêm</option><option value="PER_HOUR">Theo giờ</option></select></div></div>
        <NumberField label="Giảm giá mặc định (%)" value={String(discountPercent)} onChange={(value) => setDiscountPercent(Math.max(0, Math.min(100, Number(value) || 0)))} placeholder="0" />
        {isEdit && assignedRoomCount > 0 && <label className="flex items-start gap-2 rounded-xl border border-pms-primary-soft bg-pms-primary-soft/25 p-3 text-[12px] text-pms-text"><input className="mt-0.5" type="checkbox" checked={applyRoomPrices} onChange={(event) => setApplyRoomPrices(event.target.checked)} /><span><b className="block text-[13px] text-pms-primary">Áp dụng bảng giá mới cho tất cả {assignedRoomCount} phòng cùng loại</b>{applyRoomPrices ? "Các mức giá linh hoạt và quy tắc giá động sẽ có hiệu lực ngay với các phòng đang dùng loại này." : "Chỉ lưu tên và thông tin mô tả loại phòng; bảng giá và giá động hiện tại được giữ nguyên."}</span></label>}
        <div className="rounded-xl border border-pms-border p-3.5"><div className="mb-1"><b className="text-[13px]">Bảng giá linh hoạt</b></div><p className="m-0 mb-3 text-[11.5px] text-pms-muted">Bật các mức giá áp dụng cho loại phòng. Chi tiết giá được lưu riêng theo từng loại phòng.</p>{ratesLoading ? <p className="m-0 text-[12px] text-pms-muted">Đang tải bảng giá...</p> : <div className="space-y-2">{rates.map((rate) => <div key={rate.rateKey} className="grid grid-cols-[24px_1fr_130px_100px] items-center gap-2"><input type="checkbox" checked={rate.active} onChange={(event) => updateRate(rate.rateKey, { active: event.target.checked })} /><input value={rate.label} onChange={(event) => updateRate(rate.rateKey, { label: event.target.value })} className="rounded-md border border-pms-border px-2.5 py-2 text-[12.5px]" /><input type="number" min="0" value={rate.amount} onChange={(event) => updateRate(rate.rateKey, { amount: Number(event.target.value) || 0 })} className="rounded-md border border-pms-border px-2.5 py-2 text-[12.5px]" aria-label={`Giá ${rate.label}`} /><input type="number" min="1" value={rate.minimumUnits} onChange={(event) => updateRate(rate.rateKey, { minimumUnits: Math.max(1, Number(event.target.value) || 1) })} className="rounded-md border border-pms-border px-2.5 py-2 text-[12.5px]" aria-label={`Đơn vị tối thiểu ${rate.label}`} /></div>)}</div>}<div className="mt-2 grid grid-cols-[24px_1fr_130px_100px] gap-2 text-[10.5px] text-pms-muted"><span /><span>Loại giá</span><span>Đơn giá (VND)</span><span>Đơn vị tối thiểu</span></div></div>
        <div className="rounded-xl border border-pms-primary-soft bg-pms-primary-soft/25 p-3.5">
          <label className="flex items-center gap-2 text-[13px] font-semibold text-pms-primary"><input type="checkbox" checked={dynamicPricing.enabled} onChange={(event) => setDynamicPricing((current) => ({ ...current, enabled: event.target.checked }))} />Bật giá động cho phòng đang trống</label>
          <p className="mb-3 mt-1 text-[11.5px] text-pms-muted">Giá hiện thời chỉ tự điều chỉnh với phòng VACANT; giá đã chốt của booking không bị thay đổi.</p>
          {dynamicPricingLoading ? <p className="m-0 text-[12px] text-pms-muted">Đang tải quy tắc giá động...</p> : <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3"><RuleNumber label="Trống liên tiếp (ngày)" value={dynamicPricing.vacancyDays} min={1} onChange={(value) => setDynamicPricing((current) => ({ ...current, vacancyDays: Math.max(1, Math.trunc(value) || 1) }))} /><RuleNumber label="Giảm khi trống lâu (%)" value={dynamicPricing.vacancyDiscountPercent} min={0} max={100} onChange={(value) => setDynamicPricing((current) => ({ ...current, vacancyDiscountPercent: Math.max(0, Math.min(100, value || 0)) }))} /></div>
            <div className="rounded-lg border border-pms-border bg-white p-3"><b className="text-[12px]">Quy tắc động theo tỷ lệ lấp đầy hiện tại</b><div className="mt-2 grid grid-cols-2 gap-3"><RuleNumber label="Lấp đầy dưới (%)" value={dynamicPricing.lowOccupancyPercent} min={0} max={100} onChange={(value) => setDynamicPricing((current) => ({ ...current, lowOccupancyPercent: Math.max(0, Math.min(100, Math.trunc(value) || 0)) }))} /><RuleNumber label="Điều chỉnh thấp (%)" value={dynamicPricing.lowOccupancyAdjustmentPercent} min={-100} max={0} onChange={(value) => setDynamicPricing((current) => ({ ...current, lowOccupancyAdjustmentPercent: Math.max(-100, Math.min(0, value || 0)) }))} /><RuleNumber label="Lấp đầy trên (%)" value={dynamicPricing.highOccupancyPercent} min={0} max={100} onChange={(value) => setDynamicPricing((current) => ({ ...current, highOccupancyPercent: Math.max(0, Math.min(100, Math.trunc(value) || 0)) }))} /><RuleNumber label="Điều chỉnh cao (%)" value={dynamicPricing.highOccupancyAdjustmentPercent} min={0} max={200} onChange={(value) => setDynamicPricing((current) => ({ ...current, highOccupancyAdjustmentPercent: Math.max(0, Math.min(200, value || 0)) }))} /></div></div>
            <RuleNumber label="Giá sàn (VND, để trống nếu không dùng)" value={dynamicPricing.minimumPrice ?? ""} min={0} onChange={(value) => setDynamicPricing((current) => ({ ...current, minimumPrice: value || null }))} />
            <p className="m-0 text-[11px] text-pms-muted">Ví dụ như ảnh: lấp đầy &lt;30% → -20%, &gt;80% → +30%. Nếu phòng trống vượt ngưỡng, mức giảm trống lâu được cộng dồn theo tỷ lệ.</p>
          </div>}
        </div>
      </div>
    </Modal>
  );
}

function TextField({ label, required, value, onChange, placeholder }: { label: string; required?: boolean; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div><label className="mb-1.5 block text-[12px]">{label} {required && <span className="text-pms-danger">*</span>}</label><input className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}
function NumberField({ label, required, value, onChange, placeholder }: { label: string; required?: boolean; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div><label className="mb-1.5 block text-[12px]">{label} {required && <span className="text-pms-danger">*</span>}</label><input type="number" min="0" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}
function RuleNumber({ label, value, min, max, onChange }: { label: string; value: number | string; min: number; max?: number; onChange: (value: number) => void }) {
  return <div><label className="mb-1.5 block text-[11.5px]">{label}</label><input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full rounded-md border border-pms-border bg-white px-2.5 py-2 text-[12.5px]" /></div>;
}
function Stepper({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (value: number) => void; min?: number }) {
  return <div><label className="mb-1.5 block text-[12px]">{label}</label><div className="flex items-center justify-between rounded-lg border border-pms-border px-3 py-2"><button type="button" onClick={() => onChange(Math.max(min, value - 1))}>−</button><span className="text-[13px]">{value}</span><button type="button" onClick={() => onChange(value + 1)}>+</button></div></div>;
}
