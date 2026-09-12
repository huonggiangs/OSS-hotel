import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export function generateDeviceKey(): string {
  return randomBytes(32).toString("base64url");
}

export async function hashDeviceKey(deviceKey: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(deviceKey, salt, 32)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyDeviceKey(deviceKey: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(deviceKey, salt, expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
