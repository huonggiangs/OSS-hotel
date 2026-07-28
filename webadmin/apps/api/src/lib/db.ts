import { Pool, PoolClient } from "pg";
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
// gì thêm, không cần Docker, không cần cài PostgreSQL. Cách làm bắt chước
// đúng adapter đã dùng thành công cho `smart-hotel-os/property-web/apps/api/
// src/lib/db.ts` — xem file đó để đối chiếu.
//
// KHÁC BIỆT QUAN TRỌNG so với property-web: `webadmin` có 3 file repository
// (hardwareAssets.repo.ts, purchaseOrders.repo.ts, releases.repo.ts) dùng
// `pool.connect()` để mở transaction thủ công (BEGIN/COMMIT/ROLLBACK, có cả
// "SELECT ... FOR UPDATE") — property-web KHÔNG có nhu cầu này nên adapter
// gốc chỉ cần bọc `.query()`. Ở đây phải bọc thêm `.connect()` trả về một
// "client" giả lập.
//
// GIỚI HẠN CẦN BIẾT: PGlite là MỘT tiến trình nhúng DUY NHẤT (không có pool
// nhiều kết nối thật như PostgreSQL) — mọi "client" giả lập từ `.connect()`
// bên dưới đều dùng chung một session. Nghĩa là nếu có 2 request ghi đồng
// thời cùng mở transaction, câu lệnh của request này có thể "lọt" vào giữa
// transaction của request kia (không cô lập được như pg.Pool nhiều kết nối
// thật). Chấp nhận được cho mục đích của chế độ embedded (chạy dev/demo một
// người dùng trên máy cá nhân, không phải production nhiều người dùng đồng
// thời) — đã kiểm chứng BEGIN/COMMIT/ROLLBACK/FOR UPDATE hoạt động đúng ở mức
// một transaction tại một thời điểm. KHÔNG dùng chế độ embedded cho môi
// trường production thật nhiều người dùng — production luôn dùng DB_MODE=postgres.
// ============================================================================

export interface QueryResultLike<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClientLike {
  query<T = any>(text: string, params?: any[]): Promise<QueryResultLike<T>>;
  release(): void;
}

export interface DbPool {
  query<T = any>(text: string, params?: any[]): Promise<QueryResultLike<T>>;
  connect(): Promise<DbClientLike>;
  end(): Promise<void>;
}

export const DB_MODE: "postgres" | "embedded" =
  (process.env.DB_MODE as "postgres" | "embedded" | undefined) ?? (process.env.DATABASE_URL ? "postgres" : "embedded");

// Thư mục lưu dữ liệu PGlite — mặc định `apps/api/.data/webadmin-db` (đã thêm
// `.data/` vào .gitignore). Có thể chỉnh qua biến môi trường PGLITE_DATA_DIR.
export const embeddedDataDir = process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".data", "webadmin-db");

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

  const runQuery = async <T = any>(text: string, params: any[] = []): Promise<QueryResultLike<T>> => {
    const result = await embeddedDb!.query<T>(text, params);
    return { rows: result.rows as T[], rowCount: (result as { affectedRows?: number }).affectedRows ?? result.rows.length };
  };

  pool = {
    query: runQuery,
    // Giả lập `pool.connect()` của node-postgres cho các repo dùng transaction
    // thủ công (BEGIN/COMMIT/ROLLBACK qua client.query(...)). Đã kiểm chứng
    // PGlite chạy đúng các câu lệnh SQL "BEGIN"/"COMMIT"/"ROLLBACK" và
    // "SELECT ... FOR UPDATE" trực tiếp qua .query() (xem ghi chú giới hạn ở
    // trên) — nên client giả lập chỉ cần trỏ thẳng về cùng một `runQuery`.
    async connect(): Promise<DbClientLike> {
      return {
        query: runQuery,
        release() {
          // no-op — không có kết nối thật riêng để trả lại pool, PGlite chỉ
          // có một session nhúng duy nhất dùng chung cho toàn bộ tiến trình.
        },
      };
    },
    async end() {
      await embeddedDb!.close();
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
  // pg.Pool đã có sẵn .query()/.connect()/.end() đúng interface DbPool phía
  // trên (PoolClient trả về từ .connect() cũng đã có .query()/.release()) —
  // chỉ cần ép kiểu, không cần viết lại logic.
  pool = pgPool as unknown as DbPool;
}

export { pool };
export type { PoolClient };
