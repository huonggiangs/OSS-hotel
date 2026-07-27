"use client";

import { Modal, ButtonGhost, ButtonPrimary, FieldBox } from "@/components/ui/Modal";
import { expenseCategories } from "@/lib/mock-data";

// Modal "Thêm chi phí" — pixel-perfect theo khối `showAddExpense` (dòng 1210-1232 bản
// gốc). Bản gốc để các trường là placeholder tĩnh (không bind state thật, nút Lưu chỉ
// đóng modal) — giữ nguyên hành vi đó ở đây, không tự thêm logic lưu dữ liệu.
export function AddExpenseModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Thêm chi phí"
      onClose={onClose}
      width={440}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={onClose}>Lưu</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-[12px]">Loại chi phí</label>
          <div className="grid grid-cols-2 gap-2.5">
            {expenseCategories.map((c) => (
              <label key={c} className="flex items-center gap-2 text-[13px]">
                <span className="inline-block h-[15px] w-[15px] flex-shrink-0 rounded-full border-[1.5px] border-pms-muted-2" />
                {c}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Ngày phát sinh</label>
          <FieldBox placeholder>dd/mm/yyyy 📅</FieldBox>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Nội dung</label>
          <FieldBox placeholder>Mô tả chi phí</FieldBox>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Số tiền</label>
          <FieldBox placeholder>0đ</FieldBox>
        </div>
      </div>
    </Modal>
  );
}
