"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary, FieldBox } from "@/components/ui/Modal";

// Modal "Thêm tài sản mới" — pixel-perfect theo khối `showAddAsset` (dòng 1436-1478
// bản gốc). Đa phần trường tĩnh đúng bản gốc, riêng ô "Thời gian khấu hao" có nút
// −/+ thao tác được thật (đúng cấu trúc UI −/số/+ trong bản gốc dù không có logic rõ).
export function AddAssetModal({ onClose }: { onClose: () => void }) {
  const [months, setMonths] = useState(12);

  return (
    <Modal
      title="Thêm tài sản mới"
      onClose={onClose}
      width={600}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Cancel</ButtonGhost>
          <ButtonPrimary onClick={onClose}>Tạo tài sản</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-[12px]">Tên tài sản</label>
          <FieldBox placeholder>VD: Điều hòa 12.000BTU</FieldBox>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Mã tài sản</label>
            <FieldBox placeholder>VD: ABCD1236</FieldBox>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Đơn vị tính</label>
            <FieldBox placeholder>VD: Bộ</FieldBox>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Giá trị</label>
            <FieldBox placeholder>VD: 10.000.000đ</FieldBox>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Số lượng</label>
            <FieldBox placeholder>VD: 12</FieldBox>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Thời gian khấu hao</label>
            <div className="flex items-center gap-2.5 rounded-lg border border-pms-border px-2.5 py-1.5">
              <span
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-pms-divider font-bold text-pms-muted"
                onClick={() => setMonths((m) => Math.max(0, m - 1))}
              >
                −
              </span>
              <span className="flex-1 text-center text-[13px]">{months}</span>
              <span
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-pms-divider font-bold text-pms-muted"
                onClick={() => setMonths((m) => m + 1)}
              >
                +
              </span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">&nbsp;</label>
            <div className="flex items-center justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-text">
              Tháng <span>⌄</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Phòng lắp đặt</label>
            <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
              Chọn phòng <span>⌄</span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Trạng thái</label>
            <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
              Đang hoạt động <span>⌄</span>
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Hình ảnh</label>
          <label className="flex cursor-pointer justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
            Choose file <span>📎</span>
            <input type="file" accept="image/*" className="hidden" />
          </label>
        </div>
      </div>
    </Modal>
  );
}
