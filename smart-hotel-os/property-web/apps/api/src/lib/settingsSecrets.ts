import { createCipheriv, createHash, randomBytes } from "node:crypto";

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
