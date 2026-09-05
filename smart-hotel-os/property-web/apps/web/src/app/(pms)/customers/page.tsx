"use client";

import { useEffect, useState } from "react";
import { customerSegmentColors, type CustomerRow } from "@/lib/mock-data";
import { CustomerDetailModal } from "@/components/customers/CustomerDetailModal";
import { api, isApiError } from "@/lib/api-client";
import { useSettings } from "@/lib/useSettings";

// Trang "Khách hàng" — ĐÃ NỐI API THẬT: GET /api/v1/customers (bảng customers
// có sẵn). Đổi phân khúc trong modal chi tiết giờ gọi thật
// PATCH /api/v1/customers/:id (thay vì chỉ setState cục bộ như bản mock cũ).
// Các số liệu tổng hợp (số lần đặt/đặt lại/CSKH/tổng chi tiêu/giao dịch/dịch
// vụ đã dùng) CHƯA có bảng thống kê tương ứng trong MVP này — hiển thị "—"
// thay vì số liệu trang trí giả, xem PROGRESS.md.
interface ApiCustomer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  segment: string;
  note: string | null;
}

interface ApiCustomerBooking {
  id: string;
  customer_id: string | null;
  code: string;
  room_number: string | null;
  room_type_name: string | null;
  channel: string;
  status: string;
  checkin_date: string;
  checkout_date: string;
  total_price?: string;
  deposit?: string;
  arrival_confirmation_status?: "PENDING" | "WILL_ARRIVE" | "NO_SHOW";
  no_show_reason?: string | null;
  deposit_resolution?: "REFUND" | "RETAIN" | "PENDING" | null;
  created_at: string;
}

interface CustomerCareData {
  enabled: boolean;
  channels: { zalo: boolean; facebook: boolean; email: boolean };
  schedule: { beforeArrivalHours: number; afterCheckoutHours: number };
  approvedScript: string;
  learningMode: "SUGGEST_ONLY" | "OFF";
  consentRequired: boolean;
}

const CUSTOMER_CARE_FALLBACK: CustomerCareData = { enabled: false, channels: { zalo: false, facebook: false, email: true }, schedule: { beforeArrivalHours: 24, afterCheckoutHours: 4 }, approvedScript: "Xin chào {{guest_name}}, cơ sở xin xác nhận thời gian nhận phòng {{checkin_date}}. Anh/chị có cần hỗ trợ gì thêm không?", learningMode: "SUGGEST_ONLY", consentRequired: true };

export type CustomerBookingDetail = ApiCustomerBooking;
type CustomerView = CustomerRow & { bookingDetails: ApiCustomerBooking[] };

function mapCustomer(c: ApiCustomer, bookings: ApiCustomerBooking[]): CustomerRow & { bookingDetails: ApiCustomerBooking[] } {
  const customerBookings = bookings.filter((booking) => booking.customer_id === c.id);
  return {
    key: c.id,
    name: c.full_name,
    phone: c.phone ?? "—",
    email: c.email ?? "—",
    bookings: customerBookings.length,
    rebookings: customerBookings.filter((booking) => booking.status === "CHECKED_OUT").length,
    careAfterStay: 0,
    spent: "—",
    segment: (c.segment as CustomerRow["segment"]) || "Mới",
    note: c.note ?? "",
    preferences: "Chưa có dữ liệu tổng hợp.",
    servicesUsed: [],
    transactions: [],
    bookingDetails: customerBookings,
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [careMessage, setCareMessage] = useState<string | null>(null);
  const care = useSettings<CustomerCareData>("customer_care", CUSTOMER_CARE_FALLBACK);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [res, bookingsRes] = await Promise.all([
        api.get<{ items: ApiCustomer[] }>("/api/v1/customers"),
        api.get<{ items: ApiCustomerBooking[] }>("/api/v1/bookings"),
      ]);
      setCustomers(res.items.map((customer) => mapCustomer(customer, bookingsRes.items)));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không tải được danh sách khách hàng.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBookingAction(bookingId: string, action: "arrive" | "no-show", reason?: string, resolution?: "REFUND" | "RETAIN" | "PENDING") {
    try {
      if (action === "arrive") await api.post(`/api/v1/bookings/${bookingId}/arrival-confirmation`, { willArrive: true });
      else await api.post(`/api/v1/bookings/${bookingId}/no-show`, { reason, depositResolution: resolution ?? "PENDING" });
      setCareMessage(action === "arrive" ? "Đã ghi nhận khách sẽ đến." : "Đã ghi nhận không đến và xử lý tiền cọc.");
      await load();
    } catch (err) {
      setCareMessage(isApiError(err) ? err.message : "Không cập nhật được trạng thái đặt phòng.");
    }
  }

  const selected = customers.find((c) => c.key === selectedKey) || null;

  async function handleChangeSegment(segment: CustomerRow["segment"]) {
    if (!selected) return;
    setCustomers((prev) => prev.map((c) => (c.key === selected.key ? { ...c, segment } : c)));
    try {
      await api.patch(`/api/v1/customers/${selected.key}`, { segment });
    } catch {
      load();
    }
  }

  if (loading) return <div className="text-[13px] text-pms-muted">Đang tải dữ liệu...</div>;
  if (error)
    return (
      <div className="rounded-xl bg-white p-6 text-[13px] text-pms-danger shadow-card">
        {error} <span className="cursor-pointer font-semibold text-pms-primary" onClick={load}>Thử lại</span>
      </div>
    );

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Khách hàng</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">{customers.length} khách hàng đã lưu trú</p>
      {careMessage && <div className="mb-4 flex items-center justify-between rounded-lg bg-pms-primary-soft px-3 py-2 text-[12px] text-pms-primary"><span>{careMessage}</span><button type="button" onClick={() => setCareMessage(null)} className="font-semibold">Đóng</button></div>}

      <div className="rounded-xl bg-white p-4 shadow-card sm:p-6">
        <div className="space-y-3 md:hidden">
          {customers.map((c) => {
            const segColor = customerSegmentColors[c.segment] ?? customerSegmentColors["Mới"];
            return (
              <button key={c.key} type="button" onClick={() => setSelectedKey(c.key)} className="block w-full rounded-lg border border-pms-divider p-3 text-left">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold text-pms-primary">{c.name}</span>
                  <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: segColor.bg, color: segColor.fg }}>{c.segment}</span>
                </div>
                <p className="mt-2 break-words text-[12px] text-pms-muted">{c.phone} · {c.email}</p>
                {c.note && <p className="mt-1 line-clamp-2 text-[12px] text-pms-muted">{c.note}</p>}
              </button>
            );
          })}
          {customers.length === 0 && <p className="py-4 text-center text-[13px] text-pms-muted">Chưa có khách hàng.</p>}
        </div>
        <table className="hidden w-full border-collapse text-[13px] md:table">
          <thead>
            <tr>
              {["Khách hàng", "Số điện thoại", "Email", "Số lần đặt", "Đặt lại", "Chăm sóc sau lưu trú", "Tổng chi tiêu", "Phân khúc", "Ghi chú"].map(
                (h) => (
                  <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const segColor = customerSegmentColors[c.segment] ?? customerSegmentColors["Mới"];
              return (
                <tr key={c.key} className="cursor-pointer" onClick={() => setSelectedKey(c.key)}>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold text-pms-primary">{c.name}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{c.phone}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{c.email}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{c.bookings}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{c.rebookings}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{c.careAfterStay}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{c.spent}</td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ background: segColor.bg, color: segColor.fg }}
                    >
                      {c.segment}
                    </span>
                  </td>
                  <td className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-pms-divider px-2 py-3 text-pms-muted">
                    {c.note}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CustomerCarePanel value={care.data} saving={care.saving} error={care.error} onChange={care.setData} onSave={() => void care.save(care.data)} />

      {selected && (
        <CustomerDetailModal customer={selected} onClose={() => setSelectedKey(null)} onChangeSegment={handleChangeSegment} onBookingAction={handleBookingAction} />
      )}
    </div>
  );
}

function CustomerCarePanel({ value, saving, error, onChange, onSave }: { value: CustomerCareData; saving: boolean; error: string | null; onChange: (value: CustomerCareData) => void; onSave: () => void }) {
  return <section className="mt-5 rounded-xl bg-white p-4 shadow-card sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="m-0 text-[16px] font-semibold">Lịch chăm sóc khách tự động</h2><p className="mt-1 text-[12px] text-pms-muted">Lập lịch nhắc trước khi đến và sau khi trả phòng. Nhân viên duyệt kịch bản trước khi gửi.</p></div><label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={value.enabled} onChange={(e) => onChange({ ...value, enabled: e.target.checked })} /> Bật lịch chăm sóc</label></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-[12px]">Kênh gửi<div className="mt-1 flex flex-wrap gap-3"><span><input type="checkbox" checked={value.channels.zalo} onChange={(e) => onChange({ ...value, channels: { ...value.channels, zalo: e.target.checked } })} /> Zalo</span><span><input type="checkbox" checked={value.channels.facebook} onChange={(e) => onChange({ ...value, channels: { ...value.channels, facebook: e.target.checked } })} /> Facebook</span><span><input type="checkbox" checked={value.channels.email} onChange={(e) => onChange({ ...value, channels: { ...value.channels, email: e.target.checked } })} /> Email</span></div></label><label className="text-[12px]">Nhắc trước khi đến (giờ)<input type="number" min={1} max={168} value={value.schedule.beforeArrivalHours} onChange={(e) => onChange({ ...value, schedule: { ...value.schedule, beforeArrivalHours: Number(e.target.value) || 24 } })} className="mt-1 w-full rounded-lg border border-pms-border px-3 py-2 text-[12px]" /></label><label className="text-[12px]">Nhắc sau trả phòng (giờ)<input type="number" min={1} max={168} value={value.schedule.afterCheckoutHours} onChange={(e) => onChange({ ...value, schedule: { ...value.schedule, afterCheckoutHours: Number(e.target.value) || 4 } })} className="mt-1 w-full rounded-lg border border-pms-border px-3 py-2 text-[12px]" /></label></div><label className="mt-3 block text-[12px]">Kịch bản đã duyệt<textarea value={value.approvedScript} onChange={(e) => onChange({ ...value, approvedScript: e.target.value })} className="mt-1 min-h-[80px] w-full rounded-lg border border-pms-border px-3 py-2 text-[12px]" /></label><div className="mt-3 flex flex-wrap items-center gap-3"><label className="text-[12px]"><input type="checkbox" checked={value.consentRequired} onChange={(e) => onChange({ ...value, consentRequired: e.target.checked })} /> Chỉ gửi khi khách đã đồng ý nhận tin</label><span className="text-[11px] text-pms-muted">Gợi ý kịch bản: học từ thao tác nhân viên ở chế độ chỉ đề xuất</span><button type="button" onClick={onSave} disabled={saving} className="ml-auto rounded-lg bg-pms-primary px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu lịch chăm sóc"}</button></div>{error && <p className="m-0 mt-2 text-[12px] text-pms-danger">{error}</p>}<p className="m-0 mt-3 text-[11px] text-pms-muted">Để gửi thật qua Zalo/Facebook cần ứng dụng doanh nghiệp, quyền truy cập và sự đồng ý của khách; hiện hệ thống lưu lịch và kịch bản đã duyệt, không tự giả làm người.</p></section>;
}
