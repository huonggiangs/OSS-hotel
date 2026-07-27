"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

interface PurchaseOrderItem {
  id: string;
  product_name: string;
  asset_type: string | null;
  quantity: number;
  unit_price: string;
  received_quantity: number;
}

interface PurchaseOrderDetail {
  id: string;
  supplier_id: string;
  status: string;
  expected_at: string | null;
  notes: string | null;
  created_at: string;
  items: PurchaseOrderItem[];
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

const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  DRAFT: [
    { value: "ORDERED", label: "Xác nhận đặt hàng (ORDERED)" },
    { value: "CANCELLED", label: "Huỷ đơn (CANCELLED)" },
  ],
  ORDERED: [
    { value: "RECEIVED", label: "Ghi nhận đã nhận hàng (RECEIVED)" },
    { value: "CANCELLED", label: "Huỷ đơn (CANCELLED)" },
  ],
  RECEIVED: [],
  CANCELLED: [],
};

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [po, setPo] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [productName, setProductName] = useState("");
  const [assetType, setAssetType] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<PurchaseOrderDetail>(`/api/v1/purchase-orders/${params.id}`);
      setPo(res);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không tải được đơn mua hàng.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/api/v1/purchase-orders/${params.id}/items`, {
        productName,
        assetType: assetType || undefined,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice) || 0,
      });
      setProductName("");
      setAssetType("");
      setQuantity("1");
      setUnitPrice("0");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Thêm dòng hàng thất bại.");
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!po) return;
    setError(null);
    try {
      await api.del(`/api/v1/purchase-orders/${po.id}/items/${itemId}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Xoá dòng hàng thất bại.");
    }
  }

  async function handleChangeStatus(status: string) {
    if (!po) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/v1/purchase-orders/${po.id}/status`, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Đổi trạng thái thất bại.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Đang tải...</p>;
  if (!po) return <p className="text-sm text-red-600">{error ?? "Không tìm thấy đơn mua hàng."}</p>;

  const nextOptions = NEXT_STATUS[po.status] ?? [];

  return (
    <div>
      <Link href="/purchase-orders" className="text-xs font-medium text-brand-600 hover:underline">
        ← Danh sách đơn mua hàng
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Đơn mua hàng #{po.id.slice(0, 8)}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tạo ngày {new Date(po.created_at).toLocaleDateString("vi-VN")}
            {po.expected_at ? ` · Dự kiến nhận ${new Date(po.expected_at).toLocaleDateString("vi-VN")}` : ""}
          </p>
        </div>
        <StatusBadge status={po.status} />
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {nextOptions.length > 0 && (
        <div className="mt-4 flex gap-2">
          {nextOptions.map((opt) => (
            <button
              key={opt.value}
              disabled={busy}
              onClick={() => handleChangeStatus(opt.value)}
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {po.status === "RECEIVED" && (
        <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Đã nhận hàng — thiết bị tương ứng (dòng hàng có gắn loại thiết bị) đã được tự động tạo trong Thiết bị phần cứng với số serial tạm, cập nhật lại serial thật khi đối soát.
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Sản phẩm / model</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Loại thiết bị</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Số lượng</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Đơn giá</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Đã nhận</th>
              {po.status === "DRAFT" && <th className="px-4 py-2"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {po.items.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Chưa có dòng hàng nào.</td></tr>}
            {po.items.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{it.product_name}</td>
                <td className="px-4 py-2 text-gray-600">{it.asset_type ? it.asset_type.replaceAll("_", " ") : "—"}</td>
                <td className="px-4 py-2 text-gray-600">{it.quantity}</td>
                <td className="px-4 py-2 text-gray-600">{Number(it.unit_price).toLocaleString("vi-VN")} đ</td>
                <td className="px-4 py-2 text-gray-600">{it.received_quantity}</td>
                {po.status === "DRAFT" && (
                  <td className="px-4 py-2">
                    <button onClick={() => handleRemoveItem(it.id)} className="text-xs font-medium text-red-600 hover:underline">Xoá</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {po.status === "DRAFT" && (
        <form onSubmit={handleAddItem} className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Sản phẩm / model</label>
            <input required value={productName} onChange={(e) => setProductName(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Loại thiết bị (tuỳ chọn)</label>
            <select value={assetType} onChange={(e) => setAssetType(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">— Không tạo tài sản theo dõi —</option>
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>{t.replaceAll("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Số lượng</label>
            <input type="number" min={1} required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Đơn giá</label>
            <input type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="lg:col-span-4">
            <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Thêm dòng hàng</button>
          </div>
        </form>
      )}
    </div>
  );
}
