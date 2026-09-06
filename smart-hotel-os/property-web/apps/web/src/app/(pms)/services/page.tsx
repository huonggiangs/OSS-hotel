"use client";

import { useState } from "react";
import type { OwnServiceRow, PartnerServiceRow } from "@/lib/mock-data";
import { StatusPill } from "@/components/ui/StatusPill";
import { EditServiceModal, type EditServiceForm } from "@/components/services/EditServiceModal";
import { AddPartnerModal, type NewPartnerForm } from "@/components/services/AddPartnerModal";
import { AddServiceModal, type NewServiceForm } from "@/components/services/AddServiceModal";
import { useSettings } from "@/lib/useSettings";
import { Modal } from "@/components/ui/Modal";

const TH = "border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted";
const TD = "border-b border-pms-divider px-2 py-3";

// Trang "Dịch vụ" — ĐÃ NỐI API THẬT: cả 2 bảng (gói dịch vụ của cơ sở + đối
// tác xung quanh) lưu trong property_settings nhóm "services" (own + partners
// — chưa có bảng nghiệp vụ riêng, xem PROGRESS.md). Sửa/Xoá dịch vụ giờ ghi
// thật xuống DB qua PUT (thay vì chỉ setState cục bộ như bản mock trước đây).
interface ServicesData {
  own: OwnServiceRow[];
  partners: PartnerServiceRow[];
}
const FALLBACK: ServicesData = { own: [], partners: [] };

export default function ServicesPage() {
  const { data, loading, save, error } = useSettings<ServicesData>("services", FALLBACK);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [editingPartnerIndex, setEditingPartnerIndex] = useState<number | null>(null);
  const [viewingPartnerIndex, setViewingPartnerIndex] = useState<number | null>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const ownServices = data.own
    .filter((service) => !search.trim() || `${service.name} ${service.category}`.toLowerCase().includes(search.trim().toLowerCase()))
    .map((s) => {
      const statusLabel = (s as OwnServiceRow & { statusLabel?: string }).statusLabel ?? (s.linked ? "Đã xuất bản" : "Chưa xuất bản");
      return { ...s, statusLabel, fg: statusLabel === "Đã xuất bản" ? "#00C853" : "#CC2F42" };
    })
    .map((s, i) => ({ ...s, stt: i + 1 }));

  const editingService = ownServices.find((s) => s.id === editingId) || null;

  async function handleDelete(id: number) {
    await save({ ...data, own: data.own.filter((s) => s.id !== id) });
    setOpenMenuId(null);
  }

  async function handleSaveEdit(form: EditServiceForm) {
    if (editingId === null) return;
    await save({
      ...data,
      own: data.own.map((s) => (s.id === editingId ? { ...s, ...form, linked: form.statusLabel === "Đã xuất bản" } : s)),
    });
    setEditingId(null);
    setNotice("Đã cập nhật dịch vụ.");
  }

  async function handleAddService(form: NewServiceForm) {
    const nextId = data.own.reduce((max, service) => Math.max(max, Number(service.id) || 0), -1) + 1;
    await save({ ...data, own: [...data.own, { ...form, id: nextId, linked: false }] });
    setShowAddService(false); setNotice("Đã thêm dịch vụ. Hãy mở menu để công khai trước khi nhận yêu cầu.");
  }

  async function handleAddPartner(form: NewPartnerForm) {
    await save({ ...data, partners: [...data.partners, { ...form, linked: false }] });
    setShowAddPartner(false); setNotice("Đã thêm đối tác. Bạn có thể bật liên kết sau khi xác nhận thông tin.");
  }

  async function handleEditPartner(form: NewPartnerForm) {
    if (editingPartnerIndex === null) return;
    await save({ ...data, partners: data.partners.map((partner, index) => index === editingPartnerIndex ? { ...partner, ...form } : partner) });
    setEditingPartnerIndex(null); setNotice("Đã cập nhật đối tác.");
  }

  async function handleDeletePartner(index: number) {
    const partner = data.partners[index];
    if (!partner || !window.confirm(`Xóa đối tác “${partner.name}”?`)) return;
    await save({ ...data, partners: data.partners.filter((_, itemIndex) => itemIndex !== index) });
    setNotice("Đã xóa đối tác.");
  }

  if (loading) return <div className="text-[13px] text-pms-muted">Đang tải dữ liệu...</div>;

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Dịch vụ</h1>
      <p className="mb-2 text-[13px] text-pms-muted">Tạo dịch vụ → công khai → ghi nhận sử dụng vào đúng phòng và hóa đơn</p>
      {error && <p className="mb-3 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12px] text-pms-danger">{error}</p>}
      {notice && <p className="mb-3 rounded-lg bg-[#E9FBEF] px-3 py-2 text-[12px] text-pms-success">{notice}</p>}

      <div className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-pms-primary/10 bg-[#F6F8FF] p-4 text-[12px] sm:grid-cols-3"><div><b>1. Tạo dịch vụ</b><p className="m-0 mt-1 text-[11px] text-pms-muted">Tên, giá, thời gian và nơi cung cấp.</p></div><div><b>2. Công khai</b><p className="m-0 mt-1 text-[11px] text-pms-muted">Chỉ dịch vụ đã công khai mới đưa cho khách chọn.</p></div><div><b>3. Ghi nhận và thu tiền</b><p className="m-0 mt-1 text-[11px] text-pms-muted">Mở phòng đang ở để thêm số lượng vào hóa đơn.</p></div></div>

      <div className="mb-4 rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Gói dịch vụ của cơ sở</h3>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên hoặc nhóm" className="w-full rounded-lg border border-pms-border px-3 py-2 text-[12px] sm:w-[220px]" />
            <button type="button" className="rounded-[10px] bg-pms-primary px-3 py-2 text-[12px] font-semibold text-white" onClick={() => setShowAddService(true)}>+ Thêm dịch vụ</button>
          </div>
        </div>
        <div className="space-y-3 md:hidden">{ownServices.map((s) => <article key={s.id} className="rounded-lg border border-pms-divider p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block break-words text-[13px]">{s.name}</b><span className="text-[11px] text-pms-muted">{s.category} · {s.unit}</span></div><StatusPill bg={s.fg === "#00C853" ? "#E9FBEF" : "#FDECEC"} fg={s.fg}>{s.statusLabel}</StatusPill></div><p className="m-0 mt-2 break-words text-[12px] text-pms-muted">{s.price} · {s.schedule} · {s.location}</p><div className="mt-3 flex flex-wrap gap-3 text-[11px] font-semibold"><button type="button" onClick={() => setEditingId(s.id)} className="text-pms-primary">Sửa</button><button type="button" onClick={() => void handleDelete(s.id)} className="text-pms-danger">Xóa</button><a href="/rooms" className="text-pms-primary no-underline">Ghi nhận tại phòng →</a></div></article>)}{ownServices.length === 0 && <p className="py-4 text-center text-[13px] text-pms-muted">Chưa có dịch vụ phù hợp.</p>}</div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[980px] border-collapse whitespace-nowrap text-[13px]">
          <thead>
            <tr>
              <th className={`${TH} w-7`}>
                <input type="checkbox" />
              </th>
              {["STT", "Loại dịch vụ", "Dịch vụ", "Đơn vị tính", "Thời gian", "Phương tiện", "Địa điểm yêu cầu", "Giá", "Trạng thái", ""].map(
                (h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {ownServices.map((s) => (
              <tr key={s.id}>
                <td className={TD}>
                  <input type="checkbox" />
                </td>
                <td className={`${TD} text-pms-muted`}>{s.stt}</td>
                <td className={TD}>{s.category}</td>
                <td className={`${TD} font-semibold`}>{s.name}</td>
                <td className={TD}>{s.unit}</td>
                <td className={TD}>{s.schedule}</td>
                <td className={TD}>{s.vehicle}</td>
                <td className={TD}>{s.location}</td>
                <td className={TD}>{s.price}</td>
                <td className={TD} style={{ fontWeight: 600, color: s.fg }}>
                  {s.statusLabel}
                </td>
                <td className={`${TD} relative`}>
                  <div className="cursor-pointer px-2 py-1 text-center" onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}>
                    ⋯
                  </div>
                  {openMenuId === s.id && (
                    <div className="absolute right-2 top-8 z-50 min-w-[120px] rounded-[10px] border border-pms-border bg-white shadow-popover">
                      <div
                        className="cursor-pointer px-3.5 py-2.5 text-[12.5px]"
                        onClick={() => {
                          setEditingId(s.id);
                          setOpenMenuId(null);
                        }}
                      >
                        Sửa dịch vụ
                      </div>
                      <div className="cursor-pointer px-3.5 py-2.5 text-[12.5px] text-pms-danger" onClick={() => handleDelete(s.id)}>
                        Xóa
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="mt-3.5 flex items-center justify-between">
          <span className="text-[12px] text-pms-muted">Hiển thị {ownServices.length}/{data.own.length} dịch vụ</span>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Đối tác xung quanh</h3>
          <div
            className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
            onClick={() => setShowAddPartner(true)}
          >
            + Thêm đối tác
          </div>
        </div>
        <div className="space-y-3 md:hidden">{data.partners.map((s, index) => <article key={`${s.name}-${index}`} className="rounded-lg border border-pms-divider p-3"><div className="flex items-start justify-between gap-3"><b className="break-words text-[13px]">{s.name}</b><StatusPill bg={s.linked ? "#E9FBEF" : "#F4F5F6"} fg={s.linked ? "#00C853" : "#777E90"}>{s.linked ? "Đang liên kết" : "Chưa liên kết"}</StatusPill></div><p className="m-0 mt-2 break-words text-[12px] text-pms-muted">{s.category} · {s.distance || "Chưa cập nhật"} · Hoa hồng {s.commission || "Chưa cập nhật"}</p><div className="mt-3 flex gap-3 text-[12px] font-semibold"><button type="button" onClick={() => setViewingPartnerIndex(index)} className="text-pms-primary">👁 Xem</button><button type="button" onClick={() => setEditingPartnerIndex(index)} className="text-pms-primary">✎ Sửa</button><button type="button" onClick={() => void handleDeletePartner(index)} className="text-pms-danger">🗑 Xóa</button></div></article>)}{data.partners.length === 0 && <p className="py-4 text-center text-[13px] text-pms-muted">Chưa có đối tác.</p>}</div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] border-collapse text-[13px]">
          <thead>
            <tr>
              {["Đối tác", "Loại hình", "Khoảng cách", "Hoa hồng", "Trạng thái", "Hành động"].map((h) => (
                <th key={h} className={TH}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.partners.map((s, index) => (
              <tr key={`${s.name}-${index}`}>
                <td className={`${TD} font-semibold`}>{s.name}</td>
                <td className={TD}>{s.category}</td>
                <td className={TD}>{s.distance}</td>
                <td className={TD}>{s.commission}</td>
                <td className={TD}>
                  <StatusPill bg={s.linked ? "#E9FBEF" : "#F4F5F6"} fg={s.linked ? "#00C853" : "#777E90"}>
                    {s.linked ? "Đang liên kết" : "Chưa liên kết"}
                  </StatusPill>
                </td>
                <td className={TD}><div className="flex gap-2 text-[12px] font-semibold"><button type="button" title="Xem" onClick={() => setViewingPartnerIndex(index)} className="text-pms-primary">👁</button><button type="button" title="Sửa" onClick={() => setEditingPartnerIndex(index)} className="text-pms-primary">✎</button><button type="button" title="Xóa" onClick={() => void handleDeletePartner(index)} className="text-pms-danger">🗑</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {editingService && (
        <EditServiceModal
          service={editingService as OwnServiceRow & { statusLabel: string }}
          onClose={() => setEditingId(null)}
          onSave={handleSaveEdit}
        />
      )}
      {showAddPartner && <AddPartnerModal onClose={() => setShowAddPartner(false)} onSave={handleAddPartner} />}
      {editingPartnerIndex !== null && data.partners[editingPartnerIndex] && <AddPartnerModal initial={data.partners[editingPartnerIndex]} onClose={() => setEditingPartnerIndex(null)} onSave={handleEditPartner} />}
      {viewingPartnerIndex !== null && data.partners[viewingPartnerIndex] && <Modal title="Chi tiết đối tác" onClose={() => setViewingPartnerIndex(null)} width={520}><div className="space-y-2 px-6 py-5 text-[13px]"><b className="block text-[16px]">{data.partners[viewingPartnerIndex].name}</b><p className="m-0">Loại hình: {data.partners[viewingPartnerIndex].category}</p><p className="m-0">Khoảng cách: {data.partners[viewingPartnerIndex].distance || "Chưa cập nhật"}</p><p className="m-0">Hoa hồng: {data.partners[viewingPartnerIndex].commission || "Chưa cập nhật"}</p><p className="m-0">Trạng thái: {data.partners[viewingPartnerIndex].linked ? "Đang liên kết" : "Chưa liên kết"}</p></div></Modal>}
      {showAddService && <AddServiceModal onClose={() => setShowAddService(false)} onSave={handleAddService} />}
    </div>
  );
}
