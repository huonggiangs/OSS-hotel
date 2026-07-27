"use client";

import { useState } from "react";
import type { RoomCard } from "@/lib/mock-data";
import { Modal, ButtonGhost } from "@/components/ui/Modal";

function money(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

// Modal "Quản lý lưu trú" — pixel-perfect theo khối `showStayManage` (dòng 782-852):
// điều khiển nguồn điện tự động theo thẻ từ/cảm biến (đóng vai trò IoT rule engine ở
// RULES.md/MODULE_IOT_ENERGY.md), đổi phòng, tạm ứng thêm, trả phòng nhanh (2 bước).
export function StayManageModal({ room, onClose }: { room: RoomCard; onClose: () => void }) {
  const [powerAuto, setPowerAuto] = useState(true);
  const [onDelay, setOnDelay] = useState(2);
  const [offDelay, setOffDelay] = useState(5);
  const [advances, setAdvances] = useState<{ time: string; amount: number }[]>(
    (room.stayHours ?? 0) > 20 ? [{ time: "Hôm qua, 18:40", amount: 500000 + ((room.n % 3) * 200000) }] : [],
  );
  const [step, setStep] = useState<"main" | "confirm">("main");

  const advanceTotal = advances.reduce((s, a) => s + a.amount, 0);
  const roomCharge = Math.max(1, Math.ceil((room.stayHours ?? 4) / 24)) * 800000;
  const balanceDue = Math.max(0, roomCharge - advanceTotal);

  return (
    <Modal title={`Quản lý lưu trú — Phòng ${room.n}`} onClose={onClose} width={600} footer={<ButtonGhost onClick={onClose}>Đóng</ButtonGhost>}>
      <div className="flex flex-col gap-4 px-6 py-5">
        <div className="text-[13px] text-pms-muted">
          Khách: <b className="text-pms-text">{room.guest}</b> · Đã ở {room.stayLabel}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-pms-divider pt-3.5">
          <div>
            <b className="text-[13.5px]">Điều khiển nguồn điện phòng</b>
            <p className="m-0 mt-1 text-[11.5px] text-pms-muted">
              Khách vào phòng tự cấp nguồn, khách ra khỏi phòng tự tắt nguồn (theo thẻ từ/cảm biến)
            </p>
          </div>
          <div
            className="relative h-5 w-9 flex-shrink-0 cursor-pointer rounded-full"
            style={{ background: powerAuto ? "#284AB1" : "#E6E8EC" }}
            onClick={() => setPowerAuto((v) => !v)}
          >
            <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-[left]" style={{ left: powerAuto ? "18px" : "2px" }} />
          </div>
        </div>

        {powerAuto && (
          <div className="grid grid-cols-2 gap-4">
            <Stepper label="Trễ cấp nguồn khi vào (phút)" value={onDelay} onDec={() => setOnDelay((v) => Math.max(0, v - 1))} onInc={() => setOnDelay((v) => Math.min(30, v + 1))} />
            <Stepper label="Trễ tắt nguồn khi ra (phút)" value={offDelay} onDec={() => setOffDelay((v) => Math.max(0, v - 1))} onInc={() => setOffDelay((v) => Math.min(30, v + 1))} />
          </div>
        )}

        <div className="border-t border-pms-divider pt-3.5">
          <b className="text-[13.5px]">Đổi phòng (nếu phòng gặp lỗi)</b>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Đổi sang phòng</label>
          <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
            Chọn phòng trống, sạch <span>⌄</span>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Lý do đổi phòng</label>
          <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">VD: Điều hoà hỏng, khách yêu cầu...</div>
        </div>
        <div className="cursor-pointer rounded-lg bg-pms-primary py-2.5 text-center text-[13px] font-semibold text-white">Xác nhận đổi phòng</div>

        <div className="border-t border-pms-divider pt-3.5">
          <b className="text-[13.5px]">Tạm ứng thêm (khách ở nhiều ngày)</b>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-pms-divider px-3 py-2.5">
          <span className="text-[12px] text-pms-muted">Tổng đã tạm ứng</span>
          <b className="text-[15px] text-pms-primary">{money(advanceTotal)}</b>
        </div>
        {advances.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {advances.map((a, i) => (
              <div key={i} className="flex justify-between text-[12px] text-pms-muted">
                <span>{a.time}</span>
                <b className="text-pms-text">{money(a.amount)}</b>
              </div>
            ))}
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-[12px]">Số tiền tạm ứng mới</label>
          <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">500.000đ</div>
        </div>
        <div
          className="cursor-pointer rounded-lg bg-pms-primary py-2.5 text-center text-[13px] font-semibold text-white"
          onClick={() => setAdvances((v) => [...v, { time: "Vừa xong", amount: 500000 }])}
        >
          Ghi nhận tạm ứng
        </div>

        <div className="border-t border-pms-divider pt-3.5">
          <b className="text-[13.5px]">Trả phòng nhanh</b>
        </div>
        {step === "confirm" ? (
          <>
            <div className="flex flex-col gap-2 rounded-[10px] bg-pms-divider p-3.5">
              <b className="text-[13px]">Chốt số tiền khách nghỉ (tự động)</b>
              <div className="flex justify-between text-[12.5px]">
                <span className="text-pms-muted">Tiền phòng</span>
                <b>{money(roomCharge)}</b>
              </div>
              <div className="flex justify-between text-[12.5px]">
                <span className="text-pms-muted">Đã tạm ứng</span>
                <b className="text-pms-success">− {money(advanceTotal)}</b>
              </div>
              <div className="flex justify-between border-t border-pms-border pt-2 text-[13.5px]">
                <span className="font-semibold">Còn phải thu</span>
                <b className="text-pms-danger">{money(balanceDue)}</b>
              </div>
            </div>
            <div className="cursor-pointer rounded-lg bg-pms-danger py-2.5 text-center text-[13px] font-semibold text-white" onClick={onClose}>
              Xác nhận trả phòng &amp; thu tiền
            </div>
          </>
        ) : (
          <div className="cursor-pointer rounded-lg bg-pms-danger py-2.5 text-center text-[13px] font-semibold text-white" onClick={() => setStep("confirm")}>
            Trả phòng ngay
          </div>
        )}
      </div>
    </Modal>
  );
}

function Stepper({ label, value, onDec, onInc }: { label: string; value: number; onDec: () => void; onInc: () => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px]">{label}</label>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-pms-border font-bold" onClick={onDec}>
          −
        </div>
        <div className="flex-1 rounded-lg border border-pms-border py-1.5 text-center text-[13px] font-semibold">{value} phút</div>
        <div className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-pms-border font-bold" onClick={onInc}>
          +
        </div>
      </div>
    </div>
  );
}
