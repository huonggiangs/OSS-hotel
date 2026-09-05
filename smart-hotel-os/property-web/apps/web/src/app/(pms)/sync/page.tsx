"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/useSettings";
import { AddOtaModal, OtaConnection } from "@/components/sync/AddOtaModal";
import { api, isApiError } from "@/lib/api-client";

interface SyncData {
  connections: OtaConnection[];
  syncGoogleHotel: boolean;
  syncWebsite: boolean;
  autoSync: boolean;
  syncTimeOfDay: string;
}
const FALLBACK: SyncData = { connections: [], syncGoogleHotel: true, syncWebsite: true, autoSync: true, syncTimeOfDay: "03:00" };

interface OtaRecon { id: string; channel: string; external_reference: string; booking_code?: string | null; guest_name?: string | null; gross_amount: string; commission_amount: string; net_amount: string; received_amount: string; settlement_date: string | null; status: "PENDING" | "MATCHED" | "DISPUTED"; note: string | null; }

// Trang "Đồng bộ hoá" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT: property_settings
// nhóm "sync". Khác bản trước (checkbox "chọn kênh" cố định dùng chung 1 cấu
// hình cho mọi kênh): nay mỗi kênh OTA là 1 "connection" riêng với mã cơ sở/
// API Key/loại dữ liệu đồng bộ RIÊNG — vì thực tế mỗi hotel cần cấu hình khác
// nhau cho từng kênh, không thể dùng chung 1 công tắc bật/tắt cho tất cả.
//
// PHẠM VI THẬT: trang này chỉ cho phép hotel LƯU cấu hình kết nối (mã cơ sở,
// API Key, loại dữ liệu muốn đồng bộ) cho từng kênh OTA — KHÔNG thực hiện
// đồng bộ trực tiếp với API thật của Booking.com/Agoda/Airbnb. Đồng bộ thật
// đòi hỏi trở thành đối tác được từng OTA cấp phép (ký hợp đồng, được cấp
// credential riêng) — việc này nằm ngoài khả năng tự làm khi chưa có
// credential đối tác thật, đúng như ranh giới đã ghi ở
// smart-hotel-os/services/channel-manager-service (dùng MockOtaAdapter vì lý
// do tương tự). 3 công tắc bên dưới (Google Hotel/website/tự động đồng bộ) là
// phần đã hoạt động thật từ trước, giữ nguyên logic.
export default function SyncPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<OtaConnection | null>(null);
  const { data, loading, saving, save } = useSettings<SyncData>("sync", FALLBACK);
  const [form, setForm] = useState<SyncData>(FALLBACK);
  const [reconciliations, setReconciliations] = useState<OtaRecon[]>([]);
  const [reconForm, setReconForm] = useState({ channel: "BOOKING_COM", externalReference: "", bookingId: "", grossAmount: "", commissionAmount: "", receivedAmount: "", settlementDate: "", note: "" });
  const [reconError, setReconError] = useState<string | null>(null);
  const [reconSaving, setReconSaving] = useState(false);

  useEffect(() => {
    if (!loading) setForm(data);
  }, [loading, data]);

  useEffect(() => { void loadReconciliations(); }, []);

  async function loadReconciliations() {
    try { const response = await api.get<{ items: OtaRecon[] }>("/api/v1/ota-reconciliation"); setReconciliations(response.items); } catch (error) { setReconError(isApiError(error) ? error.message : "Không tải được sổ đối soát OTA."); }
  }

  async function addReconciliation() {
    setReconError(null);
    if (!reconForm.externalReference || !reconForm.grossAmount || !reconForm.receivedAmount) { setReconError("Nhập mã giao dịch OTA, doanh thu gộp và số tiền cơ sở nhận."); return; }
    setReconSaving(true);
    try {
      await api.post("/api/v1/ota-reconciliation", { channel: reconForm.channel, externalReference: reconForm.externalReference, bookingId: reconForm.bookingId || null, grossAmount: Number(reconForm.grossAmount), commissionAmount: Number(reconForm.commissionAmount || 0), receivedAmount: Number(reconForm.receivedAmount), settlementDate: reconForm.settlementDate || null, note: reconForm.note || null });
      setReconForm({ channel: "BOOKING_COM", externalReference: "", bookingId: "", grossAmount: "", commissionAmount: "", receivedAmount: "", settlementDate: "", note: "" });
      await loadReconciliations();
    } catch (error) { setReconError(isApiError(error) ? error.message : "Không lưu được dòng đối soát."); } finally { setReconSaving(false); }
  }

  function upsertConnection(input: Omit<OtaConnection, "apiKeyEncrypted" | "hasApiKey"> & { apiKey: string }) {
    setForm((f) => {
      const exists = f.connections.some((c) => c.id === input.id);
      const { apiKey, ...rest } = input;
      const connection: OtaConnection & { apiKey?: string } = { ...rest, apiKeyEncrypted: null, hasApiKey: false, apiKey };
      const nextConnections = exists
        ? f.connections.map((c) => (c.id === input.id ? { ...c, ...connection } : c))
        : [...f.connections, connection as OtaConnection];
      const next = { ...f, connections: nextConnections };
      save(next);
      return next;
    });
    setShowAdd(false);
    setEditing(null);
  }

  function toggleStatus(id: string) {
    setForm((f) => {
      const next = { ...f, connections: f.connections.map((c) => (c.id === id ? { ...c, status: c.status === "ACTIVE" ? ("PAUSED" as const) : ("ACTIVE" as const) } : c)) };
      save(next);
      return next;
    });
  }

  function removeConnection(id: string, provider: string) {
    if (!window.confirm(`Xóa kết nối "${provider}"? Thao tác này không thể hoàn tác.`)) return;
    setForm((f) => {
      const next = { ...f, connections: f.connections.filter((c) => c.id !== id) };
      save(next);
      return next;
    });
  }

  function saveToggles(next: SyncData) {
    setForm(next);
    save(next);
  }

  return (
    <div>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h3 className="mb-0.5 text-[20px] font-bold">Đồng bộ</h3>
            <p className="m-0 text-[13px] text-pms-text">Quản lý kết nối đồng bộ với các kênh bán trực tuyến</p>
          </div>
          <div
            className="cursor-pointer whitespace-nowrap rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
            onClick={() => setShowAdd(true)}
          >
            + Thêm kênh bán
          </div>
        </div>
        <p className="mb-5 text-[12px] text-pms-muted">
          Trang này cho phép lưu cấu hình kết nối riêng cho từng kênh bán (mã cơ sở, mã kết nối, loại dữ liệu muốn đồng
          bộ) — chưa thực hiện đồng bộ trực tiếp với hệ thống của Booking.com/Agoda/Airbnb. Để đồng bộ thật cần trở
          thành đối tác được từng kênh cấp phép (hợp đồng + thông tin xác thực riêng), ngoài phạm vi có thể tự triển khai khi
          chưa có thông tin xác thực đối tác thật.
        </p>

        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}

        {!loading && (
          <>
            <div className="mb-5 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[13px]">
                <thead>
                  <tr>
                    {["Kênh bán", "Mã cơ sở", "Đồng bộ", "Trạng thái", ""].map((h) => (
                      <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.connections.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-4 text-pms-muted">
                        Chưa có kênh bán nào. Bấm "+ Thêm kênh bán" để thêm.
                      </td>
                    </tr>
                  )}
                  {form.connections.map((c) => (
                    <tr key={c.id}>
                      <td className="border-b border-pms-divider px-2 py-3 font-semibold">{c.provider}</td>
                      <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{c.propertyCode || "—"}</td>
                      <td className="border-b border-pms-divider px-2 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {c.syncRooms && <Badge>Phòng</Badge>}
                          {c.syncRates && <Badge>Giá</Badge>}
                          {c.syncAvailability && <Badge>Phòng trống</Badge>}
                        </div>
                      </td>
                      <td className="border-b border-pms-divider px-2 py-3">
                        <span
                          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={c.status === "ACTIVE" ? { background: "#E9FBEF", color: "#00C853" } : { background: "#FDEDEC", color: "#CC2F42" }}
                        >
                          {c.status === "ACTIVE" ? "Đang bật" : "Tạm dừng"}
                        </span>
                      </td>
                      <td className="border-b border-pms-divider px-2 py-3">
                        <div className="flex flex-wrap gap-3 text-[12.5px] font-semibold">
                          <span className="cursor-pointer text-pms-primary" onClick={() => setEditing(c)}>
                            Sửa
                          </span>
                          <span className="cursor-pointer text-pms-muted" onClick={() => toggleStatus(c.id)}>
                            {c.status === "ACTIVE" ? "Tạm dừng" : "Kích hoạt"}
                          </span>
                          <span className="cursor-pointer text-pms-danger" onClick={() => removeConnection(c.id, c.provider)}>
                            Xóa
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ToggleRow label="Đồng bộ với google hotel" on={form.syncGoogleHotel} onClick={() => saveToggles({ ...form, syncGoogleHotel: !form.syncGoogleHotel })} />
            <ToggleRow label="Đồng bộ website" on={form.syncWebsite} onClick={() => saveToggles({ ...form, syncWebsite: !form.syncWebsite })} />
            <div className="grid gap-2 border-t border-pms-divider py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center sm:gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              <span className="text-[13px]">Thời gian đồng bộ</span>
              <input
                type="time"
                value={form.syncTimeOfDay}
                onChange={(e) => saveToggles({ ...form, syncTimeOfDay: e.target.value })}
                className="max-w-[220px] rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
              />
            </div>
            <ToggleRow label="Tự động đồng bộ" on={form.autoSync} onClick={() => saveToggles({ ...form, autoSync: !form.autoSync })} />

            {saving && <div className="mt-3 text-[12px] text-pms-muted">Đang lưu...</div>}

            <div className="mt-8 border-t border-pms-divider pt-5"><h4 className="m-0 text-[15px] font-semibold">Đối soát tiền nhận từ kênh bán</h4><p className="mt-1 text-[12px] text-pms-muted">Nhập số liệu quyết toán từ Booking.com, Agoda, Airbnb hoặc Traveloka để so sánh doanh thu gộp – hoa hồng – tiền thực nhận.</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><select value={reconForm.channel} onChange={(e) => setReconForm((f) => ({ ...f, channel: e.target.value }))} className="rounded-lg border border-pms-border px-3 py-2 text-[12px]"><option value="BOOKING_COM">Booking.com</option><option value="AGODA">Agoda</option><option value="AIRBNB">Airbnb</option><option value="TRAVELOKA">Traveloka</option><option value="OTHER">Khác</option></select><input value={reconForm.externalReference} onChange={(e) => setReconForm((f) => ({ ...f, externalReference: e.target.value }))} placeholder="Mã giao dịch OTA *" className="rounded-lg border border-pms-border px-3 py-2 text-[12px]" /><input value={reconForm.bookingId} onChange={(e) => setReconForm((f) => ({ ...f, bookingId: e.target.value }))} placeholder="Mã ID đặt phòng (tuỳ chọn)" className="rounded-lg border border-pms-border px-3 py-2 text-[12px]" /><input type="date" value={reconForm.settlementDate} onChange={(e) => setReconForm((f) => ({ ...f, settlementDate: e.target.value }))} className="rounded-lg border border-pms-border px-3 py-2 text-[12px]" /><input inputMode="decimal" value={reconForm.grossAmount} onChange={(e) => setReconForm((f) => ({ ...f, grossAmount: e.target.value }))} placeholder="Doanh thu gộp *" className="rounded-lg border border-pms-border px-3 py-2 text-[12px]" /><input inputMode="decimal" value={reconForm.commissionAmount} onChange={(e) => setReconForm((f) => ({ ...f, commissionAmount: e.target.value }))} placeholder="Hoa hồng" className="rounded-lg border border-pms-border px-3 py-2 text-[12px]" /><input inputMode="decimal" value={reconForm.receivedAmount} onChange={(e) => setReconForm((f) => ({ ...f, receivedAmount: e.target.value }))} placeholder="Tiền thực nhận *" className="rounded-lg border border-pms-border px-3 py-2 text-[12px]" /><button type="button" onClick={() => void addReconciliation()} disabled={reconSaving} className="rounded-lg bg-pms-primary px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50">{reconSaving ? "Đang lưu..." : "Thêm dòng đối soát"}</button></div>{reconError && <p className="mt-2 text-[12px] text-pms-danger">{reconError}</p>}<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-[12px]"><thead><tr>{["Kênh", "Mã giao dịch", "Đặt phòng", "Gộp", "Hoa hồng", "Thực nhận", "Trạng thái"].map((h) => <th key={h} className="border-b border-pms-border px-2 py-2 text-left font-medium text-pms-muted">{h}</th>)}</tr></thead><tbody>{reconciliations.map((row) => <tr key={row.id}><td className="border-b border-pms-divider px-2 py-2">{row.channel}</td><td className="border-b border-pms-divider px-2 py-2">{row.external_reference}</td><td className="border-b border-pms-divider px-2 py-2">{row.booking_code ?? "—"}</td><td className="border-b border-pms-divider px-2 py-2">{Number(row.gross_amount).toLocaleString("vi-VN")}đ</td><td className="border-b border-pms-divider px-2 py-2">{Number(row.commission_amount).toLocaleString("vi-VN")}đ</td><td className="border-b border-pms-divider px-2 py-2">{Number(row.received_amount).toLocaleString("vi-VN")}đ</td><td className="border-b border-pms-divider px-2 py-2"><span className={`rounded-full px-2 py-1 font-semibold ${row.status === "MATCHED" ? "bg-pms-success-bg text-pms-success" : row.status === "DISPUTED" ? "bg-pms-danger-bg text-pms-danger" : "bg-pms-divider text-pms-muted"}`}>{row.status === "MATCHED" ? "Đã khớp" : row.status === "DISPUTED" ? "Có chênh lệch" : "Chờ đối chiếu"}</span></td></tr>)}{reconciliations.length === 0 && <tr><td colSpan={7} className="px-2 py-3 text-pms-muted">Chưa có dữ liệu đối soát.</td></tr>}</tbody></table></div></div>
          </>
        )}
      </div>

      {showAdd && <AddOtaModal onClose={() => setShowAdd(false)} onSave={upsertConnection} />}
      {editing && <AddOtaModal onClose={() => setEditing(null)} onSave={upsertConnection} initial={editing} />}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[#EAF0FF] px-2 py-0.5 text-[11px] font-medium text-pms-primary">{children}</span>;
}

function ToggleRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <div className="grid gap-2 border-t border-pms-divider py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center sm:gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <span className="text-[13px]">{label}</span>
      <div className="relative h-6 w-10 cursor-pointer rounded-full" style={{ background: on ? "#284AB1" : "#E6E8EC" }} onClick={onClick}>
        <div className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white" style={{ left: on ? "auto" : 3, right: on ? 3 : "auto" }} />
      </div>
    </div>
  );
}
