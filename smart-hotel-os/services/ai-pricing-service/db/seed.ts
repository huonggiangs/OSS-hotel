/**
 * Seed dữ liệu demo — 1 pricing_rule mẫu cho property/room-type demo, có 1
 * ngày lễ cấu hình sẵn (ngày Quốc khánh 2/9 năm hiện tại) để demo được nhánh
 * "là_ngày_lễ" của thuật toán.
 *
 * Chạy: npm run seed (sau khi npm run migrate)
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const TENANT_ID = "demo-tenant";
const PROPERTY_ID = "demo-property-1";
const ROOM_TYPE_ID = "room-type-deluxe";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const year = new Date().getFullYear();
  const holidayDate = `${year}-09-02`;

  await client.query(
    `INSERT INTO pricing_rules
      (id, tenant_id, property_id, room_type_id, base_price, min_price, max_price,
       weekend_days, weekend_multiplier, occupancy_threshold_pct, occupancy_multiplier,
       holiday_dates, holiday_multiplier,
       clearance_lead_time_hours, clearance_occupancy_threshold_pct, clearance_multiplier)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT (property_id, room_type_id) DO UPDATE SET
       base_price = EXCLUDED.base_price, updated_at = now()`,
    [
      randomUUID(),
      TENANT_ID,
      PROPERTY_ID,
      ROOM_TYPE_ID,
      1000000, // base_price: 1.000.000 VND / đêm
      600000, // min_price
      2000000, // max_price
      JSON.stringify([5, 6]),
      1.3,
      80,
      1.2,
      JSON.stringify([holidayDate]),
      1.6,
      24,
      50,
      0.85,
    ]
  );

  console.log("Seed ai-pricing-service xong.");
  console.log(`  tenant_id=${TENANT_ID} property_id=${PROPERTY_ID} room_type_id=${ROOM_TYPE_ID} holiday=${holidayDate}`);
  await client.end();
}

main().catch((err) => {
  console.error("Seed thất bại:", err);
  process.exit(1);
});
