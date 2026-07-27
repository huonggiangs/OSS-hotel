import { Pool, types } from "pg";

// Ép kiểu cột DATE (OID 1082) trả về CHUỖI 'YYYY-MM-DD' thuần thay vì JS Date
// — tránh lệch ngày do quy đổi timezone (xem giải thích đầy đủ ở
// channel-manager-service/src/lib/db.ts). Quan trọng ở service này vì
// `customers.last_stay_check_out`/`birthday` được đưa thẳng vào
// `new Date(`${value}T00:00:00Z`)` trong src/segmentation/engine.ts — nếu
// value là object Date bị stringify sai định dạng, Date sinh ra sẽ là
// "Invalid Date" và toàn bộ phân khúc khách sẽ tính sai.
types.setTypeParser(1082, (value: string) => value);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Lỗi không mong muốn từ PostgreSQL pool (crm-service):", err);
});
