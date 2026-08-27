"use client";

import { useEffect, useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { api, apiUpload, isApiError } from "@/lib/api-client";
import type { RoomCard } from "@/lib/room-status";

interface MaintenancePartner { id: string; name: string; category: string; phone?: string; visibleToGuest?: boolean }
interface MaintenanceMedia { id: string; original_name: string; mime_type: string; byte_size: number }
interface MaintenanceIssue { id: string; category: string; description: string; priority: string; media: MaintenanceMedia[] }
interface MaintenanceRequest { id: string; category: string; description: string; priority: string; status: string; partner_name: string | null; created_at: string; issues: MaintenanceIssue[] }
interface IssueDraft { key: string; category: string; description: string; priority: string; files: File[] }

const CATEGORIES = ["Điện", "Nước", "Mạng/Wi‑Fi", "Camera", "Điều hòa", "Khóa cửa", "Tivi/loa", "Thiết bị khác"];
const PRIORITIES: [string, string][] = [["LOW", "Thấp"], ["NORMAL", "Bình thường"], ["HIGH", "Cao"], ["URGENT", "Khẩn cấp"]];
function freshIssue(): IssueDraft { return { key: typeof crypto !== "undefined" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, category: "Điện", description: "", priority: "NORMAL", files: [] }; }

export function MaintenanceRequestModal({ room, bookingId, onClose, onChanged }: { room: RoomCard; bookingId?: string; onClose: () => void; onChanged: () => void }) {
  const [partners, setPartners] = useState<MaintenancePartner[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [issues, setIssues] = useState<IssueDraft[]>([freshIssue()]);
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

  function updateIssue(key: string, patch: Partial<IssueDraft>) {
    setIssues((items) => items.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  async function submit() {
    if (issues.some((issue) => issue.description.trim().length < 3)) {
      setError("Mỗi lỗi hỏng cần có mô tả ít nhất 3 ký tự.");
      return;
    }
    setSaving(true); setError(null);
    const partner = partners.find((item) => item.id === partnerId);
    try {
      const request = await api.post<MaintenanceRequest>("/api/v1/maintenance", {
        roomId: room.id,
        bookingId: bookingId ?? null,
        category: issues[0].category,
        description: issues[0].description.trim(),
        priority: issues[0].priority,
        issues: issues.map((issue) => ({ category: issue.category, description: issue.description.trim(), priority: issue.priority })),
        partnerName: partner?.name ?? null,
        partnerPhone: partner?.phone ?? null,
        guestVisible: partner?.visibleToGuest ?? true,
        markRoomMaintenance: room.statusKey === "occupied" ? false : markMaintenance,
      });
      for (let index = 0; index < issues.length; index += 1) {
        const createdIssue = request.issues[index];
        if (!createdIssue) continue;
        for (const file of issues[index].files) {
          await apiUpload(`/api/v1/maintenance/${request.id}/issues/${createdIssue.id}/media`, file);
        }
      }
      onChanged(); onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không thể tạo phiếu yêu cầu sửa chữa hoặc tải tệp đính kèm.");
    } finally { setSaving(false); }
  }

  return <Modal title={`Báo hỏng & yêu cầu sửa — Phòng ${room.n}`} onClose={onClose} width={680} footer={<><ButtonGhost onClick={onClose}>Hủy</ButtonGhost><ButtonPrimary onClick={submit}>{saving ? "Đang gửi..." : "Tạo phiếu sửa chữa"}</ButtonPrimary></>}>
    <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
      {error && <p className="m-0 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">{error}</p>}
      {room.statusKey === "occupied" && <p className="m-0 rounded-lg bg-[#FFF7E6] px-3 py-2 text-[12px] text-[#9A6700]">Khách vẫn đang ở phòng. Phiếu được tạo nhưng phòng chỉ chuyển “Bảo trì” sau khi khách chuyển/trả phòng.</p>}
      <div><label className="mb-1.5 block text-[12px]">Đối tác sửa chữa</label><select value={partnerId} onChange={(event) => setPartnerId(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"><option value="">Tự phân công / chưa chọn</option>{partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name} · {partner.category}{partner.phone ? ` · ${partner.phone}` : ""}</option>)}</select>{partners.length === 0 && <p className="mb-0 mt-1 text-[11.5px] text-pms-muted">Chưa có đối tác. Chủ cơ sở thêm tại Tiện ích → Đối tác bảo trì.</p>}</div>
      <section className="space-y-3"><div className="flex items-center justify-between"><b className="text-[13px]">Các lỗi hỏng</b><button type="button" className="text-[12px] font-semibold text-pms-primary" onClick={() => setIssues((items) => [...items, freshIssue()])}>+ Thêm lỗi</button></div>{issues.map((issue, index) => <div key={issue.key} className="rounded-xl border border-pms-divider p-3"><div className="mb-2 flex items-center justify-between"><b className="text-[12px]">Lỗi {index + 1}</b>{issues.length > 1 && <button type="button" className="text-[11.5px] font-semibold text-pms-danger" onClick={() => setIssues((items) => items.filter((item) => item.key !== issue.key))}>Xóa lỗi</button>}</div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Select label="Hạng mục" value={issue.category} onChange={(value) => updateIssue(issue.key, { category: value })} options={CATEGORIES} /><Select label="Mức độ" value={issue.priority} onChange={(value) => updateIssue(issue.key, { priority: value })} options={PRIORITIES} /><div className="sm:col-span-2"><label className="mb-1.5 block text-[12px]">Mô tả sự cố *</label><textarea value={issue.description} onChange={(event) => updateIssue(issue.key, { description: event.target.value })} rows={3} placeholder="Triệu chứng, vị trí thiết bị, thời điểm phát hiện..." className="w-full resize-y rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></div><div className="sm:col-span-2"><label className="mb-1.5 block text-[12px]">Ảnh hoặc video (tối đa 40 MB/tệp)</label><input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={(event) => updateIssue(issue.key, { files: Array.from(event.target.files ?? []) })} className="block w-full text-[12px]" />{issue.files.length > 0 && <p className="mb-0 mt-1 text-[11.5px] text-pms-muted">{issue.files.map((file) => file.name).join(", ")}</p>}</div></div></div>)}</section>
      {room.statusKey !== "occupied" && <label className="flex items-start gap-2 rounded-lg border border-pms-divider p-3 text-[12.5px]"><input type="checkbox" checked={markMaintenance} onChange={(event) => setMarkMaintenance(event.target.checked)} className="mt-0.5" /><span><b>Đưa phòng vào bảo trì</b><br /><span className="text-pms-muted">Tắt các thiết bị năng lượng đã gán và chặn nhận khách cho đến khi xử lý.</span></span></label>}
      {requests.length > 0 && <div className="border-t border-pms-divider pt-3"><b className="text-[12.5px]">Phiếu gần đây</b><div className="mt-2 flex flex-col gap-2">{requests.slice(0, 3).map((request) => <div key={request.id} className="rounded-lg bg-pms-bg px-3 py-2 text-[11.5px]"><b>{request.issues.length} lỗi</b> · {request.issues.map((item) => item.category).join(", ")} <span className="text-pms-muted">({request.status})</span></div>)}</div></div>}
    </div>
  </Modal>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] | [string, string][] }) {
  return <div><label className="mb-1.5 block text-[12px]">{label}</label><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">{options.map((option) => Array.isArray(option) ? <option key={option[0]} value={option[0]}>{option[1]}</option> : <option key={option} value={option}>{option}</option>)}</select></div>;
}
