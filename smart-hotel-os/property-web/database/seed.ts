/**
 * Seed dữ liệu demo — TÁCH BIỆT HOÀN TOÀN với production, chỉ dùng cho môi
 * trường dev/demo cục bộ. Lấy tên/khu vực/giá phòng đúng theo dữ liệu mẫu đã có
 * sẵn trong `apps/web/src/lib/mock-data.ts` (roomTypePrices, buildRooms(),
 * customersSeed, bookings, invoices, expenses...) để khi nối API thật vào UI,
 * số liệu hiển thị gần giống với bản mock trước đó — không bắt buộc khớp 100%
 * (vd. số phòng trong `bookings` mock không nằm trong dải 101-132 do
 * buildRooms() sinh ra một cách độc lập, đây là mock rời rạc không tham chiếu
 * chéo — ở seed thật, bookings PHẢI trỏ đúng room_id có thật nên đã chọn lại
 * phòng cho khớp).
 *
 * Chạy: npm run seed (trong thư mục database/), SAU khi đã chạy `npm run migrate`.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import bcrypt from "bcryptjs";

const TENANT_ID = "00000000-0000-0000-0000-00000000d001";
const PROPERTY_ID = "00000000-0000-0000-0000-00000000d101";

const ROOM_TYPE_DEFS = [
  { key: "Standard", basePrice: 650000, capacity: 2, bedsBig: 1, bedsSmall: 0, area: 22 },
  { key: "Deluxe", basePrice: 890000, capacity: 2, bedsBig: 1, bedsSmall: 1, area: 28 },
  { key: "Suite", basePrice: 1450000, capacity: 4, bedsBig: 2, bedsSmall: 0, area: 42 },
  { key: "Family", basePrice: 1150000, capacity: 4, bedsBig: 1, bedsSmall: 2, area: 36 },
];
const ZONE_NAMES = ["Khu vực A", "Khu vực B", "Khu vực C"];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Docker Compose chạy job migrate/seed ở mỗi lần `up`. Seed fixture phải
  // idempotent: nếu property demo đã tồn tại thì giữ nguyên toàn bộ dữ liệu
  // người dùng/test đã sửa, không tạo UUID mới rồi va chạm foreign key.
  const existing = await client.query("SELECT 1 FROM properties WHERE id = $1 LIMIT 1", [PROPERTY_ID]);
  if (existing.rowCount) {
    console.log("Seed Property Web đã tồn tại — bỏ qua để giữ dữ liệu hiện có.");
    await client.end();
    return;
  }

  // Mật khẩu demo dùng chung — đổi từ "ChangeMe123!" sang "Anio2026@" theo yêu cầu
  // đơn giản hoá đăng nhập (dễ nhớ hơn khi demo/test cục bộ).
  const passwordHash = await bcrypt.hash("Anio2026@", 10);

  // ---- property ----
  await client.query(
    `INSERT INTO properties (id, tenant_id, name, address, phone, status)
     VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
     ON CONFLICT (id) DO NOTHING`,
    [PROPERTY_ID, TENANT_ID, "ANIO Riverside Hotel", "12 Trần Phú, Hà Nội", "024 3333 4444"]
  );

  // ---- property_users (4 vai trò tối thiểu: OWNER, MANAGER, RECEPTIONIST, HOUSEKEEPING).
  // Đăng nhập bằng "username" ngắn (owner/manager/reception/housekeeping) — bỏ đuôi
  // "@anio-riverside.local" theo yêu cầu đơn giản hoá. Cột "email" vẫn giữ (dùng làm
  // địa chỉ liên hệ + tương thích ngược, xem migration 002_add_username.sql).
  async function upsertPropertyUser(username: string, email: string, fullName: string, role: string) {
    await client.query(
      `INSERT INTO property_users (id, property_id, tenant_id, username, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (username) DO NOTHING`,
      [randomUUID(), PROPERTY_ID, TENANT_ID, username, email, passwordHash, fullName, role]
    );
  }
  await upsertPropertyUser("owner", "owner@anio-riverside.local", "Nguyễn Văn Chủ", "OWNER");
  await upsertPropertyUser("manager", "manager@anio-riverside.local", "Lê Thảo", "MANAGER");
  await upsertPropertyUser("reception", "reception@anio-riverside.local", "Trần Thị Mai", "RECEPTIONIST");
  await upsertPropertyUser("housekeeping", "housekeeping@anio-riverside.local", "Nguyễn Văn Bình", "HOUSEKEEPING");

  // ---- room_types ----
  const roomTypeIds: Record<string, string> = {};
  for (const rt of ROOM_TYPE_DEFS) {
    const id = randomUUID();
    roomTypeIds[rt.key] = id;
    await client.query(
      `INSERT INTO room_types (id, property_id, tenant_id, name, base_price, capacity, beds_big, beds_small, area_m2)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, PROPERTY_ID, TENANT_ID, rt.key, rt.basePrice, rt.capacity, rt.bedsBig, rt.bedsSmall, rt.area]
    );
  }

  // ---- rooms — sinh 32 phòng theo đúng thuật toán buildRooms() trong mock-data.ts,
  // để trạng thái/điện đúng đồng dạng với UI khi còn hiển thị dữ liệu mock trước đó ----
  const roomIds: string[] = [];
  const roomNumberToId: Record<string, string> = {};
  const roomTypeKeys = ROOM_TYPE_DEFS.map((r) => r.key);
  for (let i = 0; i < 32; i++) {
    const floor = String(Math.floor(i / 11) + 1);
    const type = roomTypeKeys[i % 4];
    const zone = ZONE_NAMES[i % 3];
    const statusKey = i % 9 < 5 ? "OCCUPIED" : i % 9 < 7 ? "VACANT" : i % 9 === 7 ? "DIRTY" : "MAINTENANCE";
    const number = String(101 + i);
    const powerOn = statusKey === "OCCUPIED";
    const id = randomUUID();
    roomIds.push(id);
    roomNumberToId[number] = id;
    await client.query(
      `INSERT INTO rooms (id, property_id, tenant_id, room_type_id, number, floor, zone, status, power_on)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (property_id, number) DO NOTHING`,
      [id, PROPERTY_ID, TENANT_ID, roomTypeIds[type], number, floor, zone, statusKey, powerOn]
    );

    // Mỗi phòng đang ở có 1 thiết bị công tắc điện (IoT) đăng ký kèm theo, khớp UI
    // công tắc điện trong lưới phòng.
    await client.query(
      `INSERT INTO devices (id, property_id, tenant_id, room_id, device_type, name, external_id, status, power_on)
       VALUES ($1,$2,$3,$4,'POWER_SWITCH',$5,$6,$7,$8)`,
      [randomUUID(), PROPERTY_ID, TENANT_ID, id, `Công tắc điện phòng ${number}`, `SWITCH-${number}`, powerOn ? "ONLINE" : "OFFLINE", powerOn]
    );
  }

  // ---- customers ----
  const customerDefs = [
    { name: "Nguyễn Văn An", phone: "0912 345 678", email: "a.nguyen@anio.vn", segment: "Khách quen" },
    { name: "Trần Thị Bích", phone: "0987 654 321", email: "b.tran@anio.vn", segment: "Mới" },
    { name: "Lê Hoàng Nam", phone: "0901 222 333", email: "nam.le@anio.vn", segment: "VIP" },
    { name: "Phạm Thu Hà", phone: "0933 111 222", email: "ha.pham@anio.vn", segment: "Mới" },
  ];
  const customerIds: Record<string, string> = {};
  for (const c of customerDefs) {
    const id = randomUUID();
    customerIds[c.name] = id;
    await client.query(
      `INSERT INTO customers (id, property_id, tenant_id, full_name, phone, email, segment)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, PROPERTY_ID, TENANT_ID, c.name, c.phone, c.email, c.segment]
    );
  }

  // ---- bookings — chọn lại số phòng có thật trong dải 101-132 (khác dải số phòng
  // "204/118/310/402/115" ở bản mock rời rạc, xem ghi chú đầu file) ----
  const bookingDefs = [
    { guest: "Nguyễn Văn An", room: "101", channel: "BOOKING_COM", status: "CONFIRMED", checkin: "2026-07-25", checkout: "2026-07-28", total: 2670000, deposit: 500000 },
    { guest: "Trần Thị Bích", room: "106", channel: "DIRECT", status: "CHECKED_IN", checkin: "2026-07-24", checkout: "2026-07-26", total: 1300000, deposit: 0 },
    { guest: "Lê Hoàng Nam", room: "112", channel: "AIRBNB", status: "PENDING", checkin: "2026-07-26", checkout: "2026-07-31", total: 7250000, deposit: 1000000 },
    { guest: "Phạm Thu Hà", room: "120", channel: "AGODA", status: "CHECKED_OUT", checkin: "2026-07-20", checkout: "2026-07-22", total: 1780000, deposit: 0 },
    { guest: "Nguyễn Văn An", room: "125", channel: "DIRECT", status: "CANCELLED", checkin: "2026-07-23", checkout: "2026-07-24", total: 650000, deposit: 0 },
  ];
  let seq = 1;
  for (const b of bookingDefs) {
    const code = `HD-2026${String(seq++).padStart(3, "0")}`;
    await client.query(
      `INSERT INTO bookings (id, property_id, tenant_id, code, customer_id, room_id, channel, status, checkin_date, checkout_date, total_price, deposit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (code) DO NOTHING`,
      [randomUUID(), PROPERTY_ID, TENANT_ID, code, customerIds[b.guest], roomNumberToId[b.room], b.channel, b.status, b.checkin, b.checkout, b.total, b.deposit]
    );
  }

  // ---- invoices ----
  const invoiceDefs = [
    { guest: "Nguyễn Văn An", method: "CARD", amount: 2400000, status: "PAID" },
    { guest: "Trần Thị Bích", method: "CASH", amount: 1100000, status: "PAID" },
    { guest: "Lê Hoàng Nam", method: "BANK_TRANSFER", amount: 4750000, status: "PENDING" },
    { guest: "Phạm Thu Hà", method: "OTA_WALLET", amount: 1780000, status: "PAID" },
  ];
  let invSeq = 1;
  for (const inv of invoiceDefs) {
    const code = `HD-${8890 + invSeq++}`;
    await client.query(
      `INSERT INTO invoices (id, property_id, tenant_id, code, guest_name, method, amount, status, paid_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (code) DO NOTHING`,
      [randomUUID(), PROPERTY_ID, TENANT_ID, code, inv.guest, inv.method, inv.amount, inv.status, inv.status === "PAID" ? new Date() : null]
    );
  }

  // ---- expenses ----
  const expenseDefs = [
    { category: "Tiền điện", desc: "Thanh toán điện tháng 7", amount: 3200000 },
    { category: "Vệ sinh", desc: "Mua dụng cụ vệ sinh phòng", amount: 450000 },
    { category: "Tiền nước", desc: "Thanh toán nước tháng 7", amount: 980000 },
    { category: "Mua đồ dùng", desc: "Mua khăn tắm, ga giường", amount: 1650000 },
  ];
  for (const e of expenseDefs) {
    await client.query(
      `INSERT INTO expenses (id, property_id, tenant_id, category, description, amount)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [randomUUID(), PROPERTY_ID, TENANT_ID, e.category, e.desc, e.amount]
    );
  }

  console.log("Seed hoàn tất. Tài khoản demo cấp cơ sở (mật khẩu chung: Anio2026@):");
  console.log("  - owner (OWNER)");
  console.log("  - manager (MANAGER)");
  console.log("  - reception (RECEPTIONIST)");
  console.log("  - housekeeping (HOUSEKEEPING)");

  await client.end();
}

main().catch((err) => {
  console.error("Seed thất bại:", err);
  process.exit(1);
});
