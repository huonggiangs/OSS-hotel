import { pool } from "../lib/db";
import { Errors } from "../utils/errors";
import type { AppKey, AppRelease, ReleaseChannel } from "../types/domain";

export interface AppReleaseInput {
  appKey: AppKey;
  version: string;
  releaseNotes?: string | null;
  channel: ReleaseChannel;
  artifactUrl?: string | null;
  isActive?: boolean;
}

// pg trả về mã lỗi PostgreSQL dạng string trong field `code` — 23505 = unique_violation.
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

export const releasesRepo = {
  async list(opts: { appKey?: string; channel?: string }): Promise<AppRelease[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (opts.appKey) {
      params.push(opts.appKey);
      clauses.push(`app_key = $${params.length}`);
    }
    if (opts.channel) {
      params.push(opts.channel);
      clauses.push(`channel = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query<AppRelease>(
      `SELECT * FROM app_releases ${where} ORDER BY app_key ASC, created_at DESC`,
      params
    );
    return rows;
  },

  async findById(id: string): Promise<AppRelease | null> {
    const { rows } = await pool.query<AppRelease>(`SELECT * FROM app_releases WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  // "Phát hành phiên bản mới" — mặc định active ngay (isActive=true), khử
  // active bản trước đó của cùng (app_key, channel) trong cùng transaction.
  // Ràng buộc UNIQUE INDEX ... WHERE is_active=true (migration 002) là lớp
  // bảo vệ cuối cùng chống race condition giữa 2 request publish đồng thời.
  async create(input: AppReleaseInput, publishedById: string): Promise<AppRelease> {
    const isActive = input.isActive ?? true;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (isActive) {
        await client.query(
          `UPDATE app_releases SET is_active = false, updated_at = now()
           WHERE app_key = $1 AND channel = $2 AND is_active = true`,
          [input.appKey, input.channel]
        );
      }
      const { rows } = await client.query<AppRelease>(
        `INSERT INTO app_releases (id, app_key, version, release_notes, channel, published_at, published_by, artifact_url, is_active)
         VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          input.appKey,
          input.version,
          input.releaseNotes ?? null,
          input.channel,
          isActive ? new Date() : null,
          isActive ? publishedById : null,
          input.artifactUrl ?? null,
          isActive,
        ]
      );
      await client.query("COMMIT");
      return rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(err)) throw Errors.conflict("Phiên bản này đã tồn tại cho ứng dụng/kênh đã chọn.");
      throw err;
    } finally {
      client.release();
    }
  },

  // Dùng chung cho hai thao tác MVP: "rollback" (isActive=true — kích hoạt
  // lại một bản cũ, khử active bản đang chạy) và "gỡ khỏi active"
  // (isActive=false — không tự chọn bản thay thế). Đây là quản lý VERSION,
  // KHÔNG phải deploy pipeline thật — xem giới hạn ghi trong PROGRESS.md và
  // MODULE_APP_RELEASE_CONSOLE.md mục 4 ("không thao tác cập nhật/rollback
  // trực tiếp xuống thiết bị từ HQ Console").
  async setActive(id: string, isActive: boolean, actorId: string): Promise<AppRelease | null> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows: relRows } = await client.query<AppRelease>(`SELECT * FROM app_releases WHERE id = $1 FOR UPDATE`, [id]);
      const release = relRows[0];
      if (!release) {
        await client.query("ROLLBACK");
        return null;
      }
      if (isActive) {
        await client.query(
          `UPDATE app_releases SET is_active = false, updated_at = now()
           WHERE app_key = $1 AND channel = $2 AND is_active = true AND id <> $3`,
          [release.app_key, release.channel, id]
        );
      }
      const { rows } = await client.query<AppRelease>(
        `UPDATE app_releases
         SET is_active = $2,
             published_at = CASE WHEN $2 THEN now() ELSE published_at END,
             published_by = CASE WHEN $2 THEN $3 ELSE published_by END,
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id, isActive, actorId]
      );
      await client.query("COMMIT");
      return rows[0] ?? null;
    } catch (err) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(err)) throw Errors.conflict("Đã có bản active khác cho ứng dụng/kênh này.");
      throw err;
    } finally {
      client.release();
    }
  },
};
