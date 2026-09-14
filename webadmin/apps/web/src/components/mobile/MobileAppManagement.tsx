"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiClientError } from "@/lib/api";

export type MobileManagementView = "screens" | "releases";

interface AppRelease {
  id: string;
  app_key: "OWNER_MOBILE" | "HOUSEKEEPING_MOBILE" | string;
  version: string;
  release_notes: string | null;
  channel: "STABLE" | "BETA";
  published_at: string | null;
  created_at: string;
  artifact_url: string | null;
  is_active: boolean;
}

const MOBILE_APPS = [
  { key: "OWNER_MOBILE", label: "Ứng dụng Chủ cơ sở", short: "Chủ cơ sở", roles: "Chủ cơ sở, Quản lý, Lễ tân, Kỹ thuật viên" },
  { key: "HOUSEKEEPING_MOBILE", label: "Ứng dụng Buồng phòng", short: "Buồng phòng", roles: "Nhân viên dọn phòng" },
] as const;

const SCREENS = [
  { id: "dashboard", name: "Tổng quan", path: "Trang chủ", roles: "Chủ cơ sở, Quản lý", detail: "Công suất, doanh thu, việc cần xử lý và cảnh báo thiết bị.", accent: "blue" },
  { id: "rooms", name: "Phòng", path: "Thanh điều hướng · Phòng", roles: "Chủ cơ sở, Lễ tân, Buồng phòng", detail: "Tình trạng phòng, nhận phòng nhanh, dọn phòng và báo hỏng.", accent: "green" },
  { id: "booking", name: "Đặt phòng", path: "Thanh điều hướng · Đặt phòng", roles: "Chủ cơ sở, Quản lý, Lễ tân", detail: "Danh sách đặt trước, xác nhận đến, không đến và chi tiết hợp đồng.", accent: "violet" },
  { id: "alerts", name: "Cảnh báo", path: "Thanh điều hướng · Cảnh báo", roles: "Chủ cơ sở, Quản lý, Kỹ thuật viên", detail: "Báo hỏng, bảo trì, mất kết nối thiết bị và thời hạn xử lý.", accent: "rose" },
  { id: "account", name: "Tài khoản", path: "Thanh điều hướng · Tài khoản", roles: "Mọi vai trò", detail: "Thông tin người dùng, cơ sở đang làm việc và thiết lập an toàn.", accent: "amber" },
] as const;

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Chưa phát hành";
}

function featureLines(notes: string | null) {
  const lines = (notes ?? "").split(/\r?\n|•/).map((item) => item.replace(/^[-*]\s*/, "").trim()).filter(Boolean);
  return lines.length ? lines : ["Chưa có mô tả tính năng cho phiên bản này."];
}

export function MobileAppManagement({ view }: { view: MobileManagementView }) {
  if (view === "screens") return <ScreensCatalog />;
  return <MobileReleaseManager />;
}

function ScreensCatalog() {
  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
        <h2 className="text-lg font-bold text-blue-950">Danh mục màn hình ứng dụng</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-blue-800">Đây là bản xem trước các màn hình người dùng có thể thao tác trên app. Phân quyền quyết định hành động nào xuất hiện; dữ liệu thật được lấy từ PMS sau khi đăng nhập.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {SCREENS.map((screen) => (
          <article key={screen.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <PhonePreview screen={screen.id} accent={screen.accent} />
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{screen.path}</p>
              <h3 className="mt-1 text-base font-bold text-gray-950">{screen.name}</h3>
              <p className="mt-1 text-sm leading-5 text-gray-600">{screen.detail}</p>
              <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600"><b>Áp dụng:</b> {screen.roles}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PhonePreview({ screen, accent }: { screen: string; accent: string }) {
  const palette: Record<string, string> = { blue: "bg-blue-600", green: "bg-emerald-500", violet: "bg-violet-600", rose: "bg-rose-500", amber: "bg-amber-500" };
  const color = palette[accent] ?? "bg-blue-600";
  const content = screen === "dashboard" ? <><div className="grid grid-cols-2 gap-1.5"><MiniCard color="bg-emerald-100" label="Công suất" value="60%" /><MiniCard color="bg-blue-100" label="Doanh thu" value="12,4tr" /><MiniCard color="bg-blue-100" label="Đang ở" value="18 phòng" /><MiniCard color="bg-amber-100" label="Cần xử lý" value="3 việc" /></div><div className="mt-2 rounded-lg border border-gray-100 p-2"><div className="h-14 rounded-full border-[8px] border-emerald-500 border-t-rose-400" /><p className="mt-1 text-center text-[7px] font-bold">Trạng thái phòng</p></div></> : screen === "rooms" ? <><div className="grid grid-cols-3 gap-1.5">{["101", "102", "103", "201", "202", "203"].map((room, index) => <div key={room} className={`rounded-lg p-2 text-center text-[8px] font-bold ${index === 1 ? "bg-blue-100 text-blue-700" : index === 4 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{room}<br /><span className="text-[6px] font-normal">{index === 1 ? "Đang ở" : index === 4 ? "Chờ dọn" : "Trống"}</span></div>)}</div><button className={`mt-2 w-full rounded-lg py-1.5 text-[8px] font-bold text-white ${color}`}>+ Nhận phòng nhanh</button></> : screen === "booking" ? <><button className={`w-full rounded-lg py-1.5 text-[8px] font-bold text-white ${color}`}>+ Tạo đặt phòng mới</button>{["HD-2026007", "HD-2026005"].map((code, index) => <div key={code} className="mt-2 rounded-lg border border-gray-100 p-2"><b className="text-[8px]">{code}</b><p className="text-[7px] text-gray-500">{index ? "Nguyễn Văn An" : "Bà Ngọc"} · Phòng {index ? "125" : "120"}</p><span className="text-[7px] text-rose-500">{index ? "Đã hủy" : "Không đến"}</span></div>)}</> : screen === "alerts" ? <>{["Mất kết nối công tơ phòng 203", "Bảo trì điều hòa phòng 106", "Yêu cầu dọn phòng 201"].map((text, index) => <div key={text} className="mt-2 flex gap-2 rounded-lg border border-gray-100 p-2"><span className={`mt-0.5 h-3 w-3 rounded-full ${index === 0 ? "bg-rose-500" : index === 1 ? "bg-amber-400" : "bg-blue-500"}`} /><div><b className="block text-[7px]">{text}</b><span className="text-[6px] text-gray-500">Chạm để xem và xử lý</span></div></div>)}</> : <><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-base text-blue-700">◉</div><p className="mt-2 text-center text-[9px] font-bold">Nguyễn Văn Chủ</p><p className="text-center text-[7px] text-gray-500">ANIO Riverside Hotel</p>{["Đổi cơ sở làm việc", "Thiết lập thông báo", "Đăng xuất"].map((text) => <div key={text} className="mt-2 rounded-lg bg-gray-50 px-2 py-1.5 text-[7px]">{text} <span className="float-right">›</span></div>)}</>;
  return <div className="bg-[#f5f8ff] p-4"><div className="mx-auto max-w-[210px] rounded-[22px] border-[5px] border-gray-900 bg-white p-3 shadow-lg"><div className="mb-2 flex items-center justify-between"><span className="text-[7px] font-bold">9:41</span><span className="text-[7px]">●●●</span></div><h4 className="text-[12px] font-extrabold text-slate-950">{screen === "dashboard" ? "Tổng quan" : screen === "rooms" ? "Phòng" : screen === "booking" ? "Đặt phòng" : screen === "alerts" ? "Cảnh báo" : "Tài khoản"}</h4><p className="mb-2 text-[7px] text-blue-700">ANIO Riverside Hotel</p>{content}<div className="mt-3 flex justify-between border-t border-gray-100 pt-2 text-[6px] text-gray-500"><span>⌂</span><span>▱</span><span>□</span><span>♧</span><span>◉</span></div></div></div>;
}

function MiniCard({ color, label, value }: { color: string; label: string; value: string }) {
  return <div className={`rounded-md p-1.5 ${color}`}><p className="text-[6px] text-gray-600">{label}</p><b className="text-[9px] text-slate-950">{value}</b></div>;
}

function MobileReleaseManager() {
  const [items, setItems] = useState<AppRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [appKey, setAppKey] = useState<(typeof MOBILE_APPS)[number]["key"]>("OWNER_MOBILE");
  const [version, setVersion] = useState("");
  const [channel, setChannel] = useState<"STABLE" | "BETA">("STABLE");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [artifactUrl, setArtifactUrl] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await api.get<{ items: AppRelease[] }>("/api/v1/releases");
      setItems(response.items.filter((item) => item.app_key === "OWNER_MOBILE" || item.app_key === "HOUSEKEEPING_MOBILE"));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không tải được các phiên bản ứng dụng.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const activeByApp = useMemo(() => MOBILE_APPS.map((app) => ({ ...app, release: items.find((item) => item.app_key === app.key && item.is_active && item.channel === "STABLE") })), [items]);

  async function publish(event: FormEvent) {
    event.preventDefault();
    setError(null); setNotice(null); setBusyId("publish");
    try {
      await api.post("/api/v1/releases", { appKey, version, channel, releaseNotes, artifactUrl: artifactUrl || undefined, isActive: true });
      setNotice(`Đã phát hành ${version} cho ${MOBILE_APPS.find((item) => item.key === appKey)?.label}.`);
      setVersion(""); setReleaseNotes(""); setArtifactUrl(""); setShowForm(false);
      await load();
    } catch (err) { setError(err instanceof ApiClientError ? err.message : "Không phát hành được phiên bản."); }
    finally { setBusyId(null); }
  }

  async function activate(release: AppRelease) {
    setError(null); setNotice(null); setBusyId(release.id);
    try {
      await api.patch(`/api/v1/releases/${release.id}`, { isActive: true });
      setNotice(`Đã kích hoạt lại phiên bản ${release.version}.`);
      await load();
    } catch (err) { setError(err instanceof ApiClientError ? err.message : "Không thể kích hoạt lại phiên bản."); }
    finally { setBusyId(null); }
  }

  return <section className="space-y-5">
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
      <div><h2 className="text-lg font-bold text-gray-950">Phiên bản ứng dụng di động</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">Theo dõi bản đang dùng, lịch sử thay đổi và phát hành bản mới. Mỗi bản phải có ghi chú tính năng để bộ phận vận hành biết chính xác nội dung đã thay đổi.</p></div>
      <button type="button" onClick={() => setShowForm((value) => !value)} className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">{showForm ? "Đóng biểu mẫu" : "+ Phát hành phiên bản"}</button>
    </div>

    <div className="grid gap-3 md:grid-cols-2">{activeByApp.map((app) => <div key={app.key} className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-sm font-semibold text-gray-950">{app.label}</p><p className="mt-1 text-xs text-gray-500">Dành cho: {app.roles}</p><p className="mt-4 text-2xl font-bold text-blue-700">{app.release ? `v${app.release.version}` : "Chưa phát hành"}</p><p className="mt-1 text-xs text-gray-500">{app.release ? `${app.release.channel === "STABLE" ? "Bản ổn định" : "Bản thử nghiệm"} · ${formatDate(app.release.published_at)}` : "Chưa có bản ổn định đang hoạt động"}</p></div>)}</div>

    {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    {notice && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

    {showForm && <form onSubmit={publish} className="grid gap-4 rounded-xl border border-blue-200 bg-blue-50 p-5 sm:grid-cols-2"><div><label className="block text-sm font-semibold text-gray-800">Ứng dụng</label><select value={appKey} onChange={(event) => setAppKey(event.target.value as typeof appKey)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">{MOBILE_APPS.map((app) => <option key={app.key} value={app.key}>{app.label}</option>)}</select></div><div><label className="block text-sm font-semibold text-gray-800">Phiên bản <span className="text-red-600">*</span></label><input required value={version} onChange={(event) => setVersion(event.target.value)} placeholder="Ví dụ: 0.6.0" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div><div><label className="block text-sm font-semibold text-gray-800">Kênh phát hành</label><select value={channel} onChange={(event) => setChannel(event.target.value as "STABLE" | "BETA")} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option value="STABLE">Bản ổn định</option><option value="BETA">Bản thử nghiệm</option></select></div><div><label className="block text-sm font-semibold text-gray-800">Link APK / App Store (nếu có)</label><input type="url" value={artifactUrl} onChange={(event) => setArtifactUrl(event.target.value)} placeholder="https://..." className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div><div className="sm:col-span-2"><label className="block text-sm font-semibold text-gray-800">Tính năng và thay đổi <span className="text-red-600">*</span></label><textarea required minLength={3} value={releaseNotes} onChange={(event) => setReleaseNotes(event.target.value)} rows={4} placeholder={'Mỗi dòng một nội dung, ví dụ:\n- Sửa giao diện tổng quan\n- Bổ sung cảnh báo thiết bị'} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div><div className="sm:col-span-2"><button disabled={busyId === "publish"} type="submit" className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busyId === "publish" ? "Đang phát hành..." : "Phát hành và đặt làm bản hiện tại"}</button><p className="mt-2 text-xs text-blue-800">HQ ghi nhận phiên bản và link gói cài đặt; việc đưa APK lên kho phân phối/Play Store vẫn cần quy trình ký và phát hành riêng.</p></div></form>}

    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"><div className="border-b border-gray-100 px-5 py-4"><h3 className="font-semibold text-gray-950">Lịch sử phiên bản và tính năng</h3></div>{loading ? <p className="p-6 text-sm text-gray-500">Đang tải phiên bản...</p> : items.length === 0 ? <p className="p-6 text-sm text-gray-500">Chưa có phiên bản ứng dụng di động được ghi nhận.</p> : <div className="divide-y divide-gray-100">{items.map((release) => <article key={release.id} className="p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-gray-950">{MOBILE_APPS.find((item) => item.key === release.app_key)?.label ?? release.app_key} · v{release.version}</h4>{release.is_active && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Đang phát hành</span>}<span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{release.channel === "STABLE" ? "Ổn định" : "Thử nghiệm"}</span></div><p className="mt-1 text-xs text-gray-500">{release.published_at ? `Phát hành: ${formatDate(release.published_at)}` : `Ghi nhận lịch sử: ${formatDate(release.created_at)}`}</p></div>{!release.is_active && <button type="button" onClick={() => void activate(release)} disabled={busyId === release.id} className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">Kích hoạt lại</button>}</div><div className="mt-3 rounded-lg bg-gray-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tính năng</p><ul className="mt-1 space-y-1 text-sm text-gray-700">{featureLines(release.release_notes).map((feature, index) => <li key={`${release.id}-${index}`}>• {feature}</li>)}</ul></div>{release.artifact_url && <a className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline" href={release.artifact_url} target="_blank" rel="noreferrer">Mở gói cài đặt ↗</a>}</article>)}</div>}</div>
  </section>;
}
