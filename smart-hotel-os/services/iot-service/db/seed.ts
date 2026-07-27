/**
 * Seed 2 thiết bị demo (1 công tắc điện, 1 điều hoà) cho 1 phòng — dùng để
 * scripts/simulate-device.ts và test API có dữ liệu sẵn.
 *
 * Chạy: npm run seed (sau khi npm run migrate)
 */
import "dotenv/config";
import { Client } from "pg";
import { AIRCON_DEVICE_ID, PROPERTY_ID, ROOM_ID, SWITCH_DEVICE_ID, TENANT_ID } from "./seed-constants";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query(
    `INSERT INTO devices (id, tenant_id, property_id, room_id, device_type, name, status, power_state)
     VALUES ($1,$2,$3,$4,'SWITCH','Công tắc điện tổng phòng 101','ONLINE','OFF')
     ON CONFLICT (id) DO NOTHING`,
    [SWITCH_DEVICE_ID, TENANT_ID, PROPERTY_ID, ROOM_ID]
  );
  await client.query(
    `INSERT INTO devices (id, tenant_id, property_id, room_id, device_type, name, status, power_state)
     VALUES ($1,$2,$3,$4,'AIRCON','Điều hoà phòng 101','ONLINE','OFF')
     ON CONFLICT (id) DO NOTHING`,
    [AIRCON_DEVICE_ID, TENANT_ID, PROPERTY_ID, ROOM_ID]
  );

  console.log("Seed iot-service xong.");
  console.log(`  switch_device_id=${SWITCH_DEVICE_ID} aircon_device_id=${AIRCON_DEVICE_ID} room_id=${ROOM_ID}`);
  await client.end();
}

main().catch((err) => {
  console.error("Seed thất bại:", err);
  process.exit(1);
});
