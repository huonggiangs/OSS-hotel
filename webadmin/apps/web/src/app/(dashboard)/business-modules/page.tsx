"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Customer {
  id: string;
  name: string;
  pms_property_id: string | null;
  operational_status: string;
}

interface BusinessModule {
  customer_id: string;
  module_key: string;
  name: string;
  description: string;
  pms_route_scope: string;
  enabled: boolean;
  disabled_reason: string | null;
  sync_status: "PENDING" | "SYNCED" | "FAILED";
  last_sync_at: string | null;
  last_sync_error: string | null;
  updated_at: string;
}

interface PmsProperty { id: string; tenant_id: string; name: string; address: string | null; status: string }

const MODULE_ICON: Record<string, string> = {
  IOT_CONTROL: "⌁",
  MAINTENANCE_ASSETS: "⚒",
  CRM_MARKETING: "◎",
  CHANNEL_MANAGER: "⇄",
  REPORTING_VALUE: "◔",
};

const CORE_MODULES = [
  "Đăng nhập, cơ sở và phân quyền",
  "Phòng và tồn phòng",
  "Đặt phòng và lưu trú",
  "Thanh toán và sổ giao dịch",
  "Đồng bộ Edge cốt lõi",
];

export default function BusinessModulesPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<BusinessModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDisable, setPendingDisable] = useState<BusinessModule | null>(null);
  const [reason, setReason] = useState("");
  const [availableProperties, setAvailableProperties] = useState<PmsProperty[]>([]);
  const [propertyToLink, setPropertyToLink] = useState("");

  const selectedCustomer = useMemo(() => customers.find((item) => item.id === customerId), [customers, customerId]);
  const enabledCount = items.filter((item) => item.enabled).length;
  const failedCount = items.filter((item) => item.sync_status === "FAILED").length;

  useEffect(() => {
    api.get<{ items: Customer[] }>("/api/v1/customers")
      .then((response) => {
        const active = response.items.filter((item) => item.operational_status !== "INACTIVE");
        setCustomers(active);
        setCustomerId((current) => current || active[0]?.id || "");
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Không tải được danh sách cơ sở."));
  }, []);

  async function load(id = customerId) {
    if (!id) { setItems([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ items: BusinessModule[]; available_properties: PmsProperty[] }>(`/api/v1/business-modules?customerId=${encodeURIComponent(id)}`);
      setItems(response.items);
      setAvailableProperties(response.available_properties ?? []);
      setPropertyToLink((current) => current && response.available_properties?.some((item) => item.id === current) ? current : response.available_properties?.[0]?.id ?? "");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không tải được trạng thái module.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(customerId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [customerId]);

  async function updateModule(item: BusinessModule, enabled: boolean, disabledReason?: string) {
    setBusy(item.module_key);
    setError(null);
    setNotice(null);
    try {
      const response = await api.patch<{ item: BusinessModule; sync: { status: string; message: string } }>(
        `/api/v1/business-modules/${item.module_key}`,
        { customerId, enabled, reason: disabledReason }
      );
      await load();
      setNotice(`${enabled ? "Đã bật" : "Đã tắt"} “${item.name}”. ${response.sync.message}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không cập nhật được module.");
    } finally {
      setBusy(null);
    }
  }

  async function retrySync() {
    if (!customerId) return;
    setBusy("sync");
    setError(null);
    try {
      const response = await api.post<{ sync: { status: string; message: string } }>("/api/v1/business-modules/sync", { customerId });
      await load();
      setNotice(response.sync.message);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không đồng bộ được trạng thái module.");
    } finally {
      setBusy(null);
    }
  }

  async function linkProperty() {
    if (!customerId || !propertyToLink) return;
    setBusy("link");
    setError(null);
    try {
      const response = await api.post<{ sync: { message: string } }>("/api/v1/business-modules/link-property", { customerId, propertyId: propertyToLink });
      setCustomers((current) => current.map((item) => item.id === customerId ? { ...item, pms_property_id: propertyToLink } : item));
      await load();
      setNotice(`Đã liên kết cơ sở PMS. ${response.sync.message}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không liên kết được cơ sở PMS.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Quản lý module nghiệp vụ</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">Bật hoặc tắt độc lập theo từng cơ sở. Tắt module chỉ chặn chức năng tương ứng, không làm gián đoạn đăng nhập, phòng, đặt phòng hay thanh toán.</p>
        </div>
        <button type="button" disabled={!customerId || busy === "sync" || user?.role !== "SUPER_ADMIN"} onClick={retrySync} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
          {busy === "sync" ? "Đang đồng bộ..." : "Đồng bộ lại với PMS"}
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-700">Cơ sở áp dụng</label>
        <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm sm:max-w-xl">
          {customers.length === 0 && <option value="">Chưa có cơ sở hoạt động</option>}
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.pms_property_id ? "" : " — chưa liên kết PMS"}</option>)}
        </select>
        {selectedCustomer && !selectedCustomer.pms_property_id && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">Khách hàng chưa liên kết với PMS</p>
            <p className="mt-1 text-xs text-amber-800">Chọn đúng cơ sở để HQ có thể áp dụng trạng thái module.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <select value={propertyToLink} onChange={(event) => setPropertyToLink(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm">
                {availableProperties.length === 0 && <option value="">Không tìm thấy cơ sở PMS khả dụng</option>}
                {availableProperties.map((property) => <option key={property.id} value={property.id}>{property.name}{property.address ? ` — ${property.address}` : ""}</option>)}
              </select>
              <button type="button" disabled={!propertyToLink || busy === "link" || user?.role !== "SUPER_ADMIN"} onClick={linkProperty} className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy === "link" ? "Đang liên kết..." : "Liên kết PMS"}</button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Summary label="Có thể quản lý" value={items.length} />
        <Summary label="Đang hoạt động" value={enabledCount} tone="green" />
        <Summary label="Cần đồng bộ lại" value={failedCount} tone={failedCount ? "red" : "gray"} />
      </div>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-gray-900">Module có thể tắt hoàn toàn</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {loading && <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Đang tải trạng thái...</div>}
          {!loading && items.map((item) => (
            <article key={item.module_key} className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${item.enabled ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}>{MODULE_ICON[item.module_key] ?? "◇"}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.enabled}
                      aria-label={`${item.enabled ? "Tắt" : "Bật"} ${item.name}`}
                      disabled={busy === item.module_key || user?.role !== "SUPER_ADMIN"}
                      onClick={() => item.enabled ? (setReason(""), setPendingDisable(item)) : void updateModule(item, true)}
                      className={`relative h-7 w-12 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${item.enabled ? "bg-blue-600" : "bg-gray-300"}`}
                    >
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${item.enabled ? "left-6" : "left-1"}`} />
                    </button>
                  </div>
                  <p className="mt-1 break-words text-sm leading-5 text-gray-600">{item.description}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 text-xs">
                <span className={`rounded-full px-2.5 py-1 font-medium ${item.enabled ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>{item.enabled ? "Đang hoạt động" : "Đã tắt hoàn toàn"}</span>
                <SyncBadge status={item.sync_status} />
                {item.disabled_reason && <span className="min-w-0 break-words text-gray-500">Lý do: {item.disabled_reason}</span>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold text-amber-900">Module lõi được bảo vệ</h2>
        <p className="mt-1 text-sm text-amber-800">HQ không cho tắt hoàn toàn các module này để tránh gián đoạn vận hành tại quầy.</p>
        <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-amber-900 sm:grid-cols-2 lg:grid-cols-3">
          {CORE_MODULES.map((name) => <li key={name} className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2">🔒 {name}</li>)}
        </ul>
      </section>

      {pendingDisable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="disable-module-title">
          <form className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onSubmit={(event) => { event.preventDefault(); if (reason.trim().length >= 3) { const item = pendingDisable; setPendingDisable(null); void updateModule(item, false, reason.trim()); } }}>
            <h2 id="disable-module-title" className="text-lg font-semibold text-gray-900">Tắt “{pendingDisable.name}”?</h2>
            <p className="mt-2 text-sm text-gray-600">PMS sẽ từ chối tác vụ mới thuộc module này. Dữ liệu cũ và trạng thái an toàn hiện tại vẫn được giữ nguyên.</p>
            <label className="mt-4 block text-sm font-medium text-gray-700">Lý do tắt <span className="text-red-600">*</span></label>
            <textarea autoFocus required minLength={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Ví dụ: Tạm bảo trì kết nối nhà cung cấp..." />
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPendingDisable(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">Hủy</button>
              <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Xác nhận tắt module</button>
            </div>
          </form>
        </div>
      )}
      {selectedCustomer && <p className="mt-5 text-xs text-gray-400">Đang quản lý: {selectedCustomer.name}. Chỉ Super Admin được thay đổi trạng thái.</p>}
    </div>
  );
}

function Summary({ label, value, tone = "blue" }: { label: string; value: number; tone?: "blue" | "green" | "red" | "gray" }) {
  const colors = { blue: "text-blue-700", green: "text-emerald-700", red: "text-red-700", gray: "text-gray-700" };
  return <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p><p className={`mt-1 text-2xl font-semibold ${colors[tone]}`}>{value}</p></div>;
}

function SyncBadge({ status }: { status: BusinessModule["sync_status"] }) {
  const styles = status === "SYNCED" ? "bg-blue-50 text-blue-700" : status === "FAILED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  const label = status === "SYNCED" ? "Đã áp dụng tại PMS" : status === "FAILED" ? "Đồng bộ lỗi" : "Chờ đồng bộ";
  return <span className={`rounded-full px-2.5 py-1 font-medium ${styles}`}>{label}</span>;
}
