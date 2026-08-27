"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/useSettings";
import { DatePickerModal } from "@/components/ui/DatePickerModal";

interface Holiday {
  id: string;
  name: string;
  from: string; // "yyyy-mm-dd" hoặc rỗng nếu chưa chọn
  to: string;
  adjustmentType: "PERCENT" | "FIXED";
  adjustmentValue: number;
}

interface TimeData {
  holidays: Holiday[];
  prepaidServices: string[];
  selectedPrepaidServices: string[];
  checkinTime: string;
  checkoutTime: string;
  timeFormat: "24h" | "12h";
  timezone: string;
  overnightFrom: string;
  overnightTo: string;
  roundingMinutes: number;
  housekeepingMinutes: number;
  billingDayOfMonth: number;
  cutoffDayOfMonth: number;
}

const TIMEZONE_OPTIONS = ["GMT+7 (Bangkok, Hà Nội, Jakarta)", "UTC (Giờ quốc tế)"];

const FALLBACK: TimeData = {
  holidays: [],
  prepaidServices: ["Điện", "Nước", "Internet", "Vệ Sinh", "Thang máy"],
  selectedPrepaidServices: [],
  checkinTime: "14:00",
  checkoutTime: "12:00",
  timeFormat: "24h",
  timezone: TIMEZONE_OPTIONS[0],
  overnightFrom: "21:00",
  overnightTo: "12:00",
  roundingMinutes: 15,
  housekeepingMinutes: 15,
  billingDayOfMonth: 15,
  cutoffDayOfMonth: 5,
};

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `hol-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Tương thích dữ liệu cũ: holidays trước đây chỉ là string[] tên ngày lễ,
// không có from/to. Các trường mới (format/timezone/overnight/rounding...)
// dùng giá trị mặc định nếu bản ghi cũ chưa có.
function normalise(value: Partial<TimeData> | null | undefined): TimeData {
  return {
    holidays: Array.isArray(value?.holidays)
      ? value.holidays.map((raw): Holiday => {
          if (typeof raw === "string") return { id: newId(), name: raw, from: "", to: "", adjustmentType: "PERCENT", adjustmentValue: 0 };
          const h = raw as Partial<Holiday>;
          return {
            id: typeof h.id === "string" && h.id ? h.id : newId(),
            name: h.name ?? "",
            from: h.from ?? "",
            to: h.to ?? "",
            adjustmentType: h.adjustmentType === "FIXED" ? "FIXED" : "PERCENT",
            adjustmentValue: typeof h.adjustmentValue === "number" && Number.isFinite(h.adjustmentValue) ? Math.max(0, h.adjustmentValue) : 0,
          };
        })
      : [],
    prepaidServices: Array.isArray(value?.prepaidServices) && value.prepaidServices.length > 0 ? value.prepaidServices : FALLBACK.prepaidServices,
    selectedPrepaidServices: Array.isArray(value?.selectedPrepaidServices) ? value.selectedPrepaidServices : [],
    checkinTime: value?.checkinTime ?? FALLBACK.checkinTime,
    checkoutTime: value?.checkoutTime ?? FALLBACK.checkoutTime,
    timeFormat: value?.timeFormat === "12h" ? "12h" : "24h",
    timezone: value?.timezone ?? FALLBACK.timezone,
    overnightFrom: value?.overnightFrom ?? FALLBACK.overnightFrom,
    overnightTo: value?.overnightTo ?? FALLBACK.overnightTo,
    roundingMinutes: typeof value?.roundingMinutes === "number" ? value.roundingMinutes : FALLBACK.roundingMinutes,
    housekeepingMinutes: typeof value?.housekeepingMinutes === "number" ? value.housekeepingMinutes : FALLBACK.housekeepingMinutes,
    billingDayOfMonth: typeof value?.billingDayOfMonth === "number" ? value.billingDayOfMonth : FALLBACK.billingDayOfMonth,
    cutoffDayOfMonth: typeof value?.cutoffDayOfMonth === "number" ? value.cutoffDayOfMonth : FALLBACK.cutoffDayOfMonth,
  };
}

function formatDmy(iso: string): string {
  if (!iso) return "dd/mm/yy";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Trang "Thời gian" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT: property_settings
// nhóm "time". Toàn bộ trường trước đây tĩnh (định dạng giờ, múi giờ, giờ qua
// đêm, làm tròn giờ, dọn phòng, ngày chốt số điện nước, cắt điện, dịch vụ trả
// trước) nay đọc/ghi thật qua 1 state `form` và 1 nút "Cập nhật" duy nhất.
// DatePickerModal dùng chung cho ngày lễ (từ/đến) và 2 ô "ngày trong tháng"
// (chốt số điện nước / cắt điện) — `openPickerFor` xác định đang mở cho
// trường nào để định tuyến kết quả chọn về đúng chỗ.
export default function TimePage() {
  const { data, loading, saving, save } = useSettings<TimeData>("time", FALLBACK);
  const [form, setForm] = useState<TimeData>(FALLBACK);
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) setForm(normalise(data));
  }, [loading, data]);

  function addHolidayRow() {
    setForm((f) => ({ ...f, holidays: [...f.holidays, { id: newId(), name: "", from: "", to: "", adjustmentType: "PERCENT", adjustmentValue: 0 }] }));
  }
  function updateHolidayName(id: string, name: string) {
    setForm((f) => ({ ...f, holidays: f.holidays.map((h) => (h.id === id ? { ...h, name } : h)) }));
  }
  function updateHoliday(id: string, patch: Partial<Holiday>) {
    setForm((f) => ({ ...f, holidays: f.holidays.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
  }
  function removeHoliday(id: string) {
    setForm((f) => ({ ...f, holidays: f.holidays.filter((h) => h.id !== id) }));
  }
  function togglePrepaid(service: string) {
    setForm((f) => ({
      ...f,
      selectedPrepaidServices: f.selectedPrepaidServices.includes(service)
        ? f.selectedPrepaidServices.filter((s) => s !== service)
        : [...f.selectedPrepaidServices, service],
    }));
  }

  function pickerValue(): string | undefined {
    if (!openPickerFor) return undefined;
    if (openPickerFor.startsWith("holiday|")) {
      const [, id, which] = openPickerFor.split("|");
      const h = form.holidays.find((x) => x.id === id);
      const v = h ? (which === "from" ? h.from : h.to) : "";
      return v || undefined;
    }
    return undefined;
  }

  function handlePickerSelect(iso: string) {
    if (!openPickerFor) return;
    if (openPickerFor.startsWith("holiday|")) {
      const [, id, which] = openPickerFor.split("|");
      setForm((f) => ({ ...f, holidays: f.holidays.map((h) => (h.id === id ? { ...h, [which]: iso } : h)) }));
    } else if (openPickerFor === "billingDay") {
      setForm((f) => ({ ...f, billingDayOfMonth: Number(iso.split("-")[2]) }));
    } else if (openPickerFor === "cutoffDay") {
      setForm((f) => ({ ...f, cutoffDayOfMonth: Number(iso.split("-")[2]) }));
    }
  }

  async function handleSave() {
    try {
      await save(form);
    } catch {
      // Lỗi đã được useSettings hiển thị.
    }
  }

  return (
    <div>
      <h1 className="mb-5 text-[22px] font-bold">Thời gian</h1>

      <div className="mb-4 min-w-0 rounded-xl bg-white p-4 shadow-card sm:p-6">
        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
        {!loading && (
          <div className="flex max-w-[900px] flex-col gap-[18px]">
            <FieldRow label="Định dạng giờ">
              <select
                value={form.timeFormat}
                onChange={(e) => setForm((f) => ({ ...f, timeFormat: e.target.value as "24h" | "12h" }))}
                className="rounded-lg border border-pms-border bg-white px-3 py-2.5 text-[13px]"
                style={{ maxWidth: 300 }}
              >
                <option value="24h">24h</option>
                <option value="12h">12h (AM/PM)</option>
              </select>
            </FieldRow>
            <FieldRow label="Múi giờ">
              <select
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                className="rounded-lg border border-pms-border bg-white px-3 py-2.5 text-[13px]"
                style={{ maxWidth: 300 }}
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </FieldRow>
            <div className="grid gap-3 sm:grid-cols-[180px_130px_30px_130px] sm:items-center lg:grid-cols-[220px_130px_30px_130px]">
              <span className="text-[13px]">Nhận phòng / trả phòng</span>
              <input
                type="time"
                value={form.checkinTime}
                onChange={(e) => setForm((f) => ({ ...f, checkinTime: e.target.value }))}
                className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
              />
              <span className="text-center">→</span>
              <input
                type="time"
                value={form.checkoutTime}
                onChange={(e) => setForm((f) => ({ ...f, checkoutTime: e.target.value }))}
                className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[180px_130px_30px_130px] sm:items-center lg:grid-cols-[220px_130px_30px_130px]">
              <span className="text-[13px]">Cấu hình giờ qua đêm</span>
              <input
                type="time"
                value={form.overnightFrom}
                onChange={(e) => setForm((f) => ({ ...f, overnightFrom: e.target.value }))}
                className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
              />
              <span className="text-center">→</span>
              <input
                type="time"
                value={form.overnightTo}
                onChange={(e) => setForm((f) => ({ ...f, overnightTo: e.target.value }))}
                className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[180px_120px_minmax(0,1fr)] sm:items-center lg:grid-cols-[220px_120px_minmax(0,1fr)]">
              <span className="text-[13px]">Làm tròn giờ</span>
              <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={form.roundingMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, roundingMinutes: Number(e.target.value) || 0 }))}
                  className="w-14 border-0 p-0 text-[13px] outline-none"
                />
                <span className="text-pms-muted">Phút</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[180px_120px_minmax(0,1fr)] sm:items-center lg:grid-cols-[220px_120px_minmax(0,1fr)]">
              <span className="text-[13px]">Dọn phòng</span>
              <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={form.housekeepingMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, housekeepingMinutes: Number(e.target.value) || 0 }))}
                  className="w-14 border-0 p-0 text-[13px] outline-none"
                />
                <span className="text-pms-muted">Phút</span>
              </div>
            </div>

            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[13px]">Ngày lễ</span>
                <button
                  type="button"
                  onClick={addHolidayRow}
                  className="rounded-md border border-pms-primary px-2.5 py-1.5 text-[12px] font-medium text-pms-primary"
                >
                  + Thêm ngày lễ
                </button>
              </div>
              {form.holidays.map((h) => (
                <div key={h.id} className="mb-3 grid gap-2 rounded-lg border border-pms-divider p-3 md:grid-cols-[minmax(140px,1fr)_125px_125px_120px_120px_28px] md:items-center">
                  <input value={h.name} onChange={(e) => updateHolidayName(h.id, e.target.value)} className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" placeholder="Tên ngày lễ" />
                  <div className="flex cursor-pointer justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" onClick={() => setOpenPickerFor(`holiday|${h.id}|from`)}>{formatDmy(h.from)} 📅</div>
                  <div className="flex cursor-pointer justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" onClick={() => setOpenPickerFor(`holiday|${h.id}|to`)}>{formatDmy(h.to)} 📅</div>
                  <select value={h.adjustmentType} onChange={(e) => updateHoliday(h.id, { adjustmentType: e.target.value as Holiday["adjustmentType"] })} className="rounded-lg border border-pms-border bg-white px-3 py-2.5 text-[13px]"><option value="PERCENT">Tăng theo %</option><option value="FIXED">Tăng số tiền</option></select>
                  <input type="number" min="0" value={h.adjustmentValue} onChange={(e) => updateHoliday(h.id, { adjustmentValue: Math.max(0, Number(e.target.value) || 0) })} className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" placeholder={h.adjustmentType === "PERCENT" ? "%" : "VND"} />
                  <button type="button" aria-label={`Xóa ${h.name || "ngày lễ"}`} className="flex h-7 w-7 items-center justify-center rounded-lg border border-pms-border text-pms-danger" onClick={() => removeHoliday(h.id)}>−</button>
                  <div className="md:col-span-6 text-[11px] text-pms-muted">Đơn giá phòng khi rơi vào ngày này tăng {h.adjustmentValue.toLocaleString("vi-VN")}{h.adjustmentType === "PERCENT" ? "%" : " VND"} so với giá ngày thường.</div>
                </div>
              ))}
              {form.holidays.length === 0 && <p className="text-[12px] text-pms-muted">Chưa có ngày lễ nào. Bấm &quot;+ Thêm ngày lễ&quot; để thêm.</p>}
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 min-w-0 rounded-xl bg-white p-4 shadow-card sm:p-6">
        <h3 className="mb-[18px] text-[16px] font-bold">Thời gian tiện ích lưu trú ngắn hạn</h3>
        <div className="flex max-w-[700px] flex-col gap-[18px]">
          <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center lg:grid-cols-[220px_minmax(0,1fr)]">
            <span className="text-[13px]">Ngày chốt số điện, nước</span>
            <div
              className="flex max-w-[200px] cursor-pointer justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
              onClick={() => setOpenPickerFor("billingDay")}
            >
              {form.billingDayOfMonth} 📅
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center lg:grid-cols-[220px_minmax(0,1fr)]">
            <span className="text-[13px]">Cắt điện nếu chưa thanh toán vào ngày</span>
            <div
              className="flex max-w-[200px] cursor-pointer justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
              onClick={() => setOpenPickerFor("cutoffDay")}
            >
              {form.cutoffDayOfMonth} 📅
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)]">
            <span className="pt-0.5 text-[13px]">Áp dụng dịch vụ trả trước</span>
            <div className="flex flex-col gap-3">
              {form.prepaidServices.map((s) => (
                <label key={s} className="flex items-center gap-2.5 text-[13px]">
                  <input type="checkbox" checked={form.selectedPrepaidServices.includes(s)} onChange={() => togglePrepaid(s)} className="h-4 w-4" />
                  {s}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="w-[160px] cursor-pointer rounded-lg bg-pms-primary p-3 text-center text-[14px] font-semibold text-white"
        onClick={handleSave}
      >
        {saving ? "Đang lưu..." : "Cập nhật"}
      </div>

      {openPickerFor && <DatePickerModal value={pickerValue()} onSelect={handlePickerSelect} onClose={() => setOpenPickerFor(null)} />}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center sm:gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <span className="text-[13px]">{label}</span>
      {children}
    </div>
  );
}
