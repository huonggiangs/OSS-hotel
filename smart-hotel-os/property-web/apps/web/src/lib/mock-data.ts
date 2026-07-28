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

// campaignsSeed (mảng dữ liệu mẫu) đã XOÁ — trang /marketing ĐÃ NỐI API THẬT
// (property_settings nhóm "marketing"), chỉ còn giữ type `CampaignRow` để dùng
// chung + `campaignAudienceOptions` (modal Thêm chiến dịch vẫn dùng tĩnh).
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

// customersSeed (mảng dữ liệu mẫu) đã XOÁ — trang /customers ĐÃ NỐI API THẬT
// (GET /api/v1/customers), chỉ còn giữ type `CustomerRow`/`CustomerTransaction`.

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

// ownServicesSeed (mảng dữ liệu mẫu) đã XOÁ — trang /services ĐÃ NỐI API THẬT
// (property_settings nhóm "services"), chỉ còn giữ type `OwnServiceRow`.

export interface PartnerServiceRow {
  name: string;
  category: string;
  distance: string;
  commission: string;
  linked: boolean;
}

// partnerServicesList (mảng dữ liệu mẫu) đã XOÁ cùng lý do trên.

// ---------- Tiện ích (Utilities) — khối `isUtilities`, dòng 2246 ----------

export interface UtilityLink {
  key: "maps" | "hotel";
  name: string;
  desc: string;
  linked: boolean;
}

// utilityLinksSeed (mảng dữ liệu mẫu) đã XOÁ — trang /utilities ĐÃ NỐI API
// THẬT (property_settings nhóm "utilities").

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

// advancedModulesSeed (mảng dữ liệu mẫu) đã XOÁ — trang /modules ĐÃ NỐI API
// THẬT (property_settings nhóm "modules").

// ---------- Kênh bán OTA (Channel) — khối `isChannel`, dòng 1274 ----------
// channels/ChannelRow (mảng dữ liệu mẫu) đã XOÁ — trang /channel ĐÃ NỐI API
// THẬT (property_settings nhóm "channel").

// ---------- Người dùng & phân quyền (Users) — khối `isUsers`, dòng 1289 ----------
// roles/RoleRow (mảng dữ liệu mẫu) đã XOÁ — trang /users ĐÃ NỐI API THẬT
// (property_settings nhóm "roles" + bảng property_users thật). permissionGroups
// vẫn giữ (RolePopupModal dùng tĩnh).

export const permissionGroups = [
  { group: "Đặt phòng", perms: ["Xem", "Tạo mới", "Sửa", "Hủy"] },
  { group: "Phòng & giá", perms: ["Xem", "Sửa giá", "Thêm/xóa phòng"] },
  { group: "Thanh toán", perms: ["Xem hóa đơn", "Thu tiền", "Hoàn tiền", "Chạy kế toán đêm"] },
  { group: "Người dùng", perms: ["Xem", "Thêm/xóa tài khoản", "Phân quyền"] },
  { group: "Báo cáo", perms: ["Xem báo cáo doanh thu"] },
];

// ---------- Quản lý tài sản (Assets) — khối `isAssets`, dòng 1383 ----------
// assets/AssetRow (mảng dữ liệu mẫu) đã XOÁ — trang /assets ĐÃ NỐI API THẬT
// (property_settings nhóm "assets").

// ---------- Danh sách cơ sở (Branches) — khối `isBranches`, dòng 1481 ----------
// branches/BranchRow (mảng dữ liệu mẫu) đã XOÁ — trang /branches ĐÃ NỐI API
// THẬT (GET/POST /api/v1/branches, bảng "properties").

// ---------- Cơ bản (Basic) — khối `isBasic`, dòng 1553 ----------
// floorInputs đã XOÁ — trang /basic ĐÃ NỐI API THẬT (property_settings nhóm "basic").

// ---------- Tiện ích cơ sở (Amenities) — khối `isAmenities`, dòng 1610 ----------
// amenityGroups/zip3/activitiesList/amenityServicesList đã XOÁ — trang
// /amenities ĐÃ NỐI API THẬT (property_settings nhóm "amenities", đã seed đúng
// nguyên văn danh sách dài trong apps/api/src/lib/defaultSettings.ts).

// ---------- Hình ảnh (Images) — khối `isImages`, dòng 1662 ----------
// photoGalleryCount/roomImageTypes đã XOÁ — trang /images ĐÃ NỐI API THẬT
// (property_settings nhóm "images").

// ---------- Email — khối `isEmail`, dòng 1692 ----------
// emailFields/autoEmails đã XOÁ — trang /email ĐÃ NỐI API THẬT (property_settings
// nhóm "email").

// ---------- Bảo vệ (Security) — khối `isSecurity`, dòng 1733 ----------
// securityItemsSeed đã XOÁ — trang /security ĐÃ NỐI API THẬT (property_settings
// nhóm "security"). accountActivity vẫn giữ mock (chưa có nguồn audit log
// riêng cho UI này, xem PROGRESS.md).

export const accountActivity = [
  { user: "Lê Thảo", action: "Đăng nhập thành công", time: "25/07 08:12", ip: "192.168.1.12" },
  { user: "Nguyễn Văn Bình", action: "Đổi mật khẩu", time: "24/07 21:40", ip: "192.168.1.20" },
  { user: "Lê Thảo", action: "Sửa quyền vai trò Lễ tân", time: "24/07 14:05", ip: "192.168.1.12" },
];

// ---------- Tiền tệ (Currency) — khối `isCurrency`, dòng 1757 ----------
// currencies đã XOÁ — trang /currency ĐÃ NỐI API THẬT (property_settings nhóm
// "currency").

// ---------- Thuế & phí (Tax) — khối `isTax`, dòng 1772 ----------
// taxes đã XOÁ — trang /tax ĐÃ NỐI API THẬT (property_settings nhóm "tax").

// ---------- Thời gian (Time) — khối `isTime`, dòng 1809 ----------
// holidaysSeed/prepaidServices đã XOÁ — trang /time ĐÃ NỐI API THẬT
// (property_settings nhóm "time").

// ---------- Đồng bộ hoá (Sync) — khối `isSync`, dòng 1892 ----------
// otaChannels đã XOÁ — trang /sync ĐÃ NỐI API THẬT (property_settings nhóm "sync").

// ---------- Cơ sở dữ liệu (Db) — khối `isDb`, dòng 1943 ----------
// dbInfo đã XOÁ — trang /db ĐÃ NỐI API THẬT (property_settings nhóm "db").

// ---------- Mạng xã hội (Social) — khối `isSocial`, dòng 1958 ----------
// socialLinksSeed/SocialLink đã XOÁ — trang /social ĐÃ NỐI API THẬT
// (property_settings nhóm "social", interface khai báo lại tại chỗ trong page.tsx).

// ---------- Máy in & mẫu in (Printer) — khối `isPrinter`, dòng 2333 ----------
// printTemplates đã XOÁ — trang /printer ĐÃ NỐI API THẬT (property_settings
// nhóm "printer").
