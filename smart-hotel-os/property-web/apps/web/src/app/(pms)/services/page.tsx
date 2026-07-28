"use client";

import { useState } from "react";
import type { OwnServiceRow, PartnerServiceRow } from "@/lib/mock-data";
import { StatusPill } from "@/components/ui/StatusPill";
import { EditServiceModal, type EditServiceForm } from "@/components/services/EditServiceModal";
import { AddPartnerModal } from "@/components/services/AddPartnerModal";
import { useSettings } from "@/lib/useSettings";

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
  const { data, loading, save } = useSettings<ServicesData>("services", FALLBACK);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddPartner, setShowAddPartner] = useState(false);

  const ownServices = data.own
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
  }

  if (loading) return <div className="text-[13px] text-pms-muted">Đang tải dữ liệu...</div>;

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Dịch vụ</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">Liên kết các cơ sở xung quanh để bán chéo sản phẩm cho khách lưu trú</p>

      <div className="mb-4 rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Gói dịch vụ của cơ sở</h3>
          <div className="flex items-center gap-2.5">
            <div className="flex min-w-[200px] items-center gap-2 rounded-lg border border-pms-border px-3 py-2 text-[13px] text-pms-muted-2">
              Tìm kiếm <span className="ml-auto text-pms-muted">🔍</span>
            </div>
          </div>
        </div>
        <table className="w-full min-w-[1100px] border-collapse whitespace-nowrap text-[13px]">
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
                        Xoá
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3.5 flex items-center justify-between">
          <span className="text-[12px] text-pms-muted">Hiển thị {ownServices.length}/{ownServices.length} dịch vụ</span>
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
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Đối tác", "Loại hình", "Khoảng cách", "Hoa hồng", "Trạng thái"].map((h) => (
                <th key={h} className={TH}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.partners.map((s) => (
              <tr key={s.name}>
                <td className={`${TD} font-semibold`}>{s.name}</td>
                <td className={TD}>{s.category}</td>
                <td className={TD}>{s.distance}</td>
                <td className={TD}>{s.commission}</td>
                <td className={TD}>
                  <StatusPill bg={s.linked ? "#E9FBEF" : "#F4F5F6"} fg={s.linked ? "#00C853" : "#777E90"}>
                    {s.linked ? "Đang liên kết" : "Chưa liên kết"}
                  </StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingService && (
        <EditServiceModal
          service={editingService as OwnServiceRow & { statusLabel: string }}
          onClose={() => setEditingId(null)}
          onSave={handleSaveEdit}
        />
      )}
      {showAddPartner && <AddPartnerModal onClose={() => setShowAddPartner(false)} />}
    </div>
  );
}
