"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { MobileAppManagement, type MobileManagementView } from "@/components/mobile/MobileAppManagement";

type ConnectionStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";

interface MobileConnection {
  id: string;
  username: string;
  full_name: string;
  role: string;
  property_name: string;
  platform: "ANDROID" | "IOS";
  device_name: string | null;
  device_id: string;
  app_version: string | null;
  status: ConnectionStatus;
  auth_method: string;
  is_emulator: boolean;
  attestation_provider: string | null;
  attestation_verdict: string | null;
  requested_at: string;
  approved_at: string | null;
  revoked_at: string | null;
  rejected_at: string | null;
  last_seen_at: string | null;
  approval_note: string | null;
}

interface MobileConnectionEvent {
  id: number;
  event_type: "DISCOVERY" | "LOGIN_STARTED" | "LOGIN_SUCCEEDED" | "LOGIN_FAILED";
  property_code: string | null;
  username: string | null;
  platform: "ANDROID" | "IOS";
  device_id: string;
  device_name: string | null;
  app_version: string | null;
  endpoint_host: string | null;
  outcome: string | null;
  source_ip: string | null;
  created_at: string;
}

const STATUS_TEXT: Record<ConnectionStatus, string> = {
  PENDING: "Dữ liệu cũ",
  APPROVED: "Đã kết nối",
  REJECTED: "Đã từ chối",
  REVOKED: "Đã thu hồi",
};

const STATUS_CLASS: Record<ConnectionStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
  REVOKED: "bg-gray-200 text-gray-700",
};

const ROLE_TEXT: Record<string, string> = {
  OWNER: "Chủ cơ sở",
  MANAGER: "Quản lý",
  RECEPTIONIST: "Lễ tân",
  HOUSEKEEPING: "Nhân viên dọn phòng",
  TECHNICIAN: "Kỹ thuật viên",
};

function formatDate(value: string | null) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function MobileConnectionsPage() {
  const [tab, setTab] = useState<"connections" | MobileManagementView>("connections");
  const [items, setItems] = useState<MobileConnection[]>([]);
  const [events, setEvents] = useState<MobileConnectionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const query = params.toString();
      const result = await api.get<{ items: MobileConnection[]; pending: number }>(`/api/v1/mobile-connections${query ? `?${query}` : ""}`);
      const eventResult = await api.get<{ items: MobileConnectionEvent[] }>("/api/v1/mobile-connections/events").catch(() => ({ items: [] }));
      setItems(result.items);
      setEvents(eventResult.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không tải được danh sách kết nối ứng dụng.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  const approved = items.filter((item) => item.status === "APPROVED").length;
  const android = items.filter((item) => item.platform === "ANDROID").length;
  const ios = items.filter((item) => item.platform === "IOS").length;
  const recentlySeen = items.filter((item) => item.last_seen_at && Date.now() - new Date(item.last_seen_at).getTime() < 15 * 60 * 1000).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Quản trị ứng dụng di động</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
            Theo dõi thiết bị kết nối, xem các màn hình người dùng và quản lý lịch sử phiên bản ứng dụng.
          </p>
        </div>
        {tab === "connections" && <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Đang tải..." : "Làm mới"}
        </button>}
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm" role="tablist" aria-label="Quản trị ứng dụng di động">
        <TabButton active={tab === "connections"} onClick={() => setTab("connections")}>Thiết bị kết nối</TabButton>
        <TabButton active={tab === "screens"} onClick={() => setTab("screens")}>Màn hình ứng dụng</TabButton>
        <TabButton active={tab === "releases"} onClick={() => setTab("releases")}>Phiên bản phát hành</TabButton>
      </div>

      {tab !== "connections" ? <MobileAppManagement view={tab} /> : <>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Tổng thiết bị đã ghi nhận" value={items.length} tone="blue" />
        <Summary label="Đang kết nối" value={approved} tone="green" />
        <Summary label="Có tín hiệu trong 15 phút" value={recentlySeen} tone="green" />
        <Summary label="Android / iOS" value={`${android} / ${ios}`} tone="blue" />
      </div>

      <section className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-semibold">Cách đăng nhập và bảo vệ tài khoản</p><p className="mt-1 text-xs text-blue-700">App tự tìm PMS trong LAN; bản public dùng domain HTTPS cố định. Người dùng không nhập URL máy chủ.</p></div>
          <a href="anio://discover" className="rounded-lg bg-blue-600 px-4 py-2 text-center font-semibold text-white hover:bg-blue-700">Mở app và tự kết nối</a>
        </div>
        <ol className="mt-2 grid gap-2 sm:grid-cols-3">
          <li><b>1.</b> App tự tìm máy chủ; nhập mã cơ sở, tên đăng nhập và mật khẩu trong lần đầu.</li>
          <li><b>2.</b> Hệ thống ghi nhận mã thiết bị và tự đăng nhập ở các lần sau.</li>
          <li><b>3.</b> HQ dùng trang này để thống kê thiết bị và thời điểm hoạt động gần nhất.</li>
        </ol>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-950">Hoạt động tìm và kết nối gần đây</h2>
            <p className="text-xs text-gray-500">Hiển thị ngay cả khi người dùng chưa đăng nhập thành công; không lưu mật khẩu.</p>
          </div>
          <span className="text-xs text-gray-500">{events.length} sự kiện</span>
        </div>
        {events.length === 0 ? <p className="mt-3 text-sm text-gray-500">Chưa nhận được sự kiện từ app. Hãy cài APK mới và bấm “Tìm lại”.</p> : (
          <div className="mt-3 space-y-2">
            {events.slice(0, 8).map((event) => (
              <div key={event.id} className="flex flex-col gap-1 rounded-lg bg-gray-50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><span className="font-semibold">{event.event_type === "DISCOVERY" ? "Đã tìm thấy PMS" : event.event_type === "LOGIN_STARTED" ? "Bắt đầu đăng nhập" : event.event_type}</span><span className="ml-2 text-gray-500">{event.device_name || event.device_id} · {event.username || "chưa nhập tài khoản"}</span></div>
                <div className="shrink-0 text-xs text-gray-500">{formatDate(event.created_at)} · {event.source_ip || "LAN"}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row">
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Tìm tên đăng nhập, họ tên, cơ sở hoặc thiết bị"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="APPROVED">Đã kết nối</option>
          <option value="REJECTED">Dữ liệu cũ đã từ chối</option>
          <option value="REVOKED">Đã thu hồi</option>
        </select>
        <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Tìm kiếm
        </button>
      </form>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">Đang tải danh sách...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="font-semibold text-gray-800">Chưa có thiết bị phù hợp</p>
          <p className="mt-1 text-sm text-gray-500">Thiết bị sẽ xuất hiện sau lần đăng nhập thành công đầu tiên.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-gray-950">{item.full_name}</p>
                  <p className="truncate text-sm text-gray-500">@{item.username} · {ROLE_TEXT[item.role] ?? item.role}</p>
                  <p className="mt-1 truncate text-sm font-medium text-blue-700">{item.property_name}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[item.status]}`}>
                  {STATUS_TEXT[item.status]}
                </span>
              </div>

              <div className="mt-4 grid gap-3 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-2">
                <Info label="Cách xác thực" value={item.auth_method === "PASSWORD" ? "Mã cơ sở + mật khẩu" : "Dữ liệu ghép nối cũ"} />
                <Info label="Nền tảng" value={item.platform === "IOS" ? "iPhone / iPad" : "Android"} />
                <Info label="Thiết bị" value={item.device_name || "Chưa nhận diện tên"} />
                <Info label="Phiên bản ứng dụng" value={item.app_version || "Chưa cung cấp"} />
                <Info label="Đăng nhập lần đầu" value={formatDate(item.requested_at)} />
                <Info label="Hoạt động gần nhất" value={formatDate(item.last_seen_at)} />
              </div>

              <p className="mt-3 break-all text-xs text-gray-400">Mã thiết bị: {item.device_id}</p>
              {item.approval_note && <p className="mt-2 text-sm text-gray-600">Ghi chú: {item.approval_note}</p>}

            </article>
          ))}
        </div>
      )}
      </>}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{children}</button>;
}

function Summary({ label, value, tone }: { label: string; value: number | string; tone: "green" | "gray" | "blue" }) {
  const toneClass = tone === "green" ? "text-emerald-700" : tone === "blue" ? "text-blue-700" : "text-gray-700";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="truncate font-semibold text-gray-800">{value}</p>
    </div>
  );
}
