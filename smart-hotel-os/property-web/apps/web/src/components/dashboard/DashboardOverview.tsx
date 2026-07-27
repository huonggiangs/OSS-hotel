import {
  dashboardKpis,
  incomeSources,
  fixedCostItems,
  variableCostItems,
  smallBars,
  smallBars2,
  roomUsage,
  bookingHistory,
  packages,
  activityTabs,
  activity,
  newCustomers,
} from "@/lib/mock-data";
import { Donut, buildConicGradient } from "@/components/ui/Donut";

// Tab "Tổng quan cơ sở" — pixel-perfect theo khối `isDashOverview` (dòng 302-457
// trong bản gốc): 4 thẻ KPI + lưới 3 cột (Doanh thu & đặt phòng / Phòng & dịch vụ /
// Khách hàng & hoạt động).
export function DashboardOverview() {
  const roomUsageGradient = buildConicGradient([
    { color: "#284AB1", from: 0, to: 58.63 },
    { color: "#00C853", from: 58.63, to: 82.57 },
    { color: "#FAB505", from: 82.57, to: 95.51 },
    { color: "#FC7F3A", from: 95.51, to: 100 },
  ]);
  const bookingHistoryGradient = buildConicGradient([
    { color: "#284AB1", from: 0, to: 58.63 },
    { color: "#00C853", from: 58.63, to: 82.57 },
    { color: "#FAB505", from: 82.57, to: 95.51 },
    { color: "#CC2F42", from: 95.51, to: 100 },
  ]);

  return (
    <div>
      <div className="mb-3.5 grid grid-cols-4 gap-3.5">
        {dashboardKpis.map((k) => (
          <div key={k.label} className="rounded-xl bg-white p-3.5 px-4 shadow-card">
            <span className="text-[11px] text-pms-muted">{k.label}</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <b className="text-[22px]" style={{ color: k.valueColor }}>
                {k.value}
              </b>
              {k.trend && (
                <span className="text-[11px] font-semibold" style={{ color: k.trendColor }}>
                  {k.trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 items-start gap-4">
        {/* Cột 1: Doanh thu & đặt phòng */}
        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-pms-primary">Doanh thu &amp; đặt phòng</div>

          <div className="rounded-xl bg-white p-4 shadow-card">
            <div className="mb-0.5 flex items-center justify-between">
              <h3 className="m-0 text-[13px] font-semibold">Thu nhập &amp; chi phí</h3>
              <span className="rounded-lg bg-pms-divider px-2 py-0.5 text-[10.5px] text-pms-muted">30 ngày</span>
            </div>
            <div className="my-1.5 flex gap-5">
              <div>
                <span className="text-[10.5px] font-semibold text-pms-primary">Thu nhập</span>
                <div className="text-[15px] font-bold">928.000.000đ</div>
              </div>
              <div>
                <span className="text-[10.5px] font-semibold text-pms-danger">Chi phí</span>
                <div className="text-[15px] font-bold">269.000.000đ</div>
              </div>
            </div>
            <svg width="100%" height="56" viewBox="0 0 300 56" preserveAspectRatio="none">
              <polyline points="0,40 40,33 80,36 120,12 160,30 200,20 240,26 300,8" fill="none" stroke="#284AB1" strokeWidth="2.5" />
              <polyline points="0,50 40,46 80,48 120,40 160,45 200,38 240,44 300,33" fill="none" stroke="#CC2F42" strokeWidth="2.5" strokeDasharray="4 3" />
            </svg>
            <div className="mt-2 flex gap-4 border-t border-pms-divider pt-2">
              {incomeSources.map((s) => (
                <div className="flex-1" key={s.label}>
                  <span className="text-[10px] text-pms-muted">{s.label}</span>
                  <div className="mt-0.5 text-[12.5px] font-bold">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-card">
            <div className="mb-2.5 flex items-center gap-2">
              <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg bg-pms-primary-soft">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#284AB1" strokeWidth={2}>
                  <path d="M3 7a2 2 0 012-2h13a1 1 0 011 1v3" />
                  <path d="M3 7v11a2 2 0 002 2h14a1 1 0 001-1v-8a1 1 0 00-1-1H6a1 1 0 00-1 1v0" />
                  <circle cx="16.5" cy="14" r="1.4" />
                </svg>
              </div>
              <h3 className="m-0 text-[13px] font-semibold">Chi phí cố định &amp; phát sinh</h3>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <b className="text-[14px]">215.500.000đ</b>
                  <span className="text-[10.5px] font-semibold text-pms-danger">▲ 3,1%</span>
                </div>
                <div className="my-1.5 flex h-[26px] items-end gap-0.5">
                  {smallBars.map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-pms-primary opacity-70" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="text-[10px] uppercase text-pms-muted">Cố định · so với tháng trước</div>
                {fixedCostItems.map((c) => (
                  <div key={c.label} className="mt-[5px] flex justify-between gap-1.5 text-[10.5px] text-pms-muted">
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">{c.label}</span>
                    <b className="flex-shrink-0 text-pms-text">{c.value}</b>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <b className="text-[14px]">42.100.000đ</b>
                  <span className="text-[10.5px] font-semibold text-pms-success">▼ 6,4%</span>
                </div>
                <div className="my-1.5 flex h-[26px] items-end gap-0.5">
                  {smallBars2.map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-pms-danger opacity-60" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="text-[10px] uppercase text-pms-muted">Phát sinh · so với tháng trước</div>
                {variableCostItems.map((c) => (
                  <div key={c.label} className="mt-[5px] flex justify-between gap-1.5 text-[10.5px] text-pms-muted">
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">{c.label}</span>
                    <b className="flex-shrink-0 text-pms-text">{c.value}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-card">
            <h3 className="m-0 mb-0.5 text-[13px] font-semibold">Lợi nhuận thuần</h3>
            <b className="text-[18px]">659.000.000đ</b>
            <svg width="100%" height="48" viewBox="0 0 300 48" preserveAspectRatio="none" className="mt-1.5">
              <path d="M0,36 L30,27 L60,30 L90,15 L120,21 L150,12 L180,18 L210,9 L240,15 L270,6 L300,12 L300,48 L0,48 Z" fill="rgba(40,74,177,0.12)" />
              <polyline points="0,36 30,27 60,30 90,15 120,21 150,12 180,18 210,9 240,15 270,6 300,12" fill="none" stroke="#284AB1" strokeWidth="2.5" />
            </svg>
            <div className="mt-1.5 flex gap-5">
              <div>
                <div className="text-[10px] uppercase text-pms-muted">Đặt (tháng)</div>
                <b className="text-[12px]">913</b>
              </div>
              <div>
                <div className="text-[10px] uppercase text-pms-muted">Đặt (tuần)</div>
                <b className="text-[12px]">125</b>
              </div>
            </div>
          </div>
        </div>

        {/* Cột 2: Phòng & dịch vụ */}
        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-pms-primary">Phòng &amp; dịch vụ</div>

          <div className="rounded-xl bg-white p-4 shadow-card">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="m-0 text-[13px] font-semibold">Biểu đồ sử dụng phòng</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-semibold text-pms-success">▲ 4,2%</span>
                <span className="rounded-lg bg-pms-divider px-2 py-0.5 text-[10.5px] text-pms-muted">1 tháng</span>
              </div>
            </div>
            <div className="flex items-center gap-3.5">
              <Donut gradient={roomUsageGradient} holeSize={60}>
                <b className="text-[11px]">Single</b>
                <span className="text-[9px] text-pms-muted">1913 phòng</span>
              </Donut>
              <div className="flex flex-col gap-1.5">
                {roomUsage.map((u) => (
                  <div key={u.label} className="flex items-center gap-1.5 text-[11.5px]">
                    <span className="h-[7px] w-[7px] rounded-full" style={{ background: u.color }} />
                    {u.label} <span className="text-pms-muted">{u.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-card">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="m-0 text-[13px] font-semibold">Tổng quan lịch sử đặt</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-semibold text-pms-success">▲ 2,8%</span>
                <span className="rounded-lg bg-pms-divider px-2 py-0.5 text-[10.5px] text-pms-muted">1 tháng</span>
              </div>
            </div>
            <div className="flex items-center gap-3.5">
              <Donut gradient={bookingHistoryGradient} holeSize={60}>
                <b className="text-[12px]">Đang chờ</b>
                <span className="text-[10px] text-pms-muted">337</span>
              </Donut>
              <div className="flex flex-col gap-1.5">
                {bookingHistory.map((h) => (
                  <div key={h.label} className="flex items-center gap-1.5 text-[11.5px]">
                    <span className="h-[7px] w-[7px] rounded-full" style={{ background: h.color }} />
                    {h.label} <b className="ml-0.5">{h.value}</b> <span className="text-pms-muted">{h.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-card">
            <div className="mb-0.5 flex items-center justify-between">
              <h3 className="m-0 text-[13px] font-semibold">Gói được lựa chọn nhiều nhất</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-semibold text-pms-danger">▼ 1,5%</span>
                <span className="rounded-lg bg-pms-divider px-2 py-0.5 text-[10.5px] text-pms-muted">30 ngày</span>
              </div>
            </div>
            {packages.map((p) => (
              <div key={p.name} className="mt-2">
                <div className="mb-1 flex justify-between gap-2 text-[11.5px]">
                  <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{p.name}</span>
                  <b className="flex-shrink-0">{p.pct}%</b>
                </div>
                <div className="h-[5px] rounded bg-pms-divider">
                  <div className="h-[5px] rounded" style={{ width: `${p.pct}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cột 3: Khách hàng & hoạt động */}
        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-pms-primary">Khách hàng &amp; hoạt động</div>

          <div className="rounded-xl bg-white p-4 shadow-card">
            <h3 className="m-0 mb-2 text-[13px] font-semibold">Hoạt động mới nhất</h3>
            <div className="mb-1.5 flex gap-3.5 border-b border-pms-divider text-[11.5px]">
              {activityTabs.map((t, i) => (
                <div
                  key={t}
                  className="pb-1.5 font-semibold"
                  style={{ color: i === 0 ? "#284AB1" : "#777E90", borderBottom: `2px solid ${i === 0 ? "#284AB1" : "transparent"}` }}
                >
                  {t}
                </div>
              ))}
            </div>
            {activity.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 border-b border-[#F9FAFB] py-1.5">
                <div className="h-7 w-7 flex-shrink-0 rounded-full bg-pms-primary-soft" />
                <div className="text-[12px]">
                  <div>{a.text}</div>
                  <div className="text-[10.5px] text-pms-muted-2">{a.time}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="m-0 text-[13px] font-semibold">Khách hàng mới</h3>
              <a href="#" className="text-[11px] font-semibold no-underline">
                Xem tất cả
              </a>
            </div>
            {newCustomers.map((c) => (
              <div key={c.email} className="flex items-center gap-2.5 py-1.5">
                <div className="h-7 w-7 flex-shrink-0 rounded-full bg-pms-divider" />
                <div className="text-[12px]">
                  <div>{c.name}</div>
                  <div className="text-[10.5px] text-pms-muted-2">{c.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
