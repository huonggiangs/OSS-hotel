"use client";

import { useState } from "react";

// Modal chọn ngày dùng chung (Ngày lễ, Ngày chốt số điện/nước...) — lịch thật:
// hiển thị đúng tháng/năm hiện tại (hoặc tháng của `value` nếu có), điều hướng
// tháng trước/sau thật, tính đúng số ngày trong tháng và offset thứ trong
// tuần bằng Date thuần (không cần thư viện ngoài). Bấm 1 ngày sẽ gọi
// onSelect(isoDate) rồi đóng modal — khác bản gốc chỉ đóng modal không lưu gì.
export function DatePickerModal({
  value,
  onSelect,
  onClose,
}: {
  value?: string;
  onSelect: (isoDate: string) => void;
  onClose: () => void;
}) {
  const initial = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth()); // 0-based

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  // getDay(): 0=CN,1=T2,...,6=T7 — lưới hiển thị bắt đầu từ T2 nên dịch offset.
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [...Array.from({ length: startOffset }, () => null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }
  function pick(day: number) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onSelect(iso);
    onClose();
  }

  const selectedDay =
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) === viewYear && Number(value.slice(5, 7)) === viewMonth + 1
      ? Number(value.slice(8, 10))
      : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(23,26,31,.45)]" onClick={onClose}>
      <div className="w-[300px] rounded-[14px] bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="cursor-pointer select-none px-1 text-[14px] text-pms-muted" onClick={prevMonth} title="Tháng trước">
              ‹
            </span>
            <b className="text-[14px]">
              Tháng {viewMonth + 1}, {viewYear}
            </b>
            <span className="cursor-pointer select-none px-1 text-[14px] text-pms-muted" onClick={nextMonth} title="Tháng sau">
              ›
            </span>
          </div>
          <div className="cursor-pointer text-[16px] text-pms-muted" onClick={onClose}>
            ✕
          </div>
        </div>
        <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[11px] text-pms-muted">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, idx) =>
            d === null ? (
              <div key={`empty-${idx}`} />
            ) : (
              <div
                key={d}
                className="flex aspect-square cursor-pointer items-center justify-center rounded-md text-[12px] hover:bg-pms-divider"
                style={d === selectedDay ? { background: "#284AB1", color: "#fff", fontWeight: 600 } : undefined}
                onClick={() => pick(d)}
              >
                {d}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
