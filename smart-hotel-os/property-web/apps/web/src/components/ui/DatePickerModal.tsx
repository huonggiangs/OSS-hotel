"use client";

// Modal chọn ngày dùng chung (Ngày lễ, Ngày chốt số điện/nước...) — pixel-perfect theo
// khối `showDatePicker` (dòng 1335-1353 bản gốc): lưới ngày tĩnh tháng 7/2026, bấm 1
// ngày bất kỳ sẽ đóng modal (đúng hành vi `closeDatePicker` gán cho mọi ô ngày ở bản gốc).
export function DatePickerModal({ onClose }: { onClose: () => void }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(23,26,31,.45)]" onClick={onClose}>
      <div className="w-[300px] rounded-[14px] bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3.5 flex items-center justify-between">
          <b className="text-[14px]">Tháng 7, 2026</b>
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
          {days.map((d) => (
            <div
              key={d}
              className="flex aspect-square cursor-pointer items-center justify-center rounded-md text-[12px] hover:bg-pms-divider"
              onClick={onClose}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="mt-3.5 flex gap-2.5">
          <div className="flex-1 rounded-lg border border-pms-border p-[9px] text-center text-[12px]">08:00</div>
          <div className="flex-1 rounded-lg border border-pms-border p-[9px] text-center text-[12px]">⌄ Giờ</div>
        </div>
      </div>
    </div>
  );
}
