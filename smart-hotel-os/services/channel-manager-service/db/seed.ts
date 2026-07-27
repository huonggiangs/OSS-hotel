/**
 * Seed dữ liệu demo cho channel-manager-service — tách biệt hoàn toàn khỏi dữ
 * liệu production (DATA_MODEL.md mục 4.5). Tạo sẵn:
 * - 1 property demo với 3 kết nối OTA (booking/agoda/airbnb) ở trạng thái CONNECTED
 * - tồn phòng cục bộ (room_type_inventory_cache) cho 7 ngày tới, loại phòng "deluxe"
 *   với đúng 1 phòng còn trống vào ngày gần nhất — để demo dễ tái hiện tình huống
 *   overbooking khi 2 request ingest cùng lúc.
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

  const providers = ["booking", "agoda", "airbnb"] as const;
  for (const provider of providers) {
    await client.query(
      `INSERT INTO ota_connections (id, tenant_id, property_id, ota_provider, credentials, status, last_connected_at)
       VALUES ($1,$2,$3,$4,$5,'CONNECTED', now())
       ON CONFLICT (property_id, ota_provider) DO NOTHING`,
      [randomUUID(), TENANT_ID, PROPERTY_ID, provider, JSON.stringify({ mock_api_key: `mock-${provider}-key` })]
    );
  }

  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    // Format theo giờ ĐỊA PHƯƠNG (không dùng toISOString()) để tránh lệch
    // ngày do quy đổi UTC — xem giải thích ở src/lib/db.ts.
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    // Ngày đầu tiên chỉ còn 1 phòng trống — cố ý để demo kịch bản overbooking.
    const availableRooms = i === 0 ? 1 : 5;
    await client.query(
      `INSERT INTO room_type_inventory_cache (id, tenant_id, property_id, room_type_id, date, available_rooms)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (property_id, room_type_id, date) DO UPDATE SET available_rooms = EXCLUDED.available_rooms`,
      [randomUUID(), TENANT_ID, PROPERTY_ID, ROOM_TYPE_ID, dateStr, availableRooms]
    );
  }

  console.log("Seed channel-manager-service xong.");
  console.log(`  tenant_id=${TENANT_ID} property_id=${PROPERTY_ID} room_type_id=${ROOM_TYPE_ID}`);
  await client.end();
}

main().catch((err) => {
  console.error("Seed thất bại:", err);
  process.exit(1);
});
