"use client";

import { useState } from "react";
import { bookings, type BookingRow } from "@/lib/mock-data";
import { StatusPill } from "@/components/ui/StatusPill";
import { AddBookingModal } from "@/components/booking/AddBookingModal";
import { ViewBookingModal, EditBookingModal } from "@/components/booking/ViewEditBookingModal";
import { ContractTemplateModal } from "@/components/booking/ContractTemplateModal";

const COLUMNS = ["Mã HĐ", "Khách hàng", "Phòng", "Nhận phòng", "Trả phòng", "Kênh", "Trạng thái", ""];

// Trang "Quản lý hợp đồng / đặt phòng" — pixel-perfect theo khối `isBooking`
// (dòng 460-499 trong bản gốc): bảng danh sách hợp đồng + 3 modal (Thêm/Xem/Sửa)
// + editor Mẫu hợp đồng.
export default function BookingPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [viewBooking, setViewBooking] = useState<BookingRow | null>(null);
  const [editBooking, setEditBooking] = useState<BookingRow | null>(null);
  const [showContract, setShowContract] = useState(false);

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Quản lý hợp đồng / đặt phòng</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">128 hợp đồng trong tháng</p>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Danh sách hợp đồng</h3>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 rounded-[10px] bg-pms-divider px-3.5 py-2.5 text-[13px] text-pms-muted">Tìm kiếm</div>
            <div
              className="cursor-pointer whitespace-nowrap rounded-[10px] border border-pms-border px-[18px] py-2.5 text-[13px] font-semibold"
              onClick={() => setShowContract(true)}
            >
              🖨 Mẫu hợp đồng
            </div>
            <div
              className="cursor-pointer whitespace-nowrap rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
              onClick={() => setShowAdd(true)}
            >
              + Thêm mới
            </div>
          </div>
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="border-b border-pms-divider px-2 py-3">{b.id}</td>
                <td className="border-b border-pms-divider px-2 py-3">{b.guest}</td>
                <td className="border-b border-pms-divider px-2 py-3">{b.room}</td>
                <td className="border-b border-pms-divider px-2 py-3">{b.checkin}</td>
                <td className="border-b border-pms-divider px-2 py-3">{b.checkout}</td>
                <td className="border-b border-pms-divider px-2 py-3">{b.channel}</td>
                <td className="border-b border-pms-divider px-2 py-3">
                  <StatusPill bg={b.bg} fg={b.fg}>
                    {b.status}
                  </StatusPill>
                </td>
                <td className="whitespace-nowrap border-b border-pms-divider px-2 py-3">
                  <span className="cursor-pointer font-semibold text-pms-primary" onClick={() => setViewBooking(b)}>
                    Xem
                  </span>
                  <span className="ml-2.5 cursor-pointer font-semibold text-pms-muted" onClick={() => setEditBooking(b)}>
                    Sửa
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <AddBookingModal onClose={() => setShowAdd(false)} />}
      {viewBooking && (
        <ViewBookingModal booking={viewBooking} onClose={() => setViewBooking(null)} onOpenContractTemplate={() => setShowContract(true)} />
      )}
      {editBooking && <EditBookingModal booking={editBooking} onClose={() => setEditBooking(null)} />}
      {showContract && (
        <ContractTemplateModal guestName={(viewBooking || editBooking)?.guest ?? ""} onClose={() => setShowContract(false)} />
      )}
    </div>
  );
}
