"use client";

import { Modal, ButtonGhost, ButtonPrimary, FieldBox } from "@/components/ui/Modal";

// Modal "Thêm loại thuế/phí" — pixel-perfect theo khối `showAddTax` (dòng 1786-1806
// bản gốc). Toàn bộ trường tĩnh đúng bản gốc.
export function AddTaxModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Thêm loại thuế/phí"
      onClose={onClose}
      width={420}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={onClose}>Lưu</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-[12px]">Tên loại thuế/phí</label>
          <FieldBox placeholder>VD: Thuế GTGT, Phí dịch vụ...</FieldBox>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Mức thu</label>
          <FieldBox placeholder>VD: 8% hoặc 20.000đ/đêm</FieldBox>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Áp dụng cho</label>
          <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
            Chọn phạm vi áp dụng <span>⌄</span>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-[12px]">Mục đích</label>
          <label className="mb-2.5 flex items-center gap-2 text-[13px]">
            <span className="inline-block h-4 w-4 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" />
            Tính vào hoá đơn khách hàng
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <span className="inline-block h-4 w-4 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" />
            Chỉ hạch toán nội bộ (không hiển thị cho khách)
          </label>
        </div>
      </div>
    </Modal>
  );
}
