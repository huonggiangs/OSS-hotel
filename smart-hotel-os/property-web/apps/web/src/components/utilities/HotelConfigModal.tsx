"use client";

import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

// Modal "Cấu hình Google Hotel" — pixel-perfect theo khối `showHotelConfig` (dòng
// 2309-2331 bản gốc): 2 công tắc bật/tắt thật (đồng bộ trạng thái phòng / khuyến mãi)
// đúng hành vi `toggleHotelSyncAvail`/`toggleHotelSyncPromo` bản gốc.
export function HotelConfigModal({
  syncAvail,
  syncPromo,
  onToggleAvail,
  onTogglePromo,
  onClose,
}: {
  syncAvail: boolean;
  syncPromo: boolean;
  onToggleAvail: () => void;
  onTogglePromo: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title="Cấu hình Google Hotel"
      onClose={onClose}
      width={520}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={onClose}>Lưu &amp; gắn lên Google Hotel</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <p className="m-0 text-[12px] text-pms-muted">
          Đưa cơ sở lên Google Hotel để khách dễ tiếp cận — hệ thống tự động đồng bộ trạng thái còn phòng và khuyến mãi khi
          khách tìm trực tiếp trên Google Hotel.
        </p>
        <div className="flex items-center justify-between border-t border-pms-divider pt-3.5">
          <div>
            <b className="text-[13.5px]">Đồng bộ trạng thái còn phòng</b>
            <p className="m-0 mt-1 text-[11.5px] text-pms-muted">Cập nhật số phòng trống theo thời gian thực từ Trạng thái phòng</p>
          </div>
          <Toggle on={syncAvail} onClick={onToggleAvail} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <b className="text-[13.5px]">Đồng bộ khuyến mãi</b>
            <p className="m-0 mt-1 text-[11.5px] text-pms-muted">Hiển thị khuyến mãi/giảm giá hiện có của cơ sở trên Google Hotel Search</p>
          </div>
          <Toggle on={syncPromo} onClick={onTogglePromo} />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Mã liên kết Google Hotel Center</label>
          <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">Nhập Hotel ID / mã đối tác</div>
        </div>
      </div>
    </Modal>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="relative h-5 w-9 flex-shrink-0 cursor-pointer rounded-full"
      style={{ background: on ? "#284AB1" : "#E6E8EC" }}
    >
      <div
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-[left]"
        style={{ left: on ? 18 : 2 }}
      />
    </div>
  );
}
