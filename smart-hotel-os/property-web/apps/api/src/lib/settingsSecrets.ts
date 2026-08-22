import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? {})) as T;
}

function encryptionKey(): Buffer {
  const configured = process.env.SETTINGS_ENCRYPTION_KEY;
  if (configured) {
    const key = Buffer.from(configured, "base64");
    if (key.length !== 32) throw new Error("SETTINGS_ENCRYPTION_KEY phải là khoá base64 gồm đúng 32 byte.");
    return key;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SETTINGS_ENCRYPTION_KEY bắt buộc ở môi trường production.");
  }
  console.warn("[settings] SETTINGS_ENCRYPTION_KEY chưa cấu hình — dùng khoá chỉ dành cho dev.");
  return createHash("sha256").update("smart-hotel-dev-settings-encryption-key").digest();
}

function encrypt(value: string): JsonRecord {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

/** Chiều ngược lại của encrypt() — giải mã bằng đúng khoá/thuật toán AES-256-GCM. */
function decrypt(record: unknown): string | null {
  if (!isRecord(record)) return null;
  const { iv, tag, ciphertext } = record as Record<string, unknown>;
  if (typeof iv !== "string" || typeof tag !== "string" || typeof ciphertext !== "string") return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    const plain = Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]);
    return plain.toString("utf8");
  } catch {
    return null;
  }
}

/** Lưu cấu hình email mà không bao giờ lưu/trả mật khẩu SMTP rõ. */
export function secureEmailSettings(input: unknown, previous?: unknown): unknown {
  const data = isRecord(input) ? cloneJson(input) : {};
  const fields = isRecord(data.fields) ? data.fields : {};
  const previousData = isRecord(previous) ? previous : {};
  const previousFields = isRecord(previousData.fields) ? previousData.fields : {};
  const suppliedPassword = typeof fields.password === "string" ? fields.password : "";

  if (suppliedPassword) {
    data.smtp_password_encrypted = encrypt(suppliedPassword);
  } else if (previousData.smtp_password_encrypted) {
    data.smtp_password_encrypted = previousData.smtp_password_encrypted;
  } else if (typeof previousFields.password === "string" && previousFields.password) {
    data.smtp_password_encrypted = encrypt(previousFields.password);
  }

  data.fields = { ...fields, password: "" };
  delete data.hasPassword;
  return data;
}

export function redactEmailSettings(input: unknown): unknown {
  const data = isRecord(input) ? cloneJson(input) : {};
  const fields = isRecord(data.fields) ? data.fields : {};
  const hasPassword = Boolean(data.smtp_password_encrypted) || Boolean(fields.password);
  delete data.smtp_password_encrypted;
  data.fields = { ...fields, password: "" };
  data.hasPassword = hasPassword;
  return data;
}

/**
 * Lưu cấu hình thanh toán (group "payment") mà không bao giờ lưu API Token
 * SePay ở dạng rõ — cùng logic "giữ lại giá trị mã hoá cũ nếu trường mới để
 * trống" như secureEmailSettings() áp dụng cho mật khẩu SMTP.
 */
export function secureSepayToken(input: unknown, previous?: unknown): unknown {
  const data = isRecord(input) ? cloneJson(input) : {};
  const sepay = isRecord(data.sepay) ? data.sepay : {};
  const previousData = isRecord(previous) ? previous : {};
  const previousSepay = isRecord(previousData.sepay) ? previousData.sepay : {};
  const suppliedToken = typeof sepay.apiToken === "string" ? sepay.apiToken : "";

  let apiTokenEncrypted = previousSepay.apiTokenEncrypted ?? null;
  if (suppliedToken) {
    apiTokenEncrypted = encrypt(suppliedToken);
  }

  data.sepay = { ...sepay, apiToken: "", apiTokenEncrypted };
  return data;
}

export function redactSepayToken(input: unknown): unknown {
  const data = isRecord(input) ? cloneJson(input) : {};
  const sepay = isRecord(data.sepay) ? data.sepay : {};
  const hasApiToken = Boolean(sepay.apiTokenEncrypted);
  const redactedSepay: JsonRecord = { ...sepay, apiToken: "", hasApiToken };
  delete redactedSepay.apiTokenEncrypted;
  data.sepay = redactedSepay;
  return data;
}

/**
 * Giải mã API Token SePay ở phía server để gọi API SePay thật (đồng bộ giao
 * dịch) — KHÔNG BAO GIỜ trả giá trị này ra ngoài (chỉ dùng nội bộ trong route
 * xử lý sync/webhook). Trả null nếu chưa cấu hình hoặc giải mã thất bại.
 */
export function decryptSepayToken(sepaySettings: unknown): string | null {
  if (!isRecord(sepaySettings)) return null;
  return decrypt(sepaySettings.apiTokenEncrypted);
}

/**
 * Lưu cấu hình đồng bộ OTA (group "sync") — mỗi kết nối (connection) trong
 * mảng "connections" có thể mang 1 API Key riêng, không bao giờ lưu/trả API
 * Key ở dạng rõ. Cùng logic "giữ lại giá trị mã hoá cũ nếu trường mới để
 * trống" như secureEmailSettings()/secureSepayToken(), nhưng áp dụng PER
 * CONNECTION (khớp theo "id") vì mỗi hotel có thể có nhiều kênh OTA khác nhau
 * với API Key khác nhau.
 */
export function secureSyncApiKeys(input: unknown, previous?: unknown): unknown {
  const data = isRecord(input) ? cloneJson(input) : {};
  const connections = Array.isArray(data.connections) ? data.connections : [];
  const previousData = isRecord(previous) ? previous : {};
  const previousConnections = Array.isArray(previousData.connections) ? previousData.connections : [];

  data.connections = connections.map((connection) => {
    const conn = isRecord(connection) ? { ...connection } : {};
    const previousConn = previousConnections.find((p) => isRecord(p) && p.id === conn.id);
    const suppliedApiKey = typeof conn.apiKey === "string" ? conn.apiKey : "";

    let apiKeyEncrypted = isRecord(previousConn) ? previousConn.apiKeyEncrypted ?? null : null;
    if (suppliedApiKey) {
      apiKeyEncrypted = encrypt(suppliedApiKey);
    }

    conn.apiKey = "";
    conn.apiKeyEncrypted = apiKeyEncrypted;
    return conn;
  });

  return data;
}

export function redactSyncApiKeys(input: unknown): unknown {
  const data = isRecord(input) ? cloneJson(input) : {};
  const connections = Array.isArray(data.connections) ? data.connections : [];

  data.connections = connections.map((connection) => {
    const conn = isRecord(connection) ? { ...connection } : {};
    const hasApiKey = Boolean(conn.apiKeyEncrypted);
    delete conn.apiKeyEncrypted;
    delete conn.apiKey;
    conn.hasApiKey = hasApiKey;
    return conn;
  });

  return data;
}
