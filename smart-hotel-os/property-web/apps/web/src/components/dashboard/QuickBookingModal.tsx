"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { availableRoomOptions } from "@/lib/mock-data";

export interface QuickBookingPrefill {
  room?: string;
  checkinISO?: string;
  checkoutISO?: string;
}

// Modal "Đặt phòng nhanh từ lịch" — mở khi bấm nút "+ Đặt phòng nhanh" hoặc khi kéo
// chọn 1 dải ngày trống trên Gantt. Pixel-perfect theo khối `showQuickBooking`
// trong bản gốc (dòng 247-300).
export function QuickBookingModal({ prefill, onClose }: { prefill: QuickBookingPrefill; onClose: () => void }) {
  const [room, setRoom] = useState(prefill.room ?? "");
  const [extraRooms, setExtraRooms] = useState<string[]>([]);
  const [checkinISO, setCheckinISO] = useState(prefill.checkinISO ?? "");
  const [checkoutISO, setCheckoutISO] = useState(prefill.checkoutISO ?? "");
  const [showRoomPicker, setShowRoomPicker] = useState(false);

  const options = availableRoomOptions.filter((c) => c !== room && !extraRooms.includes(c));

  function pickRoom(code: string) {
    if (!room) setRoom(code);
    else setExtraRooms((v) => [...v, code]);
    setShowRoomPicker(false);
  }

  return (
    <Modal
      title="Đặt phòng nhanh từ lịch"
      onClose={onClose}
      width={560}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={onClose}>Tạo đặt phòng</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <p className="m-0 text-[12px] text-pms-muted">
          Chọn nhiều phòng trống cho cùng 1 khách hoặc theo đoàn, áp dụng cho một khoảng ngày liên tục — dùng để đặt trước hoặc đặt
          nhanh ngay từ lịch đặt phòng.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Nhận phòng</label>
            <input
              type="date"
              value={checkinISO}
              onChange={(e) => setCheckinISO(e.target.value)}
              className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Trả phòng</label>
            <input
              type="date"
              value={checkoutISO}
              onChange={(e) => setCheckoutISO(e.target.value)}
              className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
            />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[12px]">Chọn phòng trống (có thể chọn nhiều phòng cho đoàn)</label>
            <span className="cursor-pointer text-[11px] font-semibold text-pms-primary" onClick={() => setShowRoomPicker(true)}>
              + Thêm phòng
            </span>
          </div>
          <div
            className="flex cursor-pointer justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
            style={{ color: room ? "#23262F" : "#B1B5C3" }}
            onClick={() => setShowRoomPicker(true)}
          >
            {room || "Chọn phòng trống theo khoảng ngày trên"} <span>⌄</span>
          </div>
          {extraRooms.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {extraRooms.map((er) => (
                <span key={er} className="flex items-center gap-1.5 rounded-full bg-pms-primary-soft px-2.5 py-1 text-[12px] font-semibold text-pms-primary">
                  {er} <span className="cursor-pointer" onClick={() => setExtraRooms((v) => v.filter((c) => c !== er))}>✕</span>
                </span>
              ))}
            </div>
          )}
          {showRoomPicker && (
            <div className="relative">
              <div className="absolute left-0 right-0 top-1 z-[60] max-h-[200px] overflow-y-auto rounded-[10px] border border-pms-border bg-white shadow-popover">
                {options.map((ro) => (
                  <div key={ro} className="cursor-pointer border-b border-pms-divider px-3.5 py-2.5 text-[12.5px] hover:bg-pms-divider" onClick={() => pickRoom(ro)}>
                    {ro}
                  </div>
                ))}
                <div className="cursor-pointer px-3.5 py-2 text-center text-[11.5px] text-pms-muted" onClick={() => setShowRoomPicker(false)}>
                  Đóng
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-pms-divider pt-3.5">
          <b className="text-[13.5px]">Thông tin khách đặt trước</b>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Họ và tên / Tên đoàn</label>
          <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">Nhập họ tên khách hoặc tên đoàn</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Số điện thoại</label>
            <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">Số điện thoại</div>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Số lượng khách</label>
            <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">Số người</div>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Ghi chú</label>
          <div className="min-h-[50px] rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">Yêu cầu đặc biệt (nếu có)</div>
        </div>
      </div>
    </Modal>
  );
}
