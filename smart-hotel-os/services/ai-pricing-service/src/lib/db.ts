import { Pool, types } from "pg";

// Ép kiểu cột DATE (OID 1082) trả về CHUỖI 'YYYY-MM-DD' thuần thay vì JS Date
// — tránh lệch ngày do quy đổi timezone khi format lại (xem giải thích đầy đủ
// ở channel-manager-service/src/lib/db.ts, cùng một lớp lỗi áp dụng ở đây vì
// pricing_suggestions.date cũng là kiểu DATE).
types.setTypeParser(1082, (value: string) => value);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Lỗi không mong muốn từ PostgreSQL pool (ai-pricing-service):", err);
});
