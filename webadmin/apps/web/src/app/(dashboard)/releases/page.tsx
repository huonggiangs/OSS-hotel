"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

interface AppRelease {
  id: string;
  app_key: string;
  version: string;
  release_notes: string | null;
  channel: string;
  published_at: string | null;
  artifact_url: string | null;
  is_active: boolean;
}

const APP_KEYS = [
  "KIOSK_APP",
  "PROPERTY_WEB",
  "PROPERTY_WINDOWS",
  "OWNER_MOBILE",
  "HOUSEKEEPING_MOBILE",
  "SUPER_ADMIN_WEB",
];
const APP_LABELS: Record<string, string> = {
  KIOSK_APP: "Kiosk App",
  PROPERTY_WEB: "Property Web (PMS)",
  PROPERTY_WINDOWS: "Property Windows (PMS Desktop)",
  OWNER_MOBILE: "Owner Mobile",
  HOUSEKEEPING_MOBILE: "Housekeeping Mobile",
  SUPER_ADMIN_WEB: "Super Admin Web",
};

// Release Console — MVP quản lý VERSION, KHÔNG PHẢI pipeline deploy thật.
// "Phát hành" ở đây chỉ ghi nhận bản nào đang active trong bảng app_releases
// để hiển thị/tra cứu; không tự gửi lệnh cập nhật xuống thiết bị/khách hàng
// (xem giới hạn ghi trong hq-console/docs/MODULE_APP_RELEASE_CONSOLE.md mục 4
// và PROGRESS.md).
export default function ReleasesPage() {
  const [items, setItems] = useState<AppRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterApp, setFilterApp] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [appKey, setAppKey] = useState(APP_KEYS[0]);
  const [version, setVersion] = useState("");
  const [channel, setChannel] = useState("STABLE");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [artifactUrl, setArtifactUrl] = useState("");

  async function load() {
    setLoading(true);
    try {
      const query = filterApp ? `?appKey=${filterApp}` : "";
      const res = await api.get<{ items: AppRelease[] }>(`/api/v1/releases${query}`);
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không tải được danh sách bản phát hành.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterApp]);

  async function handlePublish(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/v1/releases", {
        appKey,
        version,
        channel,
        releaseNotes: releaseNotes || undefined,
        artifactUrl: artifactUrl || undefined,
        isActive: true,
      });
      setShowForm(false);
      setVersion("");
      setReleaseNotes("");
      setArtifactUrl("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Phát hành phiên bản thất bại.");
    }
  }

  async function handleRollback(r: AppRelease) {
    setBusyId(r.id);
    setError(null);
    try {
      await api.patch(`/api/v1/releases/${r.id}`, { isActive: true });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Rollback thất bại.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Release Console</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tổng hợp phiên bản của toàn bộ client app trong hệ sinh thái. MVP quản lý version — chưa phải deploy pipeline thật, không gửi lệnh cập nhật xuống thiết bị/khách hàng.
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
          {showForm ? "Đóng" : "+ Phát hành phiên bản mới"}
        </button>
      </div>

      <div className="mt-4">
        <select value={filterApp} onChange={(e) => setFilterApp(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Tất cả ứng dụng</option>
          {APP_KEYS.map((k) => (
            <option key={k} value={k}>{APP_LABELS[k]}</option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {showForm && (
        <form onSubmit={handlePublish} className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ứng dụng</label>
            <select value={appKey} onChange={(e) => setAppKey(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              {APP_KEYS.map((k) => (
                <option key={k} value={k}>{APP_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phiên bản</label>
            <input required placeholder="vd. 1.4.0" value={version} onChange={(e) => setVersion(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Kênh</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="STABLE">Stable</option>
              <option value="BETA">Beta</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Link gói cài đặt (artifact URL)</label>
            <input value={artifactUrl} onChange={(e) => setArtifactUrl(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Ghi chú phát hành</label>
            <textarea value={releaseNotes} onChange={(e) => setReleaseNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Phát hành ngay</button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Ứng dụng</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Phiên bản</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Kênh</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Ngày phát hành</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Trạng thái</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Đang tải...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Chưa có bản phát hành nào.</td></tr>}
            {items.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{APP_LABELS[r.app_key] ?? r.app_key}</td>
                <td className="px-4 py-2 font-mono text-gray-900">{r.version}</td>
                <td className="px-4 py-2 text-gray-600">{r.channel}</td>
                <td className="px-4 py-2 text-gray-600">{r.published_at ? new Date(r.published_at).toLocaleString("vi-VN") : "—"}</td>
                <td className="px-4 py-2"><StatusBadge status={r.is_active ? "ACTIVE" : "INACTIVE"} /></td>
                <td className="px-4 py-2">
                  {!r.is_active && (
                    <button disabled={busyId === r.id} onClick={() => handleRollback(r)} className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50">
                      Kích hoạt lại (rollback)
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
