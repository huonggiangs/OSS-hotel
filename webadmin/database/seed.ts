/**
 * Seed dữ liệu demo — TÁCH BIỆT HOÀN TOÀN với production, chỉ dùng cho môi
 * trường dev/demo cục bộ.
 *
 * Chạy: npm run seed (trong thư mục database/), SAU khi đã chạy `npm run migrate`.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import bcrypt from "bcryptjs";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);

  async function upsertUser(email: string, fullName: string, role: string) {
    await client.query(
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
  await client.query(
    `INSERT INTO partners (id, name, territory, contact_name, contact_email, default_commission_pct, max_customers, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
     ON CONFLICT (id) DO NOTHING`,
    [partnerId, "Đại lý Miền Bắc (demo)", "Hà Nội, Hải Phòng, Quảng Ninh", "Nguyễn Văn A", "dailymienbac@example.com", 10, 50]
  );

  const supplierId = "00000000-0000-0000-0000-000000000002";
  await client.query(
    `INSERT INTO suppliers (id, name, supplies_types, contact_email, lead_time_days, status)
     VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
     ON CONFLICT (id) DO NOTHING`,
    [supplierId, "Công ty TNHH Thiết bị ABC (demo)", "camera,card_dispenser,thermal_printer", "sales@abc-devices.example.com", 14]
  );

  const customerId = "00000000-0000-0000-0000-000000000003";
  await client.query(
    `INSERT INTO customers_unified (id, name, address, contact_name, partner_id, uses_kiosk, uses_smart_hotel_os, billing_status)
     VALUES ($1, $2, $3, $4, $5, true, true, 'ACTIVE')
     ON CONFLICT (id) DO NOTHING`,
    [customerId, "Khách sạn Hoa Sen (demo)", "12 Trần Phú, Hà Nội", "Lê Thị B", partnerId]
  );

  // asset_code sinh qua nextval() của cùng sequence mà hardwareAssets.repo.ts dùng
  // (xem giải thích chi tiết trong embeddedBootstrap.ts seedDemoData()) — tránh
  // trùng mã với tài sản đầu tiên tạo qua API sau khi seed.
  await client.query(
    `INSERT INTO hardware_assets (id, asset_type, brand, model, serial_number, supplier_id, customer_id, purchase_cost, status, asset_code, activated_at, connection_status)
     VALUES ($1, 'KIOSK', 'FocusBox', 'FB-K1', 'KIOSK-DEMO-0001', $2, $3, 35000000, 'DEPLOYED', 'AST-' || LPAD(nextval('hardware_assets_asset_code_seq')::text, 6, '0'), now(), 'UNKNOWN')
     ON CONFLICT (serial_number) DO NOTHING`,
    [randomUUID(), supplierId, customerId]
  );

  // ID cố định để seed có thể chạy lại an toàn khi watcher rebuild Docker;
  // tránh tạo thêm quy tắc/bản ghi hoa hồng trùng mỗi lần source đổi.
  const ruleId = "00000000-0000-0000-0000-000000000004";
  await client.query(
    `INSERT INTO commission_rules (id, partner_id, product_scope, rate_pct, is_recurring)
     VALUES ($1, $2, 'BOTH', 10, true)
     ON CONFLICT (id) DO NOTHING`,
    [ruleId, partnerId]
  );

  await client.query(
    `INSERT INTO commission_records (id, partner_id, customer_id, rule_id, period, amount, status)
     VALUES ($1, $2, $3, $4, '2026-07', 1500000, 'CALCULATED')
     ON CONFLICT (id) DO NOTHING`,
    ["00000000-0000-0000-0000-000000000005", partnerId, customerId, ruleId]
  );

  console.log("Seed hoàn tất. Tài khoản demo (mật khẩu: ChangeMe123!):");
  console.log("  - admin@hq-console.local (SUPER_ADMIN)");
  console.log("  - sales@hq-console.local (SALES_MANAGER)");
  console.log("  - accountant@hq-console.local (ACCOUNTANT)");
  console.log("  - supply@hq-console.local (SUPPLY_CHAIN)");

  await client.end();
}

main().catch((err) => {
  console.error("Seed thất bại:", err);
  process.exit(1);
});
