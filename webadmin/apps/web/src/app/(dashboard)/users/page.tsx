"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
}

const ROLES = ["SUPER_ADMIN", "OPS_SUPPORT", "SALES_MANAGER", "ACCOUNTANT", "SUPPLY_CHAIN", "RELEASE_MANAGER"];

// Trang quản lý user/role — CHỈ SUPER_ADMIN gọi được API phía sau (backend
// chặn ở requireRole("SUPER_ADMIN") cho toàn bộ router /api/v1/users, xem
// apps/api/src/routes/users.routes.ts). Trang này không tự ẩn nav với role
// khác — đúng convention hiện có của webadmin (không ẩn menu theo role ở UI,
// dựa vào lỗi 403 từ backend), nhưng nếu gọi bằng role khác sẽ nhận lỗi rõ.
export default function UsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("OPS_SUPPORT");
  const [password, setPassword] = useState("");

  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState("OPS_SUPPORT");
  const [editStatus, setEditStatus] = useState("ACTIVE");

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ items: UserRow[] }>("/api/v1/users");
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không tải được danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/v1/users", { email, fullName, role, password });
      setShowCreate(false);
      setEmail("");
      setFullName("");
      setRole("OPS_SUPPORT");
      setPassword("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Tạo người dùng thất bại.");
    }
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setEditRole(u.role);
    setEditStatus(u.status);
    setError(null);
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    try {
      await api.patch(`/api/v1/users/${editing.id}`, { role: editRole, status: editStatus });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Cập nhật người dùng thất bại.");
    }
  }

  async function handleResetPassword(u: UserRow) {
    setError(null);
    setNotice(null);
    try {
      const res = await api.post<{ temporary_password: string }>(`/api/v1/users/${u.id}/reset-password`);
      setNotice(`Mật khẩu tạm cho ${u.email}: ${res.temporary_password} (chỉ hiển thị một lần, hãy gửi lại cho người dùng qua kênh khác).`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Đặt lại mật khẩu thất bại.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Người dùng & phân quyền</h1>
          <p className="mt-1 text-sm text-gray-500">Chỉ SUPER_ADMIN quản lý được tài khoản, vai trò và khoá/mở tài khoản HQ Console.</p>
        </div>
        <button onClick={() => setShowCreate((v) => !v)} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
          {showCreate ? "Đóng" : "+ Thêm người dùng"}
        </button>
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{notice}</p>}

      {showCreate && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Họ tên</label>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Vai trò</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mật khẩu ban đầu</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Tạo người dùng</button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Họ tên</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Vai trò</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Trạng thái</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Đang tải...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Chưa có người dùng nào.</td></tr>}
            {items.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{u.full_name}</td>
                <td className="px-4 py-2 text-gray-600">{u.email}</td>
                <td className="px-4 py-2 text-gray-600">{u.role}</td>
                <td className="px-4 py-2"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-2 space-x-3">
                  <button onClick={() => openEdit(u)} className="text-xs font-medium text-brand-600 hover:underline">Sửa vai trò/khoá</button>
                  <button onClick={() => handleResetPassword(u)} className="text-xs font-medium text-brand-600 hover:underline">Đặt lại mật khẩu</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <h2 className="text-base font-semibold text-gray-900">Sửa người dùng</h2>
            <p className="mt-1 text-sm text-gray-500">{editing.email}</p>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Vai trò</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="ACTIVE">ACTIVE (mở khoá)</option>
                  <option value="DISABLED">DISABLED (khoá tài khoản)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Huỷ
                </button>
                <button type="submit" className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
