"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/useSettings";
import { AddOtaModal, OtaConnection } from "@/components/sync/AddOtaModal";

interface SyncData {
  connections: OtaConnection[];
  syncGoogleHotel: boolean;
  syncWebsite: boolean;
  autoSync: boolean;
  syncTimeOfDay: string;
}
const FALLBACK: SyncData = { connections: [], syncGoogleHotel: true, syncWebsite: true, autoSync: true, syncTimeOfDay: "03:00" };

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

  useEffect(() => {
    if (!loading) setForm(data);
  }, [loading, data]);

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
            <p className="m-0 text-[13px] text-pms-text">Quản lý kết nối đồng bộ với các kênh OTA</p>
          </div>
          <div
            className="cursor-pointer whitespace-nowrap rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
            onClick={() => setShowAdd(true)}
          >
            + Thêm kênh OTA
          </div>
        </div>
        <p className="mb-5 text-[12px] text-pms-muted">
          Trang này cho phép lưu cấu hình kết nối riêng cho từng kênh OTA (mã cơ sở, API Key, loại dữ liệu muốn đồng
          bộ) — chưa thực hiện đồng bộ trực tiếp với API thật của Booking.com/Agoda/Airbnb. Để đồng bộ thật cần trở
          thành đối tác được từng kênh cấp phép (hợp đồng + credential riêng), ngoài phạm vi có thể tự triển khai khi
          chưa có credential đối tác thật.
        </p>

        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}

        {!loading && (
          <>
            <div className="mb-5 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[13px]">
                <thead>
                  <tr>
                    {["Kênh OTA", "Mã cơ sở", "Đồng bộ", "Trạng thái", ""].map((h) => (
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
                        Chưa có kênh OTA nào. Bấm "+ Thêm kênh OTA" để thêm.
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
