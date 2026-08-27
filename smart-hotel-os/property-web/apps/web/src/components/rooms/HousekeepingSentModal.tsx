"use client";

import { useState } from "react";
import { api, isApiError } from "@/lib/api-client";
import type { RoomCard } from "@/lib/room-status";

export function HousekeepingSentModal({ room, onClose, onChanged }: { room: RoomCard; onClose: () => void; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function markClean() {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/v1/rooms/${room.id}/housekeeping-complete`);
      onChanged();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không thể cập nhật trạng thái phòng.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(23,26,31,.45)]">
      <div className="w-[380px] rounded-[14px] bg-white p-6 text-center">
        <div className="mb-2 text-[32px]">🧹</div>
        <b className="mb-1.5 block text-[15px]">Hoàn tất dọn phòng {room.n}</b>
        <p className="m-0 mb-[18px] text-[13px] text-pms-muted">Xác nhận hoàn tất công việc buồng phòng để chuyển phòng sang “Trống, sạch”. Yêu cầu dọn và trạng thái phòng được đóng cùng lúc.</p>
        {error && <p className="mb-3 rounded-lg bg-pms-danger-bg px-3 py-2 text-left text-[12px] text-pms-danger">{error}</p>}
        <div className="flex gap-2"><button type="button" className="flex-1 rounded-lg border border-pms-border py-2.5 text-[13px] font-semibold" onClick={onClose}>Hủy</button><button type="button" className="flex-1 rounded-lg bg-pms-primary py-2.5 text-[13px] font-semibold text-white" onClick={markClean}>{saving ? "Đang cập nhật..." : "Đánh dấu đã dọn"}</button></div>
      </div>
    </div>
  );
}
