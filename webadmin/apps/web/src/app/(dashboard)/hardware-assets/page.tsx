"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

interface HardwareAsset {
  id: string;
  asset_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string;
  status: string;
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
  "OTHER",
];

export default function HardwareAssetsPage() {
  const [items, setItems] = useState<HardwareAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetType, setAssetType] = useState("KIOSK");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ items: HardwareAsset[] }>("/api/v1/hardware-assets");
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không tải được danh sách thiết bị.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/v1/hardware-assets", {
        assetType,
        brand: brand || undefined,
        model: model || undefined,
        serialNumber,
      });
      setShowForm(false);
      setBrand("");
      setModel("");
      setSerialNumber("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Tạo thiết bị thất bại.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Thiết bị phần cứng</h1>
          <p className="mt-1 text-sm text-gray-500">Vòng đời tài sản: nhập kho → lắp đặt → bảo hành → thu hồi.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
          {showForm ? "Đóng" : "+ Thêm thiết bị"}
        </button>
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
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
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Lưu thiết bị</button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Loại</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Hãng / Model</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Số serial</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Đang tải...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Chưa có thiết bị nào.</td></tr>}
            {items.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2 text-gray-600">{a.asset_type.replaceAll("_", " ")}</td>
                <td className="px-4 py-2 text-gray-600">{[a.brand, a.model].filter(Boolean).join(" · ") || "—"}</td>
                <td className="px-4 py-2 font-mono text-gray-900">{a.serial_number}</td>
                <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
