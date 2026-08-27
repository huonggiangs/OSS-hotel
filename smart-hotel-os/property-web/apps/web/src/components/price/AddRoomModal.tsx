"use client";

import { useEffect, useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { api, isApiError } from "@/lib/api-client";
import type { ApiRoom, ApiRoomType } from "@/app/(pms)/price/page";

const STATUS_OPTIONS: { value: ApiRoom["status"]; label: string }[] = [
  { value: "VACANT", label: "Đang mở" },
  { value: "OCCUPIED", label: "Đã đặt" },
  { value: "DIRTY", label: "Chờ xử lý" },
  { value: "MAINTENANCE", label: "Ngừng hoạt động" },
];

type DeviceControlKind =
  | "POWER_METER"
  | "POWER_SWITCH"
  | "LIGHTING_CONTROLLER"
  | "AC_CONTROLLER"
  | "DOOR_LOCK"
  | "CARD_DISPENSER"
  | "ANNOUNCEMENT_SPEAKER"
  | "SMART_TV"
  | "OTHER";
type DeviceStatus = "ONLINE" | "OFFLINE" | "ERROR";

interface RoomDevice {
  id: string;
  name: string;
  external_id: string | null;
  control_kind: DeviceControlKind;
  status: DeviceStatus;
  power_on: boolean;
}

const DEVICE_KINDS: { value: DeviceControlKind; label: string; icon: string }[] = [
  { value: "POWER_METER", label: "Công tơ đo điện", icon: "⚡" },
  { value: "LIGHTING_CONTROLLER", label: "Điều khiển ánh sáng", icon: "💡" },
  { value: "DOOR_LOCK", label: "Khóa thông minh", icon: "🔐" },
  { value: "CARD_DISPENSER", label: "Bộ cấp / thu hồi thẻ", icon: "🪪" },
  { value: "ANNOUNCEMENT_SPEAKER", label: "Loa thông báo", icon: "🔊" },
  { value: "SMART_TV", label: "Smart TV", icon: "📺" },
  { value: "AC_CONTROLLER", label: "Điều khiển điều hòa", icon: "❄️" },
  { value: "POWER_SWITCH", label: "Công tắc nguồn", icon: "⏻" },
  { value: "OTHER", label: "Thiết bị khác", icon: "🔌" },
];
const DEVICE_STATUS_LABEL: Record<DeviceStatus, string> = { ONLINE: "Trực tuyến", OFFLINE: "Ngoại tuyến", ERROR: "Lỗi" };

function kindLabel(kind: DeviceControlKind) {
  return DEVICE_KINDS.find((item) => item.value === kind) ?? DEVICE_KINDS.at(-1)!;
}

// Thiết bị được lưu trong bảng devices, không còn là các dòng minh họa tĩnh.
export function AddRoomModal({
  onClose,
  onSaved,
  floors,
  zones,
  initial,
}: {
  onClose: () => void;
  onSaved: () => void;
  floors: string[];
  zones: string[];
  initial?: ApiRoom;
}) {
  const isEdit = !!initial;
  const [number, setNumber] = useState(initial?.number ?? "");
  const [floor, setFloor] = useState(initial?.floor ?? floors[0] ?? "");
  const [zone, setZone] = useState(initial?.zone ?? zones[0] ?? "");
  const [roomTypeId, setRoomTypeId] = useState(initial?.room_type_id ?? "");
  const [status, setStatus] = useState<ApiRoom["status"]>(initial?.status ?? "VACANT");
  const [note, setNote] = useState(initial?.note ?? "");
  const [roomTypes, setRoomTypes] = useState<ApiRoomType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [devices, setDevices] = useState<RoomDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(Boolean(initial));
  const [deviceKind, setDeviceKind] = useState<DeviceControlKind>("POWER_METER");
  const [deviceName, setDeviceName] = useState("");
  const [deviceExternalId, setDeviceExternalId] = useState("");
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>("OFFLINE");
  const [devicePowerOn, setDevicePowerOn] = useState(false);
  const [savingDevice, setSavingDevice] = useState(false);
  const [changingDeviceId, setChangingDeviceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ items: ApiRoomType[] }>("/api/v1/room-types")
      .then((res) => {
        setRoomTypes(res.items);
        if (!roomTypeId && res.items[0]) setRoomTypeId(res.items[0].id);
      })
      .catch(() => setError("Không tải được danh sách loại phòng."))
      .finally(() => setLoadingTypes(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDevices() {
    if (!initial) return;
    setLoadingDevices(true);
    try {
      const response = await api.get<{ items: RoomDevice[] }>(`/api/v1/devices?roomId=${encodeURIComponent(initial.id)}`);
      setDevices(response.items);
      setDeviceError(null);
    } catch (err) {
      setDeviceError(isApiError(err) ? err.message : "Không tải được thiết bị của phòng.");
    } finally {
      setLoadingDevices(false);
    }
  }

  useEffect(() => {
    void loadDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    if (!number.trim()) return setError("Vui lòng nhập tên/số phòng.");
    if (!floor.trim()) return setError("Vui lòng chọn hoặc nhập tầng.");
    if (!roomTypeId) return setError("Vui lòng chọn loại phòng.");
    if (!zone.trim()) return setError("Vui lòng chọn hoặc nhập khu/phân khu.");
    setSaving(true);
    setError(null);
    try {
      const body = { number: number.trim(), floor: floor.trim(), zone: zone.trim(), roomTypeId, status, note: note.trim() || undefined };
      if (isEdit && initial) await api.patch(`/api/v1/rooms/${initial.id}`, body);
      else await api.post("/api/v1/rooms", body);
      onSaved();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không lưu được phòng.");
    } finally {
      setSaving(false);
    }
  }

  async function addDevice() {
    if (!initial) return;
    if (!deviceName.trim()) return setDeviceError("Nhập tên hoặc mã nhận diện thiết bị.");
    setSavingDevice(true);
    setDeviceError(null);
    try {
      const device = await api.post<RoomDevice>("/api/v1/devices", {
        roomId: initial.id,
        controlKind: deviceKind,
        name: deviceName.trim(),
        externalId: deviceExternalId.trim() || undefined,
        status: deviceStatus,
        powerOn: devicePowerOn,
      });
      setDevices((current) => [...current, device]);
      setDeviceName("");
      setDeviceExternalId("");
      setDeviceStatus("OFFLINE");
      setDevicePowerOn(false);
    } catch (err) {
      setDeviceError(isApiError(err) ? err.message : "Không gán được thiết bị.");
    } finally {
      setSavingDevice(false);
    }
  }

  async function toggleDevicePower(device: RoomDevice) {
    const powerOn = !device.power_on;
    setChangingDeviceId(device.id);
    setDeviceError(null);
    try {
      const updated = await api.patch<RoomDevice>(`/api/v1/devices/${device.id}/power`, { powerOn });
      setDevices((current) => current.map((item) => (item.id === device.id ? updated : item)));
    } catch (err) {
      setDeviceError(isApiError(err) ? err.message : "Không thay đổi được trạng thái thiết bị.");
    } finally {
      setChangingDeviceId(null);
    }
  }

  async function removeDevice(device: RoomDevice) {
    if (!window.confirm(`Gỡ thiết bị "${device.name}" khỏi phòng ${initial?.number}?`)) return;
    setChangingDeviceId(device.id);
    setDeviceError(null);
    try {
      await api.delete(`/api/v1/devices/${device.id}`);
      setDevices((current) => current.filter((item) => item.id !== device.id));
    } catch (err) {
      setDeviceError(isApiError(err) ? err.message : "Không gỡ được thiết bị.");
    } finally {
      setChangingDeviceId(null);
    }
  }

  function changeDeviceKind(next: DeviceControlKind) {
    setDeviceKind(next);
    if (!deviceName) setDeviceName(kindLabel(next).label);
  }

  return (
    <Modal
      title={isEdit ? `Sửa phòng ${initial?.number}` : "Thêm phòng"}
      onClose={onClose}
      width={760}
      footer={<><ButtonGhost onClick={onClose}>Hủy</ButtonGhost><ButtonPrimary onClick={handleSave}>{saving ? "Đang lưu..." : "Lưu phòng"}</ButtonPrimary></>}
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        {error && <div className="rounded-lg bg-[#FDECEC] px-3 py-2 text-[12px] text-pms-danger">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tên / số phòng" required value={number} onChange={setNumber} placeholder="VD: 101" />
          <div><label className="mb-1.5 block text-[12px]">Trạng thái</label><select className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" value={status} onChange={(event) => setStatus(event.target.value as ApiRoom["status"])}>{STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="mb-1.5 block text-[12px]">Tầng</label><input className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary" list="floor-suggestions" value={floor} onChange={(event) => setFloor(event.target.value)} placeholder="VD: 1" /><datalist id="floor-suggestions">{floors.map((item) => <option key={item} value={item} />)}</datalist></div>
          <div><label className="mb-1.5 block text-[12px]">Loại phòng <span className="text-pms-danger">*</span></label><select className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" value={roomTypeId} onChange={(event) => setRoomTypeId(event.target.value)} disabled={loadingTypes}>{roomTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="mb-1.5 block text-[12px]">Khu / phân khu</label><input className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary" list="zone-suggestions" value={zone} onChange={(event) => setZone(event.target.value)} placeholder="VD: Khu A" /><datalist id="zone-suggestions">{zones.map((item) => <option key={item} value={item} />)}</datalist></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-[12px]">Mã phòng</label><AutoHint /></div><div><label className="mb-1.5 block text-[12px]">QR code</label><AutoHint /></div></div>
        </div>

        <div><label className="mb-1.5 block text-[12px]">Ghi chú nội bộ</label><textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-[64px] w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" placeholder="VD: Phòng gần thang máy, lưu ý bảo trì..." /></div>

        <section className="rounded-xl border border-pms-border p-3.5">
          <div className="mb-1 flex items-center justify-between"><b className="text-[13px]">Thiết bị điều khiển trong phòng</b>{isEdit && <span className="text-[11.5px] text-pms-muted">Gán riêng cho phòng {initial?.number}</span>}</div>
          {!isEdit ? <p className="m-0 text-[12px] text-pms-muted">Lưu phòng trước, sau đó mở “Sửa phòng” để gán công tơ, đèn, khóa, loa hoặc TV.</p> : <>
            {loadingDevices ? <p className="m-0 text-[12px] text-pms-muted">Đang tải thiết bị...</p> : <div className="space-y-2">{devices.length ? devices.map((device) => { const kind = kindLabel(device.control_kind); const busy = changingDeviceId === device.id; return <div key={device.id} className="flex items-center gap-2 rounded-lg bg-pms-divider/60 px-3 py-2"><span>{kind.icon}</span><div className="min-w-0 flex-1"><div className="truncate text-[12.5px] font-semibold">{device.name}</div><div className="text-[11px] text-pms-muted">{kind.label} · {DEVICE_STATUS_LABEL[device.status]}{device.external_id ? ` · ${device.external_id}` : ""}</div></div><button type="button" disabled={busy} onClick={() => void toggleDevicePower(device)} className={`rounded-md px-2 py-1 text-[11px] font-semibold ${device.power_on ? "bg-pms-primary text-white" : "border border-pms-border text-pms-muted"}`}>{device.power_on ? "Bật" : "Tắt"}</button><button type="button" disabled={busy} onClick={() => void removeDevice(device)} className="text-[11px] font-semibold text-pms-danger disabled:opacity-50">Gỡ</button></div>; }) : <p className="m-0 text-[12px] text-pms-muted">Chưa gán thiết bị nào.</p>}</div>}
            <div className="mt-3 rounded-lg border border-dashed border-pms-border p-3"><b className="text-[12px] text-pms-primary">Gán thiết bị</b><div className="mt-2 grid grid-cols-2 gap-2"><select value={deviceKind} onChange={(event) => changeDeviceKind(event.target.value as DeviceControlKind)} className="rounded-md border border-pms-border bg-white px-2.5 py-2 text-[12px]">{DEVICE_KINDS.map((item) => <option key={item.value} value={item.value}>{item.icon} {item.label}</option>)}</select><input value={deviceName} onChange={(event) => setDeviceName(event.target.value)} className="rounded-md border border-pms-border px-2.5 py-2 text-[12px]" placeholder="Tên / mã thiết bị" /><input value={deviceExternalId} onChange={(event) => setDeviceExternalId(event.target.value)} className="rounded-md border border-pms-border px-2.5 py-2 text-[12px]" placeholder="Mã kết nối (tuỳ chọn)" /><select value={deviceStatus} onChange={(event) => setDeviceStatus(event.target.value as DeviceStatus)} className="rounded-md border border-pms-border bg-white px-2.5 py-2 text-[12px]">{Object.entries(DEVICE_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><label className="mt-2 flex items-center gap-2 text-[12px]"><input type="checkbox" checked={devicePowerOn} onChange={(event) => setDevicePowerOn(event.target.checked)} />Bật nguồn khi gán</label><button type="button" disabled={savingDevice} onClick={() => void addDevice()} className="mt-2 rounded-md bg-pms-primary px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60">{savingDevice ? "Đang gán..." : "+ Gán thiết bị"}</button></div>
            {deviceError && <p className="mb-0 mt-2 text-[12px] text-pms-danger">{deviceError}</p>}
          </>}
        </section>
      </div>
    </Modal>
  );
}

function Field({ label, required, value, onChange, placeholder }: { label: string; required?: boolean; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div><label className="mb-1.5 block text-[12px]">{label} {required && <span className="text-pms-danger">*</span>}</label><input className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}

function AutoHint() {
  return <div className="flex min-h-[42px] items-center rounded-lg border border-dashed border-pms-muted-2 px-2.5 text-[11px] text-pms-muted">Tự động tạo</div>;
}
