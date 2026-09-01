"use client";

import { useEffect, useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { MaintenanceRequestModal } from "@/components/rooms/MaintenanceRequestModal";
import { api, isApiError } from "@/lib/api-client";
import type { RoomCard } from "@/lib/room-status";

type View = "overview" | "extend" | "transfer" | "settlement";
interface Adjustment { id: string; description: string; amount: string; payment_timing: string | null }
interface Service { id: string; name: string; quantity: string; unit_price: string; amount: string; note: string | null }
interface DeviceAction { deviceId: string; deviceName: string; controlKind: string; deliveryStatus: "QUEUED" | "NOT_CONFIGURED" | "ACKNOWLEDGED" | "FAILED" }
interface AccessCard { id: string; card_code: string; status: string }
interface Summary { booking: { id: string; total_price: string; deposit: string; checkout_at: string | null; checkout_date: string }; adjustments: Adjustment[]; services: Service[]; accessCard: AccessCard | null; lodgingReport: { status: string; last_error: string | null } | null; deviceActions: DeviceAction[]; paidAmount: number; amountDue: number }
interface ApiRoom { id: string; number: string; status: string; room_type_name: string; room_type_price: string }
interface Settlement { invoice: { id: string; code: string; guest_name: string; method: string; amount: string; status: string }; amountDue: number }

function money(value: number) { return `${value.toLocaleString("vi-VN")}đ`; }
function localDateTimeTomorrow() { const value = new Date(); value.setDate(value.getDate() + 1); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}T12:00`; }
function toOffset(value: string) { return value ? `${value}:00+07:00` : ""; }
function reportLabel(status?: string) { return ({ READY: "Sẵn sàng khai báo", NOT_REQUIRED: "Chưa bắt buộc (không qua đêm)", NEEDS_INFO: "Thiếu thông tin", QUEUED: "Đang chờ gửi", SUBMITTED: "Đã gửi", ACCEPTED: "Đã tiếp nhận", REJECTED: "Bị từ chối", MANUAL_REQUIRED: "Cần gửi thủ công" } as Record<string, string>)[status ?? ""] ?? "Chưa chuẩn bị"; }
function deviceDeliveryLabel(status: DeviceAction["deliveryStatus"]) { return ({ QUEUED: "Đã ghi lệnh, chờ ACK Edge/IoT", ACKNOWLEDGED: "Đã xác nhận bởi thiết bị", FAILED: "Thiết bị không thực hiện được lệnh", NOT_CONFIGURED: "Chưa map phần cứng" } as const)[status]; }
function deviceDeliveryClass(status: DeviceAction["deliveryStatus"]) { return status === "ACKNOWLEDGED" ? "text-pms-success" : status === "FAILED" ? "text-pms-danger" : status === "QUEUED" ? "text-pms-primary" : "text-pms-muted"; }

export function StayManageModal({ room, onClose, onChanged }: { room: RoomCard; onClose: () => void; onChanged: () => void }) {
  const [view, setView] = useState<View>("overview");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [present, setPresent] = useState(room.powered);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [serviceQuantity, setServiceQuantity] = useState(1);
  const [serviceUnitPrice, setServiceUnitPrice] = useState(0);
  const [serviceNote, setServiceNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [cardCode, setCardCode] = useState("");
  const [checkoutAt, setCheckoutAt] = useState(localDateTimeTomorrow());
  const [extensionAmount, setExtensionAmount] = useState(0);
  const [extensionDeposit, setExtensionDeposit] = useState(0);
  const [paymentTiming, setPaymentTiming] = useState("POSTPAID");
  const [extensionNote, setExtensionNote] = useState("");
  const [targetRoomId, setTargetRoomId] = useState("");
  const [transferAmount, setTransferAmount] = useState(0);
  const [transferReason, setTransferReason] = useState("Khách yêu cầu chuyển phòng");

  async function load() {
    if (!room.activeBookingId) return;
    try {
      const response = await api.get<Summary>(`/api/v1/bookings/${room.activeBookingId}/operations`);
      setSummary(response); setError(null);
    } catch (err) { setError(isApiError(err) ? err.message : "Không tải được chi tiết lưu trú."); }
  }
  useEffect(() => { void load(); }, [room.activeBookingId]);
  useEffect(() => {
    if (view !== "transfer") return;
    void api.get<{ items: ApiRoom[] }>("/api/v1/rooms").then((response) => setRooms(response.items.filter((item) => item.status === "VACANT" && item.id !== room.id))).catch((err) => setError(isApiError(err) ? err.message : "Không tải được phòng trống."));
  }, [view, room.id]);

  async function run(action: () => Promise<void>, success?: () => void) {
    setSaving(true); setError(null);
    try { await action(); await onChanged(); success?.(); }
    catch (err) { setError(isApiError(err) ? err.message : "Thao tác không thành công."); }
    finally { setSaving(false); }
  }
  async function togglePresence() {
    if (!room.activeBookingId) return;
    const next = !present;
    await run(async () => { await api.post(`/api/v1/bookings/${room.activeBookingId}/${next ? "guest-return" : "guest-out"}`); setPresent(next); await load(); });
  }
  async function addService() {
    if (!room.activeBookingId || serviceName.trim().length < 2 || serviceQuantity <= 0 || serviceUnitPrice < 0) { setError("Nhập tên, số lượng và đơn giá dịch vụ hợp lệ."); return; }
    await run(async () => {
      await api.post(`/api/v1/bookings/${room.activeBookingId}/services`, { name: serviceName.trim(), quantity: serviceQuantity, unitPrice: serviceUnitPrice, note: serviceNote.trim() || undefined });
      setServiceName(""); setServiceQuantity(1); setServiceUnitPrice(0); setServiceNote(""); await load();
    });
  }
  async function issueCard() {
    if (!room.activeBookingId || !cardCode.trim()) { setError("Nhập mã/số thẻ trước khi cấp."); return; }
    await run(async () => { await api.post(`/api/v1/bookings/${room.activeBookingId}/access-card/issue`, { cardCode: cardCode.trim() }); setCardCode(""); await load(); });
  }
  async function returnCard() {
    if (!room.activeBookingId) return;
    await run(async () => { await api.post(`/api/v1/bookings/${room.activeBookingId}/access-card/return`); await load(); });
  }
  async function prepareSettlement() {
    if (!room.activeBookingId) return;
    setSaving(true); setError(null); setQrUrl(null);
    try {
      const response = await api.post<Settlement>(`/api/v1/bookings/${room.activeBookingId}/settlement-preview`, { paymentMethod });
      setSettlement(response);
      if (paymentMethod === "BANK_TRANSFER" && Number(response.invoice.amount) > 0) {
        const qr = await api.get<{ imgUrl: string | null }>(`/api/v1/payments/sepay/qr?invoiceId=${encodeURIComponent(response.invoice.id)}`);
        setQrUrl(qr.imgUrl);
        if (!qr.imgUrl) setError("Chưa cấu hình SePay (ngân hàng/số tài khoản) nên chưa thể hiển thị QR.");
      }
      setView("settlement");
    } catch (err) { setError(isApiError(err) ? err.message : "Không thể lập phiếu xác nhận thanh toán."); }
    finally { setSaving(false); }
  }
  async function finalizeSettlement() {
    if (!room.activeBookingId || !settlement) return;
    await run(async () => { await api.post(`/api/v1/bookings/${room.activeBookingId}/settlement-finalize`, { invoiceId: settlement.invoice.id }); }, onClose);
  }
  async function syncAndRefreshQr() {
    if (!room.activeBookingId || !settlement) return;
    setSaving(true); setError(null);
    try {
      await api.post("/api/v1/payments/sepay/sync");
      const refreshed = await api.post<Settlement>(`/api/v1/bookings/${room.activeBookingId}/settlement-preview`, { paymentMethod });
      setSettlement(refreshed);
      await load();
    } catch (err) { setError(isApiError(err) ? err.message : "Chưa đồng bộ được giao dịch QR."); }
    finally { setSaving(false); }
  }
  async function extend() {
    if (!room.activeBookingId || !checkoutAt) return;
    await run(async () => {
      await api.post(`/api/v1/bookings/${room.activeBookingId}/extend`, { checkoutDate: checkoutAt.slice(0, 10), checkoutAt: toOffset(checkoutAt), additionalAmount: extensionAmount, additionalDeposit: extensionDeposit, paymentTiming, note: extensionNote.trim() || undefined });
      setView("overview"); await load();
    });
  }
  async function transfer() {
    if (!room.activeBookingId || !targetRoomId || transferReason.trim().length < 3) { setError("Chọn phòng trống và nhập lý do chuyển phòng."); return; }
    await run(async () => { await api.post(`/api/v1/bookings/${room.activeBookingId}/transfer`, { targetRoomId, adjustmentAmount: transferAmount, reason: transferReason.trim() }); }, onClose);
  }

  const balance = summary?.amountDue ?? Math.max(0, (room.activeBookingTotal ?? 0) - (room.activeBookingDeposit ?? 0));
  const title = view === "extend" ? `Gia hạn lưu trú — Phòng ${room.n}` : view === "transfer" ? `Chuyển phòng — Phòng ${room.n}` : view === "settlement" ? `Xác nhận thanh toán — Phòng ${room.n}` : `Quản lý lưu trú — Phòng ${room.n}`;
  return <><Modal title={title} onClose={onClose} width={700} footer={<ButtonGhost onClick={onClose}>Đóng</ButtonGhost>}>
    <div className="flex max-h-[72vh] flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
      {error && <p className="m-0 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">{error}</p>}
      {!room.activeBookingId && <p className="m-0 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">Không tìm thấy hợp đồng đang lưu trú. Không thể thao tác tự động.</p>}
      {view === "overview" && <>
        <div className="rounded-lg bg-pms-primary-soft px-3 py-2 text-[13px]">Khách: <b>{room.guest ?? "Chưa gắn khách"}</b>{room.stayLabel ? ` · Đã ở ${room.stayLabel}` : ""}</div>
        <div className="rounded-lg border border-pms-divider p-3.5"><Line label="Tổng tiền lưu trú & phát sinh" value={money(Number(summary?.booking.total_price ?? room.activeBookingTotal ?? 0))} /><Line label="Đặt cọc" value={`− ${money(Number(summary?.booking.deposit ?? room.activeBookingDeposit ?? 0))}`} good /><Line label="Đã thanh toán" value={`− ${money(summary?.paidAmount ?? 0)}`} good /><div className="flex justify-between border-t border-pms-border pt-2 text-[13.5px]"><span className="font-semibold">Còn phải thu</span><b className="text-pms-danger">{money(balance)}</b></div></div>
        <div className="grid gap-3 sm:grid-cols-2"><section className="rounded-lg border border-pms-divider p-3"><b className="text-[12.5px]">Khai báo lưu trú</b><p className="mb-0 mt-1 text-[12px]">{reportLabel(summary?.lodgingReport?.status)}</p>{summary?.lodgingReport?.last_error && <p className="mb-0 mt-1 text-[11.5px] text-pms-danger">{summary.lodgingReport.last_error}</p>}</section><section className="rounded-lg border border-pms-divider p-3"><b className="text-[12.5px]">Thiết bị được điều khiển</b>{summary?.deviceActions.length ? <div className="mt-1.5 space-y-1">{summary.deviceActions.map((device) => <p key={device.deviceId} className="m-0 text-[11.5px]">{device.deviceName} · <span className={deviceDeliveryClass(device.deliveryStatus)}>{deviceDeliveryLabel(device.deliveryStatus)}</span></p>)}</div> : <p className="mb-0 mt-1 text-[11.5px] text-pms-muted">Chưa gán thiết bị năng lượng/bộ thẻ.</p>}</section></div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><Action onClick={togglePresence} disabled={!room.activeBookingId || saving} label={present ? "Khách ra ngoài · ngắt điện" : "Khách về phòng · cấp điện"} /><Action onClick={() => setView("extend")} disabled={!room.activeBookingId} label="Gia hạn lưu trú" /><Action onClick={() => setView("transfer")} disabled={!room.activeBookingId} label="Chuyển / nâng hạng / hạ hạng" /><Action onClick={() => setMaintenanceOpen(true)} disabled={!room.activeBookingId} label="Báo hỏng & yêu cầu sửa" danger /></div>
        <section className="rounded-lg border border-pms-divider p-3"><b className="text-[13px]">Thẻ phòng</b>{summary?.accessCard?.status === "ISSUED" ? <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]"><span>Đang cấp: <b>{summary.accessCard.card_code}</b></span><button type="button" disabled={saving} onClick={() => void returnCard()} className="rounded-md border border-pms-danger px-2.5 py-1.5 font-semibold text-pms-danger">Thu hồi thẻ</button><span className="text-pms-muted">Phải thu hồi trước chuyển/trả phòng.</span></div> : <div className="mt-2 flex flex-col gap-2 sm:flex-row"><input value={cardCode} onChange={(event) => setCardCode(event.target.value)} placeholder="Mã/số thẻ" className="rounded-md border border-pms-border px-2.5 py-2 text-[12px]" /><button type="button" disabled={saving} onClick={() => void issueCard()} className="rounded-md bg-pms-primary px-3 py-2 text-[12px] font-semibold text-white">Cấp thẻ qua thiết bị đã gán</button></div>}</section>
        <section className="rounded-lg border border-pms-divider p-3"><b className="text-[13px]">Dịch vụ phát sinh</b>{summary?.services.length ? <div className="mt-2 space-y-1">{summary.services.map((service) => <div key={service.id} className="flex justify-between text-[12px]"><span>{service.name} · {service.quantity} × {money(Number(service.unit_price))}</span><b>{money(Number(service.amount))}</b></div>)}</div> : <p className="mb-2 mt-1 text-[11.5px] text-pms-muted">Chưa ghi nhận dịch vụ.</p>}<div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4"><input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="Tên dịch vụ" className="rounded-md border border-pms-border px-2.5 py-2 text-[12px] sm:col-span-2" /><input type="number" min={1} value={serviceQuantity} onChange={(event) => setServiceQuantity(Number(event.target.value) || 1)} className="rounded-md border border-pms-border px-2.5 py-2 text-[12px]" /><input type="number" min={0} value={serviceUnitPrice} onChange={(event) => setServiceUnitPrice(Number(event.target.value) || 0)} placeholder="Đơn giá" className="rounded-md border border-pms-border px-2.5 py-2 text-[12px]" /><input value={serviceNote} onChange={(event) => setServiceNote(event.target.value)} placeholder="Ghi chú" className="rounded-md border border-pms-border px-2.5 py-2 text-[12px] sm:col-span-3" /><button type="button" disabled={saving} onClick={() => void addService()} className="rounded-md bg-pms-primary px-3 py-2 text-[12px] font-semibold text-white">+ Ghi nhận</button></div></section>
        <section className="border-t border-pms-divider pt-4"><b className="text-[13.5px]">Thanh toán và trả phòng</b><p className="mb-3 mt-1 text-[11.5px] text-pms-muted">Bước 1 lập/in nháp để khách xác nhận. Bước 2 mới chốt doanh thu và đẩy phòng sang Chờ dọn.</p><div className="flex flex-col gap-2 sm:flex-row"><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"><option value="CASH">Tiền mặt</option><option value="BANK_TRANSFER">QR / chuyển khoản SePay</option><option value="CARD">Thẻ</option><option value="VNPAY">VNPay</option><option value="MOMO">MoMo</option><option value="ZALOPAY">ZaloPay</option></select><ButtonPrimary onClick={prepareSettlement}>{saving ? "Đang lập phiếu..." : `Bước 1 · Lập xác nhận ${money(balance)}`}</ButtonPrimary></div></section>
      </>}
      {view === "settlement" && settlement && <section className="space-y-4"><div className="rounded-lg border border-pms-divider p-4 text-[12.5px]"><p className="m-0 text-[11px] text-pms-muted">PHIẾU XÁC NHẬN THANH TOÁN (NHÁP)</p><h3 className="mb-3 mt-1 text-[17px]">{settlement.invoice.code}</h3><Line label="Khách" value={settlement.invoice.guest_name} /><Line label="Phòng" value={room.n} /><Line label="Hình thức" value={paymentMethod === "BANK_TRANSFER" ? "QR / chuyển khoản" : paymentMethod} /><div className="flex justify-between border-t border-pms-border pt-2 text-[14px]"><b>Cần thanh toán</b><b className="text-pms-danger">{money(Number(settlement.invoice.amount))}</b></div></div>{qrUrl && <div className="rounded-lg bg-pms-bg p-4 text-center"><p className="mt-0 text-[12px]">Khách quét QR, kiểm tra đúng số tiền và mã phiếu trước khi xác nhận.</p><img src={qrUrl} alt="QR thanh toán" className="mx-auto w-full max-w-[260px] rounded-lg border border-pms-border" /></div>}<div className="flex flex-wrap gap-2"><button type="button" onClick={() => window.print()} className="rounded-lg border border-pms-border px-3 py-2 text-[12px] font-semibold">In nháp khách xác nhận</button>{paymentMethod === "BANK_TRANSFER" && <button type="button" disabled={saving} onClick={() => void syncAndRefreshQr()} className="rounded-lg border border-pms-primary px-3 py-2 text-[12px] font-semibold text-pms-primary">Đồng bộ SePay / kiểm tra QR</button>}<ButtonPrimary onClick={finalizeSettlement}>{saving ? "Đang chốt..." : "Bước 2 · In phiếu, chốt doanh thu & trả phòng"}</ButtonPrimary><ButtonGhost onClick={() => setView("overview")}>Quay lại</ButtonGhost></div>{paymentMethod === "BANK_TRANSFER" && <p className="m-0 text-[11.5px] text-pms-muted">Với QR, PMS chỉ cho chốt sau khi SePay xác nhận giao dịch.</p>}</section>}
      {view === "extend" && <><p className="m-0 text-[12.5px] text-pms-muted">Gia hạn cập nhật thời điểm trả phòng, tổng tiền và tiền đặt cọc; bản ghi phát sinh giữ lại trong lịch sử hợp đồng.</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className="mb-1.5 block text-[12px]">Trả phòng mới *</label><input type="datetime-local" value={checkoutAt} onChange={(event) => setCheckoutAt(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></div><NumberField label="Tiền lưu trú thêm" value={extensionAmount} onChange={setExtensionAmount} min={0} /><NumberField label="Đặt cọc thêm" value={extensionDeposit} onChange={setExtensionDeposit} min={0} /><div><label className="mb-1.5 block text-[12px]">Thu tiền</label><select value={paymentTiming} onChange={(event) => setPaymentTiming(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"><option value="PREPAID">Yêu cầu trả trước</option><option value="POSTPAID">Thu sau</option></select></div><div className="sm:col-span-2"><TextField label="Ghi chú" value={extensionNote} onChange={setExtensionNote} placeholder="Lý do/thoả thuận gia hạn" /></div></div><div className="flex gap-2"><ButtonGhost onClick={() => setView("overview")}>Quay lại</ButtonGhost><ButtonPrimary onClick={extend}>{saving ? "Đang lưu..." : "Xác nhận gia hạn"}</ButtonPrimary></div></>}
      {view === "transfer" && <><p className="m-0 text-[12.5px] text-pms-muted">Phòng cũ chuyển Chờ dọn và chỉ thiết bị năng lượng được tắt. Nếu đã cấp thẻ, phải thu hồi trước khi chuyển phòng.</p><div><label className="mb-1.5 block text-[12px]">Phòng mới (chỉ phòng trống) *</label><select value={targetRoomId} onChange={(event) => setTargetRoomId(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"><option value="">Chọn phòng</option>{rooms.map((item) => <option key={item.id} value={item.id}>Phòng {item.number} · {item.room_type_name} · {money(Number(item.room_type_price))}</option>)}</select></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><NumberField label="Chênh lệch (− là giảm giá)" value={transferAmount} onChange={setTransferAmount} /><TextField label="Lý do chuyển phòng *" value={transferReason} onChange={setTransferReason} placeholder="Sự cố / yêu cầu khách / nâng hạng..." /></div><div className="rounded-lg bg-pms-primary-soft px-3 py-2 text-[12px]">Tổng tiền sau điều chỉnh: <b>{money(Number(summary?.booking.total_price ?? room.activeBookingTotal ?? 0) + transferAmount)}</b></div><div className="flex gap-2"><ButtonGhost onClick={() => setView("overview")}>Quay lại</ButtonGhost><ButtonPrimary onClick={transfer}>{saving ? "Đang chuyển..." : "Xác nhận chuyển phòng"}</ButtonPrimary></div></>}
    </div>
  </Modal>{maintenanceOpen && <MaintenanceRequestModal room={room} bookingId={room.activeBookingId} onClose={() => setMaintenanceOpen(false)} onChanged={() => { void onChanged(); setMaintenanceOpen(false); }} />}</>;
}

function Line({ label, value, good }: { label: string; value: string; good?: boolean }) { return <div className="mb-2 flex justify-between gap-3 text-[12.5px]"><span className="text-pms-muted">{label}</span><b className={good ? "text-pms-success" : ""}>{value}</b></div>; }
function Action({ label, onClick, disabled, danger }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) { return <button type="button" onClick={onClick} disabled={disabled} className="rounded-lg border border-pms-border px-3 py-2.5 text-left text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-50" style={{ color: danger ? "#CC2F42" : undefined }}>{label}</button>; }
function NumberField({ label, value, onChange, min }: { label: string; value: number; onChange: (value: number) => void; min?: number }) { return <div><label className="mb-1.5 block text-[12px]">{label}</label><input type="number" min={min} value={value} onChange={(event) => onChange(Number(event.target.value) || 0)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></div>; }
function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <div><label className="mb-1.5 block text-[12px]">{label}</label><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></div>; }
