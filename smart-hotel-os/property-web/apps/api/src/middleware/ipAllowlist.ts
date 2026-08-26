import type { Request } from "express";
import { settingsRepo } from "../repositories/settings.repo";

interface SecurityItem { key?: unknown; on?: unknown; }
interface AccessEntry { type?: unknown; value?: unknown; }
interface SecuritySettings { items?: unknown; accessAllowlist?: unknown; }

function clientIp(req: Request): string {
  return (req.ip || req.socket.remoteAddress || "").replace(/^::ffff:/, "").trim();
}

function ipv4ToNumber(value: string): number | null {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) return null;
  const numbers = parts.map(Number);
  if (numbers.some((part) => part < 0 || part > 255)) return null;
  return (((numbers[0] * 256 + numbers[1]) * 256 + numbers[2]) * 256 + numbers[3]) >>> 0;
}

function matchesIp(ip: string, rule: string): boolean {
  const [address, prefixRaw] = rule.trim().split("/");
  if (!prefixRaw) return ip.toLowerCase() === address.toLowerCase();
  const prefix = Number(prefixRaw);
  const ipNumber = ipv4ToNumber(ip);
  const ruleNumber = ipv4ToNumber(address);
  if (ipNumber === null || ruleNumber === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipNumber & mask) === (ruleNumber & mask);
}

export async function isRequestIpAllowed(req: Request, propertyId: string): Promise<boolean> {
  const raw = await settingsRepo.get(propertyId, "security");
  const settings = raw && typeof raw === "object" ? raw as SecuritySettings : {};
  const enabled = Array.isArray(settings.items) && settings.items.some((item) => {
    const policy = item as SecurityItem;
    return policy.key === "iprestrict" && policy.on === true;
  });
  const allowedIps = Array.isArray(settings.accessAllowlist)
    ? settings.accessAllowlist
        .map((item) => item as AccessEntry)
        .filter((item) => item.type === "IP" && typeof item.value === "string")
        .map((item) => item.value as string)
    : [];

  // Không khóa toàn bộ cơ sở nếu quản lý lỡ bật công tắc trước khi nhập IP.
  // Khi có ít nhất một IP/CIDR, chính sách bắt đầu có hiệu lực ngay ở login
  // và mọi API xác thực sau đó.
  if (!enabled || allowedIps.length === 0) return true;
  const ip = clientIp(req);
  return allowedIps.some((rule) => matchesIp(ip, rule));
}

export function requestIp(req: Request): string {
  return clientIp(req);
}
