"use client";

import { useState } from "react";
import { holidaysSeed, prepaidServices } from "@/lib/mock-data";
import { DatePickerModal } from "@/components/ui/DatePickerModal";

// Trang "Thời gian" (mở từ panel Cài đặt) — pixel-perfect theo khối `isTime` (dòng
// 1809-1890 bản gốc): cấu hình giờ nhận/trả phòng, ngày lễ (thêm dòng được), thời gian
// tiện ích lưu trú ngắn hạn (chốt số điện nước, cắt điện, dịch vụ trả trước).
export default function TimePage() {
  const [holidayCount, setHolidayCount] = useState(3);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const holidays = Array.from({ length: holidayCount }, (_, i) => ({ name: holidaysSeed[i] || "", isLast: i === holidayCount - 1 }));

  return (
    <div>
      <h1 className="mb-5 text-[22px] font-bold">Thời gian</h1>

      <div className="mb-4 rounded-xl bg-white p-6 shadow-card">
        <div className="flex max-w-[900px] flex-col gap-[18px]">
          <FieldRow label="Định dạng giờ">
            <SelectBox width={300} placeholder="24h" />
          </FieldRow>
          <FieldRow label="Múi giờ">
            <SelectBox width={300} placeholder="GMT + 7 Bangkok" />
          </FieldRow>
          <div className="grid grid-cols-[220px_20px_120px_30px_120px] items-center gap-3">
            <span className="text-[13px]">Nhận phòng/ trả phòng</span>
            <Checkbox />
            <ValueBox>14:00</ValueBox>
            <span className="text-center">→</span>
            <ValueBox>12:00</ValueBox>
          </div>
          <div className="grid grid-cols-[220px_20px_120px_30px_120px] items-center gap-3">
            <span className="text-[13px]">Cấu hình giờ qua đêm</span>
            <Checkbox />
            <ValueBox>21:00</ValueBox>
            <span className="text-center">→</span>
            <ValueBox>12:00</ValueBox>
          </div>
          <div className="grid grid-cols-[220px_20px_120px_1fr] items-center gap-3">
            <span className="text-[13px]">Làm tròn giờ</span>
            <Checkbox />
            <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">
              15 <span className="text-pms-muted">Phút</span>
            </div>
          </div>
          <div className="grid grid-cols-[220px_20px_120px_1fr] items-center gap-3">
            <span className="text-[13px]">Dọn phòng</span>
            <Checkbox />
            <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">
              15 <span className="text-pms-muted">Phút</span>
            </div>
          </div>

          <div>
            <span className="mb-2.5 block text-[13px]">Ngày lễ</span>
            {holidays.map((h, i) => (
              <div key={i} className="mb-3 grid grid-cols-[220px_20px_170px_60px_130px_60px_130px_30px] items-center gap-3">
                <span />
                <Checkbox />
                <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">{h.name}</div>
                <span className="text-[13px] text-pms-muted">Từ ngày</span>
                <div
                  className="flex cursor-pointer justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2"
                  onClick={() => setShowDatePicker(true)}
                >
                  dd/mm/yy 📅
                </div>
                <span className="text-[13px] text-pms-muted">Đến ngày</span>
                <div
                  className="flex cursor-pointer justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2"
                  onClick={() => setShowDatePicker(true)}
                >
                  dd/mm/yy 📅
                </div>
                {h.isLast ? (
                  <div
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-pms-border"
                    onClick={() => setHolidayCount((c) => c + 1)}
                  >
                    +
                  </div>
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-pms-border text-pms-muted-2">−</div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 w-[160px] cursor-pointer rounded-lg bg-pms-primary p-3 text-center text-[14px] font-semibold text-white">Cập nhật</div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <h3 className="mb-[18px] text-[16px] font-bold">Thời gian tiện ích lưu trú ngắn hạn</h3>
        <div className="flex max-w-[700px] flex-col gap-[18px]">
          <div className="grid grid-cols-[220px_20px_1fr] items-center gap-3">
            <span className="text-[13px]">Ngày chốt số điện, nước</span>
            <Checkbox />
            <div
              className="flex max-w-[200px] cursor-pointer justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
              onClick={() => setShowDatePicker(true)}
            >
              15 📅
            </div>
          </div>
          <div className="grid grid-cols-[220px_20px_1fr] items-center gap-3">
            <span className="text-[13px]">Cắt điện nếu chưa thanh toán vào ngày</span>
            <Checkbox />
            <div
              className="flex max-w-[200px] cursor-pointer justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
              onClick={() => setShowDatePicker(true)}
            >
              05 📅
            </div>
          </div>
          <div className="grid grid-cols-[220px_1fr] gap-3">
            <span className="pt-0.5 text-[13px]">Áp dụng dịch vụ trả trước</span>
            <div className="flex flex-col gap-3">
              {prepaidServices.map((s) => (
                <label key={s} className="flex items-center gap-2.5 text-[13px]">
                  <span className="inline-block h-4 w-4 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" />
                  {s}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showDatePicker && <DatePickerModal onClose={() => setShowDatePicker(false)} />}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[220px_1fr] items-center gap-4">
      <span className="text-[13px]">{label}</span>
      {children}
    </div>
  );
}
function SelectBox({ placeholder, width }: { placeholder: string; width: number }) {
  return (
    <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" style={{ maxWidth: width }}>
      {placeholder} <span>⌄</span>
    </div>
  );
}
function Checkbox() {
  return <span className="inline-block h-4 w-4 rounded border-[1.5px] border-pms-muted-2" />;
}
function ValueBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">{children}</div>;
}
