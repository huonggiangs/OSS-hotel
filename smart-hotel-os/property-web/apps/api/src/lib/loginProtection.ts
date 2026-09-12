import { createHash } from "node:crypto";
import { pool } from "./db";
import { ApiError } from "../utils/errors";

const hash = (value: string) => createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

export async function assertLoginAllowed(input: { propertyCode: string; identifier: string; ip: string }) {
  const { rows } = await pool.query<{ exact_failures: string; ip_failures: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE property_code_hash = $1 AND identifier_hash = $2)::text AS exact_failures,
       COUNT(*)::text AS ip_failures
     FROM property_login_attempts
     WHERE ip_hash = $3 AND succeeded = false AND created_at >= now() - interval '15 minutes'`,
    [hash(input.propertyCode), hash(input.identifier), hash(input.ip)]
  );
  if (Number(rows[0]?.exact_failures ?? 0) >= 5 || Number(rows[0]?.ip_failures ?? 0) >= 50) {
    throw new ApiError(429, "LOGIN_TEMPORARILY_LOCKED", "Đăng nhập tạm khóa 15 phút do nhập sai quá nhiều lần.");
  }
}

export async function recordLoginAttempt(input: {
  propertyCode: string;
  identifier: string;
  ip: string;
  clientType: "WEB" | "ANDROID" | "IOS";
  deviceId?: string;
  succeeded: boolean;
}) {
  const propertyCodeHash = hash(input.propertyCode);
  const identifierHash = hash(input.identifier);
  const ipHash = hash(input.ip);
  if (input.succeeded) {
    await pool.query(
      `DELETE FROM property_login_attempts
       WHERE property_code_hash = $1 AND identifier_hash = $2 AND ip_hash = $3 AND succeeded = false`,
      [propertyCodeHash, identifierHash, ipHash]
    );
  }
  await pool.query(
    `INSERT INTO property_login_attempts
      (property_code_hash, identifier_hash, ip_hash, client_type, device_id_hash, succeeded)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [propertyCodeHash, identifierHash, ipHash, input.clientType,
     input.deviceId ? hash(input.deviceId) : null, input.succeeded]
  );
  // Dọn lịch sử cũ theo xác suất thấp để tránh thêm job nền chỉ cho một bảng.
  if (Math.random() < 0.01) {
    void pool.query(`DELETE FROM property_login_attempts WHERE created_at < now() - interval '30 days'`).catch(() => undefined);
  }
}
