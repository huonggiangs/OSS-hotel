"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { ConnectionDot } from "@/components/ConnectionDot";

interface HardwareAsset {
  id: string;
  asset_code: string;
  asset_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string;
  status: string;
  connection_status: string;
  disconnect_count: number;
  property_id: string | null;
  property_name: string | null;
  warranty_until: string | null;
}

interface AssetAlert {
  id: string;
  asset_id: string;
  asset_code: string;
  asset_type: string;
  property_name: string | null;
  alert_type: string;
  message: string;
  severity: string;
  created_at: string;
}

interface PropertyOption {
  id: string;
  name: string;
}

const ASSET_TYPES = [
  "KIOSK",
  "PASSPORT_SCANNER",
  "QR_SCANNER",
  "CARD_DISPENSER",
  "CASH_ACCEPTOR",
  "IP_CAMERA",
  "THERMAL_PRINTER",
  "IOT_CONTROLLER",
  "DOOR_LOCK",
  "POWER_SWITCH",
  "ELECTRIC_METER",
  "EDGE_NODE",
  "OTHER",
];

const CONNECTION_STATUSES = ["ONLINE", "OFFLINE", "UNKNOWN"];

export default function HardwareAssetsPage() {
  const [items, setItems] = useState<HardwareAsset[]>([]);
  const [alerts, setAlerts] = useState<AssetAlert[]>([]);
  const [propertyOptions, setPropertyOptions] = useState<PropertyOption[]>([]);
  const [propertySource, setPropertySource] = useState<"property-web" | "fallback">("fallback");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Bộ lọc
  const [filterProperty, setFilterProperty] = useState("");
  const [filterConnection, setFilterConnection] = useState("");

  // Form tạo mới
  const [assetType, setAssetType] = useState("KIOSK");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [propertyNameManual, setPropertyNameManual] = useState("");
  const [warrantyUntil, setWarrantyUntil] = useState("");
  const [activatedAt, setActivatedAt] = useState("");
  const [connectivityProvider, setConnectivityProvider] = useState("Navtask");
  const [subscriptionFee, setSubscriptionFee] = useState("");
  const [subscriptionCycle, setSubscriptionCycle] = useState("MONTHLY");
  const [parentAssetId, setParentAssetId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProperty) params.set("propertyId", filterProperty);
      if (filterConnection) params.set("connectionStatus", filterConnection);
      const qs = params.toString();
      const res = await api.get<{ items: HardwareAsset[] }>(`/api/v1/hardware-assets${qs ? `?${qs}` : ""}`);
      setItems(res.items);
      const alertsRes = await api.get<{ items: AssetAlert[] }>("/api/v1/hardware-assets/alerts");
      setAlerts(alertsRes.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không tải được danh sách thiết bị.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPropertyOptions() {
    try {
      const res = await api.get<{ items: PropertyOption[]; source: "property-web" | "fallback" }>(
        "/api/v1/hardware-assets/property-options"
      );
      setPropertyOptions(res.items);
      setPropertySource(res.source);
    } catch {
      setPropertySource("fallback");
    }
  }

  useEffect(() => {
    load();
    loadPropertyOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterProperty, filterConnection]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const selected = propertyOptions.find((p) => p.id === propertyId);
      const resolvedPropertyName = propertySource === "property-web" ? selected?.name ?? "" : propertyNameManual;
      const resolvedPropertyId = propertySource === "property-web" ? propertyId : propertyId || propertyNameManual;
      if (!resolvedPropertyId || !resolvedPropertyName) {
        setError("Bắt buộc gán thiết bị vào 1 cơ sở (chọn hoặc nhập tên cơ sở).");
        return;
      }
      await api.post("/api/v1/hardware-assets", {
        assetType,
        brand: brand || undefined,
        model: model || undefined,
        serialNumber,
        propertyId: resolvedPropertyId,
        propertyName: resolvedPropertyName,
        warrantyUntil: warrantyUntil ? new Date(warrantyUntil).toISOString() : undefined,
        activatedAt: activatedAt ? new Date(activatedAt).toISOString() : undefined,
        connectivityProvider: connectivityProvider || undefined,
        subscriptionFee: subscriptionFee ? Number(subscriptionFee) : undefined,
        subscriptionCycle: subscriptionFee ? subscriptionCycle : undefined,
        parentAssetId: parentAssetId || undefined,
      });
      setShowForm(false);
      setBrand("");
      setModel("");
      setSerialNumber("");
      setPropertyId("");
      setPropertyNameManual("");
      setWarrantyUntil("");
      setActivatedAt("");
      setSubscriptionFee("");
      setParentAssetId("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Tạo thiết bị thất bại.");
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await api.post<{
        iotServiceReachable: boolean;
        matchedAssets: number;
        fetchedDevices: number;
        alertsCreated: number;
        error?: string;
      }>("/api/v1/hardware-assets/sync-connection-status");
      if (res.iotServiceReachable) {
        setSyncMessage(`Đã đồng bộ: khớp ${res.matchedAssets}/${res.fetchedDevices} thiết bị, sinh ${res.alertsCreated} cảnh báo mới.`);
      } else {
        setSyncMessage(`Không gọi được iot-service: ${res.error ?? "không rõ lỗi"}`);
      }
      await load();
    } catch (err) {
      setSyncMessage(err instanceof ApiClientError ? err.message : "Đồng bộ thất bại.");
    } finally {
      setSyncing(false);
    }
  }

  const kioskCandidates = items.filter((a) => a.asset_type === "KIOSK" || a.asset_type === "EDGE_NODE");

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Thiết bị phần cứng</h1>
          <p className="mt-1 text-sm text-gray-500">
            Vòng đời tài sản + giám sát kết nối thật (đồng bộ từ iot-service qua mã thiết bị chung <code>asset_code</code>).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {syncing ? "Đang đồng bộ..." : "Đồng bộ trạng thái ngay"}
          </button>
          <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
            {showForm ? "Đóng" : "+ Thêm thiết bị"}
          </button>
        </div>
      </div>

      {syncMessage && <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{syncMessage}</p>}
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Khối tổng hợp cảnh báo */}
      {alerts.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Cảnh báo thiết bị ({alerts.length} chưa xử lý)</p>
          <ul className="mt-2 space-y-1">
            {alerts.slice(0, 8).map((a) => (
              <li key={a.id} className="text-xs text-amber-800">
                <Link href={`/hardware-assets/${a.asset_id}`} className="font-mono font-medium hover:underline">
                  {a.asset_code}
                </Link>{" "}
                — {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bộ lọc */}
      <div className="mt-4 flex flex-wrap gap-3">
        <select value={filterProperty} onChange={(e) => setFilterProperty(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Tất cả cơ sở</option>
          {propertyOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={filterConnection} onChange={(e) => setFilterConnection(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Mọi trạng thái kết nối</option>
          {CONNECTION_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Loại thiết bị</label>
            <select value={assetType} onChange={(e) => setAssetType(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>{t.replaceAll("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Số serial</label>
            <input required value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Hãng</label>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Model</label>
            <input value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700">
              Cơ sở <span className="text-red-600">*</span>
            </label>
            {propertySource === "property-web" ? (
              <select required value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">— Chọn cơ sở —</option>
                {propertyOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ) : (
              <>
                <input
                  required
                  placeholder="Nhập tên cơ sở (property-web không kết nối được)"
                  value={propertyNameManual}
                  onChange={(e) => setPropertyNameManual(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-amber-600">Không lấy được danh sách cơ sở từ property-web — nhập tay tên cơ sở.</p>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Ngày kích hoạt</label>
            <input type="date" value={activatedAt} onChange={(e) => setActivatedAt(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Hạn bảo hành</label>
            <input type="date" value={warrantyUntil} onChange={(e) => setWarrantyUntil(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Nhà cung cấp dịch vụ kết nối</label>
            <input value={connectivityProvider} onChange={(e) => setConnectivityProvider(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phí thuê bao (đ)</label>
            <input type="number" min={0} value={subscriptionFee} onChange={(e) => setSubscriptionFee(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Chu kỳ thuê bao</label>
            <select value={subscriptionCycle} onChange={(e) => setSubscriptionCycle(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="MONTHLY">Hàng tháng</option>
              <option value="YEARLY">Hàng năm</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Gắn vào thiết bị chính (tuỳ chọn — vd: máy in/máy quét gắn vào Kiosk)</label>
            <select value={parentAssetId} onChange={(e) => setParentAssetId(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">— Không (thiết bị độc lập) —</option>
              {kioskCandidates.map((k) => (
                <option key={k.id} value={k.id}>{k.asset_code} · {k.asset_type} {k.brand ? `· ${k.brand}` : ""}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Lưu thiết bị</button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Mã thiết bị</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Loại</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Hãng / Model</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Cơ sở</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Kết nối</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Mất kết nối</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Đang tải...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Chưa có thiết bị nào.</td></tr>}
            {items.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2">
                  <Link href={`/hardware-assets/${a.id}`} className="font-mono font-medium text-brand-700 hover:underline">{a.asset_code}</Link>
                  <div className="text-xs text-gray-400">{a.serial_number}</div>
                </td>
                <td className="px-4 py-2 text-gray-600">{a.asset_type.replaceAll("_", " ")}</td>
                <td className="px-4 py-2 text-gray-600">{[a.brand, a.model].filter(Boolean).join(" · ") || "—"}</td>
                <td className="px-4 py-2 text-gray-600">{a.property_name ?? "—"}</td>
                <td className="px-4 py-2"><ConnectionDot status={a.connection_status} /></td>
                <td className="px-4 py-2 text-gray-600">{a.disconnect_count}</td>
                <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
