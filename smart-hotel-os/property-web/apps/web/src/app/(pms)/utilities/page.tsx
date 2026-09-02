"use client";

import { useState } from "react";
import { MapsConfigModal } from "@/components/utilities/MapsConfigModal";
import { HotelConfigModal } from "@/components/utilities/HotelConfigModal";
import { useSettings } from "@/lib/useSettings";

// Trang "Tiện ích" — ĐÃ NỐI API THẬT: property_settings nhóm "utilities".
// 2 công tắc trong modal Google Hotel (đồng bộ tình trạng phòng/khuyến mãi)
// giờ lưu thật qua PUT (thay vì chỉ setState cục bộ).
interface UtilityLink {
  key: "maps" | "hotel";
  name: string;
  desc: string;
  linked: boolean;
}
interface MaintenancePartner {
  id: string;
  name: string;
  category: string;
  phone: string;
  note?: string;
  visibleToGuest: boolean;
}
interface UtilitiesData {
  links: UtilityLink[];
  syncAvail: boolean;
  syncPromo: boolean;
  maps?: { address?: string; description?: string };
  hotelId?: string;
  maintenancePartners?: MaintenancePartner[];
}
const FALLBACK: UtilitiesData = { links: [], syncAvail: true, syncPromo: false };

export default function UtilitiesPage() {
  const { data, loading, save, error } = useSettings<UtilitiesData>("utilities", FALLBACK);
  const [openConfig, setOpenConfig] = useState<"maps" | "hotel" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<MaintenancePartner>({ id: "", name: "", category: "Điện", phone: "", note: "", visibleToGuest: true });

  const partners = data.maintenancePartners ?? [];
  async function savePartners(next: MaintenancePartner[]) { await save({ ...data, maintenancePartners: next }); setNotice("Đã lưu danh sách đối tác hỗ trợ."); }
  async function addPartner() {
    if (!draft.name.trim() || !draft.phone.trim()) return;
    const id = globalThis.crypto?.randomUUID?.() ?? `maintenance-${Date.now()}`;
    await savePartners([...partners, { ...draft, id, name: draft.name.trim(), phone: draft.phone.trim(), note: draft.note?.trim() }]);
    setDraft({ id: "", name: "", category: "Điện", phone: "", note: "", visibleToGuest: true });
  }
  async function patchPartner(id: string, patch: Partial<MaintenancePartner>) { await savePartners(partners.map((item) => item.id === id ? { ...item, ...patch } : item)); }

  if (loading) return <div className="text-[13px] text-pms-muted">Đang tải dữ liệu...</div>;

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Tiện ích</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">
        Khai báo nơi tìm đường, kênh đặt phòng và đối tác hỗ trợ để biến cấu hình thành hành động cụ thể
      </p>
      {error && <p className="mb-3 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12px] text-pms-danger">{error}</p>}
      {notice && <p className="mb-3 rounded-lg bg-[#E9FBEF] px-3 py-2 text-[12px] text-pms-success">{notice}</p>}

      <div className="flex flex-col gap-3.5">
        {data.links.map((u) => (
          <div key={u.key} className="flex items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-card">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <b className="text-[14.5px]">{u.key === "maps" ? "Bản đồ tìm đường" : "Kênh tìm kiếm và đặt phòng"}</b>
                <span
                  className="rounded-full px-2.5 py-[3px] text-[11px] font-semibold"
                  style={{ background: u.linked ? "#E9FBEF" : "#F4F5F6", color: u.linked ? "#00C853" : "#777E90" }}
                >
                  {u.linked ? "Đã gắn kết" : "Chưa gắn kết"}
                </span>
              </div>
              <p className="m-0 text-[12.5px] text-pms-muted">{u.key === "maps" ? "Hiển thị địa chỉ, vị trí và hướng dẫn đến cơ sở cho khách." : "Đồng bộ giá và số phòng còn trống lên kênh tìm kiếm."}</p>
            </div>
            <button type="button" className="whitespace-nowrap rounded-lg bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white" onClick={() => setOpenConfig(u.key)}>Thiết lập</button>
          </div>
        ))}
      </div>

      <section className="mt-4 rounded-xl border border-pms-primary/10 bg-[#F6F8FF] p-4 shadow-card"><h2 className="m-0 text-[14px] font-bold">Luồng hành động đề xuất</h2><div className="mt-3 grid grid-cols-1 gap-2 text-[12px] md:grid-cols-3"><div className="rounded-lg bg-white p-3"><b>1. Khai báo nơi đến</b><p className="m-0 mt-1 text-[11px] text-pms-muted">Lưu địa chỉ và giới thiệu để khách tìm được cơ sở.</p></div><div className="rounded-lg bg-white p-3"><b>2. Đồng bộ phòng còn trống</b><p className="m-0 mt-1 text-[11px] text-pms-muted">Bật đồng bộ sau khi kiểm tra giá và phòng trên <a href="/rooms" className="text-pms-primary no-underline">Trạng thái phòng</a>.</p></div><div className="rounded-lg bg-white p-3"><b>3. Sẵn sàng hỗ trợ</b><p className="m-0 mt-1 text-[11px] text-pms-muted">Thêm đối tác rồi cho khách gọi khi có lỗi điện, nước, mạng hoặc khóa.</p></div></div></section>

      <section className="mt-5 rounded-xl bg-white p-4 shadow-card sm:p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2"><h2 className="m-0 text-[15px] font-semibold">Đối tác sửa chữa & bảo trì</h2><span className="text-[11.5px] text-pms-muted">Dùng khi báo hỏng từ Trạng thái phòng</span></div>
        <p className="mb-4 text-[12.5px] text-pms-muted">Danh sách chỉ lưu tại cơ sở. Đối tác được bật “Hiện cho khách” sẽ hiển thị trên QR thông tin phòng khi khách cần hỗ trợ.</p>
        <div className="flex flex-col gap-2.5">{partners.map((partner) => <div key={partner.id} className="grid grid-cols-1 gap-2 rounded-lg border border-pms-divider p-3 sm:grid-cols-[1.1fr_0.9fr_1fr_auto] sm:items-center"><input aria-label="Tên đối tác" value={partner.name} onChange={(event) => void patchPartner(partner.id, { name: event.target.value })} className="min-w-0 rounded-md border border-pms-border px-2.5 py-2 text-[12.5px]" /><input aria-label="Hạng mục" value={partner.category} onChange={(event) => void patchPartner(partner.id, { category: event.target.value })} className="min-w-0 rounded-md border border-pms-border px-2.5 py-2 text-[12.5px]" /><div className="flex gap-2"><input aria-label="Số điện thoại" value={partner.phone} onChange={(event) => void patchPartner(partner.id, { phone: event.target.value })} className="min-w-0 flex-1 rounded-md border border-pms-border px-2.5 py-2 text-[12.5px]" /><label className="flex items-center gap-1 whitespace-nowrap text-[11px]"><input type="checkbox" checked={partner.visibleToGuest} onChange={(event) => void patchPartner(partner.id, { visibleToGuest: event.target.checked })} />Khách xem</label></div><button type="button" onClick={() => void savePartners(partners.filter((item) => item.id !== partner.id))} className="rounded-md px-2 py-2 text-[12px] font-semibold text-pms-danger">Xóa</button></div>)}</div>
        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-pms-divider pt-3 sm:grid-cols-[1.1fr_0.9fr_1fr_auto]"><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Tên đối tác *" className="rounded-md border border-pms-border px-2.5 py-2 text-[12.5px]" /><select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} className="rounded-md border border-pms-border px-2.5 py-2 text-[12.5px]"><option>Điện</option><option>Nước</option><option>Mạng/Wi‑Fi</option><option>Camera</option><option>Điều hòa</option><option>Khóa cửa</option><option>Thiết bị khác</option></select><input value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Số điện thoại *" className="rounded-md border border-pms-border px-2.5 py-2 text-[12.5px]" /><button type="button" onClick={() => void addPartner()} disabled={!draft.name.trim() || !draft.phone.trim()} className="rounded-md bg-pms-primary px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50">+ Thêm</button></div>
      </section>

      {openConfig === "maps" && <MapsConfigModal initial={data.maps} onClose={() => setOpenConfig(null)} onSave={async (value) => { await save({ ...data, maps: value, links: data.links.map((item) => item.key === "maps" ? { ...item, linked: Boolean(value.address) } : item) }); setNotice("Đã lưu địa chỉ và nội dung bản đồ."); setOpenConfig(null); }} />}
      {openConfig === "hotel" && (
        <HotelConfigModal
          syncAvail={data.syncAvail}
          syncPromo={data.syncPromo}
          hotelId={data.hotelId}
          onToggleAvail={() => save({ ...data, syncAvail: !data.syncAvail })}
          onTogglePromo={() => save({ ...data, syncPromo: !data.syncPromo })}
          onSaveHotelId={async (value) => { await save({ ...data, hotelId: value, links: data.links.map((item) => item.key === "hotel" ? { ...item, linked: Boolean(value) } : item) }); setNotice("Đã lưu kết nối kênh đặt phòng."); setOpenConfig(null); }}
          onClose={() => setOpenConfig(null)}
        />
      )}
    </div>
  );
}
