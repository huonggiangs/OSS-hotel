"use client";

import { useState } from "react";
import {
  expenses,
  expenseTotal,
  dailyEntriesBase,
  dailyStatusInfo,
  dailyIncomeTotal,
  dailyExpenseTotal,
  type DailyEntryStatus,
} from "@/lib/mock-data";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";

const TH = "border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted";
const TD = "border-b border-pms-divider px-2 py-3";

// Trang "Chi phí" — pixel-perfect theo khối `isExpenses` (dòng 1126-1234 bản gốc):
// 2 tab con (Chi phí / Thu chi trong ngày), modal "Thêm chi phí" dùng chung cho cả 2 tab.
export default function ExpensesPage() {
  const [tab, setTab] = useState<"expenses" | "daily">("expenses");
  const [showAdd, setShowAdd] = useState(false);
  // Trạng thái phê duyệt sổ thu chi — giữ tại chỗ trong trang, tương ứng
  // `this.state.dailyStatuses` bản gốc (đổi trạng thái khi bấm Duyệt/Từ chối).
  const [statuses, setStatuses] = useState<Record<string, DailyEntryStatus>>({});

  const dailyEntries = dailyEntriesBase.map((e) => {
    const status = statuses[e.id] || e.defaultStatus;
    const s = dailyStatusInfo[status];
    return { ...e, status, ...s, isPending: status === "pending" };
  });
  const dailyPendingCount = dailyEntries.filter((e) => e.isPending).length;

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Chi phí</h1>
      <p className="mb-5 text-[13px] text-pms-muted">
        Ghi nhận các chi phí phát sinh hàng ngày ngoài dịch vụ lưu trú (điện, nước, vệ sinh, mua đồ...)
      </p>

      <div className="mb-5 flex gap-7 border-b border-pms-border text-[14px]">
        <div
          className="cursor-pointer pb-3 font-semibold"
          style={{ color: tab === "expenses" ? "#284AB1" : "#777E90", borderBottom: `2px solid ${tab === "expenses" ? "#284AB1" : "transparent"}` }}
          onClick={() => setTab("expenses")}
        >
          Chi phí
        </div>
        <div
          className="cursor-pointer pb-3 font-semibold"
          style={{ color: tab === "daily" ? "#284AB1" : "#777E90", borderBottom: `2px solid ${tab === "daily" ? "#284AB1" : "transparent"}` }}
          onClick={() => setTab("daily")}
        >
          Thu chi trong ngày
        </div>
      </div>

      {tab === "expenses" && (
        <>
          <div className="mb-5 inline-block rounded-xl bg-white px-5 py-[18px] shadow-card">
            <span className="text-[12px] text-pms-muted">Tổng chi phí tháng này</span>
            <b className="mt-1.5 block text-[22px] text-pms-danger">{expenseTotal}</b>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="m-0 text-[15px] font-semibold">Danh sách chi phí</h3>
              <div
                className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
                onClick={() => setShowAdd(true)}
              >
                + Thêm chi phí
              </div>
            </div>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["Mã", "Ngày", "Loại chi phí", "Nội dung", "Số tiền", "Người ghi nhận"].map((h) => (
                    <th key={h} className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className={TD}>{e.id}</td>
                    <td className={TD}>{e.date}</td>
                    <td className={`${TD} font-semibold`}>{e.category}</td>
                    <td className={`${TD} text-pms-muted`}>{e.desc}</td>
                    <td className={`${TD} font-semibold text-pms-danger`}>{e.amount}</td>
                    <td className={TD}>{e.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "daily" && (
        <>
          <p className="mb-4 text-[13px] text-pms-muted">
            Các khoản thu/chi phát sinh trong ngày phải được quản lý phê duyệt trước khi hạch toán
          </p>
          <div className="mb-5 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white px-5 py-[18px] shadow-card">
              <span className="text-[12px] text-pms-muted">Tổng thu hôm nay</span>
              <b className="mt-1.5 block text-[22px] text-pms-success">{dailyIncomeTotal}</b>
            </div>
            <div className="rounded-xl bg-white px-5 py-[18px] shadow-card">
              <span className="text-[12px] text-pms-muted">Tổng chi hôm nay</span>
              <b className="mt-1.5 block text-[22px] text-pms-danger">{dailyExpenseTotal}</b>
            </div>
            <div className="rounded-xl bg-white px-5 py-[18px] shadow-card">
              <span className="text-[12px] text-pms-muted">Chờ phê duyệt</span>
              <b className="mt-1.5 block text-[22px] text-pms-warning">{dailyPendingCount}</b>
            </div>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="m-0 text-[15px] font-semibold">Sổ thu chi trong ngày</h3>
              <div
                className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
                onClick={() => setShowAdd(true)}
              >
                + Ghi nhận thu/chi
              </div>
            </div>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["Mã", "Loại", "Nội dung", "Số tiền", "Người đề xuất", "Trạng thái", "Phê duyệt"].map((h) => (
                    <th key={h} className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dailyEntries.map((d) => (
                  <tr key={d.id}>
                    <td className={TD}>{d.id}</td>
                    <td className={TD} style={{ fontWeight: 600, color: d.typeColor }}>
                      {d.type}
                    </td>
                    <td className={`${TD} text-pms-muted`}>{d.desc}</td>
                    <td className={TD} style={{ fontWeight: 600, color: d.typeColor }}>
                      {d.amount}
                    </td>
                    <td className={TD}>{d.by}</td>
                    <td className={TD}>
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{ background: d.bg, color: d.color }}
                      >
                        {d.label}
                      </span>
                    </td>
                    <td className={TD}>
                      {d.isPending && (
                        <div className="flex gap-2">
                          <span
                            className="cursor-pointer font-semibold text-pms-success"
                            onClick={() => setStatuses((prev) => ({ ...prev, [d.id]: "approved" }))}
                          >
                            Duyệt
                          </span>
                          <span
                            className="cursor-pointer font-semibold text-pms-danger"
                            onClick={() => setStatuses((prev) => ({ ...prev, [d.id]: "rejected" }))}
                          >
                            Từ chối
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showAdd && <AddExpenseModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
