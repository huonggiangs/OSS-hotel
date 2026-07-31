// Tự động chạy migration + seed cho chế độ database embedded (PGlite) khi
// Edge Node khởi động lần đầu — người dùng chỉ cần `npm run dev`, không phải
// gõ thêm lệnh migrate/seed thủ công nào. Y HỆT pattern
// property-web/apps/api/src/lib/embeddedBootstrap.ts (đọc trực tiếp file .sql
// trong database/migrations/, KHÔNG copy nội dung sang đây).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { PGlite } from "@electric-sql/pglite";

// apps/edge-node/src/lib/embeddedBootstrap.ts -> lên 3 cấp (lib, src, apps/edge-node)
// là tới apps/edge-node/, rồi vào database/migrations. Đúng cho cả chạy dev qua
// tsx (từ src/) lẫn chạy bản build (từ dist/, vì dist/lib nằm cùng độ sâu với src/lib).
const MIGRATIONS_DIR = join(__dirname, "..", "..", "database", "migrations");

// Khớp ĐÚNG PROPERTY_ID/TENANT_ID demo "ANIO Riverside Hotel" đã seed sẵn ở
// property-web/apps/api/src/lib/embeddedBootstrap.ts — để 2 hệ thống nói về
// cùng 1 cơ sở khi demo đồng bộ push/pull với CLOUD_PROPERTY_API_URL trỏ vào
// property-web chạy cục bộ (cổng 4100).
const TENANT_ID = process.env.TENANT_ID ?? "00000000-0000-0000-0000-00000000d001";
const PROPERTY_ID = process.env.PROPERTY_ID ?? "00000000-0000-0000-0000-00000000d101";

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

  // Mật khẩu demo dùng CHUNG với property-web (Anio2026@) — cố tình để cùng
  // tài khoản/mật khẩu đăng nhập được ở CẢ Cloud lẫn Edge Node khi offline
  // (xem README.md mục "Đồng bộ property_users" — Edge Node không đồng bộ
  // được password_hash thật từ Cloud qua API công khai, nên seed sẵn local
  // với mật khẩu demo giống Cloud để offline login hoạt động ngay).
  const passwordHash = await bcrypt.hash("Anio2026@", 10);

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

  // ---- room_types (rút gọn hơn property-web — đủ để demo, đồng bộ pull-sync
  // sẽ tự cập nhật lại đúng dữ liệu thật từ Cloud khi có mạng) ----
  const ROOM_TYPE_DEFS = [
    { key: "Standard", basePrice: 650000, capacity: 2, bedsBig: 1, bedsSmall: 0, area: 22 },
    { key: "Deluxe", basePrice: 890000, capacity: 2, bedsBig: 1, bedsSmall: 1, area: 28 },
    { key: "Suite", basePrice: 1450000, capacity: 4, bedsBig: 2, bedsSmall: 0, area: 42 },
  ];
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

  // ---- rooms (12 phòng — đủ nhỏ để test nhanh trên UI khẩn cấp) ----
  const roomTypeKeys = ROOM_TYPE_DEFS.map((r) => r.key);
  const roomNumberToId: Record<string, string> = {};
  for (let i = 0; i < 12; i++) {
    const floor = String(Math.floor(i / 6) + 1);
    const type = roomTypeKeys[i % 3];
    const zone = ["Khu A", "Khu B"][i % 2];
    const statusKey = i % 4 === 0 ? "OCCUPIED" : i % 4 === 1 ? "VACANT" : i % 4 === 2 ? "DIRTY" : "VACANT";
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
      [randomUUID(), PROPERTY_ID, TENANT_ID, id, `Công tắc điện phòng ${number}`, `EN-SWITCH-${number}`, powerOn ? "ONLINE" : "OFFLINE", powerOn]
    );
  }

  // ---- 1 booking demo để màn hình danh sách không trống khi mới cài ----
  await db.query(
    `INSERT INTO bookings (id, property_id, tenant_id, code, guest_name, guest_phone, room_id, channel, status, checkin_date, checkout_date, total_price, deposit)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (code) DO NOTHING`,
    [
      randomUUID(),
      PROPERTY_ID,
      TENANT_ID,
      "EN-2026001",
      "Nguyễn Văn An",
      "0912 345 678",
      roomNumberToId["101"],
      "DIRECT",
      "CONFIRMED",
      "2026-07-31",
      "2026-08-02",
      1300000,
      300000,
    ]
  );

  console.log("[embedded-db] Seed hoàn tất. Tài khoản demo (mật khẩu chung: Anio2026@): owner / manager / reception / housekeeping");
}

/**
 * Gọi 1 lần khi Edge Node khởi động ở chế độ embedded — chạy migration còn
 * thiếu rồi seed dữ liệu demo nếu bảng property_users đang rỗng. An toàn để
 * gọi lại ở lần khởi động sau (idempotent).
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
