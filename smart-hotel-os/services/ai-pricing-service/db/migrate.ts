/**
 * Migration runner tối giản — đồng nhất pattern webadmin/database/migrate.ts.
 * Chạy: npm run migrate
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
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

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

  console.log("Hoàn tất migrate ai-pricing-service.");
  await client.end();
}

main().catch((err) => {
  console.error("Migrate thất bại:", err);
  process.exit(1);
});
