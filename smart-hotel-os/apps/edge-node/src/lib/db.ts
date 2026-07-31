import { Pool, PoolClient } from "pg";
import { PGlite, Transaction as PGliteTransaction } from "@electric-sql/pglite";
import path from "node:path";
import { mkdirSync } from "node:fs";

// ============================================================================
// Chế độ database: "postgres" (có DATABASE_URL, dùng pg.Pool kết nối PostgreSQL
// thật) HOẶC "embedded" (mặc định khi KHÔNG có DATABASE_URL — dùng
// @electric-sql/pglite, PostgreSQL biên dịch WASM chạy thẳng trong tiến trình
// Node). Y HỆT pattern smart-hotel-os/property-web/apps/api/src/lib/db.ts —
// xem file đó để biết lý do (không cài được Docker Desktop trên máy người
// dùng). Edge Node là ứng dụng CHẠY TẠI CHỖ (ngay tại quầy lễ tân) nên chế độ
// embedded càng quan trọng hơn: không được phép phụ thuộc bất kỳ hạ tầng cài
// đặt thêm nào — "npm run dev" là chạy được ngay trên bất kỳ máy Windows nào.
//
// MỞ RỘNG so với property-web/webadmin: Edge Node cần `transaction()` vì mọi
// ghi nghiệp vụ (booking/checkin/checkout/lệnh thiết bị) BẮT BUỘC ghi kèm 1
// dòng outbox_events trong CÙNG transaction (xem src/utils/outbox.ts) — nếu
// tách 2 câu lệnh riêng, Edge Node có thể crash giữa chừng và mất sự kiện
// đồng bộ. property-web/webadmin không cần vì không có outbox pattern.
// ============================================================================

export interface QueryResultLike<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbPool {
  query<T = any>(text: string, params?: any[]): Promise<QueryResultLike<T>>;
  transaction<T>(fn: (tx: DbPool) => Promise<T>): Promise<T>;
}

export const DB_MODE: "postgres" | "embedded" =
  (process.env.DB_MODE as "postgres" | "embedded" | undefined) ?? (process.env.DATABASE_URL ? "postgres" : "embedded");

// Thư mục lưu dữ liệu PGlite — mặc định `apps/edge-node/.data/edge-node-db`
// (đã thêm `.data/` vào .gitignore). Có thể chỉnh qua PGLITE_DATA_DIR.
export const embeddedDataDir = process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".data", "edge-node-db");

// Chỉ khởi tạo khi DB_MODE=embedded — export để index.ts gọi bootstrap
// (migration + seed) trước khi app.listen().
export let embeddedDb: PGlite | undefined;

let pool: DbPool;

function wrapEmbeddedQueryable(queryable: { query<T = any>(text: string, params?: any[]): Promise<any> }): DbPool {
  return {
    async query<T = any>(text: string, params: any[] = []): Promise<QueryResultLike<T>> {
      const result = await queryable.query<T>(text, params);
      return { rows: result.rows as T[], rowCount: (result as { affectedRows?: number }).affectedRows ?? result.rows.length };
    },
    // PGlite hỗ trợ transaction lồng nhau thật sự qua .transaction() của
    // chính đối tượng gốc (embeddedDb) — nếu gọi transaction() từ BÊN TRONG
    // 1 transaction khác (tx), coi như "no-op" (chạy thẳng trên tx hiện có,
    // KHÔNG mở transaction lồng thêm) vì PGlite tx không expose lại
    // .transaction() lồng cấp 2.
    async transaction<T>(fn: (tx: DbPool) => Promise<T>): Promise<T> {
      return fn(wrapEmbeddedQueryable(queryable));
    },
  };
}

if (DB_MODE === "embedded") {
  // PGlite không tự tạo thư mục cha đệ quy — tạo trước để tránh lỗi ENOENT khi
  // chạy lần đầu.
  mkdirSync(embeddedDataDir, { recursive: true });
  embeddedDb = new PGlite(embeddedDataDir);
  // eslint-disable-next-line no-console
  console.log(`[db] Chế độ embedded (PGlite, không cần Docker/PostgreSQL) — dữ liệu lưu tại: ${embeddedDataDir}`);

  const db = embeddedDb;
  pool = {
    async query<T = any>(text: string, params: any[] = []): Promise<QueryResultLike<T>> {
      const result = await db.query<T>(text, params);
      return { rows: result.rows as T[], rowCount: (result as { affectedRows?: number }).affectedRows ?? result.rows.length };
    },
    async transaction<T>(fn: (tx: DbPool) => Promise<T>): Promise<T> {
      return db.transaction(async (tx: PGliteTransaction) => {
        return fn(wrapEmbeddedQueryable(tx));
      });
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

  function wrapPgClient(client: PoolClient | Pool): DbPool {
    return {
      async query<T = any>(text: string, params: any[] = []): Promise<QueryResultLike<T>> {
        const result = await client.query(text, params);
        return { rows: result.rows as T[], rowCount: result.rowCount ?? result.rows.length };
      },
      async transaction<T>(fn: (tx: DbPool) => Promise<T>): Promise<T> {
        // Gọi transaction() từ bên trong 1 transaction khác (client đã là
        // PoolClient đang BEGIN) — coi như no-op, chạy thẳng trên client đó.
        if ("release" in client) {
          return fn(wrapPgClient(client));
        }
        const c = await (client as Pool).connect();
        try {
          await c.query("BEGIN");
          const result = await fn(wrapPgClient(c));
          await c.query("COMMIT");
          return result;
        } catch (err) {
          await c.query("ROLLBACK").catch(() => undefined);
          throw err;
        } finally {
          c.release();
        }
      },
    };
  }

  pool = wrapPgClient(pgPool);
  // Giữ tham chiếu .end() cho SIGTERM ở index.ts.
  (pool as unknown as { end: () => Promise<void> }).end = () => pgPool.end();
}

export { pool };
