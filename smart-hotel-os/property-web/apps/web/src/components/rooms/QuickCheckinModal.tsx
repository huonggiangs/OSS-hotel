"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { stayTypeOptions } from "@/lib/mock-data";

// Modal "Nhận phòng nhanh — Kiosk self check-in" — pixel-perfect theo khối
// `showQuickCheckin` (dòng 731-780). Đây là điểm nối PMS ↔ Kiosk theo RULES.md
// (Booking → Kiosk check-in → Room activation) — form thu thập tối thiểu theo quy
// định lưu trú, có bật nguồn điện phòng ngay khi khách nhận phòng.
export function QuickCheckinModal({ roomNumber, onClose }: { roomNumber: number | null; onClose: () => void }) {
  const [stayType, setStayType] = useState("day");
  const [powerOn, setPowerOn] = useState(true);

  const priceOf: Record<string, string> = Object.fromEntries(stayTypeOptions.map((s) => [s.key, s.price]));

  return (
    <Modal
      title={
        <>
          Nhận phòng nhanh — Kiosk self check-in {roomNumber && <span className="font-normal">(Phòng {roomNumber})</span>}
        </>
      }
      onClose={onClose}
      width={560}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={onClose}>Xác nhận nhận phòng</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-[12px]">Chọn phòng (chỉ hiện phòng Trống, sạch)</label>
          <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
            Chọn phòng trống, sạch <span>⌄</span>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Hình thức nghỉ</label>
          <div className="flex flex-wrap gap-2">
            {stayTypeOptions.map((st) => {
              const active = stayType === st.key;
              return (
                <div
                  key={st.key}
                  onClick={() => setStayType(st.key)}
                  className="cursor-pointer rounded-full px-3.5 py-2 text-[12.5px] font-semibold"
                  style={{
                    border: `1px solid ${active ? "#284AB1" : "#E6E8EC"}`,
                    background: active ? "#EEF1FB" : "#fff",
                    color: active ? "#284AB1" : "#777E90",
                  }}
                >
                  {st.label}
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-[13px] font-semibold text-pms-primary">Đơn giá: {priceOf[stayType]}</div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-pms-divider pt-3.5">
          <div>
            <b className="text-[13.5px]">Bật nguồn điện phòng</b>
            <p className="m-0 mt-1 text-[11.5px] text-pms-muted">Cấp nguồn ngay khi khách nhận phòng</p>
          </div>
          <div
            className="relative h-5 w-9 flex-shrink-0 cursor-pointer rounded-full"
            style={{ background: powerOn ? "#284AB1" : "#E6E8EC" }}
            onClick={() => setPowerOn((v) => !v)}
          >
            <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-[left]" style={{ left: powerOn ? "18px" : "2px" }} />
          </div>
        </div>
        <div className="border-t border-pms-divider pt-3.5">
          <b className="text-[14px]">Thông tin khách (theo quy định lưu trú)</b>
          <p className="m-0 mt-1 text-[11.5px] text-pms-muted">
            Thu thập tối thiểu theo yêu cầu đăng ký tạm trú/khai báo lưu trú áp dụng chung cho khách nội địa &amp; quốc tế; hệ thống
            tự động báo cáo cơ quan chức năng nếu địa phương yêu cầu.
          </p>
        </div>
        <Field label="Họ và tên (theo giấy tờ)" placeholder="Nhập họ tên đầy đủ" />
        <div className="grid grid-cols-2 gap-4">
          <FieldSelect label="Quốc tịch" placeholder="Chọn quốc gia" />
          <FieldSelect label="Loại giấy tờ" placeholder="CCCD / Hộ chiếu / ID" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Số giấy tờ" placeholder="Nhập số CCCD/hộ chiếu" />
          <FieldSelect label="Ngày sinh" placeholder="dd/mm/yyyy 📅" />
        </div>
        <label className="block cursor-pointer rounded-[10px] border border-dashed border-pms-muted-2 p-4 text-center text-[13px] text-pms-muted">
          📷 Chụp/tải ảnh mặt giấy tờ (đối chiếu, lưu trữ theo luật)
          <input type="file" accept="image/*" className="hidden" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Số điện thoại" placeholder="Số điện thoại" />
          <FieldSelect label="Dự kiến trả phòng" placeholder="dd/mm/yyyy 📅" />
        </div>
        <label className="flex items-start gap-2 text-[12px]">
          <span className="mt-px inline-block h-[15px] w-[15px] flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" />
          Tôi xác nhận thông tin trên chính xác và đồng ý để cơ sở lưu trú khai báo tạm trú với cơ quan quản lý theo quy định pháp
          luật hiện hành.
        </label>
      </div>
    </Modal>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px]">{label}</label>
      <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">{placeholder}</div>
    </div>
  );
}
function FieldSelect({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px]">{label}</label>
      <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">{placeholder}</div>
    </div>
  );
}
