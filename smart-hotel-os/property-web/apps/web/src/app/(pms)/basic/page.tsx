"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/useSettings";
import { api } from "@/lib/api-client";

type Tab = "info" | "owner" | "payment";

const TABS: { key: Tab; label: string }[] = [
  { key: "info", label: "Thông tin cơ sở" },
  { key: "owner", label: "Thông tin chủ sở hữu" },
  { key: "payment", label: "Thông tin thanh toán" },
];

const ACCOMMODATION_TYPES = ["Khách sạn", "Nhà nghỉ", "Homestay", "Resort", "Villa / Biệt thự du lịch", "Căn hộ du lịch", "Hostel", "Khác"];
const MAX_LOGO_BYTES = 750 * 1024;
const MAX_FLOORS = 200;
const MAX_ROOMS_PER_FLOOR = 200;

interface FloorRoom {
  id: string;
  name: string;
  number: string;
}

interface FloorInput {
  id: string;
  name: string;
  rooms: FloorRoom[];
}

interface BasicData {
  floorInputs: FloorInput[];
  info: {
    intro: string;
    logoDataUrl: string;
    logoFileName: string;
    website: string;
    ctvCode: string;
    accommodationType: string;
    location: { address: string; latitude: number | null; longitude: number | null; source: "ip" | "" };
  };
  owner: { fullName: string; idNumber: string; phone: string; email: string };
  payment: { bankName: string; accountNumber: string; accountHolder: string };
}

const FALLBACK: BasicData = {
  floorInputs: [],
  info: { intro: "", logoDataUrl: "", logoFileName: "", website: "", ctvCode: "", accommodationType: "", location: { address: "", latitude: null, longitude: null, source: "" } },
  owner: { fullName: "", idNumber: "", phone: "", email: "" },
  payment: { bankName: "", accountNumber: "", accountHolder: "" },
};

function normaliseBasicData(value: Partial<BasicData> | null | undefined): BasicData {
  const info = value?.info ?? FALLBACK.info;
  const location = info.location ?? FALLBACK.info.location;
  return {
    // Tương thích dữ liệu cũ chỉ lưu chuỗi "Tầng 1". Từ phiên này, mỗi tầng
    // có id ổn định, tên và danh sách phòng để người dùng quản lý trực tiếp.
    floorInputs: Array.isArray(value?.floorInputs)
      ? value.floorInputs
          .map((floor, index): FloorInput | null => {
            if (typeof floor === "string") return { id: `legacy-floor-${index + 1}`, name: floor, rooms: [] };
            if (!floor || typeof floor !== "object") return null;
            const candidate = floor as Partial<FloorInput>;
            return {
              id: typeof candidate.id === "string" && candidate.id ? candidate.id : `legacy-floor-${index + 1}`,
              name: typeof candidate.name === "string" ? candidate.name : `Tầng ${index + 1}`,
              rooms: Array.isArray(candidate.rooms)
                ? candidate.rooms
                    .map((room, roomIndex): FloorRoom | null => {
                      if (!room || typeof room !== "object") return null;
                      const roomCandidate = room as Partial<FloorRoom>;
                      return {
                        id: typeof roomCandidate.id === "string" && roomCandidate.id ? roomCandidate.id : `legacy-room-${index + 1}-${roomIndex + 1}`,
                        name: typeof roomCandidate.name === "string" ? roomCandidate.name : "",
                        number: typeof roomCandidate.number === "string" ? roomCandidate.number : "",
                      };
                    })
                    .filter((room): room is FloorRoom => room !== null)
                : [],
            };
          })
          .filter((floor): floor is FloorInput => floor !== null)
      : [],
    info: {
      intro: info.intro ?? "", logoDataUrl: info.logoDataUrl ?? "", logoFileName: info.logoFileName ?? "", website: info.website ?? "", ctvCode: info.ctvCode ?? "", accommodationType: info.accommodationType ?? "",
      location: { address: location.address ?? "", latitude: typeof location.latitude === "number" ? location.latitude : null, longitude: typeof location.longitude === "number" ? location.longitude : null, source: location.source === "ip" ? "ip" : "" },
    },
    owner: { ...FALLBACK.owner, ...(value?.owner ?? {}) },
    payment: { ...FALLBACK.payment, ...(value?.payment ?? {}) },
  };
}

function newId(prefix: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createFloor(index: number): FloorInput {
  return { id: newId("floor"), name: `Tầng ${index + 1}`, rooms: [] };
}

export default function BasicPage() {
  const [tab, setTab] = useState<Tab>("info");
  const { data, loading, saving, error, savedAt, save } = useSettings<BasicData>("basic", FALLBACK);
  const [form, setForm] = useState<BasicData>(FALLBACK);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!loading) setForm(normaliseBasicData(data));
  }, [loading, data]);

  const mapSrc = useMemo(() => {
    const { address, latitude, longitude } = form.info.location;
    const query = latitude !== null && longitude !== null ? `${latitude},${longitude}` : address;
    return query ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed` : null;
  }, [form.info.location]);

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setLogoError("Vui lòng chọn tệp ảnh PNG, JPG hoặc WebP.");
    if (file.size > MAX_LOGO_BYTES) return setLogoError("Ảnh logo tối đa 750 KB để lưu an toàn vào cơ sở dữ liệu.");

    const reader = new FileReader();
    reader.onload = () => {
      const logoDataUrl = reader.result;
      if (typeof logoDataUrl !== "string") return;
      setForm((current) => ({ ...current, info: { ...current.info, logoDataUrl, logoFileName: file.name } }));
      setLogoError(null);
    };
    reader.onerror = () => setLogoError("Không thể đọc tệp ảnh. Vui lòng thử lại.");
    reader.readAsDataURL(file);
  }

  function setFloorCount(rawValue: string) {
    const number = Number(rawValue);
    const count = Number.isFinite(number) ? Math.min(MAX_FLOORS, Math.max(0, Math.trunc(number))) : 0;
    setForm((current) => {
      if (count >= current.floorInputs.length) {
        return { ...current, floorInputs: [...current.floorInputs, ...Array.from({ length: count - current.floorInputs.length }, (_, index) => createFloor(current.floorInputs.length + index))] };
      }
      const removed = current.floorInputs.slice(count);
      if (removed.some((floor) => floor.rooms.length > 0) && !window.confirm("Giảm số lượng tầng sẽ xóa sơ đồ phòng của các tầng cuối. Bạn có muốn tiếp tục?")) return current;
      return { ...current, floorInputs: current.floorInputs.slice(0, count) };
    });
  }

  function addFloor() {
    setForm((current) => ({ ...current, floorInputs: [...current.floorInputs, createFloor(current.floorInputs.length)] }));
  }

  function removeFloor(floorId: string) {
    setForm((current) => {
      const floor = current.floorInputs.find((item) => item.id === floorId);
      if (!floor) return current;
      if (floor.rooms.length > 0 && !window.confirm(`Xóa ${floor.name || "tầng này"} sẽ xóa ${floor.rooms.length} phòng trong sơ đồ. Bạn có muốn tiếp tục?`)) return current;
      return { ...current, floorInputs: current.floorInputs.filter((item) => item.id !== floorId) };
    });
  }

  function updateFloorName(floorId: string, name: string) {
    setForm((current) => ({ ...current, floorInputs: current.floorInputs.map((floor) => (floor.id === floorId ? { ...floor, name } : floor)) }));
  }

  function addRoom(floorId: string) {
    setForm((current) => ({
      ...current,
      floorInputs: current.floorInputs.map((floor) =>
        floor.id === floorId && floor.rooms.length < MAX_ROOMS_PER_FLOOR ? { ...floor, rooms: [...floor.rooms, { id: newId("room"), name: "", number: "" }] } : floor
      ),
    }));
  }

  function updateRoom(floorId: string, roomId: string, field: "name" | "number", value: string) {
    setForm((current) => ({
      ...current,
      floorInputs: current.floorInputs.map((floor) =>
        floor.id === floorId ? { ...floor, rooms: floor.rooms.map((room) => (room.id === roomId ? { ...room, [field]: value } : room)) } : floor
      ),
    }));
  }

  function removeRoom(floorId: string, roomId: string) {
    setForm((current) => ({
      ...current,
      floorInputs: current.floorInputs.map((floor) => (floor.id === floorId ? { ...floor, rooms: floor.rooms.filter((room) => room.id !== roomId) } : floor)),
    }));
  }

  async function detectLocationByIp() {
    setLocating(true);
    setLocationError(null);
    try {
      const result = await api.get<{ address: string; latitude: number; longitude: number; source: "ip" }>("/api/v1/location/by-ip");
      setForm((current) => ({ ...current, info: { ...current.info, location: result } }));
    } catch {
      setLocationError("Không lấy được vị trí từ IP. Vui lòng thử lại sau.");
    } finally {
      setLocating(false);
    }
  }

  async function handleSave() {
    const incompleteRoom = form.floorInputs.flatMap((floor) => floor.rooms.map((room) => ({ floor, room }))).find(({ room }) => !room.name.trim() || !room.number.trim());
    if (incompleteRoom) {
      setLayoutError(`Nhập đủ tên và số cho phòng ở ${incompleteRoom.floor.name || "tầng chưa đặt tên"} trước khi lưu.`);
      return;
    }
    setLayoutError(null);
    try {
      await save(normaliseBasicData(form));
    } catch {
      // Thông báo lỗi đã được useSettings hiển thị trong giao diện.
    }
  }

  return (
    <div>
      <Link href="/branches" className="mb-4 flex items-center gap-3 text-[#23262F]"><span className="text-[18px]">←</span><h1 className="m-0 text-[20px] font-bold">Tên cơ sở</h1></Link>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-6 flex gap-7 border-b border-pms-border text-[14px]">
          {TABS.map((item) => <button key={item.key} type="button" className="cursor-pointer border-0 bg-transparent pb-3 font-semibold" style={{ color: tab === item.key ? "#284AB1" : "#777E90", borderBottom: `2px solid ${tab === item.key ? "#284AB1" : "transparent"}` }} onClick={() => setTab(item.key)}>{item.label}</button>)}
        </div>

        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
        {!loading && error && <p className="mb-4 text-[13px] text-pms-danger">{error}</p>}
        {!loading && layoutError && <p className="mb-4 text-[13px] text-pms-danger">{layoutError}</p>}
        {!loading && savedAt && !error && <p className="mb-4 text-[13px] text-[#00A844]">Đã lưu vào cơ sở dữ liệu.</p>}

        {!loading && tab === "info" && <div className="flex max-w-[900px] flex-col gap-5">
          <Row label="Giới thiệu" tall><textarea value={form.info.intro} onChange={(event) => setForm((current) => ({ ...current, info: { ...current.info, intro: event.target.value } }))} className="min-h-[80px] w-full rounded-lg border border-pms-border p-3 text-[13px]" placeholder="Giới thiệu cơ sở" /></Row>
          <Row label="Logo cơ sở"><div className="flex flex-wrap items-center gap-3">
            {form.info.logoDataUrl ? <img src={form.info.logoDataUrl} alt="Logo cơ sở" className="h-14 w-14 rounded-lg border border-pms-border object-contain p-1" /> : <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-pms-border text-[11px] text-pms-muted">Chưa có logo</span>}
            <label className="cursor-pointer rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-text hover:bg-pms-divider">Chọn ảnh<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleLogoChange} /></label>
            {form.info.logoFileName && <span className="text-[12px] text-pms-muted">{form.info.logoFileName}</span>}
            {form.info.logoDataUrl && <button type="button" className="text-[12px] text-pms-danger" onClick={() => setForm((current) => ({ ...current, info: { ...current.info, logoDataUrl: "", logoFileName: "" } }))}>Xóa ảnh</button>}
            {logoError && <span className="w-full text-[12px] text-pms-danger">{logoError}</span>}
          </div></Row>
          <Row label="Website"><input value={form.info.website} onChange={(event) => setForm((current) => ({ ...current, info: { ...current.info, website: event.target.value } }))} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" placeholder="Địa chỉ website" /></Row>
          <Row label="Mã CTV"><input value={form.info.ctvCode} onChange={(event) => setForm((current) => ({ ...current, info: { ...current.info, ctvCode: event.target.value } }))} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" placeholder="Mã CTV nếu có" /></Row>
          <Row label="Tín ngưỡng tôn giáo"><SelectBox placeholder="Chọn tín ngưỡng tôn giáo" /></Row>
          <Row label="Hình thức cơ sở lưu trú"><SelectBox placeholder="Chọn hình thức cơ sở lưu trú" /></Row>
          <Row label="Phân loại cơ sở"><select value={form.info.accommodationType} onChange={(event) => setForm((current) => ({ ...current, info: { ...current.info, accommodationType: event.target.value } }))} className="w-full rounded-lg border border-pms-border bg-white px-3 py-2.5 text-[13px]"><option value="">Chọn loại cơ sở lưu trú</option>{ACCOMMODATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></Row>
          <Row label="Khu, phân khu"><SelectBox placeholder="Chọn khu, phân khu" /></Row>
          <Row label="Tòa nhà"><SelectBox placeholder="Tên tòa nhà" /></Row>
          <Row label="Số lượng tầng"><div className="flex flex-wrap items-center gap-3"><input aria-label="Số lượng tầng" type="number" min="0" max={MAX_FLOORS} value={form.floorInputs.length} onChange={(event) => setFloorCount(event.target.value)} className="w-28 rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /><button type="button" onClick={addFloor} disabled={form.floorInputs.length >= MAX_FLOORS} className="rounded-lg border border-pms-primary px-3 py-2.5 text-[13px] font-medium text-pms-primary disabled:cursor-not-allowed disabled:opacity-50">+ Thêm tầng</button><span className="text-[12px] text-pms-muted">Tối đa {MAX_FLOORS} tầng</span></div></Row>
          {form.floorInputs.length > 0 && <div className="grid grid-cols-[220px_1fr] gap-4"><span /><div className="space-y-3">
            {form.floorInputs.map((floor, floorIndex) => <div key={floor.id} className="rounded-lg border border-pms-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input aria-label={`Tên tầng ${floorIndex + 1}`} value={floor.name} onChange={(event) => updateFloorName(floor.id, event.target.value)} className="min-w-[180px] flex-1 rounded-md border border-pms-border px-2.5 py-2 text-[13px]" placeholder="Tên tầng" />
                <span className="text-[12px] text-pms-muted">{floor.rooms.length} phòng</span>
                <button type="button" onClick={() => addRoom(floor.id)} disabled={floor.rooms.length >= MAX_ROOMS_PER_FLOOR} className="rounded-md border border-pms-primary px-2.5 py-2 text-[12px] font-medium text-pms-primary disabled:opacity-50">+ Thêm phòng</button>
                <button type="button" onClick={() => removeFloor(floor.id)} className="rounded-md px-2.5 py-2 text-[12px] font-medium text-pms-danger">Xóa tầng</button>
              </div>
              {floor.rooms.length > 0 && <div className="mt-3 space-y-2 border-t border-pms-border pt-3">
                {floor.rooms.map((room, roomIndex) => <div key={room.id} className="grid grid-cols-[1fr_140px_auto] gap-2">
                  <input aria-label={`Tên phòng ${floorIndex + 1}-${roomIndex + 1}`} value={room.name} onChange={(event) => updateRoom(floor.id, room.id, "name", event.target.value)} className="rounded-md border border-pms-border px-2.5 py-2 text-[13px]" placeholder="Tên phòng" />
                  <input aria-label={`Số phòng ${floorIndex + 1}-${roomIndex + 1}`} value={room.number} onChange={(event) => updateRoom(floor.id, room.id, "number", event.target.value)} className="rounded-md border border-pms-border px-2.5 py-2 text-[13px]" placeholder="Số phòng" />
                  <button type="button" aria-label={`Xóa phòng ${floorIndex + 1}-${roomIndex + 1}`} onClick={() => removeRoom(floor.id, room.id)} className="px-2 text-[12px] text-pms-danger">Xóa</button>
                </div>)}
              </div>}
            </div>)}
          </div></div>}
          <Row label="Ngôn ngữ"><SelectBox placeholder="Chọn ngôn ngữ" /></Row>
          <Row label="Vị trí" tall><div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={detectLocationByIp} disabled={locating} className="rounded-lg border border-pms-primary px-3 py-2.5 text-[13px] font-medium text-pms-primary disabled:cursor-wait disabled:opacity-60">{locating ? "Đang lấy vị trí..." : "Lấy vị trí theo IP"}</button>{form.info.location.address && <span className="text-[12px] text-pms-muted">{form.info.location.address}</span>}</div>
            <p className="text-[12px] text-pms-muted">Vị trí theo IP chỉ có độ chính xác ở mức thành phố/khu vực và chỉ được lấy khi bạn bấm nút.</p>
            {locationError && <p className="text-[12px] text-pms-danger">{locationError}</p>}
            {mapSrc ? <iframe title="Bản đồ vị trí cơ sở" src={mapSrc} className="h-[260px] w-full rounded-[10px] border border-pms-border" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="flex h-[180px] items-center justify-center gap-1.5 rounded-[10px] border border-pms-border bg-pms-divider text-[12px] text-pms-muted">📍 Chưa lấy vị trí cơ sở</div>}
          </div></Row>
          <SaveButton saving={saving} onClick={handleSave} />
        </div>}

        {!loading && tab === "owner" && <div className="flex max-w-[900px] flex-col gap-5">
          <Row label="Họ tên chủ sở hữu"><input value={form.owner.fullName} onChange={(event) => setForm((current) => ({ ...current, owner: { ...current.owner, fullName: event.target.value } }))} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" placeholder="Họ tên" /></Row>
          <Row label="Số CMND/CCCD"><input value={form.owner.idNumber} onChange={(event) => setForm((current) => ({ ...current, owner: { ...current.owner, idNumber: event.target.value } }))} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" placeholder="Số giấy tờ" /></Row>
          <Row label="Số điện thoại"><input value={form.owner.phone} onChange={(event) => setForm((current) => ({ ...current, owner: { ...current.owner, phone: event.target.value } }))} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" placeholder="Số điện thoại" /></Row>
          <Row label="Email"><input type="email" value={form.owner.email} onChange={(event) => setForm((current) => ({ ...current, owner: { ...current.owner, email: event.target.value } }))} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" placeholder="Email" /></Row>
          <SaveButton saving={saving} onClick={handleSave} />
        </div>}

        {!loading && tab === "payment" && <div className="flex max-w-[900px] flex-col gap-5">
          <Row label="Ngân hàng"><input value={form.payment.bankName} onChange={(event) => setForm((current) => ({ ...current, payment: { ...current.payment, bankName: event.target.value } }))} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" placeholder="Tên ngân hàng" /></Row>
          <Row label="Số tài khoản"><input inputMode="numeric" value={form.payment.accountNumber} onChange={(event) => setForm((current) => ({ ...current, payment: { ...current.payment, accountNumber: event.target.value } }))} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" placeholder="Số tài khoản" /></Row>
          <Row label="Chủ tài khoản"><input value={form.payment.accountHolder} onChange={(event) => setForm((current) => ({ ...current, payment: { ...current.payment, accountHolder: event.target.value } }))} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" placeholder="Tên chủ tài khoản" /></Row>
          <SaveButton saving={saving} onClick={handleSave} />
        </div>}
      </div>
    </div>
  );
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return <button type="button" disabled={saving} className="w-[140px] rounded-lg bg-pms-primary p-3 text-center text-[14px] font-semibold text-white disabled:cursor-wait disabled:opacity-60" onClick={onClick}>{saving ? "Đang lưu..." : "Cập nhật"}</button>;
}

function Row({ label, tall, children }: { label: string; tall?: boolean; children: React.ReactNode }) {
  return <div className={`grid grid-cols-[220px_1fr] gap-4 ${tall ? "" : "items-center"}`}><label className={`text-[13px] ${tall ? "pt-2.5" : ""}`}>{label}</label>{children}</div>;
}

function SelectBox({ placeholder }: { placeholder: string }) {
  return <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">{placeholder} <span>⌄</span></div>;
}
