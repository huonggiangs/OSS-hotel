import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { mkdirSync } from "node:fs";

// ============================================================================
// Chế độ database: "postgres" (mặc định khi có DATABASE_URL, dùng pg.Pool kết
// nối PostgreSQL thật — vd. qua docker compose) HOẶC "embedded" (mặc định khi
// KHÔNG có DATABASE_URL — dùng @electric-sql/pglite, PostgreSQL biên dịch sang
// WASM chạy thẳng trong tiến trình Node, lưu dữ liệu ra thư mục file cục bộ).
//
// Lý do có chế độ embedded: người dùng không bật được Docker Desktop trên máy
// Windows của họ (lỗi npipe dockerDesktopLinuxEngine) nên không chạy được
// PostgreSQL qua docker compose. PGlite tải qua registry.npmjs.org (không bị
// chặn bởi allowlist sandbox, khác với binaries.prisma.sh), không cần cài đặt
// gì thêm, không cần Docker, không cần cài PostgreSQL.
//
// QUAN TRỌNG: toàn bộ 9 file repository trong apps/api/src/repositories chỉ
// dùng `pool.query(text, params)` (không dùng `pool.connect()`/transaction thủ
// công) — nên chỉ cần bọc PGlite bằng một adapter mỏng khớp đúng chữ ký này là
// đủ, KHÔNG phải sửa bất kỳ file repository nào.
// ============================================================================

export interface QueryResultLike<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbPool {
  query<T = any>(text: string, params?: any[]): Promise<QueryResultLike<T>>;
}

export const DB_MODE: "postgres" | "embedded" =
  (process.env.DB_MODE as "postgres" | "embedded" | undefined) ?? (process.env.DATABASE_URL ? "postgres" : "embedded");

// Thư mục lưu dữ liệu PGlite — mặc định `apps/api/.data/property-web-db` (đã
// thêm `.data/` vào .gitignore). Có thể chỉnh qua biến môi trường PGLITE_DATA_DIR.
export const embeddedDataDir = process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".data", "property-web-db");

// Chỉ khởi tạo khi DB_MODE=embedded — export để index.ts gọi bootstrap
// (migration + seed) trước khi app.listen(), và để bootstrap module dùng
// `.exec()` (chạy nhiều câu lệnh SQL không tham số, dùng cho file migration).
export let embeddedDb: PGlite | undefined;

let pool: DbPool;

if (DB_MODE === "embedded") {
  // PGlite không tự tạo thư mục cha đệ quy — tạo trước để tránh lỗi ENOENT khi
  // chạy lần đầu (vd. apps/api/.data/ chưa tồn tại).
  mkdirSync(embeddedDataDir, { recursive: true });
  embeddedDb = new PGlite(embeddedDataDir);
  // eslint-disable-next-line no-console
  console.log(`[db] Chế độ embedded (PGlite, không cần Docker/PostgreSQL) — dữ liệu lưu tại: ${embeddedDataDir}`);

  pool = {
    async query<T = any>(text: string, params: any[] = []): Promise<QueryResultLike<T>> {
      const result = await embeddedDb!.query<T>(text, params);
      return { rows: result.rows as T[], rowCount: (result as { affectedRows?: number }).affectedRows ?? result.rows.length };
    },
  };
} else {
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  pgPool.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("Lỗi không mong muốn từ PostgreSQL pool:", err);
  });
  pool = pgPool;
}

export { pool };
