"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary, FieldBox } from "@/components/ui/Modal";
import { expenseCategories } from "@/lib/mock-data";

// Modal "Thêm chi phí" — ĐÃ NỐI API THẬT (POST /api/v1/expenses qua callback
// onCreate của trang cha). Khác bản gốc (toàn bộ trường là placeholder tĩnh,
// nút Lưu chỉ đóng modal) — bổ sung state thật tối thiểu để nút Lưu hoạt
// động, đúng yêu cầu "nút Lưu gọi API thật" cho nhóm màn hình vận hành.
export function AddExpenseModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: { category: string; amount: number; description: string; expenseDate: string }) => void;
}) {
  const [category, setCategory] = useState(expenseCategories[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!amount) return;
    setSaving(true);
    try {
      onCreate({ category, amount: Number(amount), description: desc, expenseDate: date });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Thêm chi phí"
      onClose={onClose}
      width={440}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={handleSave}>{saving ? "Đang lưu..." : "Lưu"}</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-[12px]">Loại chi phí</label>
          <div className="grid grid-cols-2 gap-2.5">
            {expenseCategories.map((c) => (
              <label key={c} className="flex cursor-pointer items-center gap-2 text-[13px]" onClick={() => setCategory(c)}>
                <span
                  className="inline-block h-[15px] w-[15px] flex-shrink-0 rounded-full border-[1.5px] border-pms-muted-2"
                  style={category === c ? { background: "#284AB1", borderColor: "#284AB1" } : undefined}
                />
                {c}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Ngày phát sinh</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Nội dung</label>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Mô tả chi phí"
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Số tiền</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0đ"
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
          />
        </div>
      </div>
    </Modal>
  );
}
