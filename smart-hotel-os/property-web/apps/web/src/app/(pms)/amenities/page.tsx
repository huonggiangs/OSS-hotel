"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/useSettings";

type Tab = "info" | "activities" | "services";
type AmenityCategory = Tab;
const TABS: { key: Tab; label: string }[] = [
  { key: "info", label: "Thông tin tiện ích" },
  { key: "activities", label: "Các hoạt động" },
  { key: "services", label: "Các dịch vụ" },
];
const MAX_ICON_BYTES = 350 * 1024;

interface AmenityGroup { title: string; items: string[]; }
interface CustomAmenity { id: string; name: string; category: AmenityCategory; iconDataUrl: string; emoji: string; }
interface AmenitiesData {
  groups: AmenityGroup[];
  activitiesCols: string[][];
  amenityServicesCols: string[][];
  selected: string[];
  customItems?: CustomAmenity[];
}
const FALLBACK: AmenitiesData = { groups: [], activitiesCols: [[], [], []], amenityServicesCols: [[], [], []], selected: [], customItems: [] };

function zip3(a: string[], b: string[], c: string[]): string[] {
  const result: string[] = [];
  for (let index = 0; index < Math.max(a.length, b.length, c.length); index++) {
    if (a[index]) result.push(a[index]);
    if (b[index]) result.push(b[index]);
    if (c[index]) result.push(c[index]);
  }
  return result;
}
function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `amenity-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function autoEmoji(name: string): string {
  const text = name.toLocaleLowerCase("vi");
  if (/wifi|internet/.test(text)) return "📶";
  if (/bể bơi|hồ bơi|swim/.test(text)) return "🏊";
  if (/đỗ xe|gara|parking/.test(text)) return "🅿️";
  if (/nhà hàng|ăn sáng|ẩm thực/.test(text)) return "🍽️";
  if (/spa|massage/.test(text)) return "💆";
  if (/thang máy/.test(text)) return "🛗";
  if (/điều hòa|air/.test(text)) return "❄️";
  if (/gym|thể thao/.test(text)) return "🏋️";
  if (/trẻ em|kids/.test(text)) return "🧸";
  if (/lễ tân|reception/.test(text)) return "🛎️";
  return "✨";
}

export default function AmenitiesPage() {
  const [tab, setTab] = useState<Tab>("info");
  const { data, loading, saving, error, save } = useSettings<AmenitiesData>("amenities", FALLBACK);
  const [selected, setSelected] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<CustomAmenity[]>([]);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [iconError, setIconError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setSelected(Array.isArray(data.selected) ? data.selected : []);
      setCustomItems(Array.isArray(data.customItems) ? data.customItems : []);
    }
  }, [data, loading]);

  const lists = useMemo(() => ({
    info: data.groups.flatMap((group) => group.items),
    activities: zip3(data.activitiesCols[0] ?? [], data.activitiesCols[1] ?? [], data.activitiesCols[2] ?? []),
    services: zip3(data.amenityServicesCols[0] ?? [], data.amenityServicesCols[1] ?? [], data.amenityServicesCols[2] ?? []),
  }), [data]);
  const customForTab = customItems.filter((item) => item.category === tab);

  async function persist(nextSelected: string[], nextCustom: CustomAmenity[]) {
    await save({ ...data, selected: nextSelected, customItems: nextCustom });
  }
  async function toggle(name: string) {
    const next = selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name];
    setSelected(next);
    try {
      await persist(next, customItems);
      setActionError(null);
    } catch {
      setSelected(selected);
      setActionError("Không thể lưu lựa chọn tiện ích.");
    }
  }
  function readIcon(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setIconError("Chỉ nhận icon PNG, JPG hoặc WebP.");
    if (file.size > MAX_ICON_BYTES) return setIconError("Icon tối đa 350 KB để lưu trực tiếp trên server.");
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") setNewIcon(reader.result); setIconError(null); };
    reader.onerror = () => setIconError("Không đọc được tệp icon.");
    reader.readAsDataURL(file);
  }
  async function addCustom() {
    const name = newName.trim();
    if (!name) return setActionError("Nhập tên tiện ích.");
    const names = [...lists.info, ...lists.activities, ...lists.services, ...customItems.map((item) => item.name)];
    if (names.some((item) => item.localeCompare(name, "vi", { sensitivity: "accent" }) === 0)) return setActionError("Tiện ích này đã có trong danh sách.");
    const nextCustom = [...customItems, { id: newId(), name, category: tab, iconDataUrl: newIcon, emoji: autoEmoji(name) }];
    const nextSelected = [...selected, name];
    setCustomItems(nextCustom);
    setSelected(nextSelected);
    try {
      await persist(nextSelected, nextCustom);
      setNewName("");
      setNewIcon("");
      setActionError(null);
    } catch {
      setCustomItems(customItems);
      setSelected(selected);
      setActionError("Không thể thêm tiện ích.");
    }
  }
  async function removeCustom(item: CustomAmenity) {
    if (!window.confirm(`Xóa tiện ích "${item.name}"?`)) return;
    const nextCustom = customItems.filter((candidate) => candidate.id !== item.id);
    const nextSelected = selected.filter((name) => name !== item.name);
    setCustomItems(nextCustom);
    setSelected(nextSelected);
    try { await persist(nextSelected, nextCustom); setActionError(null); }
    catch { setCustomItems(customItems); setSelected(selected); setActionError("Không thể xóa tiện ích."); }
  }

  return <div>
    <Link href="/branches" className="mb-4 flex items-center gap-3 text-[#23262F]"><span className="text-[18px]">←</span><h1 className="m-0 text-[20px] font-bold">Tên cơ sở</h1></Link>
    <div className="min-w-0 rounded-xl bg-white p-4 shadow-card sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-pms-border"><div className="flex flex-wrap gap-x-7 gap-y-1 text-[14px]">{TABS.map((item) => <button key={item.key} type="button" className="cursor-pointer border-0 bg-transparent pb-3 font-semibold" style={{ color: tab === item.key ? "#284AB1" : "#777E90", borderBottom: `2px solid ${tab === item.key ? "#284AB1" : "transparent"}` }} onClick={() => setTab(item.key)}>{item.label}</button>)}</div><span className="pb-3 text-[12px] text-pms-primary">{saving ? "Đang lưu..." : "Lưu vào server"}</span></div>
      {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
      {(error || actionError || iconError) && <p className="text-[12px] text-pms-danger">{actionError ?? iconError ?? error}</p>}
      {!loading && <>
        <div className="mb-5 rounded-lg border border-pms-primary-soft bg-pms-primary-soft/20 p-3"><div className="mb-2 text-[12.5px] font-semibold text-pms-primary">Thêm tiện ích riêng</div><div className="grid gap-2 md:grid-cols-[1fr_190px_auto]"><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Tên tiện ích" className="input" /><label className="input cursor-pointer text-pms-muted">{newIcon ? "Đã chọn icon riêng" : `Tự gợi ý ${autoEmoji(newName || "tiện ích")} hoặc tải icon`}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={readIcon} /></label><button type="button" onClick={addCustom} className="button">+ Thêm</button></div><p className="mb-0 mt-2 text-[11px] text-pms-muted">Icon tải lên được mã hóa và lưu trong cơ sở dữ liệu của PMS, không dùng link nhà cung cấp.</p></div>
        {tab === "info" && data.groups.map((group) => <section key={group.title} className="mb-5"><div className="mb-3 text-[14px] font-bold">{group.title}</div><div className="grid gap-x-6 gap-y-3.5 md:grid-cols-3">{group.items.map((name, index) => <AmenityItem key={`${group.title}-${name}-${index}`} name={name} checked={selected.includes(name)} onToggle={() => toggle(name)} />)}</div></section>)}
        {tab !== "info" && <div className="grid gap-x-6 gap-y-3.5 md:grid-cols-3">{lists[tab].map((name, index) => <AmenityItem key={`${name}-${index}`} name={name} checked={selected.includes(name)} onToggle={() => toggle(name)} />)}</div>}
        {customForTab.length > 0 && <section className="mt-5"><div className="mb-3 text-[13px] font-semibold">Tiện ích tự thêm</div><div className="grid gap-x-6 gap-y-3.5 md:grid-cols-3">{customForTab.map((item) => <AmenityItem key={item.id} name={item.name} checked={selected.includes(item.name)} iconDataUrl={item.iconDataUrl} emoji={item.emoji} onToggle={() => toggle(item.name)} onRemove={() => removeCustom(item)} />)}</div></section>}
      </>}
    </div>
  </div>;
}

function AmenityItem({ name, checked, iconDataUrl, emoji, onToggle, onRemove }: { name: string; checked: boolean; iconDataUrl?: string; emoji?: string; onToggle: () => void; onRemove?: () => void }) {
  return <div className="flex min-w-0 items-center gap-2.5 text-[13px]"><button type="button" aria-pressed={checked} className="flex min-w-0 flex-1 items-center gap-2.5 border-0 bg-transparent p-0 text-left" onClick={onToggle}><span className="h-4 w-4 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" style={checked ? { background: "#284AB1", borderColor: "#284AB1" } : undefined} /><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-pms-divider">{iconDataUrl ? <img src={iconDataUrl} alt="" className="h-full w-full object-cover" /> : emoji ?? autoEmoji(name)}</span><span className="truncate" title={name}>{name}</span></button>{onRemove && <button type="button" onClick={onRemove} className="text-[11px] text-pms-danger">Xóa</button>}</div>;
}
