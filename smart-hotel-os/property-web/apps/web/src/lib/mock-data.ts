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

// ---------- Expenses (Chi phí) — khối `isExpenses`, dòng 1126-1234 bản gốc ----------

export const expenseCategories = ["Tiền điện", "Tiền nước", "Vệ sinh", "Mua đồ dùng", "Sửa chữa/bảo trì", "Khác"];

export interface ExpenseRow {
  id: string;
  date: string;
  category: string;
  desc: string;
  amount: string;
  by: string;
}

export const expenses: ExpenseRow[] = [
  { id: "CP001", date: "25/07/2026", category: "Tiền điện", desc: "Thanh toán điện tháng 7", amount: "3.200.000đ", by: "Lê Thảo" },
  { id: "CP002", date: "24/07/2026", category: "Vệ sinh", desc: "Mua dụng cụ vệ sinh phòng", amount: "450.000đ", by: "Nguyễn Văn Bình" },
  { id: "CP003", date: "23/07/2026", category: "Tiền nước", desc: "Thanh toán nước tháng 7", amount: "980.000đ", by: "Lê Thảo" },
  { id: "CP004", date: "22/07/2026", category: "Mua đồ dùng", desc: "Mua khăn tắm, ga giường", amount: "1.650.000đ", by: "Trần Thị Mai" },
];

export const expenseTotal = "6.280.000đ";
export const dailyIncomeTotal = "18.400.000đ";
export const dailyExpenseTotal = "2.180.000đ";

// Sổ thu chi trong ngày — trạng thái phê duyệt (approved/pending/rejected) được đổi
// tại chỗ trong component (giống `this.state.dailyStatuses` bản gốc), nên tách riêng
// dữ liệu gốc (base) khỏi trạng thái mặc định để trang tự tính lại khi Duyệt/Từ chối.
export type DailyEntryStatus = "approved" | "pending" | "rejected";

export interface DailyEntryBase {
  id: string;
  type: "Thu" | "Chi";
  typeColor: string;
  desc: string;
  amount: string;
  by: string;
  defaultStatus: DailyEntryStatus;
}

export const dailyEntriesBase: DailyEntryBase[] = [
  { id: "TC001", type: "Thu", typeColor: "#00C853", desc: "Thu tiền phòng 101, 203", amount: "4.500.000đ", by: "Lê Thảo", defaultStatus: "approved" },
  { id: "TC002", type: "Chi", typeColor: "#CC2F42", desc: "Mua văn phòng phẩm", amount: "320.000đ", by: "Nguyễn Văn Bình", defaultStatus: "pending" },
  { id: "TC003", type: "Chi", typeColor: "#CC2F42", desc: "Sửa vòi nước phòng 305", amount: "650.000đ", by: "Trần Thị Mai", defaultStatus: "pending" },
  { id: "TC004", type: "Thu", typeColor: "#00C853", desc: "Thu dịch vụ giặt ủi", amount: "180.000đ", by: "Lê Thảo", defaultStatus: "approved" },
];

export const dailyStatusInfo: Record<DailyEntryStatus, { label: string; bg: string; color: string }> = {
  approved: { label: "Đã duyệt", bg: "#E6F9EE", color: "#00C853" },
  pending: { label: "Chờ duyệt", bg: "#FFF6E5", color: "#FAB505" },
  rejected: { label: "Đã từ chối", bg: "#FDECEE", color: "#CC2F42" },
};

// ---------- Kế toán đêm (Night Audit) — khối `isNightAudit`, dòng 1235-1273 ----------

export const auditStats = [
  { label: "Hoá đơn đã phát hành", value: "23" },
  { label: "Doanh thu phòng", value: "18.240.000đ" },
  { label: "Doanh thu dịch vụ", value: "2.410.000đ" },
  { label: "Chênh lệch đối soát", value: "0đ" },
];

// ---------- Marketing — khối `isMarketing`, dòng 1978 ----------

export interface CampaignRow {
  name: string;
  channel: string;
  start: string;
  end: string;
  sent: number;
  opened: string;
  status: string;
  bg: string;
  fg: string;
}

export const campaignsSeed: CampaignRow[] = [
  { name: "Ưu đãi hè 2026", channel: "Email", start: "01/06/2026", end: "31/08/2026", sent: 1203, opened: "38%", status: "Đang chạy", bg: "#E6F9EE", fg: "#00C853" },
  { name: "Giảm 20% đặt sớm", channel: "SMS", start: "01/03/2026", end: "15/04/2026", sent: 850, opened: "61%", status: "Đã kết thúc", bg: "#F4F5F6", fg: "#777E90" },
  { name: "Khách hàng thân thiết", channel: "Email", start: "01/01/2026", end: "31/12/2026", sent: 430, opened: "52%", status: "Đang chạy", bg: "#E6F9EE", fg: "#00C853" },
];

export const campaignAudienceOptions = [
  { value: "all", label: "Tất cả khách hàng" },
  { value: "vip", label: "Khách VIP" },
  { value: "regular", label: "Khách quen" },
  { value: "new", label: "Khách mới" },
];

// ---------- Khách hàng (Customers) — khối `isCustomers`, dòng 2031 ----------

export interface CustomerTransaction {
  date: string;
  desc: string;
  amount: string;
}

export interface CustomerRow {
  key: string;
  name: string;
  phone: string;
  email: string;
  bookings: number;
  rebookings: number;
  careAfterStay: number;
  spent: string;
  segment: "VIP" | "Khách quen" | "Mới";
  note: string;
  preferences: string;
  servicesUsed: string[];
  transactions: CustomerTransaction[];
}

export const customerSegmentColors: Record<string, { bg: string; fg: string }> = {
  VIP: { bg: "#FFF7E0", fg: "#946200" },
  "Khách quen": { bg: "#E6F9EE", fg: "#00C853" },
  Mới: { bg: "#EEF1FB", fg: "#284AB1" },
};

export const customersSeed: CustomerRow[] = [
  {
    key: "an",
    name: "Nguyễn Văn An",
    phone: "0912 345 678",
    email: "a.nguyen@anio.vn",
    bookings: 5,
    rebookings: 3,
    careAfterStay: 4,
    spent: "12.400.000đ",
    segment: "Khách quen",
    note: "Thích phòng tầng cao, yên tĩnh",
    preferences: "Ưa phòng view biển, hay đặt bữa sáng muộn, thích trà xanh thay cà phê.",
    servicesUsed: ["Đưa đón sân bay", "Giặt là", "Spa"],
    transactions: [
      { date: "02/06/2026", desc: "Đặt phòng Deluxe 3N2Đ", amount: "4.500.000đ" },
      { date: "15/03/2026", desc: "Dịch vụ Spa", amount: "800.000đ" },
    ],
  },
  {
    key: "bich",
    name: "Trần Thị Bích",
    phone: "0987 654 321",
    email: "b.tran@anio.vn",
    bookings: 2,
    rebookings: 0,
    careAfterStay: 1,
    spent: "3.200.000đ",
    segment: "Mới",
    note: "Khách mới, chưa có ghi chú thêm",
    preferences: "Đi cùng gia đình có trẻ nhỏ, cần nôi em bé.",
    servicesUsed: ["Đưa đón sân bay"],
    transactions: [{ date: "20/05/2026", desc: "Đặt phòng Superior 2N1Đ", amount: "1.600.000đ" }],
  },
  {
    key: "nam",
    name: "Lê Hoàng Nam",
    phone: "0901 222 333",
    email: "nam.le@anio.vn",
    bookings: 8,
    rebookings: 6,
    careAfterStay: 7,
    spent: "24.900.000đ",
    segment: "VIP",
    note: "Khách VIP, ưu tiên nâng hạng phòng khi còn trống",
    preferences: "Hay đi công tác, cần phòng có bàn làm việc, không hút thuốc.",
    servicesUsed: ["Đưa đón sân bay", "Giặt là", "Thuê xe", "Tour trải nghiệm"],
    transactions: [
      { date: "10/07/2026", desc: "Đặt phòng Suite 4N3Đ", amount: "9.800.000đ" },
      { date: "01/04/2026", desc: "Thuê xe + tài xế", amount: "1.200.000đ" },
    ],
  },
  {
    key: "ha",
    name: "Phạm Thu Hà",
    phone: "0933 111 222",
    email: "ha.pham@anio.vn",
    bookings: 1,
    rebookings: 0,
    careAfterStay: 0,
    spent: "1.100.000đ",
    segment: "Mới",
    note: "",
    preferences: "Chưa đủ dữ liệu.",
    servicesUsed: [],
    transactions: [{ date: "05/06/2026", desc: "Đặt phòng Standard 1N", amount: "1.100.000đ" }],
  },
];

// ---------- Dịch vụ (Services) — khối `isServices`, dòng 2111 ----------

export interface OwnServiceRow {
  id: number;
  category: string;
  name: string;
  unit: string;
  schedule: string;
  vehicle: string;
  price: string;
  location: string;
  linked: boolean;
}

export const ownServicesSeed: OwnServiceRow[] = [
  { id: 0, name: "Tour đi bộ", category: "Tour trải nghiệm", unit: "Lượt", schedule: "Thứ hai, 12/08/2022 · 5:30", vehicle: "Xe đạp", price: "300.000đ", location: "Đón tại cơ sở", linked: true },
  { id: 1, name: "Tour lặn biển", category: "Tour trải nghiệm", unit: "Lượt", schedule: "Thứ ba, 13/08/2022 · 5:30", vehicle: "Ô tô", price: "300.000đ", location: "Đón tại cơ sở", linked: true },
  { id: 2, name: "Tour leo núi", category: "Tour trải nghiệm", unit: "Lượt", schedule: "Thứ tư, 14/08/2022 · 5:30", vehicle: "Tàu biển", price: "300.000đ", location: "Đón tại cơ sở", linked: true },
  { id: 3, name: "Bus dạo phố", category: "Tour trải nghiệm", unit: "Lượt", schedule: "Thứ năm, 15/08/2022 · 5:30", vehicle: "Xe bus", price: "300.000đ", location: "Tại quầy lễ tân", linked: false },
  { id: 4, name: "Chạy bộ cùng HLV", category: "Tour trải nghiệm", unit: "Lượt", schedule: "Thứ sáu, 16/08/2022 · 5:30", vehicle: "Không cần", price: "300.000đ", location: "Tại cơ sở", linked: true },
  { id: 5, name: "Khám phá hang động", category: "Tour trải nghiệm", unit: "Lượt", schedule: "Thứ bảy, 17/08/2022 · 5:30", vehicle: "Xe địa hình", price: "300.000đ", location: "Đón tại cơ sở", linked: true },
  { id: 6, name: "Mạng Internet", category: "Vệ sinh", unit: "Tháng", schedule: "Định kỳ hàng tháng", vehicle: "—", price: "100.000đ", location: "Tại phòng", linked: true },
  { id: 7, name: "Vệ sinh phòng", category: "Vệ sinh", unit: "Tháng", schedule: "Định kỳ hàng tháng", vehicle: "—", price: "150.000đ", location: "Tại phòng", linked: false },
  { id: 8, name: "Gửi xe", category: "Gửi xe", unit: "Tháng", schedule: "Định kỳ hàng tháng", vehicle: "—", price: "100.000đ", location: "Tại cơ sở", linked: true },
  { id: 9, name: "Nước", category: "Nước", unit: "m3", schedule: "Theo chỉ số hàng tháng", vehicle: "—", price: "15.000đ", location: "Tại phòng", linked: true },
  { id: 10, name: "Điện", category: "Điện", unit: "Số", schedule: "Theo chỉ số hàng tháng", vehicle: "—", price: "3.500đ", location: "Tại phòng", linked: true },
];

export interface PartnerServiceRow {
  name: string;
  category: string;
  distance: string;
  commission: string;
  linked: boolean;
}

export const partnerServicesList: PartnerServiceRow[] = [
  { name: "Spa Hương Sen", category: "Spa & Massage", distance: "150m", commission: "10%", linked: true },
  { name: "Nhà hàng Biển Đông", category: "Ẩm thực", distance: "300m", commission: "8%", linked: true },
  { name: "Tour Đảo Ngọc", category: "Tour & Trải nghiệm", distance: "1.2km", commission: "15%", linked: false },
  { name: "Cho thuê xe máy Minh Phát", category: "Di chuyển", distance: "80m", commission: "12%", linked: true },
  { name: "Phòng gym FitZone", category: "Thể thao", distance: "400m", commission: "5%", linked: false },
];

// ---------- Tiện ích (Utilities) — khối `isUtilities`, dòng 2246 ----------

export interface UtilityLink {
  key: "maps" | "hotel";
  name: string;
  desc: string;
  linked: boolean;
}

export const utilityLinksSeed: UtilityLink[] = [
  { key: "maps", name: "Google Maps", desc: "Hiển thị vị trí cơ sở trên Google Maps để khách dễ dàng tìm đường", linked: true },
  { key: "hotel", name: "Google Hotel (Google Hotel Ads)", desc: "Đồng bộ giá phòng, tình trạng còn phòng để hiển thị trên Google Hotel Search", linked: false },
];

// ---------- Module nâng cao (Modules) — khối `isModules`, dòng 2262 ----------

export interface AdvancedModule {
  key: string;
  name: string;
  icon: string;
  bg: string;
  price?: string;
  free?: boolean;
  on: boolean;
}

export const advancedModulesSeed: AdvancedModule[] = [
  { key: "power", name: "Liên kết điện", icon: "🔌", bg: "#EAF2FF", price: "3.000đ/phòng/tháng", on: true },
  { key: "notify", name: "Thông báo", icon: "🔔", bg: "#FFF7E0", free: true, on: true },
  { key: "cots", name: "Dịch vụ order trong phòng", icon: "🧸", bg: "#FDEFE9", free: true, on: true },
  { key: "housekeeping", name: "Dọn phòng (Housekeeping)", icon: "🧹", bg: "#FDF3D8", price: "3.000đ/phòng/tháng", on: true },
  { key: "rfid", name: "Liên kết ScanQr", icon: "📶", bg: "#E6F4FF", price: "2.000đ/phòng/tháng", on: true },
  { key: "camera", name: "Camera", icon: "📷", bg: "#EEF1F4", price: "200.000đ", on: true },
  { key: "passport", name: "Hộ chiếu, CCCD", icon: "🛂", bg: "#EAF0FF", price: "200.000đ", on: true },
  { key: "gatelock", name: "Khóa cổng", icon: "🔒", bg: "#E7F7EE", price: "200.000đ", on: false },
  { key: "cms", name: "Quản trị nội dung — Liên kết OTA", icon: "⚙️", bg: "#EDEFF2", price: "Liên hệ", on: true },
  { key: "marketing2", name: "Marketing", icon: "📣", bg: "#FFF1E6", price: "200.000đ", on: true },
  { key: "account", name: "Tài khoản", icon: "✅", bg: "#E9F0FF", price: "200.000đ", on: true },
  { key: "doorlock", name: "Liên kết khoá từ", icon: "🔢", bg: "#E6F6FF", price: "3.000đ/phòng/tháng", on: true },
  { key: "task", name: "Công việc", icon: "📋", bg: "#E9F0FF", price: "200.000đ", on: true },
  { key: "hrm", name: "Nhân sự (HRM)", icon: "🧑‍🤝‍🧑", bg: "#F1ECFB", price: "200.000đ", on: true },
  { key: "webbooking", name: "Đặt phòng qua Web", icon: "✈️", bg: "#E9F0FF", price: "200.000đ", on: true },
  { key: "otasync", name: "Đồng bộ OTA", icon: "☁️", bg: "#E6F4FF", price: "200.000đ", on: true },
  { key: "extend", name: "Gia hạn lưu trú", icon: "↗️", bg: "#FFF4D6", price: "200.000đ", on: true },
  { key: "breakeven", name: "Điểm hòa vốn", icon: "👛", bg: "#F3E9E0", price: "200.000đ", on: true },
  { key: "combo", name: "Gói combo", icon: "🧳", bg: "#FDEDE6", price: "200.000đ", on: true },
  { key: "aicamera", name: "Thống kê khách hàng AI Camera", icon: "📊", bg: "#E6F4FF", price: "200.000đ", on: false },
  { key: "screenlink", name: "Liên kết màn hình phụ", icon: "🖥️", bg: "#EAF2FF", price: "3.000đ/phòng/tháng", on: false },
  { key: "einvoice", name: "Xuất hoá đơn điện", icon: "🧾", bg: "#FFF7E0", price: "500.000–900.000đ/năm", on: false },
  { key: "voiceassistant", name: "Trợ lý ảo AI cho khách (Voice/Chatbot)", icon: "🗣️", bg: "#F1ECFB", price: "250.000đ/phòng/tháng", on: false },
  { key: "smartenergy", name: "Tiết kiệm năng lượng AI", icon: "🌿", bg: "#E7F7EE", price: "5.000đ/phòng/tháng", on: false },
  { key: "facecheckin", name: "Nhận diện khuôn mặt check-in", icon: "🪪", bg: "#EAF0FF", price: "300.000đ/tháng", on: false },
  { key: "dynamicpricing", name: "Định giá phòng linh hoạt (Dynamic Pricing AI)", icon: "📈", bg: "#FFF4D6", price: "400.000đ/tháng", on: false },
  { key: "contactlessagent", name: "Trợ lý nghỉ dưỡng không tiếp xúc (QR trong phòng)", icon: "📲", bg: "#E6F4FF", price: "2.000đ/phòng/tháng", on: false },
];

// ---------- Kênh bán OTA (Channel) — khối `isChannel`, dòng 1274 ----------

export interface ChannelRow {
  name: string;
  initial: string;
  color: string;
  status: string;
  statusColor: string;
  stat: string;
}

export const channels: ChannelRow[] = [
  { name: "Booking.com", initial: "B", color: "#003580", status: "Đã kết nối", statusColor: "#00C853", stat: "37 đặt phòng tháng này · đồng bộ 2 phút trước" },
  { name: "Agoda", initial: "A", color: "#5A1F8A", status: "Đã kết nối", statusColor: "#00C853", stat: "22 đặt phòng tháng này · đồng bộ 5 phút trước" },
  { name: "Airbnb", initial: "Ab", color: "#FF5A5F", status: "Đã kết nối", statusColor: "#00C853", stat: "15 đặt phòng tháng này · đồng bộ 9 phút trước" },
  { name: "Traveloka", initial: "T", color: "#1B9AAA", status: "Chưa kết nối", statusColor: "#CC2F42", stat: "Cần nhập API key để bật đồng bộ" },
];

// ---------- Người dùng & phân quyền (Users) — khối `isUsers`, dòng 1289 ----------

export interface RoleRow {
  name: string;
  count: number;
  scope: string;
}

export const roles: RoleRow[] = [
  { name: "Quản lý", count: 2, scope: "Toàn quyền mọi module" },
  { name: "Lễ tân", count: 6, scope: "Hợp đồng, Trạng thái phòng, Thanh toán (không xoá)" },
  { name: "Kế toán", count: 2, scope: "Thanh toán, Kế toán đêm, Báo cáo" },
  { name: "Buồng phòng", count: 5, scope: "Trạng thái phòng (chỉ cập nhật dọn phòng)" },
  { name: "Bảo trì", count: 3, scope: "Trạng thái phòng (chỉ gắn/gỡ cờ bảo trì)" },
];

export const permissionGroups = [
  { group: "Đặt phòng", perms: ["Xem", "Tạo mới", "Sửa", "Hủy"] },
  { group: "Phòng & giá", perms: ["Xem", "Sửa giá", "Thêm/xóa phòng"] },
  { group: "Thanh toán", perms: ["Xem hóa đơn", "Thu tiền", "Hoàn tiền", "Chạy kế toán đêm"] },
  { group: "Người dùng", perms: ["Xem", "Thêm/xóa tài khoản", "Phân quyền"] },
  { group: "Báo cáo", perms: ["Xem báo cáo doanh thu"] },
];

// ---------- Quản lý tài sản (Assets) — khối `isAssets`, dòng 1383 ----------

export interface AssetRow {
  stt: number;
  name: string;
  code: string;
  room: string;
  value: string;
  qty: number;
  unit: string;
  depMonths: number;
  depValue: string;
  status: string;
  fg: string;
}

export const assets: AssetRow[] = [
  { name: "Điều hoà Daikin", code: "DH", room: "204", value: "10.000.000đ", qty: 35, unit: "Cái", depMonths: 12, depValue: "12.000.000đ", status: "Đang dùng", fg: "#00C853" },
  { name: "Khoá cửa thông minh", code: "KC", room: "118", value: "1.500.000đ", qty: 35, unit: "Cái", depMonths: 12, depValue: "2.000.000đ", status: "Đang dùng", fg: "#00C853" },
  { name: "TV Samsung 55\"", code: "TV", room: "310", value: "8.000.000đ", qty: 35, unit: "Cái", depMonths: 12, depValue: "9.500.000đ", status: "Cần kiểm tra", fg: "#946200" },
  { name: "Bình nóng lạnh", code: "BNL", room: "402", value: "1.000.000đ", qty: 35, unit: "Cái", depMonths: 12, depValue: "12.000.000đ", status: "Hỏng", fg: "#CC2F42" },
  { name: "Camera hành lang T3", code: "CAM", room: "Khu vực chung", value: "1.000.000đ", qty: 35, unit: "Cái", depMonths: 12, depValue: "12.000.000đ", status: "Đang dùng", fg: "#00C853" },
  { name: "Giường đôi", code: "GD", room: "Nhiều phòng", value: "1.000.000đ", qty: 35, unit: "Bộ", depMonths: 12, depValue: "12.000.000đ", status: "Đang dùng", fg: "#00C853" },
  { name: "Tủ lạnh mini", code: "TL", room: "Nhiều phòng", value: "1.000.000đ", qty: 35, unit: "Cái", depMonths: 12, depValue: "12.000.000đ", status: "Hỏng", fg: "#CC2F42" },
  { name: "Quạt treo tường", code: "QT", room: "Nhiều phòng", value: "1.000.000đ", qty: 35, unit: "Cái", depMonths: 12, depValue: "12.000.000đ", status: "Đang dùng", fg: "#00C853" },
  { name: "Tủ quần áo", code: "QA", room: "Nhiều phòng", value: "1.000.000đ", qty: 35, unit: "Cái", depMonths: 12, depValue: "12.000.000đ", status: "Đang dùng", fg: "#00C853" },
].map((a, i) => ({ ...a, stt: i + 1 }));

// ---------- Danh sách cơ sở (Branches) — khối `isBranches`, dòng 1481 ----------

export interface BranchRow {
  id: number;
  area: string;
  province: string;
  building: string;
  floors: number;
  rooms: number;
  status: string;
  statusColor: string;
}

export const branches: BranchRow[] = [
  { id: 1, area: "Khu vực A", province: "Hà Nội", building: "Tòa A", floors: 20, rooms: 16, status: "Hoạt động", statusColor: "#00C853" },
  { id: 2, area: "Khu vực A", province: "Hà Nội", building: "Tòa A", floors: 20, rooms: 16, status: "Bảo trì", statusColor: "#CC2F42" },
  { id: 3, area: "Khu vực B", province: "Hà Nội", building: "Tòa B", floors: 12, rooms: 10, status: "Hoạt động", statusColor: "#00C853" },
  { id: 4, area: "Khu vực Riverside", province: "Đà Nẵng", building: "Tòa A", floors: 8, rooms: 24, status: "Hoạt động", statusColor: "#00C853" },
];

// ---------- Cơ bản (Basic) — khối `isBasic`, dòng 1553 ----------

export const floorInputs = Array.from({ length: 9 }, (_, i) => `Tầng ${i + 1}`);

// ---------- Tiện ích cơ sở (Amenities) — khối `isAmenities`, dòng 1610 ----------

export const amenityGroups: { title: string; items: string[] }[] = [
  { title: "Cơ bản", items: ["Wifi", "Disco (mùa hè)", "Đầu báo cháy", "Vườn", "Lễ tân 24 giờ", "Báo khói", "Sân thượng", "Fax/ Photocopy", "Bãi đỗ xe riêng của khách sạn", "Nhận/trả phòng nhanh", "TV màn hình phẳng", "Nhà để xe (gara)", "Toàn bộ không hút thuốc", "Phòng tân hôn", "Chỉ dành cho người lớn", "Phòng không hút thuốc", "Khuôn viên", "Ven biển", "Thang máy", "Thang máy", "Khách sạn có Spa", "Điều hòa", "Phòng chống dị ứng", "Khách sạn gần khu trượt tuyết", "TV", "Sát biển", "Khách sạn suối khoáng nóng", "Disco (mùa đông)", "Lối vào có camera giám sát"] },
  { title: "Tổng quan", items: ["Ra vào tự do", "Lối đi vào riêng", "Không chung chủ", "Cửa cổng khóa vân tay/ thẻ từ", "Ban công", "Gắn biển", "Cắm trại"] },
  { title: "An toàn - An ninh", items: ["Camera an ninh", "Bảo vệ chung", "Két sắt", "Khóa điện tử", "Bình chữa cháy", "Hệ thống báo cháy"] },
  { title: "Phòng tắm", items: ["Bình nóng lạnh", "Đèn sưởi", "Khăn tắm", "Xà phòng", "Dầu gội", "Kem đánh răng", "Bồn sục", "Phòng tắm gương", "Chậu rửa mặt"] },
  { title: "Mua sắm, giải trí", items: ["Chợ", "Siêu thị", "Tạp hóa"] },
  { title: "Quy định chung", items: ["Cấm nhậu quá 23h", "Cấm làm ồn", "Cấm vật nuôi", "Về trước 22h đêm", "Không dẫn bạn về qua đêm", "Được nấu ăn"] },
  { title: "Cao cấp", items: ["Smart Tivi", "Smarthome", "Smart hotel", "GYM", "Bể bơi"] },
];

// `zip3` — trộn 3 cột dữ liệu thành 1 mảng phẳng theo đúng thứ tự bản gốc (hàm
// `zip3` dòng 2385 bản gốc), để hiển thị đúng thứ tự trong lưới 3 cột (grid-cols-3
// điền theo hàng nên cần trộn xen kẽ mới ra đúng 3 "cột" logic như thiết kế).
function zip3(a: string[], b: string[], c: string[]): string[] {
  const out: string[] = [];
  const n = Math.max(a.length, b.length, c.length);
  for (let i = 0; i < n; i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
    if (c[i]) out.push(c[i]);
  }
  return out;
}

export const activitiesList = zip3(
  ["Xe đạp nước phiêu lưu", "Hộp đêm", "Cơ sở vật chất thể thao tại chỗ", "Cưỡi ngựa", "Hồ bơi ngoài trời (quanh năm)", "Hồ bơi ngoài trời (theo mùa)", "Hồ bơi trong nhà (quanh năm)", "Hồ bơi trong nhà (theo mùa)", "Sân golf nước khoáng nóng (trong vòng 3km)", "Lướt ván buồm", "Phi tiêu", "Casino mini", "Golf", "Karaoke", "Ca-nô", "Sân tennis"],
  ["Câu cá", "Bóng bàn", "Phòng trưng bày", "Lặn", "Lặn ống thở", "Phòng trò chơi", "Bowling", "Trượt tuyết", "Bi-a", "Khu vui chơi trẻ em", "Đi bộ đường dài", "Hồ bơi ngoài trời", "Massage", "Xông hơi", "Bồn tắm nước nóng"],
  ["Trung tâm Spa & chăm sóc sức khỏe", "Hồ bơi trong nhà", "Nhân viên giải trí, phòng xông hơi, phi tiêu...", "Bóng đá mini", "Khúc côn cầu bàn", "Trò chơi điện tử", "Bóng rổ", "Muối", "Nhà hát", "Tuyết", "Đài phun nước", "Cáp treo", "Kayak, xe kart, mô tô", "Vé trượt tuyết / Ghế treo", "Ghế nằm bãi biển & hồ bơi"],
);

export const amenityServicesList = zip3(
  ["Dịch vụ hỗ trợ khách (Concierge)", "Đội ngũ hoạt náo", "Nhận/trả phòng riêng tư", "Cho thuê thiết bị trượt tuyết tại chỗ", "Bán vé trượt tuyết", "Lối vào trượt tuyết tận cửa", "Thực đơn ăn kiêng đặc biệt (theo yêu cầu)", "Máy ép quần", "Máy bán nước tự động", "Máy bán đồ ăn vặt tự động", "Suất ăn trưa mang đi", "Phòng họp/tiệc", "Phòng trăng mật", "Tiện nghi phòng VIP", "Dịch vụ trông trẻ", "Cửa hàng quà lưu niệm", "Đánh giày", "Cửa hàng làm đẹp", "Dịch vụ đặt vé", "Cho thuê xe đạp", "Giặt khô", "Đổi ngoại tệ", "Quầy tư vấn tour", "Thuê xe ô tô", "Ăn sáng tại phòng", "Dịch vụ ủi đồ", "Giặt ủi", "Xe đưa đón sân bay", "Xe đưa đón sân bay (phụ thu)", "Phục vụ phòng", "Máy ATM tại chỗ", "Phòng chống dị ứng", "Ăn sáng buffet", "Khu bãi biển riêng", "Nhà hàng gọi món", "Nhà hàng buffet", "Quầy đồ ăn nhẹ", "Sân thượng tắm nắng", "Tiện nghi cho khách khuyết tật", "Phòng cách âm", "Sưởi ấm", "Thân thiện với LGBT", "Kho chứa đồ trượt tuyết", "Dịch vụ đỗ xe hộ", "Khu vực hút thuốc riêng", "Cửa hàng trong khách sạn", "Phòng gia đình", "Két an toàn", "Báo, tạp chí", "Nhà hàng", "Giữ hành lý", "Quầy bar", "Lễ tân 24 giờ", "Trường dạy trượt tuyết", "Phòng tắm nắng nhân tạo", "Bóng quần (Squash)", "Khu vực BBQ", "Dù che bãi biển & hồ bơi", "Ghế nằm hồ bơi", "Bờ biển", "Ghế nằm bãi biển", "Cầu trượt nước"],
  ["Khăn tắm biển", "Nhân viên cứu hộ", "Hồ bơi nước khoáng nóng", "Chứng nhận Cờ Xanh", "Ghế nằm hồ bơi", "Bờ biển", "Ghế nằm bãi biển", "Cầu trượt nước", "Khăn tắm biển", "Nhân viên cứu hộ", "Hồ bơi nước khoáng nóng", "Chứng nhận Cờ Xanh", "Công viên nước", "Phòng thay đồ", "Xe đưa đón", "Bóng rổ", "Bóng chuyền bãi biển", "Mô tô nước", "Rạp chiếu phim", "Bóng đá (có phí)", "Bữa tối muộn", "Trà chiều", "Hồ bơi trẻ em", "Phù hợp cho trẻ em", "Câu lạc bộ mini", "Cho phép thú cưng", "Quán cà phê Internet", "Cảng biển", "Bác sĩ", "Nhiếp ảnh gia", "Bãi đỗ xe", "Phòng xem TV", "Đèn chiếu sáng sân tennis", "Bãi cát biển", "Cửa hàng tạp hóa", "Máy chơi game Playstation", "Điện thoại gọi trực tiếp", "Dịch vụ báo thức", "Quầy bar mini", "Đồ dùng phòng tắm miễn phí", "Máy sấy tóc", "Dịch vụ đưa đón", "Bếp", "Gương trang điểm", "Sân tennis chiếu sáng ban đêm", "Y tá", "Chợ", "Máy pinball", "Chăm sóc da & cơ thể", "Bóng rổ ban đêm", "Tiệm làm tóc", "Giường tắm nắng", "Ghế cho bé", "Thể dục nhịp điệu", "Bắn cung", "Bóng nước", "Bóng rổ", "Giường cho bé", "Phục vụ phòng", "Dịch vụ nhà nghỉ", "Bữa tối", "Cà phê sân thượng"],
  ["Đồ ăn nhẹ", "Quầy bar sảnh", "Ăn sáng", "Dịch vụ đưa đón", "Điện thoại", "Nhà hàng gọi món", "Bãi đỗ xe riêng", "Phòng tập gym", "Quầy cocktail", "Cửa hàng quà tặng", "Nhà hàng buffet", "Suất ăn kiêng đặc biệt", "Bãi đỗ xe riêng miễn phí", "Khu sinh hoạt chung/xem TV", "Dọn phòng hàng ngày", "Bãi đỗ xe công cộng miễn phí", "Tiệm cắt tóc/làm đẹp", "Hồ bơi", "Căng-tin", "Cửa hàng tiện lợi tại chỗ", "Bóng bàn", "Bồn tắm", "Phòng hội nghị", "Chấp nhận thẻ tín dụng", "Cửa hàng tại chỗ", "Giữ hành lý", "Hồ bơi ngoài trời nam", "Hồ bơi nữ & trẻ em", "Hồ bơi nam & trẻ em", "Bãi biển nữ", "Bãi biển nam", "Hồ bơi ngoài trời nữ", "Hồ bơi nước ấm nữ", "Công viên nước ngoài trời nữ", "Công viên nước nước ấm nữ", "Hồ công viên nước ấm nam", "Công viên nước nước ấm nam", "Công viên nước ngoài trời nam", "Phòng tắm gia đình", "Đồ uống không giới hạn cả ngày", "Súp đêm", "Ăn sáng sớm", "Hồ bơi ngoài trời chung", "Công viên nước trong nhà chung", "Hồ bơi trong nhà chung", "Trung tâm Spa nam", "Trung tâm Spa nữ", "Tắm hơi kiểu Thổ Nhĩ Kỳ (giờ riêng cho nữ)", "Tắm bùn", "Bồn sục Jacuzzi", "Nhà hát ngoài trời", "Hồ bơi trong nhà nữ", "Hồ bơi trong nhà nam", "Lò sưởi", "Đường trượt tuyết", "Quầy vitamin", "Thư viện", "Máy sấy quần áo", "Tùy chọn lưu trú", "Tùy chọn ẩm thực (F&B)", "Đồ ăn Halal"],
);

// ---------- Hình ảnh (Images) — khối `isImages`, dòng 1662 ----------

export const photoGalleryCount = 5;
export const roomImageTypes = [
  { name: "Single", photoCount: 5 },
  { name: "Double", photoCount: 5 },
];

// ---------- Email — khối `isEmail`, dòng 1692 ----------

export const emailFields = [
  { label: "Email", desc: "Nhập địa chỉ email của cơ sở." },
  { label: "Mật khẩu", desc: "Nhập mật khẩu email." },
  { label: "SMTP Host", desc: "Nhập máy chủ SMTP của email." },
  { label: "SMTP Port", desc: "Nhập cổng SMTP của email." },
  { label: "Mã hoá SMTP", desc: "Chọn kiểu mã hoá cho email của cơ sở." },
];

export const autoEmails = ["Khách đặt phòng lưu trú", "Nhắc khách sắp đến ngày đến cơ sở", "Nhắc khách thanh toán hóa đơn", "Cảm ơn khách khi check out khỏi cơ sở"];

// ---------- Bảo vệ (Security) — khối `isSecurity`, dòng 1733 ----------

export const securityItemsSeed = [
  { key: "2fa", label: "Xác thực 2 lớp (2FA)", desc: "Yêu cầu mã OTP khi đăng nhập từ thiết bị lạ", on: true },
  { key: "autologout", label: "Tự động đăng xuất sau 30 phút", desc: "Đăng xuất khi không thao tác", on: true },
  { key: "iprestrict", label: "Giới hạn IP truy cập", desc: "Chỉ cho phép đăng nhập từ IP nội bộ khách sạn", on: false },
];

export const accountActivity = [
  { user: "Lê Thảo", action: "Đăng nhập thành công", time: "25/07 08:12", ip: "192.168.1.12" },
  { user: "Nguyễn Văn Bình", action: "Đổi mật khẩu", time: "24/07 21:40", ip: "192.168.1.20" },
  { user: "Lê Thảo", action: "Sửa quyền vai trò Lễ tân", time: "24/07 14:05", ip: "192.168.1.12" },
];

// ---------- Tiền tệ (Currency) — khối `isCurrency`, dòng 1757 ----------

export const currencies = [
  { code: "VND", name: "Việt Nam Đồng", rate: "1 (mặc định)", isDefault: true },
  { code: "USD", name: "Đô la Mỹ", rate: "1 USD = 25.400 VND", isDefault: false },
  { code: "EUR", name: "Euro", rate: "1 EUR = 27.600 VND", isDefault: false },
];

// ---------- Thuế & phí (Tax) — khối `isTax`, dòng 1772 ----------

export const taxes = [
  { name: "Thuế GTGT (VAT)", rate: "8%", applyTo: "Toàn bộ hoá đơn" },
  { name: "Phí dịch vụ", rate: "5%", applyTo: "Toàn bộ hoá đơn" },
  { name: "Phí môi trường", rate: "20.000đ/phòng/đêm", applyTo: "Tiền phòng" },
];

// ---------- Thời gian (Time) — khối `isTime`, dòng 1809 ----------

export const holidaysSeed = ["Giỗ tổ", "Quốc khánh", "Dương lịch"];
export const prepaidServices = ["Điện", "Nước", "Internet", "Vệ Sinh", "Thang máy"];

// ---------- Đồng bộ hoá (Sync) — khối `isSync`, dòng 1892 ----------

export const otaChannels = ["Booking.com", "Agoda", "Airbnb", "Traveloka", "Expedia"];

// ---------- Cơ sở dữ liệu (Db) — khối `isDb`, dòng 1943 ----------

export const dbInfo = [
  { label: "Sao lưu gần nhất", value: "25/07/2026 03:00" },
  { label: "Tần suất sao lưu", value: "Hàng ngày lúc 03:00" },
  { label: "Dung lượng đã dùng", value: "4.2 GB / 20 GB" },
  { label: "Vị trí lưu trữ", value: "Máy chủ đám mây ANIO Cloud" },
];

// ---------- Mạng xã hội (Social) — khối `isSocial`, dòng 1958 ----------

export interface SocialLink {
  name: string;
  handle: string;
  on: boolean;
  autoOn: boolean;
}

export const socialLinksSeed: SocialLink[] = [
  { name: "Facebook", handle: "facebook.com/anio.riverside", on: true, autoOn: true },
  { name: "Zalo OA", handle: "zalo.me/anioriverside", on: true, autoOn: true },
  { name: "Instagram", handle: "instagram.com/anio.riverside", on: false, autoOn: false },
  { name: "Website", handle: "anioriverside.vn", on: true, autoOn: true },
];

// ---------- Máy in & mẫu in (Printer) — khối `isPrinter`, dòng 2333 ----------

export const printTemplates = [
  { doc: "Hợp đồng lưu trú", template: "Mẫu hợp đồng A4 song ngữ", size: "A4", linked: true },
  { doc: "Hoá đơn thanh toán", template: "Mẫu hoá đơn K80 chuẩn", size: "K80 (80mm)", linked: true },
  { doc: "Hoá đơn GTGT (VAT)", template: "Mẫu hoá đơn điện tử theo Nghị định 123", size: "A5", linked: true },
  { doc: "Phiếu đăng ký lưu trú (tạm trú)", template: "Mẫu A5 theo quy định công an (NA17)", size: "A5", linked: true },
  { doc: "Phiếu khai báo tạm trú người nước ngoài", template: "Mẫu NA17 song ngữ Anh–Việt", size: "A5", linked: true },
  { doc: "Phiếu xác nhận đặt phòng (Booking Confirmation)", template: "Mẫu A4 có logo cơ sở", size: "A4", linked: true },
  { doc: "Biên nhận tạm ứng (Deposit Receipt)", template: "Mẫu biên nhận K80", size: "K80 (80mm)", linked: true },
  { doc: "Phiếu ghi dịch vụ phát sinh (Extra Charge Slip)", template: "Mẫu K80 kèm chữ ký khách", size: "K80 (80mm)", linked: true },
  { doc: "Phiếu bàn giao ca (Shift Handover)", template: "Chưa chọn mẫu", size: "—", linked: false },
  { doc: "Thẻ chìa khoá / thẻ phòng (Key Card Envelope)", template: "Mẫu bao thẻ phòng in logo", size: "Tuỳ chỉnh 8.5×5.4cm", linked: false },
].map((t) => ({ ...t, statusLabel: t.linked ? "Đang dùng" : "Chưa cấu hình", bg: t.linked ? "#E9FBEF" : "#F4F5F6", fg: t.linked ? "#00C853" : "#777E90" }));
