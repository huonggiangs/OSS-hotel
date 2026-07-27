"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

interface PurchaseOrder {
  id: string;
  supplier_id: string;
  status: string;
  expected_at: string | null;
  created_at: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default function PurchaseOrdersPage() {
  const [items, setItems] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [poRes, supRes] = await Promise.all([
        api.get<{ items: PurchaseOrder[] }>("/api/v1/purchase-orders"),
        api.get<{ items: Supplier[] }>("/api/v1/suppliers"),
      ]);
      setItems(poRes.items);
      setSuppliers(supRes.items);
      if (!supplierId && supRes.items.length > 0) setSupplierId(supRes.items[0].id);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không tải được danh sách đơn mua hàng.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function supplierName(id: string): string {
    return suppliers.find((s) => s.id === id)?.name ?? id;
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/v1/purchase-orders", {
        supplierId,
        expectedAt: expectedAt ? new Date(expectedAt).toISOString() : undefined,
        notes: notes || undefined,
      });
      setShowForm(false);
      setNotes("");
      setExpectedAt("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Tạo đơn mua hàng thất bại.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Mua hàng / tồn kho</h1>
          <p className="mt-1 text-sm text-gray-500">Vòng đời đơn: DRAFT → ORDERED → RECEIVED (tự sinh thiết bị vào kho) hoặc CANCELLED.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
          {showForm ? "Đóng" : "+ Tạo đơn mua hàng"}
        </button>
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nhà cung cấp</label>
            <select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ngày dự kiến nhận</label>
            <input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Ghi chú</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={!supplierId} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              Tạo đơn (DRAFT)
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Nhà cung cấp</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Ngày tạo</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Dự kiến nhận</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Trạng thái</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Đang tải...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Chưa có đơn mua hàng nào.</td></tr>}
            {items.map((po) => (
              <tr key={po.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{supplierName(po.supplier_id)}</td>
                <td className="px-4 py-2 text-gray-600">{new Date(po.created_at).toLocaleDateString("vi-VN")}</td>
                <td className="px-4 py-2 text-gray-600">{po.expected_at ? new Date(po.expected_at).toLocaleDateString("vi-VN") : "—"}</td>
                <td className="px-4 py-2"><StatusBadge status={po.status} /></td>
                <td className="px-4 py-2">
                  <Link href={`/purchase-orders/${po.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                    Xem chi tiết
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
