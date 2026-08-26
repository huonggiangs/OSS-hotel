export type RoomStatusKey = "occupied" | "vacant" | "dirty" | "maintenance";
export type ApiRoomStatus = "OCCUPIED" | "VACANT" | "DIRTY" | "MAINTENANCE";

export const ROOM_STATUS_INFO: Record<RoomStatusKey, { label: string; color: string; apiStatus: ApiRoomStatus }> = {
  occupied: { label: "Đang ở", color: "#284AB1", apiStatus: "OCCUPIED" },
  vacant: { label: "Trống, sạch", color: "#00C853", apiStatus: "VACANT" },
  dirty: { label: "Chờ dọn phòng", color: "#B1B5C3", apiStatus: "DIRTY" },
  maintenance: { label: "Bảo trì", color: "#FAB505", apiStatus: "MAINTENANCE" },
};

export const ROOM_STATUS_KEYS: RoomStatusKey[] = ["occupied", "vacant", "dirty", "maintenance"];

export const ROOM_STATUS_BY_API: Record<ApiRoomStatus, RoomStatusKey> = {
  OCCUPIED: "occupied",
  VACANT: "vacant",
  DIRTY: "dirty",
  MAINTENANCE: "maintenance",
};

export interface RoomCard {
  id: string;
  n: string;
  floor: string;
  zone: string;
  type: string;
  price: string;
  priceAmount: number;
  statusKey: RoomStatusKey;
  status: string;
  color: string;
  note: string;
  powerUsage: string;
  occupants: number;
  powered: boolean;
  guest?: string;
  stayLabel?: string;
  stayHours?: number;
  activeBookingId?: string;
  activeBookingTotal?: number;
  activeBookingDeposit?: number;
}

export interface LegendItem {
  label: string;
  color: string;
  count: number;
  pct: number;
  from: number;
  to: number;
}

const GROUP_COLORS = ["#284AB1", "#00C853", "#FAB505", "#FC7F3A", "#8B5CF6", "#FF5A9E"];

function buildLegend(rooms: RoomCard[], values: string[], pick: (room: RoomCard) => string, label: (value: string) => string = (value) => value): LegendItem[] {
  let running = 0;
  return values.map((value, index) => {
    const count = rooms.filter((room) => pick(room) === value).length;
    const pct = Math.round((count / (rooms.length || 1)) * 1000) / 10;
    const item = { label: label(value), color: GROUP_COLORS[index % GROUP_COLORS.length], count, pct, from: running, to: running + pct };
    running += pct;
    return item;
  });
}

export function buildRoomBreakdown(rooms: RoomCard[]) {
  const total = rooms.length;
  const groupValues = (pick: (room: RoomCard) => string) => Array.from(new Set(rooms.map(pick))).sort((a, b) => a.localeCompare(b, "vi"));
  const statusLegend = ROOM_STATUS_KEYS.map((key) => {
    const count = rooms.filter((room) => room.statusKey === key).length;
    const pct = Math.round((count / (total || 1)) * 1000) / 10;
    return { label: ROOM_STATUS_INFO[key].label, color: ROOM_STATUS_INFO[key].color, count, pct, key };
  });
  let statusOffset = 0;
  const statusLegendWithOffsets = statusLegend.map((item) => {
    const withOffset = { ...item, from: statusOffset, to: statusOffset + item.pct };
    statusOffset += item.pct;
    return withOffset;
  });

  return {
    total,
    occupancyRate: `${Math.round((rooms.filter((room) => room.statusKey === "occupied").length / (total || 1)) * 100)}%`,
    dirtyCount: rooms.filter((room) => room.statusKey === "dirty").length,
    maintenanceCount: rooms.filter((room) => room.statusKey === "maintenance").length,
    statusLegend: statusLegendWithOffsets,
    typeLegend: buildLegend(rooms, groupValues((room) => room.type), (room) => room.type),
    zoneLegend: buildLegend(rooms, groupValues((room) => room.zone), (room) => room.zone),
    floorLegend: buildLegend(rooms, groupValues((room) => room.floor), (room) => room.floor, (floor) => `Tầng ${floor}`),
  };
}
