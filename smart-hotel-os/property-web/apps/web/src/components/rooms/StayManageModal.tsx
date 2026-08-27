"use client";

import { useEffect, useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { MaintenanceRequestModal } from "@/components/rooms/MaintenanceRequestModal";
import { api, isApiError } from "@/lib/api-client";
import type { RoomCard } from "@/lib/room-status";

type View = "overview" | "extend" | "transfer";
interface Adjustment { id: string; kind: string; description: string; amount: string; payment_timing: string | null; created_at: string }
interface Summary { booking: { id: string; total_price: string; deposit: string; checkout_at: string | null; checkout_date: string }; adjustments: Adjustment[]; paidAmount: number; amountDue: number }
interface ApiRoom { id: string; number: string; status: string; room_type_name: string; room_type_price: string }

function money(value: number) { return `${value.toLocaleString("vi-VN")}đ`; }
function localDateTimeTomorrow() { const value = new Date(); value.setDate(value.getDate() + 1); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}T12:00`; }
function toOffset(value: string) { return value ? `${value}:00+07:00` : ""; }

export function StayManageModal({ room, onClose, onChanged }: { room: RoomCard; onClose: () => void; onChanged: () => void }) {
  const [view, setView] = useState<View>("overview");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [present, setPresent] = useState(room.powered);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [serviceAmount, setServiceAmount] = useState(0);
  const [serviceNote, setServiceNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
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
    await run(async () => { await api.post(`/api/v1/bookings/${room.activeBookingId}/${next ? "guest-return" : "guest-out"}`); setPresent(next); });
  }
  async function settle() {
    if (!room.activeBookingId) return;
    await run(async () => { await api.post(`/api/v1/bookings/${room.activeBookingId}/settle-checkout`, { serviceAmount, serviceNote: serviceNote.trim() || undefined, paymentMethod }); }, onClose);
  }
  async function extend() {
    if (!room.activeBookingId || !checkoutAt) return;
    await run(async () => {
      await api.post(`/api/v1/bookings/${room.activeBookingId}/extend`, {
        checkoutDate: checkoutAt.slice(0, 10), checkoutAt: toOffset(checkoutAt), additionalAmount: extensionAmount,
        additionalDeposit: extensionDeposit, paymentTiming, note: extensionNote.trim() || undefined,
      });
      setView("overview"); await load();
    });
  }
  async function transfer() {
    if (!room.activeBookingId || !targetRoomId || transferReason.trim().length < 3) { setError("Chọn phòng trống và nhập lý do chuyển phòng."); return; }
    await run(async () => { await api.post(`/api/v1/bookings/${room.activeBookingId}/transfer`, { targetRoomId, adjustmentAmount: transferAmount, reason: transferReason.trim() }); }, onClose);
  }

  const balance = summary?.amountDue ?? Math.max(0, (room.activeBookingTotal ?? 0) - (room.activeBookingDeposit ?? 0));
  const title = view === "extend" ? `Gia hạn lưu trú — Phòng ${room.n}` : view === "transfer" ? `Chuyển phòng — Phòng ${room.n}` : `Quản lý lưu trú — Phòng ${room.n}`;
  return <><Modal title={title} onClose={onClose} width={660} footer={<ButtonGhost onClick={onClose}>Đóng</ButtonGhost>}>
    <div className="flex max-h-[72vh] flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
      {error && <p className="m-0 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">{error}</p>}
      {!room.activeBookingId && <p className="m-0 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">Không tìm thấy hợp đồng đang lưu trú. Không thể thao tác tự động.</p>}
      {view === "overview" && <>
        <div className="rounded-lg bg-pms-primary-soft px-3 py-2 text-[13px] text-pms-text">Khách: <b>{room.guest ?? "Chưa gắn khách"}</b>{room.stayLabel ? ` · Đã ở ${room.stayLabel}` : ""}</div>
        <div className="rounded-lg border border-pms-divider p-3.5"><Line label="Tổng tiền lưu trú & phát sinh" value={money(Number(summary?.booking.total_price ?? room.activeBookingTotal ?? 0))} /><Line label="Đặt cọc" value={`− ${money(Number(summary?.booking.deposit ?? room.activeBookingDeposit ?? 0))}`} good /><Line label="Đã thanh toán" value={`− ${money(summary?.paidAmount ?? 0)}`} good /><div className="flex justify-between border-t border-pms-border pt-2 text-[13.5px]"><span className="font-semibold">Còn phải thu</span><b className="text-pms-danger">{money(balance)}</b></div></div>
        {summary?.adjustments.length ? <div className="rounded-lg bg-pms-bg p-3 text-[12px]"><b>Nhật ký phát sinh</b><div className="mt-2 flex flex-col gap-1.5">{summary.adjustments.slice(0, 4).map((item) => <div key={item.id} className="flex justify-between gap-3"><span>{item.description}{item.payment_timing ? ` · ${item.payment_timing === "PREPAID" ? "trả trước" : "trả sau"}` : ""}</span><b className={Number(item.amount) < 0 ? "text-pms-success" : ""}>{Number(item.amount) > 0 ? "+" : ""}{money(Number(item.amount))}</b></div>)}</div></div> : null}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><Action onClick={togglePresence} disabled={!room.activeBookingId || saving} label={present ? "Khách ra ngoài · ngắt điện" : "Khách về phòng · cấp điện"} /><Action onClick={() => setView("extend")} disabled={!room.activeBookingId} label="Gia hạn lưu trú" /><Action onClick={() => setView("transfer")} disabled={!room.activeBookingId} label="Chuyển / nâng hạng / hạ hạng" /><Action onClick={() => setMaintenanceOpen(true)} disabled={!room.activeBookingId} label="Báo hỏng & yêu cầu sửa" danger /></div>
        <div className="border-t border-pms-divider pt-4"><b className="text-[13.5px]">Thanh toán và trả phòng</b><p className="mb-3 mt-1 text-[11.5px] text-pms-muted">Số tiền lấy từ tiền phòng, gia hạn, chuyển hạng, đặt cọc và các dịch vụ phát sinh dưới đây.</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><NumberField label="Dịch vụ phát sinh" value={serviceAmount} onChange={setServiceAmount} min={0} /><div className="sm:col-span-2"><TextField label="Ghi chú dịch vụ" value={serviceNote} onChange={setServiceNote} placeholder="Ví dụ: minibar, giặt là..." /></div><div><label className="mb-1.5 block text-[12px]">Hình thức thanh toán</label><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"><option value="CASH">Tiền mặt</option><option value="BANK_TRANSFER">Chuyển khoản</option><option value="CARD">Thẻ</option><option value="VNPAY">VNPay</option><option value="MOMO">MoMo</option><option value="ZALOPAY">ZaloPay</option></select></div><div className="flex items-end sm:col-span-2"><ButtonPrimary onClick={settle}>{saving ? "Đang xử lý..." : `Thu ${money(balance + serviceAmount)} & trả phòng`}</ButtonPrimary></div></div></div>
      </>}
      {view === "extend" && <><p className="m-0 text-[12.5px] text-pms-muted">Gia hạn cập nhật thời điểm trả phòng, tổng tiền và tiền đặt cọc; bản ghi phát sinh giữ lại trong lịch sử hợp đồng.</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className="mb-1.5 block text-[12px]">Trả phòng mới *</label><input type="datetime-local" value={checkoutAt} onChange={(event) => setCheckoutAt(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></div><NumberField label="Tiền lưu trú thêm" value={extensionAmount} onChange={setExtensionAmount} min={0} /><NumberField label="Đặt cọc thêm" value={extensionDeposit} onChange={setExtensionDeposit} min={0} /><div><label className="mb-1.5 block text-[12px]">Thu tiền</label><select value={paymentTiming} onChange={(event) => setPaymentTiming(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"><option value="PREPAID">Yêu cầu trả trước</option><option value="POSTPAID">Thu sau</option></select></div><div className="sm:col-span-2"><TextField label="Ghi chú" value={extensionNote} onChange={setExtensionNote} placeholder="Lý do/thoả thuận gia hạn" /></div></div><div className="flex gap-2"><button type="button" className="rounded-lg border border-pms-border px-4 py-2.5 text-[13px] font-semibold" onClick={() => setView("overview")}>Quay lại</button><ButtonPrimary onClick={extend}>{saving ? "Đang lưu..." : "Xác nhận gia hạn"}</ButtonPrimary></div></>}
      {view === "transfer" && <><p className="m-0 text-[12.5px] text-pms-muted">Phòng cũ sẽ chuyển sang chờ dọn, thiết bị được tắt. Điện ở phòng mới giữ theo trạng thái khách đang ở/ra ngoài hiện tại.</p><div><label className="mb-1.5 block text-[12px]">Phòng mới (chỉ hiển thị phòng trống) *</label><select value={targetRoomId} onChange={(event) => setTargetRoomId(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"><option value="">Chọn phòng</option>{rooms.map((item) => <option key={item.id} value={item.id}>Phòng {item.number} · {item.room_type_name} · {money(Number(item.room_type_price))}</option>)}</select></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><NumberField label="Chênh lệch (− là giảm giá)" value={transferAmount} onChange={setTransferAmount} /><TextField label="Lý do chuyển phòng *" value={transferReason} onChange={setTransferReason} placeholder="Sự cố / yêu cầu khách / nâng hạng..." /></div><div className="rounded-lg bg-pms-primary-soft px-3 py-2 text-[12px]">Tổng tiền sau điều chỉnh: <b>{money(Number(summary?.booking.total_price ?? room.activeBookingTotal ?? 0) + transferAmount)}</b></div><div className="flex gap-2"><button type="button" className="rounded-lg border border-pms-border px-4 py-2.5 text-[13px] font-semibold" onClick={() => setView("overview")}>Quay lại</button><ButtonPrimary onClick={transfer}>{saving ? "Đang chuyển..." : "Xác nhận chuyển phòng"}</ButtonPrimary></div></>}
    </div>
  </Modal>{maintenanceOpen && <MaintenanceRequestModal room={room} bookingId={room.activeBookingId} onClose={() => setMaintenanceOpen(false)} onChanged={() => { void onChanged(); setMaintenanceOpen(false); }} />}</>;
}

function Line({ label, value, good }: { label: string; value: string; good?: boolean }) { return <div className="mb-2 flex justify-between text-[12.5px]"><span className="text-pms-muted">{label}</span><b className={good ? "text-pms-success" : ""}>{value}</b></div>; }
function Action({ label, onClick, disabled, danger }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) { return <button type="button" onClick={onClick} disabled={disabled} className="rounded-lg border border-pms-border px-3 py-2.5 text-left text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-50" style={{ color: danger ? "#CC2F42" : undefined }}>{label}</button>; }
function NumberField({ label, value, onChange, min }: { label: string; value: number; onChange: (value: number) => void; min?: number }) { return <div><label className="mb-1.5 block text-[12px]">{label}</label><input type="number" min={min} value={value} onChange={(event) => onChange(Number(event.target.value) || 0)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></div>; }
function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <div><label className="mb-1.5 block text-[12px]">{label}</label><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></div>; }
