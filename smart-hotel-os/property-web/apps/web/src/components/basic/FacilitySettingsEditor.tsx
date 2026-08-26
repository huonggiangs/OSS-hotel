"use client";

import { useEffect, useMemo, useState } from "react";
import { api, isApiError } from "@/lib/api-client";
import { useSettings } from "@/lib/useSettings";

type LanguageMode = "DEFAULT" | "BROWSER" | "IP";

interface Building {
  id: string;
  name: string;
}

interface Zone {
  id: string;
  name: string;
  buildingId: string;
  parentId: string;
}

interface FacilitySettings {
  accommodationForm: string;
  religion: string;
  language: string;
  languageMode: LanguageMode;
  buildings: Building[];
  zones: Zone[];
}

interface ApiRoom {
  id: string;
  room_type_id: string;
  room_type_name: string;
  number: string;
  floor: string;
  zone: string;
  status: string;
}
interface RoomTypeOption { id: string; name: string; status: "ACTIVE" | "INACTIVE"; }

const ACCOMMODATION_FORMS = ["Khách sạn", "Nhà nghỉ", "Homestay", "Resort", "Villa / Biệt thự du lịch", "Căn hộ du lịch", "Hostel", "Khác"];
const RELIGIONS = ["Không xác định", "Phật giáo", "Công giáo", "Tin Lành", "Hồi giáo", "Cao Đài", "Hòa Hảo", "Khác"];
const LANGUAGES = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
];

const FALLBACK: FacilitySettings = {
  accommodationForm: "",
  religion: "Không xác định",
  language: "vi",
  languageMode: "DEFAULT",
  buildings: [],
  zones: [],
};

function newId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalise(input: Partial<FacilitySettings> | null | undefined): FacilitySettings {
  return {
    accommodationForm: typeof input?.accommodationForm === "string" ? input.accommodationForm : "",
    religion: typeof input?.religion === "string" ? input.religion : "Không xác định",
    language: typeof input?.language === "string" ? input.language : "vi",
    languageMode: input?.languageMode === "BROWSER" || input?.languageMode === "IP" ? input.languageMode : "DEFAULT",
    buildings: Array.isArray(input?.buildings)
      ? input.buildings.filter((item): item is Building => !!item && typeof item.id === "string" && typeof item.name === "string")
      : [],
    zones: Array.isArray(input?.zones)
      ? input.zones
          .filter((item): item is Zone => !!item && typeof item.id === "string" && typeof item.name === "string")
          .map((item) => ({ ...item, buildingId: item.buildingId ?? "", parentId: item.parentId ?? "" }))
      : [],
  };
}

export function FacilitySettingsEditor() {
  const { data, loading, saving, error, save } = useSettings<FacilitySettings>("facility", FALLBACK);
  const [form, setForm] = useState<FacilitySettings>(FALLBACK);
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newBuilding, setNewBuilding] = useState("");
  const [newZone, setNewZone] = useState("");
  const [newZoneBuilding, setNewZoneBuilding] = useState("");
  const [newZoneParent, setNewZoneParent] = useState("");
  const [newFloor, setNewFloor] = useState("");
  const [newRoomNumbers, setNewRoomNumbers] = useState("");
  const [newRoomZone, setNewRoomZone] = useState("");
  const [newRoomTypeId, setNewRoomTypeId] = useState("");

  async function loadRooms() {
    const response = await api.get<{ items: ApiRoom[] }>("/api/v1/rooms");
    setRooms(response.items);
  }

  useEffect(() => {
    if (!loading) setForm(normalise(data));
  }, [data, loading]);

  useEffect(() => {
    void Promise.all([
      loadRooms(),
      api.get<{ items: RoomTypeOption[] }>("/api/v1/room-types").then((response) => {
        const active = response.items.filter((item) => item.status === "ACTIVE");
        setRoomTypes(active);
        setNewRoomTypeId((current) => current || active[0]?.id || "");
      }),
    ]).catch(() => setActionError("Không tải được dữ liệu sơ đồ phòng."));
  }, []);

  const floors = useMemo(() => {
    const grouped = new Map<string, ApiRoom[]>();
    rooms.forEach((room) => grouped.set(room.floor, [...(grouped.get(room.floor) ?? []), room]));
    return Array.from(grouped.entries())
      .sort(([left], [right]) => left.localeCompare(right, "vi", { numeric: true }))
      .map(([name, items]) => ({ name, rooms: items.sort((left, right) => left.number.localeCompare(right.number, "vi", { numeric: true })) }));
  }, [rooms]);

  function addBuilding() {
    const name = newBuilding.trim();
    if (!name) return;
    if (form.buildings.some((building) => building.name.localeCompare(name, "vi", { sensitivity: "accent" }) === 0)) {
      return setActionError("Tên tòa nhà đã tồn tại.");
    }
    setForm((current) => ({ ...current, buildings: [...current.buildings, { id: newId("building"), name }] }));
    setNewBuilding("");
    setActionError(null);
  }

  function removeBuilding(id: string) {
    if (form.zones.some((zone) => zone.buildingId === id)) {
      return setActionError("Không thể xóa tòa nhà đang có khu/phân khu. Hãy chuyển hoặc xóa khu trước.");
    }
    setForm((current) => ({ ...current, buildings: current.buildings.filter((building) => building.id !== id) }));
  }

  function addZone() {
    const name = newZone.trim();
    if (!name) return setActionError("Nhập tên khu hoặc phân khu.");
    if (form.zones.some((zone) => zone.name.localeCompare(name, "vi", { sensitivity: "accent" }) === 0)) {
      return setActionError("Tên khu/phân khu đã tồn tại.");
    }
    setForm((current) => ({ ...current, zones: [...current.zones, { id: newId("zone"), name, buildingId: newZoneBuilding, parentId: newZoneParent }] }));
    setNewZone("");
    setNewZoneParent("");
    setActionError(null);
  }

  function removeZone(id: string) {
    const zone = form.zones.find((item) => item.id === id);
    if (!zone) return;
    if (rooms.some((room) => room.zone === zone.name)) {
      return setActionError(`Không thể xóa "${zone.name}" vì đang có phòng sử dụng. Hãy đổi khu của phòng trước.`);
    }
    if (form.zones.some((item) => item.parentId === id)) {
      return setActionError("Không thể xóa khu đang có phân khu con.");
    }
    setForm((current) => ({ ...current, zones: current.zones.filter((item) => item.id !== id) }));
  }

  async function saveFacility() {
    const cleaned = normalise({
      ...form,
      buildings: form.buildings.map((building) => ({ ...building, name: building.name.trim() })).filter((building) => building.name),
      zones: form.zones.map((zone) => ({ ...zone, name: zone.name.trim() })).filter((zone) => zone.name),
    });
    const duplicateZone = cleaned.zones.find((zone, index) => cleaned.zones.findIndex((candidate) => candidate.name.localeCompare(zone.name, "vi", { sensitivity: "accent" }) === 0) !== index);
    if (duplicateZone) return setActionError(`Tên khu/phân khu "${duplicateZone.name}" bị trùng.`);

    const previousZones = new Map(normalise(data).zones.map((zone) => [zone.id, zone]));
    const renamed = cleaned.zones.filter((zone) => {
      const previous = previousZones.get(zone.id);
      return previous && previous.name !== zone.name;
    });
    try {
      for (const zone of renamed) {
        const previous = previousZones.get(zone.id)!;
        const affected = rooms.filter((room) => room.zone === previous.name);
        if (affected.length > 0) {
          await Promise.all(affected.map((room) => api.patch(`/api/v1/rooms/${room.id}`, { zone: zone.name })));
        }
      }
      await save(cleaned);
      await loadRooms();
      setActionError(null);
    } catch (err) {
      setActionError(isApiError(err) ? err.message : "Không thể lưu cấu hình cơ sở.");
    }
  }

  async function editRoom(room: ApiRoom) {
    const number = window.prompt("Số phòng", room.number)?.trim();
    if (!number) return;
    const floor = window.prompt("Tầng", room.floor)?.trim();
    if (!floor) return;
    const zone = window.prompt("Khu / phân khu", room.zone)?.trim();
    if (!zone) return;
    try {
      await api.patch(`/api/v1/rooms/${room.id}`, { number, floor, zone });
      await loadRooms();
      setActionError(null);
    } catch (err) {
      setActionError(isApiError(err) ? err.message : "Không thể sửa phòng.");
    }
  }

  async function deleteRoom(room: ApiRoom) {
    if (!window.confirm(`Xóa phòng ${room.number}? Phòng có lịch sử đặt phòng hoặc đang có khách sẽ được bảo vệ.`)) return;
    try {
      await api.delete(`/api/v1/rooms/${room.id}`);
      await loadRooms();
      setActionError(null);
    } catch (err) {
      setActionError(isApiError(err) ? err.message : "Không thể xóa phòng.");
    }
  }

  async function renameFloor(floor: string) {
    const nextFloor = window.prompt("Tên tầng mới", floor)?.trim();
    if (!nextFloor || nextFloor === floor) return;
    const affected = rooms.filter((room) => room.floor === floor);
    try {
      await Promise.all(affected.map((room) => api.patch(`/api/v1/rooms/${room.id}`, { floor: nextFloor })));
      await loadRooms();
      setActionError(null);
    } catch (err) {
      setActionError(isApiError(err) ? err.message : "Không thể đổi tên tầng.");
    }
  }

  async function deleteFloor(floor: string) {
    const affected = rooms.filter((room) => room.floor === floor);
    if (!window.confirm(`Xóa tầng ${floor} và ${affected.length} phòng? Các phòng có khách hoặc lịch sử đặt phòng sẽ không bị xóa.`)) return;
    try {
      await Promise.all(affected.map((room) => api.delete(`/api/v1/rooms/${room.id}`)));
      await loadRooms();
      setActionError(null);
    } catch (err) {
      setActionError(isApiError(err) ? err.message : "Không thể xóa tầng vì có phòng đang được bảo vệ.");
    }
  }

  async function addRoomsQuickly() {
    const floor = newFloor.trim();
    const numbers = Array.from(new Set(newRoomNumbers.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean)));
    if (!floor || numbers.length === 0 || !newRoomZone || !newRoomTypeId) {
      return setActionError("Chọn tầng, khu/phân khu, loại phòng và nhập ít nhất một số phòng.");
    }
    try {
      await api.post("/api/v1/rooms/batch", { floor, zone: newRoomZone, roomTypeId: newRoomTypeId, numbers });
      setNewFloor("");
      setNewRoomNumbers("");
      await loadRooms();
      setActionError(null);
    } catch (err) {
      setActionError(isApiError(err) ? err.message : "Không thể thêm nhanh phòng.");
    }
  }

  if (loading) return <p className="text-[13px] text-pms-muted">Đang tải cấu hình cơ sở...</p>;

  return (
    <div className="space-y-5">
      {(error || actionError) && <p className="m-0 text-[12px] text-pms-danger">{actionError ?? error}</p>}
      <section className="rounded-lg border border-pms-border p-3.5">
        <div className="mb-3 text-[13px] font-semibold">Thông tin vận hành</div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Hình thức cơ sở lưu trú"><select value={form.accommodationForm} onChange={(event) => setForm((current) => ({ ...current, accommodationForm: event.target.value }))} className="input"><option value="">Chọn hình thức</option>{ACCOMMODATION_FORMS.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Tín ngưỡng tôn giáo"><select value={form.religion} onChange={(event) => setForm((current) => ({ ...current, religion: event.target.value }))} className="input">{RELIGIONS.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Ngôn ngữ mặc định"><select value={form.language} onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))} className="input">{LANGUAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          <Field label="Cách chọn ngôn ngữ"><select value={form.languageMode} onChange={(event) => setForm((current) => ({ ...current, languageMode: event.target.value as LanguageMode }))} className="input"><option value="DEFAULT">Luôn dùng ngôn ngữ mặc định</option><option value="BROWSER">Tự chọn theo trình duyệt khách</option><option value="IP">Tự chọn theo quốc gia/IP khách</option></select></Field>
        </div>
        <p className="mb-0 mt-2 text-[11px] text-pms-muted">Tùy chọn tự động được lưu theo cơ sở; IP chỉ dùng để chọn ngôn ngữ, không lưu địa chỉ IP khách.</p>
      </section>

      <section className="rounded-lg border border-pms-border p-3.5">
        <div className="mb-3 text-[13px] font-semibold">Tòa nhà</div>
        <div className="mb-3 flex gap-2"><input value={newBuilding} onChange={(event) => setNewBuilding(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addBuilding()} placeholder="Tên tòa nhà" className="input flex-1" /><button type="button" onClick={addBuilding} className="button">+ Thêm</button></div>
        <div className="space-y-2">{form.buildings.map((building) => <div key={building.id} className="flex gap-2"><input value={building.name} onChange={(event) => setForm((current) => ({ ...current, buildings: current.buildings.map((item) => item.id === building.id ? { ...item, name: event.target.value } : item) }))} className="input flex-1" /><button type="button" onClick={() => removeBuilding(building.id)} className="delete">Xóa</button></div>)}</div>
      </section>

      <section className="rounded-lg border border-pms-border p-3.5">
        <div className="mb-3 text-[13px] font-semibold">Khu, phân khu</div>
        <div className="grid gap-2 md:grid-cols-4"><input value={newZone} onChange={(event) => setNewZone(event.target.value)} placeholder="Tên khu / phân khu" className="input" /><select value={newZoneBuilding} onChange={(event) => setNewZoneBuilding(event.target.value)} className="input"><option value="">Không gán tòa nhà</option>{form.buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select><select value={newZoneParent} onChange={(event) => setNewZoneParent(event.target.value)} className="input"><option value="">Là khu chính</option>{form.zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select><button type="button" onClick={addZone} className="button">+ Thêm</button></div>
        <div className="mt-3 space-y-2">{form.zones.map((zone) => <div key={zone.id} className="grid gap-2 md:grid-cols-[1fr_180px_180px_55px]"><input value={zone.name} onChange={(event) => setForm((current) => ({ ...current, zones: current.zones.map((item) => item.id === zone.id ? { ...item, name: event.target.value } : item) }))} className="input" /><select value={zone.buildingId} onChange={(event) => setForm((current) => ({ ...current, zones: current.zones.map((item) => item.id === zone.id ? { ...item, buildingId: event.target.value } : item) }))} className="input"><option value="">Không gán tòa nhà</option>{form.buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select><select value={zone.parentId} onChange={(event) => setForm((current) => ({ ...current, zones: current.zones.map((item) => item.id === zone.id ? { ...item, parentId: event.target.value } : item) }))} className="input"><option value="">Khu chính</option>{form.zones.filter((item) => item.id !== zone.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" onClick={() => removeZone(zone.id)} className="delete">Xóa</button></div>)}</div>
      </section>

      <section className="rounded-lg border border-pms-border p-3.5">
        <div className="mb-1 text-[13px] font-semibold">Sơ đồ tầng &amp; phòng</div>
        <p className="mt-0 text-[11px] text-pms-muted">Sửa/xóa trực tiếp cập nhật dữ liệu Phòng &amp; giá và Trạng thái phòng. Xóa bị chặn khi phòng đang có khách hoặc có lịch sử đặt phòng.</p>
        <div className="mb-3 grid gap-2 rounded-md bg-pms-primary-soft/25 p-3 md:grid-cols-[110px_1fr_1fr_1fr_auto]"><input value={newFloor} onChange={(event) => setNewFloor(event.target.value)} placeholder="Tầng" className="input" /><input value={newRoomNumbers} onChange={(event) => setNewRoomNumbers(event.target.value)} placeholder="Số phòng: 401, 402" className="input" /><select value={newRoomZone} onChange={(event) => setNewRoomZone(event.target.value)} className="input"><option value="">Chọn khu / phân khu</option>{form.zones.map((zone) => <option key={zone.id} value={zone.name}>{zone.name}</option>)}</select><select value={newRoomTypeId} onChange={(event) => setNewRoomTypeId(event.target.value)} className="input"><option value="">Chọn loại phòng</option>{roomTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" onClick={addRoomsQuickly} className="button">+ Thêm nhanh</button></div>
        <div className="space-y-2">{floors.map((floor) => <div key={floor.name} className="rounded-md border border-pms-divider p-2.5"><div className="flex items-center justify-between gap-2"><b className="text-[12.5px]">Tầng {floor.name} <span className="font-normal text-pms-muted">({floor.rooms.length} phòng)</span></b><span className="flex gap-2 text-[11.5px]"><button type="button" onClick={() => renameFloor(floor.name)} className="text-pms-primary">Sửa tầng</button><button type="button" onClick={() => deleteFloor(floor.name)} className="text-pms-danger">Xóa tầng</button></span></div><div className="mt-2 flex flex-wrap gap-2">{floor.rooms.map((room) => <div key={room.id} className="flex items-center gap-1 rounded bg-pms-divider px-2 py-1 text-[11.5px]"><span>{room.number} · {room.room_type_name} · {room.zone}</span><button type="button" onClick={() => editRoom(room)} className="text-pms-primary">Sửa</button><button type="button" onClick={() => deleteRoom(room)} className="text-pms-danger">×</button></div>)}</div></div>)}</div>
      </section>

      <button type="button" disabled={saving} onClick={saveFacility} className="button disabled:opacity-60">{saving ? "Đang lưu..." : "Lưu cài đặt cơ sở"}</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-[12px]"><span className="mb-1 block text-pms-muted">{label}</span>{children}</label>;
}
