// Tự động chạy migration + seed cho chế độ database embedded (PGlite) khi API
// khởi động lần đầu — người dùng chỉ cần `npm run dev`, không phải gõ thêm lệnh
// migrate/seed thủ công nào (đang bị chặn hoàn toàn vì không bật được Docker).
//
// Đọc trực tiếp các file .sql trong `database/migrations/` (KHÔNG copy nội dung
// sang đây — nguồn sự thật duy nhất vẫn là thư mục database/, dùng chung cho cả
// chế độ embedded lẫn chế độ Postgres thật qua docker compose/`database/migrate.ts`).
// Áp dụng lần lượt 001_init.sql, 002_release_console.sql, 003_purchase_orders.sql
// theo đúng thứ tự tên file — giống hệt cách `database/migrate.ts` làm.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { PGlite } from "@electric-sql/pglite";

// apps/api/src/lib/embeddedBootstrap.ts -> lên 4 cấp (lib, src, api, apps) là
// tới webadmin/, rồi vào database/migrations. Đúng cho cả chạy dev qua tsx
// (từ src/) lẫn chạy bản build (từ dist/, vì dist/lib nằm cùng độ sâu với src/lib).
const MIGRATIONS_DIR = join(__dirname, "..", "..", "..", "..", "database", "migrations");

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
    await db.query("BEGIN");
    try {
      await db.exec(sql);
      await db.query('INSERT INTO "_migrations" (filename) VALUES ($1)', [file]);
      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  }
}

async function seedDemoData(db: PGlite): Promise<void> {
  console.log("[embedded-db] Chưa có dữ liệu — chạy seed demo lần đầu...");

  // Mật khẩu demo — KHỚP CHÍNH XÁC `database/seed.ts` (dùng cho chế độ Docker/
  // Postgres thật). Đây là hệ thống nội bộ công ty (khác `property-web`), giữ
  // nguyên tài khoản/mật khẩu đã có từ trước, KHÔNG đổi.
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);

  async function upsertUser(email: string, fullName: string, role: string) {
    await db.query(
      `INSERT INTO users (id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [randomUUID(), email, passwordHash, fullName, role]
    );
  }
  await upsertUser("admin@hq-console.local", "Quản trị viên hệ thống", "SUPER_ADMIN");
  await upsertUser("sales@hq-console.local", "Trưởng phòng Kinh doanh (demo)", "SALES_MANAGER");
  await upsertUser("accountant@hq-console.local", "Kế toán (demo)", "ACCOUNTANT");
  await upsertUser("supply@hq-console.local", "Chuỗi cung ứng (demo)", "SUPPLY_CHAIN");

  const partnerId = "00000000-0000-0000-0000-000000000001";
  await db.query(
    `INSERT INTO partners (id, name, territory, contact_name, contact_email, default_commission_pct, max_customers, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
     ON CONFLICT (id) DO NOTHING`,
    [partnerId, "Đại lý Miền Bắc (demo)", "Hà Nội, Hải Phòng, Quảng Ninh", "Nguyễn Văn A", "dailymienbac@example.com", 10, 50]
  );

  const supplierId = "00000000-0000-0000-0000-000000000002";
  await db.query(
    `INSERT INTO suppliers (id, name, supplies_types, contact_email, lead_time_days, status)
     VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
     ON CONFLICT (id) DO NOTHING`,
    [supplierId, "Công ty TNHH Thiết bị ABC (demo)", "camera,card_dispenser,thermal_printer", "sales@abc-devices.example.com", 14]
  );

  const customerId = "00000000-0000-0000-0000-000000000003";
  await db.query(
    `INSERT INTO customers_unified (id, name, address, contact_name, partner_id, uses_kiosk, uses_smart_hotel_os, billing_status)
     VALUES ($1, $2, $3, $4, $5, true, true, 'ACTIVE')
     ON CONFLICT (id) DO NOTHING`,
    [customerId, "Khách sạn Hoa Sen (demo)", "12 Trần Phú, Hà Nội", "Lê Thị B", partnerId]
  );

  // asset_code PHẢI sinh qua nextval() của cùng sequence mà hardwareAssets.repo.ts
  // dùng khi tạo tài sản qua API — nếu gán cứng 'AST-000001' ở đây, sequence vẫn ở
  // giá trị chưa dùng và request tạo tài sản ĐẦU TIÊN qua API sẽ nhận đúng
  // 'AST-000001' và bị lỗi trùng khoá (unique constraint) với dòng seed này.
  await db.query(
    `INSERT INTO hardware_assets (id, asset_type, brand, model, serial_number, supplier_id, customer_id, purchase_cost, status, asset_code, activated_at, connection_status)
     VALUES ($1, 'KIOSK', 'FocusBox', 'FB-K1', 'KIOSK-DEMO-0001', $2, $3, 35000000, 'DEPLOYED', 'AST-' || LPAD(nextval('hardware_assets_asset_code_seq')::text, 6, '0'), now(), 'UNKNOWN')
     ON CONFLICT (serial_number) DO NOTHING`,
    [randomUUID(), supplierId, customerId]
  );

  const ruleId = "00000000-0000-0000-0000-000000000004";
  await db.query(
    `INSERT INTO commission_rules (id, partner_id, product_scope, rate_pct, is_recurring)
     VALUES ($1, $2, 'BOTH', 10, true)
     ON CONFLICT (id) DO NOTHING`,
    [ruleId, partnerId]
  );

  await db.query(
    `INSERT INTO commission_records (id, partner_id, customer_id, rule_id, period, amount, status)
     VALUES ($1, $2, $3, $4, '2026-07', 1500000, 'CALCULATED')
     ON CONFLICT (id) DO NOTHING`,
    ["00000000-0000-0000-0000-000000000005", partnerId, customerId, ruleId]
  );

  // ---- app_releases (Release Console, migration 002) ----
  // Dữ liệu demo bổ sung so với database/seed.ts (seed.ts chỉ seed cho 001) —
  // để chế độ embedded có sẵn dữ liệu minh hoạ cho 2 module mới (002/003) mà
  // không phải tự tạo tay sau khi đăng nhập.
  const { rows: adminRows } = await db.query<{ id: string }>(
    `SELECT id FROM users WHERE email = 'admin@hq-console.local'`
  );
  const adminId = adminRows[0]?.id;
  await db.query(
    `INSERT INTO app_releases (id, app_key, version, release_notes, channel, published_at, published_by, is_active)
     VALUES ($1, 'PROPERTY_WEB', '1.2.0', 'Bản phát hành demo — thêm module chi phí và kế toán đêm.', 'STABLE', now(), $2, true)`,
    [randomUUID(), adminId]
  );
  await db.query(
    `INSERT INTO app_releases (id, app_key, version, release_notes, channel, published_at, published_by, is_active)
     VALUES ($1, 'KIOSK_APP', '3.4.1', 'Bản phát hành demo — vá lỗi in hoá đơn nhiệt.', 'STABLE', now(), $2, true)`,
    [randomUUID(), adminId]
  );

  // ---- purchase_orders / purchase_order_items (migration 003) ----
  const poId = randomUUID();
  await db.query(
    `INSERT INTO purchase_orders (id, supplier_id, status, expected_at, created_by, notes)
     VALUES ($1, $2, 'ORDERED', now() + interval '14 days', $3, 'Đơn demo — máy quét QR + đầu đọc thẻ đợt Q3.')`,
    [poId, supplierId, adminId]
  );
  await db.query(
    `INSERT INTO purchase_order_items (id, purchase_order_id, product_name, asset_type, quantity, unit_price)
     VALUES ($1, $2, 'Máy quét QR cầm tay', 'QR_SCANNER', 5, 1200000)`,
    [randomUUID(), poId]
  );
  await db.query(
    `INSERT INTO purchase_order_items (id, purchase_order_id, product_name, asset_type, quantity, unit_price)
     VALUES ($1, $2, 'Đầu đọc/phát hành thẻ phòng', 'CARD_DISPENSER', 3, 4500000)`,
    [randomUUID(), poId]
  );

  console.log("[embedded-db] Seed hoàn tất. Tài khoản demo (mật khẩu chung: ChangeMe123!):");
  console.log("  - admin@hq-console.local (SUPER_ADMIN)");
  console.log("  - sales@hq-console.local (SALES_MANAGER)");
  console.log("  - accountant@hq-console.local (ACCOUNTANT)");
  console.log("  - supply@hq-console.local (SUPPLY_CHAIN)");
}

/**
 * Gọi 1 lần khi API khởi động ở chế độ embedded — chạy migration còn thiếu rồi
 * seed dữ liệu demo nếu bảng users đang rỗng. An toàn để gọi lại ở lần khởi
 * động sau (idempotent — bỏ qua migration đã áp dụng, không seed lại nếu đã
 * có dữ liệu).
 */
export async function bootstrapEmbeddedDb(db: PGlite): Promise<void> {
  await runMigrations(db);

  const { rows } = await db.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users");
  if (Number(rows[0]?.count ?? 0) === 0) {
    await seedDemoData(db);
  } else {
    console.log("[embedded-db] Đã có dữ liệu — bỏ qua seed.");
  }
}
