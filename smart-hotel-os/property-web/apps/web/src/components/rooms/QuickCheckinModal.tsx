"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { api, isApiError } from "@/lib/api-client";
import type { RoomCard } from "@/lib/room-status";

type StayType = "HOURLY" | "OVERNIGHT" | "DAILY";
interface Rate { rate_key: "HOUR" | "NIGHT" | "DAY"; amount: string; minimum_units: number; active: boolean }

function pad(value: number) { return String(value).padStart(2, "0"); }
function dateOnly(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function localTimestamp(date: Date) { return `${dateOnly(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:00+07:00`; }
function money(value: number) { return `${value.toLocaleString("vi-VN")}đ`; }

export function QuickCheckinModal({ room, onClose, onChanged }: { room: RoomCard; onClose: () => void; onChanged: () => void }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("OTHER");
  const [nationality, setNationality] = useState("Việt Nam");
  const [identityType, setIdentityType] = useState("CCCD/CMND");
  const [identityNumber, setIdentityNumber] = useState("");
  const [identityIssuedPlace, setIdentityIssuedPlace] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [occupation, setOccupation] = useState("");
  const [stayPurpose, setStayPurpose] = useState("Lưu trú");
  const [stayType, setStayType] = useState<StayType>("DAILY");
  const [units, setUnits] = useState(1);
  const [powerOn, setPowerOn] = useState(true);
  const [rates, setRates] = useState<Rate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!room.roomTypeId) return;
    void api.get<{ items: Rate[] }>(`/api/v1/room-types/${room.roomTypeId}/rates`)
      .then((response) => !cancelled && setRates(response.items.filter((rate) => rate.active)))
      .catch(() => !cancelled && setRates([]));
    return () => { cancelled = true; };
  }, [room.roomTypeId]);

  const selectedRate = useMemo(() => {
    const rateKey = stayType === "HOURLY" ? "HOUR" : stayType === "OVERNIGHT" ? "NIGHT" : "DAY";
    return rates.find((rate) => rate.rate_key === rateKey) ?? null;
  }, [rates, stayType]);
  const minUnits = selectedRate?.minimum_units ?? 1;
  const unitLabel = stayType === "HOURLY" ? "giờ" : stayType === "OVERNIGHT" ? "đêm" : "ngày";
  const unitPrice = stayType === "DAILY" ? room.priceAmount : Number(selectedRate?.amount ?? room.priceAmount);
  const totalPrice = unitPrice * Math.max(minUnits, units);

  function changeStayType(next: StayType) {
    setStayType(next);
    const rateKey = next === "HOURLY" ? "HOUR" : next === "OVERNIGHT" ? "NIGHT" : "DAY";
    const rate = rates.find((item) => item.rate_key === rateKey);
    setUnits(Math.max(1, rate?.minimum_units ?? 1));
  }

  function expectedCheckout(checkin: Date) {
    const result = new Date(checkin);
    if (stayType === "HOURLY") result.setHours(result.getHours() + Math.max(minUnits, units));
    else if (stayType === "OVERNIGHT") {
      result.setDate(result.getDate() + Math.max(minUnits, units));
      result.setHours(12, 0, 0, 0);
    } else result.setDate(result.getDate() + Math.max(minUnits, units));
    return result;
  }

  async function submit() {
    setError(null);
    if (!fullName.trim() || !phone.trim() || !dateOfBirth || !nationality.trim() || !identityNumber.trim() || !permanentAddress.trim()) {
      setError("Cần điền họ tên, điện thoại, ngày sinh, quốc tịch, giấy tờ tùy thân và địa chỉ thường trú để khai báo lưu trú.");
      return;
    }
    setSubmitting(true);
    try {
      const now = new Date();
      const checkout = expectedCheckout(now);
      const customer = await api.post<{ id: string }>("/api/v1/customers", { fullName: fullName.trim(), phone: phone.trim() });
      const booking = await api.post<{ id: string }>("/api/v1/bookings", {
        customerId: customer.id,
        roomId: room.id,
        channel: "DIRECT",
        status: "CONFIRMED",
        checkinDate: dateOnly(now),
        checkoutDate: dateOnly(checkout),
        checkinAt: localTimestamp(now),
        checkoutAt: localTimestamp(checkout),
        stayType,
        totalPrice,
        guestDetails: {
          dateOfBirth,
          gender,
          nationality: nationality.trim(),
          identityType: identityType.trim(),
          identityNumber: identityNumber.trim(),
          identityIssuedPlace: identityIssuedPlace.trim() || null,
          permanentAddress: permanentAddress.trim(),
          occupation: occupation.trim() || null,
          stayPurpose: stayPurpose.trim() || null,
          expectedCheckoutAt: localTimestamp(checkout),
        },
      });
      await api.post(`/api/v1/bookings/${booking.id}/checkin`);
      if (!powerOn) await api.patch(`/api/v1/rooms/${room.id}/power`, { powerOn: false });
      onChanged();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không thể nhận phòng.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Nhận phòng nhanh — Phòng ${room.n}`} onClose={onClose} width={760} footer={<><ButtonGhost onClick={onClose}>Hủy</ButtonGhost><ButtonPrimary onClick={submit}>{submitting ? "Đang nhận phòng..." : `Nhận phòng · ${money(totalPrice)}`}</ButtonPrimary></>}>
      <div className="flex max-h-[72vh] flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
        {error && <p className="m-0 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">{error}</p>}
        <div className="rounded-lg bg-pms-primary-soft px-3 py-2 text-[12.5px] text-pms-primary">{room.type} · Giá hiện tại {room.price} {stayType === "DAILY" ? "(đã áp dụng giá linh hoạt nếu có)" : ""}</div>
        <section><b className="mb-2 block text-[13.5px]">1. Thông tin khai báo lưu trú</b><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Họ và tên khách *" value={fullName} onChange={setFullName} placeholder="Theo giấy tờ tùy thân" />
          <Field label="Số điện thoại *" value={phone} onChange={setPhone} placeholder="Số điện thoại liên hệ" inputMode="tel" />
          <Field label="Ngày sinh *" value={dateOfBirth} onChange={setDateOfBirth} type="date" />
          <SelectField label="Giới tính" value={gender} onChange={setGender} options={[["MALE", "Nam"], ["FEMALE", "Nữ"], ["OTHER", "Khác"]]} />
          <Field label="Quốc tịch *" value={nationality} onChange={setNationality} placeholder="Việt Nam" />
          <Field label="Loại giấy tờ" value={identityType} onChange={setIdentityType} placeholder="CCCD/CMND/Hộ chiếu" />
          <Field label="Số giấy tờ *" value={identityNumber} onChange={setIdentityNumber} placeholder="Nhập số giấy tờ" />
          <Field label="Nơi cấp" value={identityIssuedPlace} onChange={setIdentityIssuedPlace} placeholder="Nơi cấp giấy tờ" />
          <div className="sm:col-span-2"><Field label="Địa chỉ thường trú *" value={permanentAddress} onChange={setPermanentAddress} placeholder="Địa chỉ theo giấy tờ" /></div>
          <Field label="Nghề nghiệp" value={occupation} onChange={setOccupation} placeholder="Không bắt buộc" />
          <Field label="Mục đích lưu trú" value={stayPurpose} onChange={setStayPurpose} placeholder="Công tác, du lịch..." />
        </div></section>
        <section className="border-t border-pms-divider pt-4"><b className="mb-2 block text-[13.5px]">2. Hình thức lưu trú và tiền phòng</b><div className="grid grid-cols-3 gap-2">
          {([['HOURLY', 'Theo giờ'], ['OVERNIGHT', 'Qua đêm'], ['DAILY', 'Theo ngày']] as [StayType, string][]).map(([key, label]) => <button key={key} type="button" onClick={() => changeStayType(key)} className="rounded-lg border px-2 py-2 text-[12px] font-semibold" style={{ borderColor: stayType === key ? '#284AB1' : '#E6E8EC', background: stayType === key ? '#EEF2FF' : '#fff', color: stayType === key ? '#284AB1' : '#252733' }}>{label}</button>)}
        </div><div className="mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-3"><div><label className="mb-1.5 block text-[12px]">Số {unitLabel}</label><input type="number" min={minUnits} value={units} onChange={(event) => setUnits(Math.max(minUnits, Number(event.target.value) || minUnits))} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></div><div className="text-[12px] text-pms-muted">Đơn giá: <b className="text-pms-text">{money(unitPrice)}/{unitLabel}</b><br />Tối thiểu: {minUnits} {unitLabel}</div><div className="rounded-lg bg-pms-primary-soft px-3 py-2 text-[12.5px]">Dự kiến trả: <b>{localTimestamp(expectedCheckout(new Date())).slice(0, 16).replace('T', ' ')}</b><br />Tạm tính: <b className="text-pms-primary">{money(totalPrice)}</b></div></div></section>
        <div className="flex items-center justify-between gap-3 border-t border-pms-divider pt-3.5"><div><b className="text-[13.5px]">Bật nguồn điện phòng</b><p className="m-0 mt-1 text-[11.5px] text-pms-muted">Đồng bộ với công tơ và các thiết bị đã gán cho phòng.</p></div><button aria-label="Bật nguồn điện phòng" type="button" className="relative h-5 w-9 rounded-full" style={{ background: powerOn ? "#284AB1" : "#E6E8EC" }} onClick={() => setPowerOn((value) => !value)}><span className="absolute top-0.5 h-4 w-4 rounded-full bg-white" style={{ left: powerOn ? "18px" : "2px" }} /></button></div>
      </div>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", inputMode }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; inputMode?: "tel" }) {
  return <div><label className="mb-1.5 block text-[12px]">{label}</label><input type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary" /></div>;
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <div><label className="mb-1.5 block text-[12px]">{label}</label><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></div>;
}
