// Tự động chạy migration + seed cho chế độ database embedded (PGlite) khi API
// khởi động lần đầu — người dùng chỉ cần `npm run dev`, không phải gõ thêm lệnh
// migrate/seed thủ công nào (đang bị chặn hoàn toàn vì không bật được Docker).
//
// Đọc trực tiếp các file .sql trong `database/migrations/` (KHÔNG copy nội dung
// sang đây — nguồn sự thật duy nhất vẫn là thư mục database/, dùng chung cho cả
// chế độ embedded lẫn chế độ Postgres thật qua docker compose/`database/migrate.ts`).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { PGlite } from "@electric-sql/pglite";

// apps/api/src/lib/embeddedBootstrap.ts -> lên 4 cấp (lib, src, api, apps) là
// tới property-web/, rồi vào database/migrations. Đúng cho cả chạy dev qua tsx
// (từ src/) lẫn chạy bản build (từ dist/, vì dist/lib nằm cùng độ sâu với src/lib).
const MIGRATIONS_DIR = join(__dirname, "..", "..", "..", "..", "database", "migrations");

const TENANT_ID = "00000000-0000-0000-0000-00000000d001";
const PROPERTY_ID = "00000000-0000-0000-0000-00000000d101";

async function runMigrations(db: PGlite): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS "_migrations" (
      "filename" TEXT PRIMARY KEY,
      "applied_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const appliedResult = await db.query<{ filename: string }>('SELECT filename FROM "_migrations"');
  const applied = new Set(appliedResult.rows.map((r) => r.filename));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[embedded-db] Bỏ qua (đã áp dụng): ${file}`);
      continue;
    }
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    console.log(`[embedded-db] Áp dụng migration: ${file}`);
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query('INSERT INTO "_migrations" (filename) VALUES ($1)', [file]);
    });
  }
}

async function seedDemoData(db: PGlite): Promise<void> {
  console.log("[embedded-db] Chưa có dữ liệu — chạy seed demo lần đầu...");

  // Mật khẩu demo dùng chung — khớp database/seed.ts (đổi từ ChangeMe123! sang
  // Anio2026@ theo yêu cầu đơn giản hoá).
  const passwordHash = await bcrypt.hash("Anio2026@", 10);

  await db.query(
    `INSERT INTO properties (id, tenant_id, name, address, phone, status)
     VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
     ON CONFLICT (id) DO NOTHING`,
    [PROPERTY_ID, TENANT_ID, "ANIO Riverside Hotel", "12 Trần Phú, Hà Nội", "024 3333 4444"]
  );

  async function upsertPropertyUser(username: string, email: string, fullName: string, role: string) {
    await db.query(
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

  // ---- room_types (đúng dữ liệu database/seed.ts) ----
  const ROOM_TYPE_DEFS = [
    { key: "Standard", basePrice: 650000, capacity: 2, bedsBig: 1, bedsSmall: 0, area: 22 },
    { key: "Deluxe", basePrice: 890000, capacity: 2, bedsBig: 1, bedsSmall: 1, area: 28 },
    { key: "Suite", basePrice: 1450000, capacity: 4, bedsBig: 2, bedsSmall: 0, area: 42 },
    { key: "Family", basePrice: 1150000, capacity: 4, bedsBig: 1, bedsSmall: 2, area: 36 },
  ];
  const ZONE_NAMES = ["Khu vực A", "Khu vực B", "Khu vực C"];
  const roomTypeIds: Record<string, string> = {};
  for (const rt of ROOM_TYPE_DEFS) {
    const id = randomUUID();
    roomTypeIds[rt.key] = id;
    await db.query(
      `INSERT INTO room_types (id, property_id, tenant_id, name, base_price, capacity, beds_big, beds_small, area_m2)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, PROPERTY_ID, TENANT_ID, rt.key, rt.basePrice, rt.capacity, rt.bedsBig, rt.bedsSmall, rt.area]
    );
  }

  // ---- rooms (32 phòng, cùng thuật toán buildRooms() ở database/seed.ts) ----
  const roomTypeKeys = ROOM_TYPE_DEFS.map((r) => r.key);
  const roomNumberToId: Record<string, string> = {};
  for (let i = 0; i < 32; i++) {
    const floor = String(Math.floor(i / 11) + 1);
    const type = roomTypeKeys[i % 4];
    const zone = ZONE_NAMES[i % 3];
    const statusKey = i % 9 < 5 ? "OCCUPIED" : i % 9 < 7 ? "VACANT" : i % 9 === 7 ? "DIRTY" : "MAINTENANCE";
    const number = String(101 + i);
    const powerOn = statusKey === "OCCUPIED";
    const id = randomUUID();
    roomNumberToId[number] = id;
    await db.query(
      `INSERT INTO rooms (id, property_id, tenant_id, room_type_id, number, floor, zone, status, power_on)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (property_id, number) DO NOTHING`,
      [id, PROPERTY_ID, TENANT_ID, roomTypeIds[type], number, floor, zone, statusKey, powerOn]
    );
    await db.query(
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
    await db.query(
      `INSERT INTO customers (id, property_id, tenant_id, full_name, phone, email, segment)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, PROPERTY_ID, TENANT_ID, c.name, c.phone, c.email, c.segment]
    );
  }

  // ---- bookings ----
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
    await db.query(
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
    await db.query(
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
    await db.query(
      `INSERT INTO expenses (id, property_id, tenant_id, category, description, amount)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [randomUUID(), PROPERTY_ID, TENANT_ID, e.category, e.desc, e.amount]
    );
  }

  console.log("[embedded-db] Seed hoàn tất. Tài khoản demo (mật khẩu chung: Anio2026@): owner / manager / reception / housekeeping");
}

/**
 * Gọi 1 lần khi API khởi động ở chế độ embedded — chạy migration còn thiếu rồi
 * seed dữ liệu demo nếu bảng property_users đang rỗng. An toàn để gọi lại ở lần
 * khởi động sau (idempotent — bỏ qua migration đã áp dụng, không seed lại nếu
 * đã có dữ liệu).
 */
export async function bootstrapEmbeddedDb(db: PGlite): Promise<void> {
  await runMigrations(db);

  const { rows } = await db.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM property_users");
  if (Number(rows[0]?.count ?? 0) === 0) {
    await seedDemoData(db);
  } else {
    console.log("[embedded-db] Đã có dữ liệu — bỏ qua seed.");
  }
}
