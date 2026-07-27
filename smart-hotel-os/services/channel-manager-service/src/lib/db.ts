import { Pool, types } from "pg";

// Ép kiểu cột DATE (OID 1082) trả về CHUỖI 'YYYY-MM-DD' thuần thay vì JS
// Date. Lý do: DATE trong Postgres không có giờ/timezone, nhưng driver `pg`
// mặc định parse thành Date ở NỬA ĐÊM GIỜ ĐỊA PHƯƠNG của server chạy code —
// nếu sau đó gọi .toISOString() (quy đổi UTC) sẽ bị lệch sang ngày hôm trước
// ở múi giờ dương (vd. UTC+7). Toàn bộ business logic ở service này (đặc biệt
// kiểm tra tồn phòng chống overbooking) đều so khớp theo chuỗi ngày, nên giữ
// nguyên dạng chuỗi từ Postgres là an toàn nhất — không quy đổi timezone.
types.setTypeParser(1082, (value: string) => value);

// Một Pool dùng chung toàn service. `pg` là driver thuần JS/TS, không cần
// binary native — đồng nhất convention webadmin/apps/api/src/lib/db.ts.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Lỗi không mong muốn từ PostgreSQL pool (channel-manager-service):", err);
});
