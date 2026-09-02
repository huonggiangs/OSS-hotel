"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api, isApiError } from "@/lib/api-client";

interface ValueSummary {
  from: string; to: string; revenue_vnd: number; expense_vnd: number; profit_vnd: number;
  energy_kwh: number; energy_cost_vnd: number; energy_savings_vnd: number; labor_savings_vnd: number;
  loss_prevented_vnd: number; additional_revenue_vnd: number; cvg_vnd: number; service_fee_vnd: number;
  value_multiple: number | null; open_alerts: number; overdue_alerts: number; open_maintenance: number;
  urgent_maintenance: number; automation_actions: number; stale_edge_nodes: number;
}
interface RoomOption { id: string; number: string; floor: string; zone: string; }

const money = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
const dateInput = (value: Date) => value.toISOString().slice(0, 16);

export default function ValueDashboardPage() {
  const [summary, setSummary] = useState<ValueSummary | null>(null);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [energy, setEnergy] = useState({ roomId: "", measuredAt: dateInput(new Date()), kwh: "", costVnd: "", note: "" });
  const [event, setEvent] = useState({ eventType: "ENERGY_SAVED", amountVnd: "", sourceType: "PILOT_BASELINE", note: "" });

  async function load() {
    try {
      const [value, roomResponse] = await Promise.all([
        api.get<ValueSummary>("/api/v1/value/dashboard"),
        api.get<{ items: RoomOption[] }>("/api/v1/rooms"),
      ]);
      setSummary(value); setRooms(roomResponse.items); setError(null);
    } catch (err) { setError(isApiError(err) ? err.message : "Không tải được Value Dashboard."); }
  }
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 30_000); return () => window.clearInterval(timer); }, []);

  async function submitEnergy(e: FormEvent) {
    e.preventDefault(); setSaved(null);
    try {
      await api.post("/api/v1/value/energy-readings", {
        roomId: energy.roomId || null, measuredAt: new Date(energy.measuredAt).toISOString(), kwh: Number(energy.kwh), costVnd: Number(energy.costVnd || 0),
        source: "MANUAL", idempotencyKey: `manual-${energy.roomId || "property"}-${energy.measuredAt}`, note: energy.note || null,
      });
      setEnergy((value) => ({ ...value, kwh: "", costVnd: "", note: "" })); setSaved("Đã ghi nhận số đo năng lượng."); await load();
    } catch (err) { setError(isApiError(err) ? err.message : "Không ghi được số đo."); }
  }
  async function submitEvent(e: FormEvent) {
    e.preventDefault(); setSaved(null);
    try {
      await api.post("/api/v1/value/events", { ...event, amountVnd: Number(event.amountVnd), idempotencyKey: `manual-${event.eventType}-${Date.now()}` });
      setEvent((value) => ({ ...value, amountVnd: "", note: "" })); setSaved("Đã ghi nhận giá trị CVG."); await load();
    } catch (err) { setError(isApiError(err) ? err.message : "Không ghi được giá trị."); }
  }

  return <div className="mx-auto max-w-[1280px]">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><p className="m-0 text-[11px] font-bold uppercase tracking-wide text-pms-primary">Money → Problem → Action</p><h1 className="m-0 mt-1 text-[22px] font-bold">Value Dashboard</h1><p className="m-0 mt-1 text-[12px] text-pms-muted">Đo CVG từ doanh thu tăng, chi phí tiết kiệm và tổn thất tránh được — dữ liệu thật trong DB.</p></div>
      <div className="flex gap-2"><Link href="/alerts" className="rounded-lg border border-pms-border bg-white px-3 py-2 text-[12px] font-semibold no-underline">Mở Alert/SLA</Link><Link href="/dashboard" className="rounded-lg bg-pms-primary px-3 py-2 text-[12px] font-semibold text-white no-underline">Về tổng quan</Link></div>
    </div>
    {error && <p className="mb-3 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12px] text-pms-danger">{error}</p>}
    {saved && <p className="mb-3 rounded-lg bg-pms-success-bg px-3 py-2 text-[12px] text-pms-success">{saved}</p>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <ValueCard label="CVG kỳ này" value={money(summary?.cvg_vnd ?? 0)} tone="text-pms-success" />
      <ValueCard label="Lợi nhuận" value={money(summary?.profit_vnd ?? 0)} />
      <ValueCard label="Điện tiêu thụ" value={`${(summary?.energy_kwh ?? 0).toLocaleString("vi-VN")} kWh`} />
      <ValueCard label="Giá trị tự động hóa" value={`${summary?.automation_actions ?? 0} hành động`} />
    </div>
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr]">
      <section className="rounded-xl bg-white p-4 shadow-card"><div className="mb-3 flex items-center justify-between"><h2 className="m-0 text-[14px] font-bold">5 câu hỏi của chủ cơ sở</h2><span className="rounded-full bg-pms-primary-soft px-2 py-1 text-[10px] text-pms-primary">30 ngày gần nhất</span></div>
        <Question label="Hôm nay tiền vào bao nhiêu?" value={money(summary?.revenue_vnd ?? 0)} href="/dashboard" />
        <Question label="Tiền đang lãng phí ở đâu?" value={`${money(summary?.energy_cost_vnd ?? 0)} tiền điện đã đo`} href="/rooms" />
        <Question label="Có vấn đề nào cần xử lý?" value={`${summary?.open_alerts ?? 0} cảnh báo · ${summary?.open_maintenance ?? 0} phiếu bảo trì`} href="/alerts" danger={(summary?.overdue_alerts ?? 0) > 0} />
        <Question label="Việc nào đã tự động hóa?" value={`${summary?.automation_actions ?? 0} hành động được audit`} href="/rooms" />
        <Question label="Quyết định tiếp theo là gì?" value={(summary?.stale_edge_nodes ?? 0) > 0 ? "Kiểm tra Edge đang mất heartbeat" : "Theo dõi CVG và mở rộng pilot 10 phòng"} href={(summary?.stale_edge_nodes ?? 0) > 0 ? "/alerts" : "/rooms"} />
      </section>
      <section className="rounded-xl bg-white p-4 shadow-card"><h2 className="m-0 text-[14px] font-bold">CVG theo nguồn</h2><p className="mt-1 text-[11px] text-pms-muted">Nhập số liệu baseline/pilot có nguồn; AI chỉ được bật sau khi có đủ chuỗi dữ liệu.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]"><Mini label="Tiết kiệm điện" value={summary?.energy_savings_vnd ?? 0} /><Mini label="Tiết kiệm nhân công" value={summary?.labor_savings_vnd ?? 0} /><Mini label="Tổn thất tránh được" value={summary?.loss_prevented_vnd ?? 0} /><Mini label="Doanh thu tăng thêm" value={summary?.additional_revenue_vnd ?? 0} /></div>
        <div className="mt-3 rounded-lg bg-pms-divider p-3 text-[11px] text-pms-muted">Phí dịch vụ: {money(summary?.service_fee_vnd ?? 0)} · Multiple: {summary?.value_multiple == null ? "chưa tính (chưa cấu hình phí)" : `${summary.value_multiple.toFixed(1)}x`}</div>
      </section>
    </div>
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <form onSubmit={submitEnergy} className="rounded-xl bg-white p-4 shadow-card"><h2 className="m-0 text-[14px] font-bold">Pilot điện — ghi nhận số đo</h2><p className="mt-1 text-[11px] text-pms-muted">Chọn tối đa 10 phòng, theo dõi 30 ngày. Khi có IoT thật, giữ nguyên API và đổi source = IOT.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"><label className="text-[11px] font-semibold">Phòng<select required value={energy.roomId} onChange={(e) => setEnergy({ ...energy, roomId: e.target.value })} className="mt-1 w-full rounded-lg border border-pms-border p-2 text-[12px]"><option value="">Chọn phòng</option>{rooms.map((room) => <option key={room.id} value={room.id}>Phòng {room.number} · tầng {room.floor}</option>)}</select></label><label className="text-[11px] font-semibold">Thời điểm<input required type="datetime-local" value={energy.measuredAt} onChange={(e) => setEnergy({ ...energy, measuredAt: e.target.value })} className="mt-1 w-full rounded-lg border border-pms-border p-2 text-[12px]" /></label><label className="text-[11px] font-semibold">kWh<input required min="0" step="0.001" type="number" value={energy.kwh} onChange={(e) => setEnergy({ ...energy, kwh: e.target.value })} className="mt-1 w-full rounded-lg border border-pms-border p-2 text-[12px]" /></label><label className="text-[11px] font-semibold">Chi phí (VND)<input min="0" step="100" type="number" value={energy.costVnd} onChange={(e) => setEnergy({ ...energy, costVnd: e.target.value })} className="mt-1 w-full rounded-lg border border-pms-border p-2 text-[12px]" /></label></div><label className="mt-2 block text-[11px] font-semibold">Ghi chú<input value={energy.note} onChange={(e) => setEnergy({ ...energy, note: e.target.value })} className="mt-1 w-full rounded-lg border border-pms-border p-2 text-[12px]" /></label><button className="mt-3 rounded-lg bg-pms-primary px-3 py-2 text-[12px] font-semibold text-white">Lưu số đo</button>
      </form>
      <form onSubmit={submitEvent} className="rounded-xl bg-white p-4 shadow-card"><h2 className="m-0 text-[14px] font-bold">Ghi nhận giá trị tạo ra</h2><p className="mt-1 text-[11px] text-pms-muted">Dùng cho baseline/after pilot; mỗi bản ghi có idempotency key và audit log.</p><label className="mt-3 block text-[11px] font-semibold">Nguồn giá trị<select value={event.eventType} onChange={(e) => setEvent({ ...event, eventType: e.target.value })} className="mt-1 w-full rounded-lg border border-pms-border p-2 text-[12px]"><option value="ENERGY_SAVED">Tiết kiệm điện</option><option value="LABOR_SAVED">Tiết kiệm nhân công</option><option value="LOSS_PREVENTED">Tổn thất tránh được</option><option value="ADDITIONAL_REVENUE">Doanh thu tăng thêm</option></select></label><div className="mt-2 grid grid-cols-2 gap-2"><label className="text-[11px] font-semibold">Số tiền (VND)<input required min="0" type="number" value={event.amountVnd} onChange={(e) => setEvent({ ...event, amountVnd: e.target.value })} className="mt-1 w-full rounded-lg border border-pms-border p-2 text-[12px]" /></label><label className="text-[11px] font-semibold">Mã nguồn<input required value={event.sourceType} onChange={(e) => setEvent({ ...event, sourceType: e.target.value })} className="mt-1 w-full rounded-lg border border-pms-border p-2 text-[12px]" /></label></div><label className="mt-2 block text-[11px] font-semibold">Ghi chú<input value={event.note} onChange={(e) => setEvent({ ...event, note: e.target.value })} className="mt-1 w-full rounded-lg border border-pms-border p-2 text-[12px]" /></label><button className="mt-3 rounded-lg bg-pms-success px-3 py-2 text-[12px] font-semibold text-white">Ghi nhận CVG</button></form>
    </div>
  </div>;
}

function ValueCard({ label, value, tone }: { label: string; value: string; tone?: string }) { return <div className="rounded-xl bg-white p-3 shadow-card"><span className="text-[11px] text-pms-muted">{label}</span><b className={`mt-1 block text-[18px] ${tone ?? ""}`}>{value}</b></div>; }
function Mini({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-pms-border p-2"><span className="block text-[10px] text-pms-muted">{label}</span><b>{money(value)}</b></div>; }
function Question({ label, value, href, danger }: { label: string; value: string; href: string; danger?: boolean }) { return <Link href={href} className="flex flex-wrap items-center justify-between gap-2 border-b border-pms-divider py-2.5 text-[12px] no-underline last:border-0"><span className="font-semibold">{label}</span><span className={danger ? "font-semibold text-pms-danger" : "text-pms-muted"}>{value} <span className="text-pms-primary">→</span></span></Link>; }
