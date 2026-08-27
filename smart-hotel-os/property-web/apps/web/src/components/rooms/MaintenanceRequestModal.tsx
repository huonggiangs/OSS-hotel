"use client";

import { useEffect, useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { api, isApiError } from "@/lib/api-client";
import type { RoomCard } from "@/lib/room-status";

interface MaintenancePartner { id: string; name: string; category: string; phone?: string; visibleToGuest?: boolean }
interface MaintenanceRequest { id: string; category: string; description: string; priority: string; status: string; partner_name: string | null; created_at: string }

export function MaintenanceRequestModal({ room, bookingId, onClose, onChanged }: { room: RoomCard; bookingId?: string; onClose: () => void; onChanged: () => void }) {
  const [partners, setPartners] = useState<MaintenancePartner[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [category, setCategory] = useState("Điện");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [partnerId, setPartnerId] = useState("");
  const [markMaintenance, setMarkMaintenance] = useState(room.statusKey !== "occupied");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.get<{ data?: { maintenancePartners?: MaintenancePartner[] } }>("/api/v1/settings/utilities"),
      api.get<{ items: MaintenanceRequest[] }>(`/api/v1/maintenance?roomId=${encodeURIComponent(room.id)}`),
    ]).then(([settings, response]) => {
      if (cancelled) return;
      setPartners(settings.data?.maintenancePartners ?? []);
      setRequests(response.items);
    }).catch(() => !cancelled && setError("Không tải được danh sách đối tác hoặc phiếu bảo trì."));
    return () => { cancelled = true; };
  }, [room.id]);

  async function submit() {
    if (description.trim().length < 3) { setError("Mô tả sự cố ít nhất 3 ký tự."); return; }
    setSaving(true); setError(null);
    const partner = partners.find((item) => item.id === partnerId);
    try {
      await api.post("/api/v1/maintenance", {
        roomId: room.id,
        bookingId: bookingId ?? null,
        category,
        description: description.trim(),
        priority,
        partnerName: partner?.name ?? null,
        partnerPhone: partner?.phone ?? null,
        guestVisible: partner?.visibleToGuest ?? true,
        markRoomMaintenance: room.statusKey === "occupied" ? false : markMaintenance,
      });
      onChanged(); onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không thể tạo phiếu yêu cầu sửa chữa.");
    } finally { setSaving(false); }
  }

  return <Modal title={`Báo hỏng & yêu cầu sửa — Phòng ${room.n}`} onClose={onClose} width={620} footer={<><ButtonGhost onClick={onClose}>Hủy</ButtonGhost><ButtonPrimary onClick={submit}>{saving ? "Đang gửi..." : "Tạo phiếu sửa chữa"}</ButtonPrimary></>}>
    <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
      {error && <p className="m-0 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">{error}</p>}
      {room.statusKey === "occupied" && <p className="m-0 rounded-lg bg-[#FFF7E6] px-3 py-2 text-[12px] text-[#9A6700]">Khách vẫn đang ở phòng. Phiếu sẽ được tạo nhưng phòng chỉ được đưa vào “Bảo trì” sau khi chuyển khách hoặc trả phòng.</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Select label="Hạng mục" value={category} onChange={setCategory} options={["Điện", "Nước", "Mạng/Wi‑Fi", "Camera", "Điều hòa", "Khóa cửa", "Tivi/loa", "Thiết bị khác"]} /><Select label="Mức độ" value={priority} onChange={setPriority} options={[["LOW", "Thấp"], ["NORMAL", "Bình thường"], ["HIGH", "Cao"], ["URGENT", "Khẩn cấp"]]} /><div className="sm:col-span-2"><label className="mb-1.5 block text-[12px]">Đối tác sửa chữa</label><select value={partnerId} onChange={(event) => setPartnerId(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"><option value="">Tự phân công / chưa chọn</option>{partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name} · {partner.category}{partner.phone ? ` · ${partner.phone}` : ""}</option>)}</select>{partners.length === 0 && <p className="mb-0 mt-1 text-[11.5px] text-pms-muted">Chưa có đối tác. Chủ cơ sở thêm tại Tiện ích → Đối tác bảo trì.</p>}</div><div className="sm:col-span-2"><label className="mb-1.5 block text-[12px]">Mô tả sự cố *</label><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Triệu chứng, vị trí thiết bị, thời điểm phát hiện..." className="w-full resize-y rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></div></div>
      {room.statusKey !== "occupied" && <label className="flex items-start gap-2 rounded-lg border border-pms-divider p-3 text-[12.5px]"><input type="checkbox" checked={markMaintenance} onChange={(event) => setMarkMaintenance(event.target.checked)} className="mt-0.5" /><span><b>Đưa phòng vào bảo trì</b><br /><span className="text-pms-muted">Tắt điện và chặn nhận khách cho đến khi hoàn tất xử lý.</span></span></label>}
      {requests.length > 0 && <div className="border-t border-pms-divider pt-3"><b className="text-[12.5px]">Phiếu gần đây</b><div className="mt-2 flex flex-col gap-2">{requests.slice(0, 3).map((request) => <div key={request.id} className="rounded-lg bg-pms-bg px-3 py-2 text-[11.5px]"><b>{request.category}</b> · {request.description} <span className="text-pms-muted">({request.status})</span></div>)}</div></div>}
    </div>
  </Modal>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] | [string, string][] }) {
  return <div><label className="mb-1.5 block text-[12px]">{label}</label><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">{options.map((option) => Array.isArray(option) ? <option key={option[0]} value={option[0]}>{option[1]}</option> : <option key={option} value={option}>{option}</option>)}</select></div>;
}
