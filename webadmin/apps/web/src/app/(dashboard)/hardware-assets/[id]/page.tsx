"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { ConnectionDot } from "@/components/ConnectionDot";

interface HardwareAssetDetail {
  id: string;
  asset_code: string;
  asset_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string;
  status: string;
  connection_status: string;
  disconnect_count: number;
  last_seen_at: string | null;
  last_connection_check_at: string | null;
  activated_at: string | null;
  purchased_at: string | null;
  warranty_until: string | null;
  supplier_id: string | null;
  supporting_partner_id: string | null;
  connectivity_provider: string | null;
  subscription_fee: string | null;
  subscription_cycle: string | null;
  connected_server: string | null;
  property_id: string | null;
  property_name: string | null;
  parent_asset_id: string | null;
  customer_id: string | null;
  child_assets: { id: string; asset_code: string; asset_type: string; brand: string | null; model: string | null; connection_status: string }[];
}

interface AssetAlert {
  id: string;
  alert_type: string;
  message: string;
  severity: string;
  created_at: string;
  resolved_at: string | null;
}

interface Partner {
  id: string;
  name: string;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value ?? "—"}</dd>
    </div>
  );
}

export default function HardwareAssetDetailPage() {
  const params = useParams<{ id: string }>();
  const [asset, setAsset] = useState<HardwareAssetDetail | null>(null);
  const [alerts, setAlerts] = useState<AssetAlert[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<HardwareAssetDetail>(`/api/v1/hardware-assets/${params.id}`);
      setAsset(res);
      const alertsRes = await api.get<{ items: AssetAlert[] }>(`/api/v1/hardware-assets/${params.id}/alerts`);
      setAlerts(alertsRes.items);
      const partnersRes = await api.get<{ items: Partner[] }>("/api/v1/partners");
      setPartners(partnersRes.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không tải được thông tin thiết bị.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleSyncNow() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await api.post<{ iotServiceReachable: boolean; matchedAssets: number; fetchedDevices: number; alertsCreated: number; error?: string }>(
        "/api/v1/hardware-assets/sync-connection-status"
      );
      setSyncMessage(
        res.iotServiceReachable
          ? `Đã đồng bộ toàn hệ thống: khớp ${res.matchedAssets}/${res.fetchedDevices} thiết bị, sinh ${res.alertsCreated} cảnh báo mới.`
          : `Không gọi được iot-service: ${res.error ?? "không rõ lỗi"}`
      );
      await load();
    } catch (err) {
      setSyncMessage(err instanceof ApiClientError ? err.message : "Đồng bộ thất bại.");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Đang tải...</p>;
  if (!asset) return <p className="text-sm text-red-600">{error ?? "Không tìm thấy thiết bị."}</p>;

  const partnerName = partners.find((p) => p.id === asset.supporting_partner_id)?.name;

  return (
    <div>
      <Link href="/hardware-assets" className="text-xs font-medium text-brand-600 hover:underline">
        ← Danh sách thiết bị phần cứng
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg font-semibold text-gray-900">{asset.asset_code}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {asset.asset_type.replaceAll("_", " ")} {[asset.brand, asset.model].filter(Boolean).length ? `· ${[asset.brand, asset.model].filter(Boolean).join(" ")}` : ""} · Serial {asset.serial_number}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionDot status={asset.connection_status} />
          <StatusBadge status={asset.status} />
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {syncing ? "Đang đồng bộ..." : "Đồng bộ trạng thái ngay"}
          </button>
        </div>
      </div>

      {syncMessage && <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{syncMessage}</p>}
      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Cảnh báo riêng của thiết bị này */}
      {alerts.filter((a) => !a.resolved_at).length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Cảnh báo</p>
          <ul className="mt-2 space-y-1">
            {alerts.filter((a) => !a.resolved_at).map((a) => (
              <li key={a.id} className="text-xs text-amber-800">
                <span className="font-semibold">[{a.severity}]</span> {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Kết nối &amp; vận hành</h2>
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <Field label="Trạng thái kết nối" value={<ConnectionDot status={asset.connection_status} />} />
            <Field label="Số lần mất kết nối" value={asset.disconnect_count} />
            <Field label="Lần cuối thấy" value={asset.last_seen_at ? new Date(asset.last_seen_at).toLocaleString("vi-VN") : null} />
            <Field label="Lần kiểm tra gần nhất" value={asset.last_connection_check_at ? new Date(asset.last_connection_check_at).toLocaleString("vi-VN") : null} />
            <Field label="Server đang kết nối" value={asset.connected_server} />
            <Field label="Ngày kích hoạt" value={asset.activated_at ? new Date(asset.activated_at).toLocaleDateString("vi-VN") : null} />
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Bảo hành &amp; hỗ trợ</h2>
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <Field label="Ngày mua" value={asset.purchased_at ? new Date(asset.purchased_at).toLocaleDateString("vi-VN") : null} />
            <Field label="Hạn bảo hành" value={asset.warranty_until ? new Date(asset.warranty_until).toLocaleDateString("vi-VN") : null} />
            <Field label="Đối tác hỗ trợ/bảo hành" value={partnerName ?? asset.supporting_partner_id} />
            <Field label="Khách hàng sử dụng" value={asset.customer_id ?? "Chưa gán"} />
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Thuê bao dịch vụ kết nối</h2>
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <Field label="Nhà cung cấp" value={asset.connectivity_provider} />
            <Field
              label="Phí thuê bao"
              value={asset.subscription_fee ? `${Number(asset.subscription_fee).toLocaleString("vi-VN")} đ / ${asset.subscription_cycle === "YEARLY" ? "năm" : "tháng"}` : null}
            />
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Vị trí</h2>
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <Field label="Cơ sở" value={asset.property_name} />
            <Field label="Mã cơ sở (property_id)" value={asset.property_id} />
          </dl>
        </div>
      </div>

      {/* Thiết bị phụ trợ gắn vào (vd: máy in/máy quét gắn vào Kiosk) */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Thiết bị phụ trợ gắn vào ({asset.child_assets.length})</h2>
        {asset.child_assets.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">Không có thiết bị phụ trợ nào gắn vào thiết bị này.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {asset.child_assets.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/hardware-assets/${c.id}`} className="font-mono font-medium text-brand-700 hover:underline">
                  {c.asset_code}
                </Link>
                <span className="text-gray-500">{c.asset_type.replaceAll("_", " ")} {[c.brand, c.model].filter(Boolean).join(" ")}</span>
                <ConnectionDot status={c.connection_status} />
              </li>
            ))}
          </ul>
        )}
        {asset.parent_asset_id && (
          <p className="mt-3 text-xs text-gray-500">
            Thiết bị này là phụ trợ của{" "}
            <Link href={`/hardware-assets/${asset.parent_asset_id}`} className="font-mono text-brand-700 hover:underline">
              thiết bị chính
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
