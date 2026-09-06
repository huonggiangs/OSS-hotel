"use client";

import { type CampaignRow } from "@/lib/mock-data";
import { StatusPill } from "@/components/ui/StatusPill";
import { AddCampaignModal } from "@/components/marketing/AddCampaignModal";
import { useSettings } from "@/lib/useSettings";
import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { api, isApiError } from "@/lib/api-client";

// Trang "Marketing" — ĐÃ NỐI API THẬT: danh sách chiến dịch lưu trong
// property_settings nhóm "marketing" (chưa có bảng nghiệp vụ campaigns riêng
// — CRM/Marketing service thật thuộc smart-hotel-os/services/crm-service,
// property-web chỉ lưu cấu hình/khai báo chiến dịch cấp cơ sở, xem
// PROGRESS.md). Tạo chiến dịch mới giờ ghi thật xuống DB qua PUT (không chỉ
// setState cục bộ như bản mock trước đây).
interface MarketingData {
  campaigns: CampaignRow[];
  deleteAllowedRoles?: string[];
}
const FALLBACK: MarketingData = { campaigns: [] };

export default function MarketingPage() {
  const { data, loading, save } = useSettings<MarketingData>("marketing", FALLBACK);
  const [showAdd, setShowAdd] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  function dateInput(value: string) {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
  }

  async function confirmDelete() {
    if (deletingIndex === null || !deletePassword) return;
    setActionError(null);
    try {
      const result = await api.post<{ data: MarketingData }>("/api/v1/marketing/campaigns/delete", { index: deletingIndex, password: deletePassword });
      await save(result.data);
      setDeletingIndex(null); setDeletePassword("");
    } catch (error) { setActionError(isApiError(error) ? error.message : "Không thể xóa chiến dịch."); }
  }

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Tiếp thị</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">Chiến dịch thư điện tử hoặc tin nhắn gửi tới khách hàng</p>
      {actionError && <p className="mb-3 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12px] text-pms-danger">{actionError}</p>}

      <div className="rounded-xl bg-white p-4 shadow-card sm:p-6">
        <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Chiến dịch</h3>
          <button type="button"
            className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
            onClick={() => setShowAdd(true)}
          >
            + Tạo chiến dịch
          </button>
        </div>
        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
        {!loading && (
          <>
          <div className="space-y-3 md:hidden">
            {data.campaigns.map((c, i) => (
              <article key={c.name + i} className="rounded-lg border border-pms-divider p-3">
                <div className="flex items-start justify-between gap-3"><b className="break-words text-[13px]">{c.name}</b><StatusPill bg={c.bg} fg={c.fg}>{c.status}</StatusPill></div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-pms-muted"><span>{c.channel}</span><span className="text-right">Đã gửi: {c.sent}</span><span>{c.start} – {c.end}</span><span className="text-right">Mở: {c.opened}</span></div>
                <div className="mt-3 flex gap-3 text-[12px] font-semibold"><button type="button" onClick={() => setViewingIndex(i)} className="text-pms-primary">👁 Xem</button><button type="button" onClick={() => setEditingIndex(i)} className="text-pms-primary">✎ Sửa</button><button type="button" onClick={() => setDeletingIndex(i)} className="text-pms-danger">🗑 Xóa</button></div>
              </article>
            ))}
            {data.campaigns.length === 0 && <p className="py-4 text-center text-[13px] text-pms-muted">Chưa có chiến dịch.</p>}
          </div>
          <table className="hidden w-full border-collapse text-[13px] md:table">
            <thead>
              <tr>
                {["Chiến dịch", "Kênh", "Bắt đầu", "Kết thúc", "Đã gửi", "Tỷ lệ mở", "Trạng thái", "Hành động"].map((h) => (
                  <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((c, i) => (
                <tr key={c.name + i}>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold">{c.name}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{c.channel}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{c.start}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{c.end}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{c.sent}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{c.opened}</td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    <StatusPill bg={c.bg} fg={c.fg}>
                      {c.status}
                    </StatusPill>
                  </td>
                  <td className="border-b border-pms-divider px-2 py-3"><div className="flex gap-2 text-[12px] font-semibold"><button type="button" title="Xem" onClick={() => setViewingIndex(i)} className="text-pms-primary">👁</button><button type="button" title="Sửa" onClick={() => setEditingIndex(i)} className="text-pms-primary">✎</button><button type="button" title="Xóa" onClick={() => setDeletingIndex(i)} className="text-pms-danger">🗑</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      {showAdd && (
        <AddCampaignModal
          onClose={() => setShowAdd(false)}
          onCreate={(row) => {
            void save({ ...data, campaigns: [row, ...data.campaigns] });
            setShowAdd(false);
          }}
        />
      )}
      {editingIndex !== null && data.campaigns[editingIndex] && <AddCampaignModal initial={{ ...data.campaigns[editingIndex], start: dateInput(data.campaigns[editingIndex].start), end: dateInput(data.campaigns[editingIndex].end) }} onClose={() => setEditingIndex(null)} onCreate={(row) => { const campaigns = data.campaigns.map((campaign, index) => index === editingIndex ? { ...campaign, ...row } : campaign); void save({ ...data, campaigns }).then(() => setEditingIndex(null)); }} />}
      {viewingIndex !== null && data.campaigns[viewingIndex] && <Modal title="Chi tiết chiến dịch" onClose={() => setViewingIndex(null)} width={520}><div className="space-y-2 px-6 py-5 text-[13px]"><b className="block text-[16px]">{data.campaigns[viewingIndex].name}</b><p className="m-0">Kênh: {data.campaigns[viewingIndex].channel}</p><p className="m-0">Thời gian: {data.campaigns[viewingIndex].start} – {data.campaigns[viewingIndex].end}</p><p className="m-0">Đã gửi: {data.campaigns[viewingIndex].sent} · Tỷ lệ mở: {data.campaigns[viewingIndex].opened}</p><p className="m-0">Trạng thái: {data.campaigns[viewingIndex].status}</p></div></Modal>}
      {deletingIndex !== null && data.campaigns[deletingIndex] && <Modal title="Xác nhận xóa chiến dịch" onClose={() => { setDeletingIndex(null); setDeletePassword(""); setActionError(null); }} width={460} footer={<><ButtonGhost onClick={() => setDeletingIndex(null)}>Hủy</ButtonGhost><ButtonPrimary onClick={() => void confirmDelete()}>Xóa chiến dịch</ButtonPrimary></>}><div className="space-y-3 px-6 py-5 text-[13px]"><p className="m-0">Bạn đang xóa <b>{data.campaigns[deletingIndex].name}</b>. Chỉ tài khoản được phân quyền mới thực hiện được thao tác này.</p><label className="block text-[12px]">Nhập mật khẩu để xác nhận<input type="password" autoFocus value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="mt-1 w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></label>{actionError && <p className="m-0 text-[12px] text-pms-danger">{actionError}</p>}</div></Modal>}
    </div>
  );
}
