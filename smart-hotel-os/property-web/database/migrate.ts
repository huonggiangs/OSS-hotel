/**
 * Migration runner tối giản — giống hệt webadmin/database/migrate.ts, không phụ
 * thuộc ORM/code-gen, chỉ đọc và chạy các file .sql trong thư mục migrations/
 * theo thứ tự tên file (001_, 002_...).
 *
 * Chạy: npm run migrate  (trong thư mục database/)
 */
import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS "_migrations" (
      "filename" TEXT PRIMARY KEY,
      "applied_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const dir = join(__dirname, "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // "001_init.sql" < "002_xxx.sql" theo thứ tự chữ cái = thứ tự thời gian

  const { rows: appliedRows } = await client.query<{ filename: string }>('SELECT filename FROM "_migrations"');
  const applied = new Set(appliedRows.map((r) => r.filename));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[skip]  ${file} (đã áp dụng)`);
      continue;
    }
    const sql = readFileSync(join(dir, file), "utf-8");
    console.log(`[apply] ${file}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query('INSERT INTO "_migrations" (filename) VALUES ($1)', [file]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }

  console.log("Hoàn tất migrate.");
  await client.end();
}

main().catch((err) => {
  console.error("Migrate thất bại:", err);
  process.exit(1);
});
