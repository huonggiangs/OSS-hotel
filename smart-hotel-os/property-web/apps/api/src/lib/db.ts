import { Pool } from "pg";

// Một Pool dùng chung toàn app. `pg` là driver thuần JS/TS — không cần tải
// binary native nào, chạy được ở bất kỳ môi trường Node nào có thể kết nối
// TCP tới PostgreSQL (đúng convention webadmin/apps/api/src/lib/db.ts).
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Lỗi không mong muốn từ PostgreSQL pool:", err);
});
