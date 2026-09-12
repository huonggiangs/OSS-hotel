"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

type SaasPlan = "TRIAL" | "BASIC" | "PRO" | "PREMIUM" | "ENTERPRISE" | "CUSTOM";
interface PmsUser {
  id: string; property_id: string; property_name: string; property_code: string;
  username: string; email: string; full_name: string; role: string; status: string;
}
interface Customer {
  id: string; name: string; address: string | null; contact_name: string | null;
  contact_email: string | null; contact_phone: string | null; billing_status: string;
  uses_kiosk: boolean; uses_smart_hotel_os: boolean; pms_property_id?: string | null;
  property_login_code?: string | null; onboarding_status?: string | null;
  operational_status: "ACTIVE" | "INACTIVE"; saas_plan: SaasPlan; pms_users: PmsUser[];
}
interface ProvisionResponse {
  customer: Customer;
  pms: { property_id: string; property_name: string; property_code: string; login_url: string; setup_steps: string[] } | null;
  owner: { username: string; email: string; full_name: string; role: string } | null;
  credentials: { username: string; temporary_password: string; display_once: boolean } | null;
  email: { status: string; recipient: string; sent_at: string | null; error: string | null };
}

const plans: SaasPlan[] = ["TRIAL", "BASIC", "PRO", "PREMIUM", "ENTERPRISE", "CUSTOM"];
const planText: Record<SaasPlan, string> = { TRIAL: "Dùng thử", BASIC: "Cơ bản", PRO: "Chuyên nghiệp", PREMIUM: "Cao cấp", ENTERPRISE: "Chuỗi cơ sở", CUSTOM: "Tùy chỉnh" };
const roleText: Record<string, string> = { OWNER: "Chủ cơ sở", MANAGER: "Quản lý", RECEPTIONIST: "Lễ tân", HOUSEKEEPING: "Buồng phòng", TECHNICIAN: "Kỹ thuật viên" };
const inputClass = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500";

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [unassignedUsers, setUnassignedUsers] = useState<PmsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [result, setResult] = useState<ProvisionResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", contactName: "", contactEmail: "", contactPhone: "", ownerFullName: "", ownerEmail: "", ownerPhone: "", username: "", temporaryPassword: "", saasPlan: "TRIAL" as SaasPlan, sendEmail: true });

  async function load() {
    setLoading(true); setError(null);
    try {
      const response = await api.get<{ items: Customer[]; unassigned_pms_users: PmsUser[] }>("/api/v1/customers");
      setItems(response.items); setUnassignedUsers(response.unassigned_pms_users);
    } catch (err) { setError(err instanceof ApiClientError ? err.message : "Không tải được khách hàng và tài khoản PMS."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function change<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function resetCreate() { setForm({ name: "", address: "", contactName: "", contactEmail: "", contactPhone: "", ownerFullName: "", ownerEmail: "", ownerPhone: "", username: "", temporaryPassword: "", saasPlan: "TRIAL", sendEmail: true }); }

  async function createCustomer(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError(null); setNotice(null); setResult(null);
    try {
      const response = await api.post<ProvisionResponse>("/api/v1/customers/provision", {
        name: form.name, address: form.address || undefined, contactName: form.contactName || undefined,
        contactEmail: form.contactEmail, contactPhone: form.contactPhone, ownerFullName: form.ownerFullName,
        ownerEmail: form.ownerEmail, ownerPhone: form.ownerPhone || undefined, username: form.username || undefined,
        temporaryPassword: form.temporaryPassword || undefined, sendEmail: form.sendEmail,
      });
      if (response.customer?.id) await api.patch(`/api/v1/customers/${response.customer.id}`, { saasPlan: form.saasPlan });
      setResult(response); setShowCreate(false); resetCreate(); await load();
    } catch (err) { setError(err instanceof ApiClientError ? err.message : "Khởi tạo cơ sở thất bại."); }
    finally { setSubmitting(false); }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault(); if (!editing) return; setSubmitting(true); setError(null);
    try {
      await api.patch(`/api/v1/customers/${editing.id}`, {
        name: editing.name, address: editing.address ?? "", contactName: editing.contact_name ?? "",
        contactEmail: editing.contact_email ?? "", contactPhone: editing.contact_phone ?? "",
        saasPlan: editing.saas_plan, operationalStatus: editing.operational_status,
        usesKiosk: editing.uses_kiosk, usesSmartHotelOs: editing.uses_smart_hotel_os,
        billingStatus: editing.billing_status,
      });
      setEditing(null); setNotice("Đã cập nhật hồ sơ khách hàng."); await load();
    } catch (err) { setError(err instanceof ApiClientError ? err.message : "Không cập nhật được khách hàng."); }
    finally { setSubmitting(false); }
  }

  async function toggleStatus(customer: Customer) {
    const next = customer.operational_status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!window.confirm(next === "INACTIVE" ? `Ngừng hoạt động ${customer.name}?` : `Kích hoạt lại ${customer.name}?`)) return;
    try { await api.patch(`/api/v1/customers/${customer.id}`, { operationalStatus: next }); setNotice(next === "INACTIVE" ? "Đã ngừng hoạt động cơ sở." : "Đã kích hoạt lại cơ sở."); await load(); }
    catch (err) { setError(err instanceof ApiClientError ? err.message : "Không đổi được trạng thái."); }
  }

  async function remove(customer: Customer) {
    if (!window.confirm(`Xóa ${customer.name}? Hồ sơ sẽ được lưu ẩn để bảo toàn lịch sử và đối soát.`)) return;
    try { await api.del(`/api/v1/customers/${customer.id}`); setNotice("Đã xóa khách hàng khỏi danh sách hoạt động."); await load(); }
    catch (err) { setError(err instanceof ApiClientError ? err.message : "Không xóa được khách hàng."); }
  }

  async function copyCredentials() {
    if (!result?.credentials || !result.pms) return;
    await navigator.clipboard?.writeText(`Mã cơ sở: ${result.pms.property_code}\nTài khoản PMS: ${result.credentials.username}\nMật khẩu tạm: ${result.credentials.temporary_password}`);
    setNotice("Đã sao chép thông tin bàn giao.");
  }

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-xl font-bold text-gray-950">Khách hàng & tài khoản PMS</h1><p className="mt-1 text-sm text-gray-500">Quản lý cơ sở, gói SaaS và toàn bộ người dùng đang có trong PMS.</p></div>
      <button type="button" onClick={() => { setShowCreate((value) => !value); setEditing(null); }} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">{showCreate ? "Đóng" : "+ Thêm khách hàng"}</button>
    </header>

    {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}

    {result && <section className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-950"><div className="flex flex-wrap justify-between gap-2"><b>Đã khởi tạo {result.pms?.property_name ?? result.customer.name}</b><button onClick={() => setResult(null)} className="underline">Ẩn</button></div>{result.pms && <div className="mt-2 grid gap-1 sm:grid-cols-2"><span>Mã cơ sở: <b className="font-mono tracking-widest">{result.pms.property_code}</b></span><span>Tài khoản: <b>{result.owner?.username}</b></span><span>Trang PMS: {result.pms.login_url}</span><span>Email: {result.email.status}</span></div>}{result.credentials && <div className="mt-3 rounded-lg bg-amber-50 p-3"><b>Mật khẩu chỉ hiện một lần:</b> <code>{result.credentials.temporary_password}</code><button onClick={copyCredentials} className="ml-3 rounded border px-2 py-1">Sao chép</button></div>}</section>}

    {showCreate && <form onSubmit={createCustomer} className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Tên cơ sở *"><input required value={form.name} onChange={(e) => change("name", e.target.value)} className={inputClass} /></Field>
      <Field label="Số điện thoại *"><input required type="tel" value={form.contactPhone} onChange={(e) => change("contactPhone", e.target.value)} placeholder="6 số cuối là mã cơ sở" className={inputClass} /></Field>
      <Field label="Email cơ sở *"><input required type="email" value={form.contactEmail} onChange={(e) => change("contactEmail", e.target.value)} className={inputClass} /></Field>
      <Field label="Địa chỉ"><input value={form.address} onChange={(e) => change("address", e.target.value)} className={inputClass} /></Field>
      <Field label="Người liên hệ"><input value={form.contactName} onChange={(e) => change("contactName", e.target.value)} className={inputClass} /></Field>
      <Field label="Gói SaaS"><select value={form.saasPlan} onChange={(e) => change("saasPlan", e.target.value as SaasPlan)} className={inputClass}>{plans.map((plan) => <option key={plan} value={plan}>{planText[plan]}</option>)}</select></Field>
      <div className="border-t pt-3 font-semibold sm:col-span-2 lg:col-span-3">Tài khoản chủ cơ sở</div>
      <Field label="Họ tên *"><input required value={form.ownerFullName} onChange={(e) => change("ownerFullName", e.target.value)} className={inputClass} /></Field>
      <Field label="Email nhận bàn giao *"><input required type="email" value={form.ownerEmail} onChange={(e) => change("ownerEmail", e.target.value)} className={inputClass} /></Field>
      <Field label="Tên đăng nhập"><input value={form.username} onChange={(e) => change("username", e.target.value)} placeholder="Tự tạo nếu để trống" className={inputClass} /></Field>
      <Field label="Mật khẩu tạm"><input minLength={12} value={form.temporaryPassword} onChange={(e) => change("temporaryPassword", e.target.value)} placeholder="Tự tạo bảo mật nếu để trống" className={inputClass} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.sendEmail} onChange={(e) => change("sendEmail", e.target.checked)} /> Gửi email hướng dẫn</label>
      <div className="sm:col-span-2 lg:col-span-3"><button disabled={submitting} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Đang tạo..." : "Tạo cơ sở và tài khoản PMS"}</button></div>
    </form>}

    {editing && <form onSubmit={saveEdit} className="grid gap-4 rounded-xl border border-blue-200 bg-blue-50 p-5 sm:grid-cols-2 lg:grid-cols-3">
      <h2 className="font-bold text-blue-950 sm:col-span-2 lg:col-span-3">Sửa {editing.name}</h2>
      <Field label="Tên cơ sở"><input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputClass} /></Field>
      <Field label="Điện thoại"><input required value={editing.contact_phone ?? ""} onChange={(e) => setEditing({ ...editing, contact_phone: e.target.value })} className={inputClass} /></Field>
      <Field label="Email"><input type="email" value={editing.contact_email ?? ""} onChange={(e) => setEditing({ ...editing, contact_email: e.target.value })} className={inputClass} /></Field>
      <Field label="Địa chỉ"><input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} className={inputClass} /></Field>
      <Field label="Gói SaaS"><select value={editing.saas_plan} onChange={(e) => setEditing({ ...editing, saas_plan: e.target.value as SaasPlan })} className={inputClass}>{plans.map((plan) => <option key={plan} value={plan}>{planText[plan]}</option>)}</select></Field>
      <Field label="Trạng thái"><select value={editing.operational_status} onChange={(e) => setEditing({ ...editing, operational_status: e.target.value as "ACTIVE" | "INACTIVE" })} className={inputClass}><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></select></Field>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button disabled={submitting} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Lưu thay đổi</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg border bg-white px-4 py-2 text-sm">Hủy</button></div>
    </form>}

    {unassignedUsers.length > 0 && <section className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h2 className="font-semibold text-amber-950">Tài khoản PMS chưa gắn hồ sơ HQ ({unassignedUsers.length})</h2><p className="mt-1 text-xs text-amber-800">Các tài khoản test/đã tạo trực tiếp trong PMS vẫn được hiển thị để HQ kiểm soát.</p><PmsUsers users={unassignedUsers} /></section>}

    <section className="grid gap-4 xl:grid-cols-2">
      {loading && <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">Đang đồng bộ HQ và PMS...</div>}
      {!loading && items.map((customer) => <article key={customer.id} className="min-w-0 rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-lg font-bold">{customer.name}</h2><p className="mt-1 text-sm text-gray-500">{customer.contact_phone ?? "Chưa có điện thoại"} · {customer.contact_email ?? "Chưa có email"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${customer.operational_status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>{customer.operational_status === "ACTIVE" ? "Hoạt động" : "Ngừng hoạt động"}</span></div>
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm"><span>Mã cơ sở<br/><b className="font-mono tracking-wider text-blue-700">{customer.property_login_code ?? "—"}</b></span><span>Gói SaaS<br/><b>{planText[customer.saas_plan] ?? customer.saas_plan}</b></span><span>Onboarding<br/>{customer.onboarding_status ? <StatusBadge status={customer.onboarding_status} /> : "—"}</span><span>Thanh toán<br/><StatusBadge status={customer.billing_status} /></span></div>
        <PmsUsers users={customer.pms_users ?? []} />
        <div className="mt-4 flex flex-wrap justify-end gap-2"><button onClick={() => { setEditing(customer); setShowCreate(false); }} className="rounded-lg border px-3 py-2 text-sm font-semibold text-blue-700">Sửa</button><button onClick={() => toggleStatus(customer)} className="rounded-lg border px-3 py-2 text-sm font-semibold text-amber-700">{customer.operational_status === "ACTIVE" ? "Ngừng hoạt động" : "Kích hoạt"}</button><button onClick={() => remove(customer)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Xóa</button></div>
      </article>)}
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium text-gray-700">{label}{children}</label>; }
function PmsUsers({ users }: { users: PmsUser[] }) {
  return <div className="mt-3"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tài khoản PMS ({users.length})</p>{users.length === 0 ? <p className="mt-1 text-sm text-gray-400">Chưa đồng bộ được tài khoản PMS.</p> : <div className="mt-2 grid gap-2 sm:grid-cols-2">{users.map((user) => <div key={user.id} className="min-w-0 rounded-lg border bg-white p-3 text-sm"><div className="flex justify-between gap-2"><b className="truncate">@{user.username}</b><span className={user.status === "ACTIVE" ? "text-green-700" : "text-gray-500"}>{user.status === "ACTIVE" ? "Đang dùng" : "Đã khóa"}</span></div><p className="truncate text-gray-600">{user.full_name} · {roleText[user.role] ?? user.role}</p><p className="truncate text-xs text-gray-400">{user.property_name} · {user.property_code}</p></div>)}</div>}</div>;
}
