/**
 * Seed 6 khách demo, mỗi khách rơi vào đúng 1 kịch bản segment khác nhau để
 * dễ kiểm chứng POST /segments/recompute:
 *   - Nguyễn VIP        -> VIP (nhiều lượt ở + chi tiêu cao)
 *   - Trần Quay Lại     -> RETURNING_GUEST
 *   - Lê Khách Mới      -> NEW_GUEST (mới ở 1 lần)
 *   - Phạm Lâu Quay Lại -> INACTIVE_30D
 *   - Hoàng Lâu Rồi     -> INACTIVE_90D
 *   - Vũ Từ Chối        -> RETURNING_GUEST nhưng opt_out=true (test không gửi campaign)
 *
 * Chạy: npm run seed (sau khi npm run migrate)
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const TENANT_ID = "demo-tenant";
const PROPERTY_ID = "demo-property-1";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  // Format theo giờ ĐỊA PHƯƠNG (không dùng toISOString()) để tránh lệch ngày
  // do quy đổi UTC — xem giải thích ở src/lib/db.ts.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const customers = [
    { id: "cust-vip", name: "Nguyễn VIP", phone: "0901111111", stays: 6, spend: 25_000_000, lastCheckout: daysAgo(10), optOut: false },
    { id: "cust-returning", name: "Trần Quay Lại", phone: "0902222222", stays: 3, spend: 6_000_000, lastCheckout: daysAgo(5), optOut: false },
    { id: "cust-new", name: "Lê Khách Mới", phone: "0903333333", stays: 1, spend: 1_500_000, lastCheckout: daysAgo(2), optOut: false },
    { id: "cust-inactive30", name: "Phạm Lâu Quay Lại", phone: "0904444444", stays: 2, spend: 3_000_000, lastCheckout: daysAgo(45), optOut: false },
    { id: "cust-inactive90", name: "Hoàng Lâu Rồi", phone: "0905555555", stays: 1, spend: 1_000_000, lastCheckout: daysAgo(120), optOut: false },
    { id: "cust-optout", name: "Vũ Từ Chối", phone: "0906666666", stays: 4, spend: 8_000_000, lastCheckout: daysAgo(3), optOut: true },
  ];

  for (const c of customers) {
    await client.query(
      `INSERT INTO customers (id, tenant_id, property_id, full_name, phone, total_stays, total_spend, last_stay_check_out, opt_out)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         total_stays = EXCLUDED.total_stays, total_spend = EXCLUDED.total_spend,
         last_stay_check_out = EXCLUDED.last_stay_check_out, opt_out = EXCLUDED.opt_out, updated_at = now()`,
      [c.id, TENANT_ID, PROPERTY_ID, c.name, c.phone, c.stays, c.spend, c.lastCheckout, c.optOut]
    );
    // Ghi 1 dòng guest_stay_history đại diện (đơn giản hoá — thật ra có `stays` dòng).
    await client.query(
      `INSERT INTO guest_stay_history (id, tenant_id, property_id, customer_id, check_in, check_out, amount_spent)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [randomUUID(), TENANT_ID, PROPERTY_ID, c.id, c.lastCheckout, c.lastCheckout, c.spend / c.stays]
    );
  }

  console.log("Seed crm-service xong — 6 khách demo, mỗi khách 1 kịch bản segment khác nhau.");
  console.log(`  tenant_id=${TENANT_ID} property_id=${PROPERTY_ID}`);
  await client.end();
}

main().catch((err) => {
  console.error("Seed thất bại:", err);
  process.exit(1);
});
