"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/useSettings";
import { accountActivity } from "@/lib/mock-data";
import { api } from "@/lib/api-client";

interface SecurityItem { key: string; label: string; desc: string; on: boolean; }
interface AccessEntry { id: string; type: "IP" | "MAC"; value: string; label: string; }
interface SecurityData { items: SecurityItem[]; accessAllowlist?: AccessEntry[]; }
const FALLBACK: SecurityData = { items: [], accessAllowlist: [] };
function newId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `access-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function validIp(value: string) {
  const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}(\/(3[0-2]|[12]?\d))?$/;
  return ipv4.test(value) || /^[0-9a-fA-F:]+(\/\d{1,3})?$/.test(value);
}
function validMac(value: string) { return /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(value); }

export default function SecurityPage() {
  const { data, loading, saving, error, save } = useSettings<SecurityData>("security", FALLBACK);
  const [items, setItems] = useState<SecurityItem[]>([]);
  const [entries, setEntries] = useState<AccessEntry[]>([]);
  const [type, setType] = useState<AccessEntry["type"]>("IP");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [observedIp, setObservedIp] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  useEffect(() => { if (!loading) { setItems(data.items); setEntries(Array.isArray(data.accessAllowlist) ? data.accessAllowlist : []); } }, [data, loading]);
  useEffect(() => { api.get<{ ip: string }>("/api/v1/settings/security/observed-ip").then((response) => setObservedIp(response.ip)).catch(() => setObservedIp("")); }, []);

  async function persist(nextItems: SecurityItem[], nextEntries: AccessEntry[]) {
    await save({ items: nextItems, accessAllowlist: nextEntries });
  }
  async function toggle(key: string) {
    const next = items.map((item) => item.key === key ? { ...item, on: !item.on } : item);
    setItems(next);
    try { await persist(next, entries); setActionError(null); }
    catch { setItems(items); setActionError("Không thể lưu chính sách bảo mật."); }
  }
  async function addEntry() {
    const address = value.trim();
    if (!address) return setActionError("Nhập địa chỉ IP hoặc MAC.");
    if (type === "IP" && !validIp(address)) return setActionError("IP/CIDR không hợp lệ. Ví dụ: 192.168.1.20 hoặc 192.168.1.0/24.");
    if (type === "MAC" && !validMac(address)) return setActionError("MAC không hợp lệ. Ví dụ: AA:BB:CC:DD:EE:FF.");
    if (entries.some((entry) => entry.type === type && entry.value.toLowerCase() === address.toLowerCase())) return setActionError("Địa chỉ này đã có trong danh sách.");
    const next = [...entries, { id: newId(), type, value: address, label: label.trim() }];
    setEntries(next);
    try { await persist(items, next); setValue(""); setLabel(""); setActionError(null); }
    catch { setEntries(entries); setActionError("Không thể thêm địa chỉ vào danh sách."); }
  }
  async function removeEntry(id: string) {
    const next = entries.filter((entry) => entry.id !== id);
    setEntries(next);
    try { await persist(items, next); setActionError(null); }
    catch { setEntries(entries); setActionError("Không thể xóa địa chỉ."); }
  }

  return <div><h1 className="mb-5 text-[22px] font-bold">Bảo mật</h1>
    <div className="mb-4 rounded-xl bg-white p-6 shadow-card"><h3 className="mb-3.5 text-[15px] font-semibold">Chính sách bảo mật {saving && <span className="text-[11px] font-normal text-pms-muted">(đang lưu...)</span>}</h3>{loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}{!loading && items.map((item) => <div key={item.key} className="flex items-center justify-between border-b border-pms-divider py-3"><div><div className="text-[13px] font-semibold">{item.label}</div><div className="text-[12px] text-pms-muted">{item.desc}</div></div><button type="button" aria-label={item.label} className="relative h-6 w-10 flex-shrink-0 cursor-pointer rounded-full border-0" style={{ background: item.on ? "#284AB1" : "#E6E8EC" }} onClick={() => toggle(item.key)}><span className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white" style={{ left: item.on ? "auto" : 3, right: item.on ? 3 : "auto" }} /></button></div>)}</div>
    <div className="mb-4 rounded-xl bg-white p-6 shadow-card"><h3 className="mb-1 text-[15px] font-semibold">Giới hạn IP truy cập</h3><p className="mb-3 text-[12px] text-pms-muted">Khi bật công tắc “Giới hạn IP truy cập” và có ít nhất một IP/CIDR dưới đây, PMS chặn đăng nhập và API từ IP khác. MAC không thể được trình duyệt web gửi đến PMS; dùng danh sách MAC này để cấu hình firewall/router hoặc Edge Node trong cùng mạng.</p>{observedIp && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-pms-divider px-3 py-2 text-[12px]">IP PMS đang nhận: <b className="font-mono">{observedIp}</b><button type="button" onClick={() => { setType("IP"); setValue(observedIp); }} className="text-pms-primary">Dùng IP này</button></div>}{(error || actionError) && <p className="text-[12px] text-pms-danger">{actionError ?? error}</p>}<div className="grid gap-2 md:grid-cols-[100px_1fr_1fr_auto]"><select value={type} onChange={(event) => setType(event.target.value as AccessEntry["type"])} className="input"><option value="IP">IP / CIDR</option><option value="MAC">MAC</option></select><input value={value} onChange={(event) => setValue(event.target.value)} placeholder={type === "IP" ? "192.168.1.20 hoặc 192.168.1.0/24" : "AA:BB:CC:DD:EE:FF"} className="input" /><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Ghi chú: máy lễ tân" className="input" /><button type="button" onClick={addEntry} className="button">+ Thêm</button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] border-collapse text-[12.5px]"><thead><tr className="text-left text-pms-muted"><th className="border-b border-pms-border px-2 py-2">Loại</th><th className="border-b border-pms-border px-2 py-2">Địa chỉ</th><th className="border-b border-pms-border px-2 py-2">Ghi chú</th><th className="border-b border-pms-border px-2 py-2" /></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td className="border-b border-pms-divider px-2 py-2.5">{entry.type}</td><td className="border-b border-pms-divider px-2 py-2.5 font-mono">{entry.value}</td><td className="border-b border-pms-divider px-2 py-2.5 text-pms-muted">{entry.label || "—"}</td><td className="border-b border-pms-divider px-2 py-2.5 text-right"><button type="button" onClick={() => removeEntry(entry.id)} className="text-pms-danger">Xóa</button></td></tr>)}{entries.length === 0 && <tr><td colSpan={4} className="px-2 py-4 text-center text-pms-muted">Chưa có địa chỉ nào được phép.</td></tr>}</tbody></table></div></div>
    <div className="rounded-xl bg-white p-6 shadow-card"><h3 className="mb-3.5 text-[15px] font-semibold">Nhật ký hoạt động tài khoản</h3><table className="w-full border-collapse text-[13px]"><thead><tr>{["Người dùng", "Hành động", "Thời gian", "IP"].map((heading) => <th key={heading} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">{heading}</th>)}</tr></thead><tbody>{accountActivity.map((activity, index) => <tr key={index}><td className="border-b border-pms-divider px-2 py-3">{activity.user}</td><td className="border-b border-pms-divider px-2 py-3">{activity.action}</td><td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{activity.time}</td><td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{activity.ip}</td></tr>)}</tbody></table></div>
  </div>;
}
