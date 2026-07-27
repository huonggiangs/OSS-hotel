import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Lỗi không mong muốn từ PostgreSQL pool (iot-service):", err);
});
