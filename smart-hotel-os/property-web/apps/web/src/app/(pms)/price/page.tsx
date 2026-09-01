"use client";

import { useEffect, useState } from "react";
import { AddRoomTypeModal } from "@/components/price/AddRoomTypeModal";
import { AddRoomModal } from "@/components/price/AddRoomModal";
import { api, apiFetchBlob, isApiError } from "@/lib/api-client";

// Trang "Phòng và giá" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT cho toàn bộ
// CRUD: GET/POST/PATCH/DELETE /api/v1/room-types và /api/v1/rooms, bật/tắt
// đồng bộ OTA qua PATCH /api/v1/rooms/:id/sync, xem QR qua GET
// /api/v1/rooms/:id/qr (ảnh PNG, xem components/price/*Modal.tsx cho form).
export interface ApiRoomType {
  id: string;
  name: string;
  base_price: string;
  capacity: number;
  beds_big: number;
  beds_small: number;
  area_m2: string | null;
  status: "ACTIVE" | "INACTIVE";
  pricing_method: string;
  discount_percent: string;
}
export interface ApiRoom {
  id: string;
  number: string;
  floor: string;
  zone: string;
  room_type_id: string;
  room_type_name: string;
  room_type_price: string;
  status: "OCCUPIED" | "VACANT" | "DIRTY" | "MAINTENANCE";
  room_code: string;
  qr_token: string;
  sync_enabled: boolean;
  note: string | null;
}
interface BasicSettingsData {
  floorInputs?: { name?: string }[];
}

function formatVnd(v: string | number) {
  return Number(v).toLocaleString("vi-VN") + "đ";
}
const ROOM_STATUS_LABEL: Record<ApiRoom["status"], { label: string; color: string }> = {
  OCCUPIED: { label: "Đã đặt", color: "#284AB1" },
  VACANT: { label: "Đang mở", color: "#00C853" },
  DIRTY: { label: "Chờ xử lý", color: "#FAB505" },
  MAINTENANCE: { label: "Ngừng hoạt động", color: "#CC2F42" },
};
const PRICING_METHOD_LABEL: Record<string, string> = {
  PER_NIGHT: "Giá ngày",
  PER_HOUR: "Giá giờ",
};

export default function PricePage() {
  const [roomTypes, setRoomTypes] = useState<ApiRoomType[]>([]);
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [declaredFloors, setDeclaredFloors] = useState<string[]>([]);

  const [showAddRoomType, setShowAddRoomType] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<ApiRoomType | null>(null);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ApiRoom | null>(null);
  const [qrRoom, setQrRoom] = useState<ApiRoom | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [rt, r, basic] = await Promise.all([
        api.get<{ items: ApiRoomType[] }>("/api/v1/room-types"),
        api.get<{ items: ApiRoom[] }>("/api/v1/rooms"),
        api.get<{ data: BasicSettingsData }>("/api/v1/settings/basic"),
      ]);
      setRoomTypes(rt.items);
      setRooms(r.items);
      setDeclaredFloors((basic.data.floorInputs ?? []).map((floor) => floor.name?.trim() ?? "").filter(Boolean));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không tải được dữ liệu phòng và giá.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteRoomType(rt: ApiRoomType) {
    if (!window.confirm(`Xoá loại phòng "${rt.name}"?`)) return;
    setActionError(null);
    try {
      await api.delete(`/api/v1/room-types/${rt.id}`);
      await load();
    } catch (err) {
      setActionError(isApiError(err) ? err.message : "Không xoá được loại phòng.");
    }
  }

  async function handleDeleteRoom(r: ApiRoom) {
    if (!window.confirm(`Xoá phòng "${r.number}"?`)) return;
    setActionError(null);
    try {
      await api.delete(`/api/v1/rooms/${r.id}`);
      await load();
    } catch (err) {
      setActionError(isApiError(err) ? err.message : "Không xoá được phòng.");
    }
  }

  // Bật/tắt cờ đồng bộ OTA — cập nhật lạc quan (optimistic), hoàn tác nếu lỗi
  // (cùng khuôn mẫu với handleTogglePower ở rooms/page.tsx).
  async function handleToggleSync(r: ApiRoom) {
    const next = !r.sync_enabled;
    setRooms((rs) => rs.map((x) => (x.id === r.id ? { ...x, sync_enabled: next } : x)));
    setActionError(null);
    try {
      await api.patch(`/api/v1/rooms/${r.id}/sync`, { syncEnabled: next });
    } catch (err) {
      setRooms((rs) => rs.map((x) => (x.id === r.id ? { ...x, sync_enabled: !next } : x)));
      setActionError(isApiError(err) ? err.message : "Không đổi được trạng thái đồng bộ.");
    }
  }

  const floors = Array.from(new Set([...rooms.map((r) => r.floor), ...declaredFloors])).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  const zones = Array.from(new Set(rooms.map((r) => r.zone))).sort();

  if (loading) return <div className="text-[13px] text-pms-muted">Đang tải dữ liệu...</div>;
  if (error)
    return (
      <div className="rounded-xl bg-white p-6 text-[13px] text-pms-danger shadow-card">
        {error} <span className="cursor-pointer font-semibold text-pms-primary" onClick={load}>Thử lại</span>
      </div>
    );

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="text-[18px]">←</span>
        <h1 className="m-0 text-[20px] font-bold">ANIO Riverside Hotel</h1>
      </div>

      {actionError && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-[#FDECEC] px-4 py-3 text-[13px] text-pms-danger shadow-card">
          {actionError}
          <span className="cursor-pointer font-semibold" onClick={() => setActionError(null)}>
            ✕
          </span>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 text-[16px] font-bold">Danh sách loại phòng</h3>
        <div
          className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
          onClick={() => {
            setEditingRoomType(null);
            setShowAddRoomType(true);
          }}
        >
          + Thêm
        </div>
      </div>
      <div className="mb-7 overflow-x-auto rounded-xl bg-white px-5 py-4 shadow-card">
        <table className="w-full min-w-[900px] border-collapse whitespace-nowrap text-[13px]">
          <thead>
            <tr>
              {["STT", "Loại phòng", "Số phòng", "Giường", "S.chứa", "Diện tích", "Giá cơ bản", "Giá linh hoạt", "Tính tiền", "Giảm giá", "Trạng thái", "Action"].map((h) => (
                <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roomTypes.map((rt, i) => {
              const key = "rt" + rt.id;
              const count = rooms.filter((r) => r.room_type_id === rt.id).length;
              return (
                <tr key={key}>
                  <td className="border-b border-pms-divider px-2 py-3">{i + 1}</td>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold">{rt.name}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{count}</td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    🛏 {rt.beds_big}　🛏 {rt.beds_small}
                  </td>
                  <td className="border-b border-pms-divider px-2 py-3">{rt.capacity}</td>
                  <td className="border-b border-pms-divider px-2 py-3">📐 {rt.area_m2 ?? "—"}m2</td>
                  <td className="border-b border-pms-divider px-2 py-3">{formatVnd(rt.base_price)}</td>
                  <td className="border-b border-pms-divider px-2 py-3"><button type="button" className="font-semibold text-pms-primary" onClick={() => { setEditingRoomType(rt); setShowAddRoomType(true); }}>Cài đặt</button></td>
                  <td className="border-b border-pms-divider px-2 py-3">{PRICING_METHOD_LABEL[rt.pricing_method] ?? rt.pricing_method}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{Number(rt.discount_percent) > 0 ? `${rt.discount_percent}%` : "—"}</td>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold" style={{ color: rt.status === "ACTIVE" ? "#00C853" : "#CC2F42" }}>
                    {rt.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động"}
                  </td>
                  <td className="relative border-b border-pms-divider px-2 py-3">
                    <RowMenu
                      id={key}
                      open={openMenu === key}
                      onToggle={() => setOpenMenu(openMenu === key ? null : key)}
                      onEdit={() => {
                        setEditingRoomType(rt);
                        setShowAddRoomType(true);
                        setOpenMenu(null);
                      }}
                      onDelete={() => {
                        setOpenMenu(null);
                        handleDeleteRoomType(rt);
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination count={roomTypes.length} />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 text-[16px] font-bold">Danh sách phòng</h3>
        <div
          className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
          onClick={() => {
            setEditingRoom(null);
            setShowAddRoom(true);
          }}
        >
          + Thêm
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white px-5 py-4 shadow-card">
        <table className="w-full min-w-[1100px] border-collapse whitespace-nowrap text-[13px]">
          <thead>
            <tr>
              {["Phòng", "Loại phòng", "Mã phòng", "Tầng", "Bữa ăn", "S.chứa", "Giá 1 đêm", "Tính tiền", "QR Code", "Sync", "Trạng thái", "Action"].map((h) => (
                <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => {
              const key = "r" + r.id;
              const st = ROOM_STATUS_LABEL[r.status];
              return (
                <tr key={key}>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold">{r.number}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{r.room_type_name}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{r.room_code}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{r.floor}</td>
                  <td className="border-b border-pms-divider px-2 py-3">—</td>
                  <td className="border-b border-pms-divider px-2 py-3">—</td>
                  <td className="border-b border-pms-divider px-2 py-3">{formatVnd(r.room_type_price)}</td>
                  <td className="border-b border-pms-divider px-2 py-3">Tự động</td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    <span className="cursor-pointer text-pms-primary" onClick={() => setQrRoom(r)}>
                      ▦
                    </span>
                  </td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    <div
                      className="relative h-5 w-9 cursor-pointer rounded-full"
                      style={{ background: r.sync_enabled ? "#284AB1" : "#E6E8EC" }}
                      onClick={() => handleToggleSync(r)}
                    >
                      <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow" style={{ left: r.sync_enabled ? "18px" : "2px" }} />
                    </div>
                  </td>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold" style={{ color: st.color }}>
                    {st.label}
                  </td>
                  <td className="relative border-b border-pms-divider px-2 py-3">
                    <RowMenu
                      id={key}
                      open={openMenu === key}
                      onToggle={() => setOpenMenu(openMenu === key ? null : key)}
                      onEdit={() => {
                        setEditingRoom(r);
                        setShowAddRoom(true);
                        setOpenMenu(null);
                      }}
                      onDelete={() => {
                        setOpenMenu(null);
                        handleDeleteRoom(r);
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination count={rooms.length} />
      </div>

      {showAddRoomType && (
        <AddRoomTypeModal
          onClose={() => setShowAddRoomType(false)}
          onSaved={load}
          initial={editingRoomType ?? undefined}
          assignedRoomCount={editingRoomType ? rooms.filter((room) => room.room_type_id === editingRoomType.id).length : 0}
        />
      )}
      {showAddRoom && (
        <AddRoomModal
          onClose={() => setShowAddRoom(false)}
          onSaved={load}
          floors={floors}
          zones={zones}
          initial={editingRoom ?? undefined}
        />
      )}
      {qrRoom && <RoomQrModal room={qrRoom} onClose={() => setQrRoom(null)} />}
    </div>
  );
}

function RowMenu({
  id,
  open,
  onToggle,
  onEdit,
  onDelete,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="cursor-pointer px-2 py-1" onClick={onToggle}>
        ⋯
      </div>
      {open && (
        <div className="absolute right-2 top-8 z-50 w-[130px] rounded-[10px] bg-white shadow-popover">
          <div className="cursor-pointer px-3.5 py-2.5 text-[13px]" onClick={onEdit}>
            ✎ Sửa
          </div>
          <div className="cursor-pointer px-3.5 py-2.5 text-[13px] text-pms-danger" onClick={onDelete}>
            🗑 Xóa
          </div>
        </div>
      )}
    </>
  );
}

// Modal xem QR Code của phòng — tải ảnh PNG kèm JWT qua apiFetchBlob() (thẻ
// <img> không tự gắn header Authorization được), dựng thành blob URL. Kèm
// link công khai /guest/room/:token để nhân viên copy gửi khách nếu cần.
function RoomQrModal({ room, onClose }: { room: ApiRoom; onClose: () => void }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const guestUrl =
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3100") + `/guest/room/${room.qr_token}`;

  useEffect(() => {
    let revoke: string | null = null;
    apiFetchBlob(`/api/v1/rooms/${room.id}/qr`)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        revoke = url;
        setImgUrl(url);
      })
      .catch((err) => setError(isApiError(err) ? err.message : "Không tải được mã QR."));
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(23,26,31,.45)]" onClick={onClose}>
      <div className="flex w-[340px] flex-col items-center gap-4 rounded-[14px] bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <b className="text-[15px]">QR Code phòng {room.number}</b>
        {error && <div className="text-[12px] text-pms-danger">{error}</div>}
        {!error && imgUrl && <img src={imgUrl} alt={`QR phòng ${room.number}`} width={220} height={220} />}
        {!error && !imgUrl && <div className="text-[12px] text-pms-muted">Đang tải mã QR...</div>}
        <div className="w-full break-all rounded-lg bg-pms-divider px-3 py-2 text-center text-[11px] text-pms-muted">{guestUrl}</div>
        <div className="cursor-pointer rounded-lg bg-pms-primary px-4 py-2 text-[13px] font-semibold text-white" onClick={onClose}>
          Đóng
        </div>
      </div>
    </div>
  );
}

function Pagination({ count }: { count: number }) {
  return (
    <div className="mt-4 flex items-center justify-between text-[13px] text-pms-muted">
      <span>Hiển thị {count}/{count}</span>
      <div className="flex items-center gap-1.5">
        {[1].map((n) => (
          <div key={n} className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-pms-border">
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}
