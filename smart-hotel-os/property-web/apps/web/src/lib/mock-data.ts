// Dữ liệu mẫu (mock) cho toàn bộ Property Web — lấy đúng theo dữ liệu mẫu trong
// bundle thiết kế `hotel-pms-software-design-phase-1/project/Hotel PMS.dc.html`
// (phần `class Component extends DCLogic { renderVals() {...} }`, dòng ~2734-3150).
//
// Tách riêng ra 1 file để sau này thay bằng gọi API thật (Admin API PMS Core,
// xem smart-hotel-os/docs/API_SPECIFICATION.md) chỉ cần đổi nơi gọi, không phải
// sửa rải rác trong từng component.

// ---------- Dashboard ----------

export const dashboardKpis = [
  { label: "Tổng số đặt phòng", value: "11.230", trend: "▲1,93%", trendColor: "#00C853" },
  { label: "Công suất phòng (tháng)", value: "63%", valueColor: "#284AB1" },
  { label: "Nhân sự đang hoạt động", value: "312" },
  { label: "Tổng số khách hàng", value: "1.603" },
];

export const incomeSources = [
  { label: "Cho thuê phòng", value: "812.000.000đ" },
  { label: "Dịch vụ đi kèm", value: "116.000.000đ" },
];

export const fixedCostItems = [
  { label: "Khấu hao tài sản", value: "45.000.000đ" },
  { label: "Chi phí bảo trì", value: "12.500.000đ" },
  { label: "Thuê cơ sở & nhân sự", value: "158.000.000đ" },
];

export const variableCostItems = [
  { label: "Sửa chữa", value: "8.200.000đ" },
  { label: "Hoa hồng", value: "14.600.000đ" },
  { label: "Mua sắm", value: "6.300.000đ" },
  { label: "Điện, nước", value: "9.900.000đ" },
  { label: "Khác", value: "3.100.000đ" },
];

export const smallBars = [40, 55, 35, 60, 50, 70, 45, 65, 55, 80, 60, 50];
export const smallBars2 = [30, 45, 55, 35, 60, 40, 50, 65, 35, 55, 45, 60];

export const roomUsage = [
  { label: "Single", pct: "58,63", color: "#284AB1" },
  { label: "Double", pct: "23,94", color: "#00C853" },
  { label: "Deluxe", pct: "12,94", color: "#FAB505" },
  { label: "Suite", pct: "4,49", color: "#FC7F3A" },
];

export const bookingHistory = [
  { label: "Sắp đến", value: "1.913", pct: "58,63", color: "#284AB1" },
  { label: "Sắp đi", value: "859", pct: "23,94", color: "#00C853" },
  { label: "Đang ở", value: "482", pct: "12,94", color: "#FAB505" },
  { label: "Huỷ", value: "138", pct: "4,49", color: "#CC2F42" },
];

export const packages = [
  { name: "Đi bộ", pct: 58, color: "#284AB1" },
  { name: "Lặn biển", pct: 43, color: "#FAB505" },
  { name: "Leo núi", pct: 33, color: "#284AB1" },
  { name: "Lướt sóng", pct: 29, color: "#FF5A9E" },
  { name: "Gói mùa xuân", pct: 18, color: "#FC7F3A" },
  { name: "Gói toàn bộ suite", pct: 16, color: "#00C853" },
];

export const activityTabs = ["Tất cả", "Đặt hôm nay", "Đặt phòng tiếp theo"];

export const activity = [
  { text: "Phòng 102 nhận phòng", time: "2 giờ trước" },
  { text: "-300.000đ sửa điện phòng 204", time: "2 giờ trước" },
  { text: "Phòng 203 trả phòng", time: "2 giờ trước" },
  { text: "+450.000đ khách thanh toán P302", time: "2 giờ trước" },
  { text: "Đặt phòng OTA Agoda", time: "2 giờ trước" },
  { text: "Đặt phòng OTA Agoda", time: "3 giờ trước" },
];

export const newCustomers = [
  { name: "Nguyễn Văn A", email: "a.nguyen@anio.vn" },
  { name: "Trần Thị B", email: "b.tran@anio.vn" },
  { name: "Lê Văn C", email: "c.le@anio.vn" },
  { name: "Phạm Thị D", email: "d.pham@anio.vn" },
];

export const monthBookingCards = [
  { label: "Tổng lượt đặt", value: "428", color: "#284AB1" },
  { label: "Đã xác nhận", value: "356", color: "#00C853" },
  { label: "Chờ xác nhận", value: "52", color: "#FAB505" },
  { label: "Hủy/không đến", value: "20", color: "#CC2F42" },
  { label: "Doanh thu dự kiến", value: "1.86 tỷ đ", color: "#284AB1" },
];

// Số lượt đặt phòng theo từng ngày trong tháng — công thức lấy đúng theo bản gốc
// (dùng sin để tạo dáng biểu đồ tự nhiên, không phải số liệu thật).
export function buildMonthBookingBars(activeDay: number) {
  return Array.from({ length: 30 }, (_, i) => {
    const count = Math.round(18 * Math.abs(Math.sin((i + 1) / 3.2)) - 3);
    return { d: i + 1, count: Math.max(0, count), active: i === activeDay - 1 };
  }).filter((bar) => bar.count > 0);
}

// ---------- Booking (đặt phòng / hợp đồng) ----------

export interface BookingRow {
  id: string;
  guest: string;
  room: string;
  checkin: string;
  checkout: string;
  channel: string;
  status: string;
  bg: string;
  fg: string;
}

export const bookings: BookingRow[] = [
  { id: "HD-2026071", guest: "Nguyễn Văn An", room: "204 · Deluxe", checkin: "25/07", checkout: "28/07", channel: "Booking.com", status: "Đã xác nhận", bg: "#E6F9EE", fg: "#00C853" },
  { id: "HD-2026072", guest: "Trần Thị Bích", room: "118 · Standard", checkin: "24/07", checkout: "26/07", channel: "Trực tiếp", status: "Đã nhận phòng", bg: "#EEF1FB", fg: "#284AB1" },
  { id: "HD-2026073", guest: "Lê Hoàng Nam", room: "310 · Suite", checkin: "26/07", checkout: "31/07", channel: "Airbnb", status: "Chờ xác nhận", bg: "#FFF7E0", fg: "#946200" },
  { id: "HD-2026074", guest: "Phạm Thu Hà", room: "402 · Deluxe", checkin: "20/07", checkout: "22/07", channel: "Agoda", status: "Đã trả phòng", bg: "#F4F5F6", fg: "#777E90" },
  { id: "HD-2026075", guest: "Đỗ Minh Quân", room: "115 · Standard", checkin: "23/07", checkout: "24/07", channel: "Trực tiếp", status: "Đã huỷ", bg: "#FCEAEC", fg: "#CC2F42" },
];

export const contractTokensRoom = ["[Room_name]", "[Room_type]", "[Price_room_per_night]", "[Arrival]", "[Departure]", "[Total_night]", "[Deposit]", "[Total_price]"];
export const contractTokensGuest = ["[Full_name]", "[Customer_identity_number]", "[Customer_country]", "[Customer_phone]", "[Customer_email]", "[Customer_birthday]"];

// ---------- Rooms (trạng thái phòng — Gantt lịch + lưới phòng) ----------

export type RoomStatusKey = "occupied" | "vacant" | "dirty" | "maintenance";

export const roomStatusInfo: Record<RoomStatusKey, { label: string; color: string }> = {
  occupied: { label: "Đang ở", color: "#284AB1" },
  vacant: { label: "Trống, sạch", color: "#00C853" },
  dirty: { label: "Chờ dọn phòng", color: "#B1B5C3" },
  maintenance: { label: "Bảo trì", color: "#FAB505" },
};

export const roomTypeNames = ["Standard", "Deluxe", "Suite", "Family"] as const;
export const roomTypePrices: Record<string, string> = { Standard: "650.000đ", Deluxe: "890.000đ", Suite: "1.450.000đ", Family: "1.150.000đ" };
export const roomTypeColors: Record<string, string> = { Standard: "#284AB1", Deluxe: "#00C853", Suite: "#FAB505", Family: "#FC7F3A" };
export const zoneNames = ["Khu vực A", "Khu vực B", "Khu vực C"];
export const zoneColors: Record<string, string> = { "Khu vực A": "#284AB1", "Khu vực B": "#00C853", "Khu vực C": "#FAB505" };
export const floorNames = ["1", "2", "3"];
export const floorColors: Record<string, string> = { "1": "#284AB1", "2": "#00C853", "3": "#FAB505" };

export interface RoomCard {
  n: number;
  floor: string;
  zone: string;
  type: string;
  price: string;
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
}

// Sinh 32 phòng mẫu — thuật toán lấy đúng theo bản gốc (chỉ số i quyết định
// tầng/loại/khu/trạng thái theo modulo, không phải dữ liệu backend thật).
export function buildRooms(): RoomCard[] {
  const guestNames = ["Nguyễn Văn An", "Trần Thị Bích", "Lê Hoàng Nam", "Phạm Thu Hà"];
  const issues = ["Điều hoà không mát", "Hỏng khoá cửa", "Rò rỉ vòi nước"];
  const stayHoursList = [4, 20, 30, 3, 14];

  return Array.from({ length: 32 }, (_, i) => {
    const floor = String(Math.floor(i / 11) + 1);
    const type = roomTypeNames[i % 4];
    const zone = zoneNames[i % 3];
    const statusKey: RoomStatusKey = i % 9 < 5 ? "occupied" : i % 9 < 7 ? "vacant" : i % 9 === 7 ? "dirty" : "maintenance";
    const s = roomStatusInfo[statusKey];
    const stayDur = stayHoursList[i % stayHoursList.length];
    const stayLabel = stayDur >= 24 ? `${Math.floor(stayDur / 24)} ngày ${stayDur % 24}h` : `${stayDur} giờ`;
    const guest = guestNames[i % guestNames.length];
    const note =
      statusKey === "occupied"
        ? `Khách: ${guest} · Đã ở ${stayLabel}`
        : statusKey === "maintenance"
          ? issues[i % issues.length]
          : "";
    const roomNum = 101 + i;
    const powered = statusKey === "occupied";
    const currentKw = powered ? (0.4 + (i % 4) * 0.3).toFixed(1) : "0";
    const totalKwh = powered ? (Number(currentKw) * Math.max(1, stayDur)).toFixed(1) : "0";
    const powerUsage = powered ? `${currentKw} kW hiện tại · ${totalKwh} kWh/đợt ở` : "";
    const occupants = powered ? 1 + (i % 3) : 0;

    return {
      n: roomNum,
      floor,
      zone,
      type,
      price: roomTypePrices[type],
      statusKey,
      status: s.label,
      color: s.color,
      note,
      powerUsage,
      occupants,
      powered,
      guest,
      stayLabel,
      stayHours: stayDur,
    };
  });
}

// ---------- Gantt (Lịch đặt phòng dạng biểu đồ) ----------

export interface GanttBooking {
  guest: string;
  icon: string;
  color: string;
  startCol: number; // 0-based
  span: number;
}
export interface GanttRoom {
  code: string;
  floor: string;
  zone: string;
  bookings: GanttBooking[];
}
export interface GanttGroup {
  name: string;
  price: string;
  counts: number[]; // số lượt đặt theo 7 cột (ngày)
  rooms: GanttRoom[];
}

const ganttGuests = ["Nguyễn Văn An", "Trần Thị Bích", "Lê Hoàng Nam", "Phạm Thu Hà", "Ekaterina Pavlova", "Đỗ Minh Quân", "Hoàng Gia Huy", "Trịnh Phấn", "Trúc Trần", "Phùng Dương", "Tường Huấn", "Hương Nguyễn"];
const ganttIcons = ["B", "Ⓐ", "Ⓢ"];
const ganttColors = ["#00A651", "#284AB1"];
const patterns = [[3, 2, 2], [2, 3, 2], [1, 4, 2], [4, 1, 2], [7], [2, 2, 3]];

export function buildGanttGroups(): GanttGroup[] {
  let roomSeq = 0;
  return roomTypeNames.map((type, ti) => {
    const rooms: GanttRoom[] = Array.from({ length: 4 }, (_, ri) => {
      const idx = roomSeq++;
      const roomNum = 101 + ti * 10 + ri;
      const floor = String(ti + 1);
      const zone = zoneNames[idx % zoneNames.length];
      const pattern = idx === 3 ? [] : patterns[idx % patterns.length];
      let col = 0;
      const bookings: GanttBooking[] = pattern.map((span, si) => {
        const b: GanttBooking = {
          guest: ganttGuests[(idx * 3 + si) % ganttGuests.length],
          icon: ganttIcons[(idx + si) % ganttIcons.length],
          color: ganttColors[(idx + si) % ganttColors.length],
          startCol: col,
          span,
        };
        col += span;
        return b;
      });
      return { code: `PHÒNG ${roomNum} · Tầng ${floor} · ${zone}`, floor, zone, bookings };
    });
    const counts = Array.from({ length: 7 }, (_, day) => rooms.filter((r) => r.bookings.some((b) => b.startCol === day)).length);
    return { name: type, price: roomTypePrices[type], counts, rooms };
  });
}

export interface LegendItem {
  label: string;
  color: string;
  count: number;
  pct: number;
  from: number;
  to: number;
}

// Tính legend + conic-gradient cho 4 panel donut ở trang Rooms (Khu vực/Tầng/Trạng
// thái/Loại phòng) — thuật toán lấy đúng theo bản gốc (tích luỹ % theo thứ tự cố định).
export function buildRoomBreakdown(rooms: RoomCard[]) {
  const total = rooms.length;

  function legendOf<T extends string>(names: readonly T[], colors: Record<string, string>, pick: (r: RoomCard) => string) {
    let acc = 0;
    const items: LegendItem[] = names.map((name) => {
      const count = rooms.filter((r) => pick(r) === name).length;
      const pct = Math.round((count / total) * 1000) / 10;
      const item = { label: name, color: colors[name], count, pct, from: acc, to: acc + pct };
      acc += pct;
      return item;
    });
    return items;
  }

  const statusOrder: RoomStatusKey[] = ["occupied", "vacant", "dirty", "maintenance"];
  const statusLegend = legendOf(
    statusOrder,
    Object.fromEntries(statusOrder.map((k) => [k, roomStatusInfo[k].color])),
    (r) => r.statusKey,
  ).map((it, i) => ({ ...it, label: roomStatusInfo[statusOrder[i]].label, key: statusOrder[i] }));
  const typeLegend = legendOf(roomTypeNames, roomTypeColors, (r) => r.type);
  const zoneLegend = legendOf(zoneNames, zoneColors, (r) => r.zone);
  const floorLegend = legendOf(floorNames, floorColors, (r) => r.floor).map((it) => ({ ...it, label: "Tầng " + it.label }));

  return {
    total,
    occupancyRate: Math.round((rooms.filter((r) => r.statusKey === "occupied").length / total) * 100) + "%",
    dirtyCount: rooms.filter((r) => r.statusKey === "dirty").length,
    maintenanceCount: rooms.filter((r) => r.statusKey === "maintenance").length,
    statusLegend,
    typeLegend,
    zoneLegend,
    floorLegend,
  };
}

export const availableRoomOptions = [
  "PHÒNG 104 · Tầng 1 · Khu A",
  "PHÒNG 108 · Tầng 1 · Khu B",
  "PHÒNG 202 · Tầng 2 · Khu A",
  "PHÒNG 205 · Tầng 2 · Khu B",
  "PHÒNG 303 · Tầng 3 · Khu A",
  "PHÒNG 307 · Tầng 3 · Khu B",
];

export const stayTypeOptions = [
  { key: "hour", label: "Theo giờ", price: "50.000đ/giờ" },
  { key: "overnight", label: "Qua đêm", price: "300.000đ/đêm" },
  { key: "day", label: "Ngày", price: "500.000đ/ngày" },
  { key: "week", label: "Tuần", price: "2.800.000đ/tuần" },
  { key: "month", label: "Tháng", price: "9.000.000đ/tháng" },
];

// ---------- Price (loại phòng / phòng) ----------

export interface RoomTypeRow {
  stt: number;
  name: string;
  count: number;
  bedsBig: number;
  bedsSmall: number;
  capacity: number;
  area: string;
  basePrice: string;
  method: string;
  discount: string;
  status: string;
  statusColor: string;
}

export const roomTypesFull: RoomTypeRow[] = [
  { stt: 1, name: "Single", count: 10, bedsBig: 10, bedsSmall: 10, capacity: 10, area: "22m2", basePrice: "12,300,000đ", method: "Block giờ", discount: "- 10%", status: "Đang hoạt động", statusColor: "#00C853" },
  { stt: 2, name: "Single", count: 10, bedsBig: 10, bedsSmall: 10, capacity: 10, area: "22m2", basePrice: "300,000đ", method: "Giá ngày", discount: "- 20%", status: "Ngừng hoạt động", statusColor: "#CC2F42" },
  { stt: 3, name: "Double", count: 10, bedsBig: 10, bedsSmall: 10, capacity: 10, area: "22m2", basePrice: "300,000đ", method: "Giá tháng", discount: "- 20%", status: "Đang hoạt động", statusColor: "#00C853" },
  { stt: 4, name: "Lux", count: 10, bedsBig: 10, bedsSmall: 10, capacity: 10, area: "22m2", basePrice: "300,000đ", method: "Block giờ", discount: "- 20%", status: "Đang hoạt động", statusColor: "#00C853" },
];

export interface RoomRow {
  room: string;
  type: string;
  code: string;
  floor: number;
  meal: string;
  capacity: number;
  price: string;
  method: string;
  status: string;
  statusColor: string;
}

export const roomsFull: RoomRow[] = [
  { room: "101", type: "Single", code: "AK13620", floor: 2, meal: "Ăn sáng", capacity: 3, price: "300,000đ", method: "Tự động", status: "Đã đặt", statusColor: "#284AB1" },
  { room: "102", type: "Single", code: "AK13620", floor: 2, meal: "Ăn sáng", capacity: 3, price: "300,000đ", method: "Tự động", status: "Ngừng hoạt động", statusColor: "#CC2F42" },
  { room: "103", type: "Double", code: "AK13620", floor: 2, meal: "Ăn sáng", capacity: 3, price: "300,000đ", method: "Tự động", status: "Chờ xử lý", statusColor: "#FAB505" },
  { room: "104", type: "Lux", code: "AK13620", floor: 2, meal: "Ăn sáng", capacity: 3, price: "300,000đ", method: "Thủ công", status: "Đang mở", statusColor: "#00C853" },
];

// ---------- Payment ----------

export const paymentChannels = ["VNPay", "MoMo", "ZaloPay", "VietQR / Napas 247", "Thẻ nội địa (ATM)", "Visa / Mastercard", "Apple Pay", "Google Pay", "PayPal", "Alipay", "UnionPay"];
export const howToPay = ["Tiền mặt", "Chuyển khoản ngân hàng"];

export interface InvoiceRow {
  id: string;
  guest: string;
  method: string;
  amount: string;
  status: string;
  bg: string;
  fg: string;
}

export const invoices: InvoiceRow[] = [
  { id: "HD-8891", guest: "Nguyễn Văn An", method: "Thẻ ngân hàng", amount: "2.400.000đ", status: "Đã thanh toán", bg: "#E6F9EE", fg: "#00C853" },
  { id: "HD-8892", guest: "Trần Thị Bích", method: "Tiền mặt", amount: "1.100.000đ", status: "Đã thanh toán", bg: "#E6F9EE", fg: "#00C853" },
  { id: "HD-8893", guest: "Lê Hoàng Nam", method: "Chuyển khoản", amount: "4.750.000đ", status: "Chờ xác nhận", bg: "#FFF7E0", fg: "#946200" },
  { id: "HD-8894", guest: "Phạm Thu Hà", method: "Ví OTA", amount: "1.780.000đ", status: "Đã thanh toán", bg: "#E6F9EE", fg: "#00C853" },
];

// ---------- Sidebar / topbar dùng chung ----------

export const currentUser = {
  name: "Lê Thảo",
  initials: "LT",
  role: "Quản lý ca",
  property: "ANIO Riverside Hotel",
  email: "le.thao@anio.vn",
};
