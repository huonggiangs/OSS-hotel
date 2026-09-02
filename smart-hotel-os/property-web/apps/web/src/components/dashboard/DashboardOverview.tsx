"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Donut, buildConicGradient } from "@/components/ui/Donut";
import { api, isApiError } from "@/lib/api-client";
import { ROOM_STATUS_BY_API, ROOM_STATUS_INFO, type ApiRoomStatus } from "@/lib/room-status";

interface DashboardSummary {
  total_bookings: number;
  occupancy_rate_pct: number;
  active_staff: number;
  total_customers: number;
  total_rooms: number;
  room_status_breakdown: { status: ApiRoomStatus; count: number }[];
  booking_status_breakdown: { status: string; count: number }[];
  financial_daily: { date: string; revenue: number; expense: number }[];
  income_by_method: { method: string; amount: number }[];
  expense_by_category: { category: string; amount: number }[];
  bookings_this_month: number;
  bookings_this_week: number;
  booking_room_type_breakdown: { type_name: string; count: number }[];
  recent_activity: { action: string; entity_type: string; actor: string | null; created_at: string }[];
  recent_customers: { full_name: string; email: string | null; phone: string | null; created_at: string }[];
}
interface ValueSnapshot {
  cvg_vnd: number;
  energy_savings_vnd: number;
  open_alerts: number;
  overdue_alerts: number;
  open_maintenance: number;
  automation_actions: number;
}

const BOOKING_STATUS_INFO: Record<string, { label: string; color: string }> = {
  CONFIRMED: { label: "Đã xác nhận", color: "#284AB1" },
  CHECKED_IN: { label: "Đang ở", color: "#00C853" },
  PENDING: { label: "Chờ xác nhận", color: "#FAB505" },
  CHECKED_OUT: { label: "Đã trả phòng", color: "#B1B5C3" },
  CANCELLED: { label: "Huỷ", color: "#CC2F42" },
};
const CHART_COLORS = ["#284AB1", "#00C853", "#FAB505", "#FC7F3A", "#8B5CF6", "#FF5A9E"];
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  CARD: "Thẻ",
  OTA_WALLET: "Ví OTA",
  VNPAY: "VNPay",
  MOMO: "MoMo",
  ZALOPAY: "ZaloPay",
  STRIPE: "Stripe",
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function withPct<T extends { count: number }>(items: T[]) {
  const total = items.reduce((sum, item) => sum + item.count, 0) || 1;
  let from = 0;
  return items.map((item) => {
    const pct = Math.round((item.count / total) * 1000) / 10;
    const segment = { ...item, pct, from, to: from + pct };
    from += pct;
    return segment;
  });
}

function linePoints(values: number[], width: number, height: number) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function formatActivity(action: string, entityType: string) {
  return `${action.replaceAll("_", " ")} · ${entityType.replaceAll("_", " ")}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function DashboardOverview() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [valueSnapshot, setValueSnapshot] = useState<ValueSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await api.get<DashboardSummary>("/api/v1/dashboard/summary");
        if (!active) return;
        setSummary(data);
        setError(null);
      } catch (err) {
        if (active) setError(isApiError(err) ? err.message : "Không tải được số liệu tổng quan.");
      }
      try {
        const value = await api.get<ValueSnapshot>("/api/v1/value/dashboard");
        if (active) setValueSnapshot(value);
      } catch {
        // Value Dashboard có thể chưa có dữ liệu pilot; không làm hỏng các KPI vận hành.
      }
    };
    void load();
    const timer = window.setInterval(load, 30_000);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const roomSegments = useMemo(() => {
    if (!summary) return [];
    const counts = new Map(summary.room_status_breakdown.map((item) => [item.status, item.count]));
    return withPct((Object.keys(ROOM_STATUS_BY_API) as ApiRoomStatus[]).map((status) => ({ status, count: counts.get(status) ?? 0 })));
  }, [summary]);
  const bookingSegments = useMemo(() => (summary ? withPct(summary.booking_status_breakdown) : []), [summary]);
  const roomTypeSegments = useMemo(() => (summary ? withPct(summary.booking_room_type_breakdown) : []), [summary]);
  const financial = summary?.financial_daily ?? [];
  const revenue30 = financial.reduce((sum, item) => sum + item.revenue, 0);
  const expense30 = financial.reduce((sum, item) => sum + item.expense, 0);
  const revenueLine = linePoints(financial.map((item) => item.revenue), 300, 56);
  const expenseLine = linePoints(financial.map((item) => item.expense), 300, 56);

  const kpis: { label: string; value: string; color?: string }[] = summary
    ? [
        { label: "Tổng số đặt phòng", value: String(summary.total_bookings) },
        { label: "Công suất phòng (hiện tại)", value: `${summary.occupancy_rate_pct}%`, color: "#284AB1" },
        { label: "Nhân sự đang hoạt động", value: String(summary.active_staff) },
        { label: "Tổng số khách hàng", value: String(summary.total_customers) },
      ]
    : [];
  const displayedKpis: ({ label: string; value: string; color?: string } | undefined)[] = summary ? kpis : Array.from({ length: 4 }, () => undefined);

  return (
    <div>
      {error && <p className="mb-3.5 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">{error}</p>}

      <div className="mb-3.5 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        {displayedKpis.map((k, index) => (
          <div key={k?.label ?? index} className="rounded-xl bg-white p-3.5 px-4 shadow-card">
            {k ? (
              <>
                <span className="text-[11px] text-pms-muted">{k.label}</span>
                <b className="mt-1 block text-[22px]" style={{ color: k.color }}>{k.value}</b>
              </>
            ) : <span className="text-[11px] text-pms-muted">Đang tải...</span>}
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-xl border border-pms-primary/10 bg-[#F6F8FF] p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-[11px] font-bold uppercase tracking-wide text-pms-primary">Money → Problem → Action</div><h2 className="m-0 mt-1 text-[14px] font-bold">Giá trị đang tạo ra</h2></div><a href="/value-dashboard" className="text-[11px] font-semibold text-pms-primary no-underline">Mở Value Dashboard →</a></div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5"><QuickValue label="CVG kỳ này" value={formatVnd(valueSnapshot?.cvg_vnd ?? 0)} /><QuickValue label="Tiết kiệm điện" value={formatVnd(valueSnapshot?.energy_savings_vnd ?? 0)} /><QuickValue label="Cảnh báo mở" value={String(valueSnapshot?.open_alerts ?? 0)} tone={valueSnapshot?.overdue_alerts ? "text-pms-danger" : undefined} /><QuickValue label="Bảo trì mở" value={String(valueSnapshot?.open_maintenance ?? 0)} /><QuickValue label="Tự động hóa" value={`${valueSnapshot?.automation_actions ?? 0} lần`} /></div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <section className="flex flex-col gap-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-pms-primary">Doanh thu &amp; đặt phòng</div>
          <div className="rounded-xl bg-white p-4 shadow-card">
            <div className="mb-0.5 flex items-center justify-between">
              <h3 className="m-0 text-[13px] font-semibold">Thu nhập &amp; chi phí</h3>
              <span className="rounded-lg bg-pms-divider px-2 py-0.5 text-[10.5px] text-pms-muted">30 ngày</span>
            </div>
            <div className="my-1.5 flex gap-5">
              <Metric label="Thu nhập" value={formatVnd(revenue30)} color="#284AB1" />
              <Metric label="Chi phí" value={formatVnd(expense30)} color="#CC2F42" />
            </div>
            <svg width="100%" height="56" viewBox="0 0 300 56" preserveAspectRatio="none" aria-label="Biểu đồ thu nhập và chi phí 30 ngày">
              <polyline points={revenueLine} fill="none" stroke="#284AB1" strokeWidth="2.5" />
              <polyline points={expenseLine} fill="none" stroke="#CC2F42" strokeWidth="2.5" strokeDasharray="4 3" />
            </svg>
            <div className="mt-2 flex flex-wrap gap-3 border-t border-pms-divider pt-2">
              {(summary?.income_by_method ?? []).map((item) => (
                <div className="min-w-[84px] flex-1" key={item.method}>
                  <span className="text-[10px] text-pms-muted">{PAYMENT_METHOD_LABELS[item.method] ?? item.method}</span>
                  <div className="mt-0.5 text-[12.5px] font-bold">{formatVnd(item.amount)}</div>
                </div>
              ))}
              {summary && summary.income_by_method.length === 0 && <Empty text="Chưa có khoản thu đã thanh toán trong 30 ngày." />}
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-card">
            <h3 className="m-0 mb-2.5 text-[13px] font-semibold">Chi phí theo hạng mục</h3>
            {(summary?.expense_by_category ?? []).map((item, index) => (
              <div className="mt-2" key={item.category}>
                <div className="mb-1 flex justify-between gap-2 text-[11.5px]">
                  <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{item.category}</span>
                  <b className="flex-shrink-0">{formatVnd(item.amount)}</b>
                </div>
                <div className="h-[5px] rounded bg-pms-divider">
                  <div className="h-[5px] rounded" style={{ width: `${Math.round((item.amount / (expense30 || 1)) * 100)}%`, background: CHART_COLORS[index % CHART_COLORS.length] }} />
                </div>
              </div>
            ))}
            {summary && summary.expense_by_category.length === 0 && <Empty text="Chưa có khoản chi trong 30 ngày." />}
          </div>

          <div className="rounded-xl bg-white p-4 shadow-card">
            <h3 className="m-0 mb-0.5 text-[13px] font-semibold">Lợi nhuận thuần</h3>
            <b className="text-[18px]">{formatVnd(revenue30 - expense30)}</b>
            <div className="mt-3 flex gap-5 border-t border-pms-divider pt-2">
              <Metric label="Đặt (tháng)" value={String(summary?.bookings_this_month ?? 0)} />
              <Metric label="Đặt (tuần)" value={String(summary?.bookings_this_week ?? 0)} />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-pms-primary">Phòng &amp; dịch vụ</div>
          <div className="rounded-xl bg-white p-4 shadow-card">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="m-0 text-[13px] font-semibold">Trạng thái phòng</h3>
              <span className="rounded-lg bg-pms-divider px-2 py-0.5 text-[10.5px] text-pms-muted">Từ dữ liệu phòng</span>
            </div>
            {summary ? (
              <div className="flex items-center gap-3.5">
                <Donut gradient={buildConicGradient(roomSegments.map((item) => ({ color: ROOM_STATUS_INFO[ROOM_STATUS_BY_API[item.status]].color, from: item.from, to: item.to })))} holeSize={60}>
                  <b className="text-[11px]">{summary.total_rooms}</b><span className="text-[9px] text-pms-muted">phòng</span>
                </Donut>
                <div className="flex flex-col gap-1.5">
                  {roomSegments.map((item) => {
                    const key = ROOM_STATUS_BY_API[item.status];
                    const info = ROOM_STATUS_INFO[key];
                    return (
                      <button type="button" key={item.status} className="flex items-center gap-1.5 text-left text-[11.5px] hover:text-pms-primary" onClick={() => router.push(`/rooms?status=${key}`)} title={`Mở Trạng thái phòng: ${info.label}`}>
                        <span className="h-[7px] w-[7px] rounded-full" style={{ background: info.color }} />{info.label} <b>{item.count}</b> <span className="text-pms-muted">{item.pct}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : <Empty text="Đang tải dữ liệu phòng..." />}
          </div>

          <DonutPanel title="Tổng quan lịch sử đặt" badge="Theo trạng thái" total={summary?.total_bookings ?? 0} unit="hợp đồng" segments={bookingSegments} labelOf={(item) => BOOKING_STATUS_INFO[item.status]?.label ?? item.status} colorOf={(item) => BOOKING_STATUS_INFO[item.status]?.color ?? "#B1B5C3"} loading={!summary} />
          <DonutPanel title="Loại phòng được đặt" badge="Toàn bộ dữ liệu" total={roomTypeSegments.reduce((sum, item) => sum + item.count, 0)} unit="lượt đặt" segments={roomTypeSegments} labelOf={(item) => item.type_name} colorOf={(_, index) => CHART_COLORS[index % CHART_COLORS.length]} loading={!summary} />
        </section>

        <section className="flex flex-col gap-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-pms-primary">Khách hàng &amp; hoạt động</div>
          <div className="rounded-xl bg-white p-4 shadow-card">
            <h3 className="m-0 mb-2 text-[13px] font-semibold">Hoạt động mới nhất</h3>
            {(summary?.recent_activity ?? []).map((item, index) => (
              <div key={`${item.created_at}-${index}`} className="flex items-center gap-2.5 border-b border-[#F9FAFB] py-2 last:border-0">
                <div className="h-7 w-7 flex-shrink-0 rounded-full bg-pms-primary-soft" />
                <div className="min-w-0 text-[12px]"><div className="truncate">{formatActivity(item.action, item.entity_type)}</div><div className="text-[10.5px] text-pms-muted-2">{item.actor ? `${item.actor} · ` : ""}{formatDateTime(item.created_at)}</div></div>
              </div>
            ))}
            {summary && summary.recent_activity.length === 0 && <Empty text="Chưa có hoạt động được ghi nhận." />}
          </div>

          <div className="rounded-xl bg-white p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between"><h3 className="m-0 text-[13px] font-semibold">Khách hàng mới</h3><a href="/customers" className="text-[11px] font-semibold no-underline">Xem tất cả</a></div>
            {(summary?.recent_customers ?? []).map((customer) => (
              <div key={`${customer.full_name}-${customer.created_at}`} className="flex items-center gap-2.5 py-1.5">
                <div className="h-7 w-7 flex-shrink-0 rounded-full bg-pms-divider" />
                <div className="min-w-0 text-[12px]"><div className="truncate">{customer.full_name}</div><div className="truncate text-[10.5px] text-pms-muted-2">{customer.email ?? customer.phone ?? "Chưa có thông tin liên hệ"}</div></div>
              </div>
            ))}
            {summary && summary.recent_customers.length === 0 && <Empty text="Chưa có khách hàng." />}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return <div><span className="text-[10.5px] font-semibold" style={{ color }}>{label}</span><div className="text-[15px] font-bold">{value}</div></div>;
}

function QuickValue({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className="min-w-0"><span className="block truncate text-[10.5px] text-pms-muted">{label}</span><b className={`mt-0.5 block truncate text-[13px] ${tone ?? ""}`}>{value}</b></div>;
}

function Empty({ text }: { text: string }) {
  return <p className="m-0 py-2 text-[11.5px] text-pms-muted">{text}</p>;
}

function DonutPanel<T extends { count: number; from: number; to: number; pct: number }>({ title, badge, total, unit, segments, labelOf, colorOf, loading }: {
  title: string; badge: string; total: number; unit: string; segments: T[]; labelOf: (item: T) => string; colorOf: (item: T, index: number) => string; loading: boolean;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between"><h3 className="m-0 text-[13px] font-semibold">{title}</h3><span className="rounded-lg bg-pms-divider px-2 py-0.5 text-[10.5px] text-pms-muted">{badge}</span></div>
      {loading ? <Empty text="Đang tải..." /> : segments.length === 0 ? <Empty text="Chưa có dữ liệu." /> : (
        <div className="flex items-center gap-3.5">
          <Donut gradient={buildConicGradient(segments.map((item, index) => ({ color: colorOf(item, index), from: item.from, to: item.to })))} holeSize={60}><b className="text-[12px]">{total}</b><span className="text-[10px] text-pms-muted">{unit}</span></Donut>
          <div className="flex flex-col gap-1.5">{segments.map((item, index) => <div key={`${labelOf(item)}-${index}`} className="flex items-center gap-1.5 text-[11.5px]"><span className="h-[7px] w-[7px] rounded-full" style={{ background: colorOf(item, index) }} />{labelOf(item)} <b>{item.count}</b> <span className="text-pms-muted">{item.pct}%</span></div>)}</div>
        </div>
      )}
    </div>
  );
}
