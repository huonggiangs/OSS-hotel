"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Summary {
  partners: { total: number; active: number };
  suppliers: { total: number };
  customers: { total: number; using_both_products: number };
  hardware_assets_by_status: { status: string; count: number }[];
  commissions_pending_review: number;
  support_tickets_open: number;
}

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Summary>("/api/v1/dashboard/summary")
      .then(setSummary)
      .catch((err) => setError(err.message ?? "Không tải được dữ liệu tổng quan."));
  }, []);

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900">Tổng quan hệ thống</h1>
      <p className="mt-1 text-sm text-gray-500">
        Kiểm soát toàn bộ đối tác, nhà cung cấp, khách hàng, thiết bị và hoa hồng của công ty.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {summary && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Đối tác" value={summary.partners.total} hint={`${summary.partners.active} đang hoạt động`} />
            <Card label="Nhà cung cấp" value={summary.suppliers.total} />
            <Card
              label="Khách hàng"
              value={summary.customers.total}
              hint={`${summary.customers.using_both_products} dùng cả 2 sản phẩm`}
            />
            <Card label="Ticket hỗ trợ đang mở" value={summary.support_tickets_open} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-900">Thiết bị phần cứng theo trạng thái</p>
              <ul className="mt-3 space-y-2">
                {summary.hardware_assets_by_status.length === 0 && (
                  <li className="text-sm text-gray-400">Chưa có dữ liệu.</li>
                )}
                {summary.hardware_assets_by_status.map((row) => (
                  <li key={row.status} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{row.status.replaceAll("_", " ")}</span>
                    <span className="font-medium text-gray-900">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-900">Hoa hồng chờ xử lý</p>
              <p className="mt-3 text-2xl font-semibold text-gray-900">{summary.commissions_pending_review}</p>
              <p className="mt-1 text-xs text-gray-400">Bản ghi ở trạng thái CALCULATED / PENDING_APPROVAL</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
