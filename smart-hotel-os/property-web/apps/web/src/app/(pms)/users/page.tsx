"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/useSettings";
import { api, isApiError } from "@/lib/api-client";
import { RolePopupModal } from "@/components/users/RolePopupModal";

interface RoleScope {
  name: string;
  label: string;
  scope: string;
}
interface RolesData {
  scopes: RoleScope[];
}
const FALLBACK: RolesData = { scopes: [] };

type Role = "OWNER" | "MANAGER" | "RECEPTIONIST" | "HOUSEKEEPING";
interface AccountRow {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: Role;
  status: "ACTIVE" | "DISABLED";
}

const ROLE_LABEL: Record<Role, string> = { OWNER: "Chủ sở hữu", MANAGER: "Quản lý", RECEPTIONIST: "Lễ tân", HOUSEKEEPING: "Buồng phòng" };

// Trang "Người dùng & phân quyền" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT, gồm 2
// phần: (1) "Danh sách vai trò" — giữ pixel-perfect bản gốc (`isUsers` dòng
// 1289-1313), đọc mô tả phạm vi quyền từ property_settings nhóm "roles" + số
// người dùng THẬT tính từ bảng property_users; (2) "Tài khoản người dùng" —
// PHẦN BỔ SUNG MỚI (không có trong bản gốc, bản gốc chỉ có bảng vai trò) để
// thoả yêu cầu nghiệp vụ "xem danh sách, thêm user, đổi vai trò, khoá/mở" nối
// thẳng vào bảng property_users. RBAC: cả trang chỉ OWNER/MANAGER xem được
// (API /users chặn từ middleware requireRole, không riêng nút sửa).
export default function UsersPage() {
  const [popup, setPopup] = useState<{ open: boolean; roleName: string | null }>({ open: false, roleName: null });
  const { data: rolesData, loading: rolesLoading } = useSettings<RolesData>("roles", FALLBACK);

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);

  async function loadAccounts() {
    setLoadingAccounts(true);
    setError(null);
    try {
      const res = await api.get<{ items: AccountRow[]; role_counts: { role: Role; count: number }[] }>("/api/v1/users");
      setAccounts(res.items);
      setRoleCounts(Object.fromEntries(res.role_counts.map((r) => [r.role, r.count])));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không tải được danh sách người dùng (có thể tài khoản của bạn không có quyền xem).");
    } finally {
      setLoadingAccounts(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function changeRole(id: string, role: Role) {
    try {
      await api.patch(`/api/v1/users/${id}`, { role });
      loadAccounts();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Đổi vai trò thất bại.");
    }
  }

  async function toggleStatus(row: AccountRow) {
    try {
      await api.patch(`/api/v1/users/${row.id}`, { status: row.status === "ACTIVE" ? "DISABLED" : "ACTIVE" });
      loadAccounts();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Khoá/mở tài khoản thất bại.");
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Người dùng &amp; phân quyền</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">
        {rolesData.scopes.length} vai trò · {accounts.length} tài khoản
      </p>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-[13px] text-red-600">{error}</div>}

      <div className="mb-4 rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Danh sách vai trò</h3>
          <div
            className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
            onClick={() => setPopup({ open: true, roleName: null })}
          >
            + Thêm vai trò
          </div>
        </div>
        {rolesLoading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
        {!rolesLoading && (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {["Vai trò", "Số người dùng", "Phạm vi quyền", ""].map((h) => (
                  <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rolesData.scopes.map((r) => (
                <tr key={r.name}>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold">{r.label}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{roleCounts[r.name] ?? 0}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{r.scope}</td>
                  <td
                    className="cursor-pointer border-b border-pms-divider px-2 py-3 font-semibold text-pms-primary"
                    onClick={() => setPopup({ open: true, roleName: r.label })}
                  >
                    Sửa quyền
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Tài khoản người dùng</h3>
          <div
            className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
            onClick={() => setShowAddAccount(true)}
          >
            + Thêm người dùng
          </div>
        </div>
        {loadingAccounts && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
        {!loadingAccounts && (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {["Tên đăng nhập", "Họ tên", "Email", "Vai trò", "Trạng thái", ""].map((h) => (
                  <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold">{a.username}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{a.full_name}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{a.email}</td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    <select
                      value={a.role}
                      onChange={(e) => changeRole(a.id, e.target.value as Role)}
                      className="rounded-lg border border-pms-border px-2 py-1.5 text-[12.5px]"
                    >
                      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={
                        a.status === "ACTIVE"
                          ? { background: "#E9FBEF", color: "#00C853" }
                          : { background: "#FDEDEC", color: "#CC2F42" }
                      }
                    >
                      {a.status === "ACTIVE" ? "Đang hoạt động" : "Đã khoá"}
                    </span>
                  </td>
                  <td className="cursor-pointer border-b border-pms-divider px-2 py-3 font-semibold text-pms-primary" onClick={() => toggleStatus(a)}>
                    {a.status === "ACTIVE" ? "Khoá" : "Mở khoá"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {popup.open && <RolePopupModal roleName={popup.roleName} onClose={() => setPopup({ open: false, roleName: null })} />}
      {showAddAccount && (
        <AddAccountModal
          onClose={() => setShowAddAccount(false)}
          onCreated={() => {
            setShowAddAccount(false);
            loadAccounts();
          }}
        />
      )}
    </div>
  );
}

// Modal thêm tài khoản THẬT (gọi POST /api/v1/users) — form tối giản, không có
// trong bản gốc (bản gốc chỉ có "+ Thêm vai trò" mở RolePopupModal tĩnh).
function AddAccountModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("RECEPTIONIST");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setErr(null);
    try {
      const res = await api.post<{ temp_password?: string }>("/api/v1/users", { username, email, fullName, role });
      if (res.temp_password) {
        setTempPassword(res.temp_password);
      } else {
        onCreated();
      }
    } catch (e) {
      setErr(isApiError(e) ? e.message : "Tạo người dùng thất bại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[420px] rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-[16px] font-semibold">Thêm người dùng mới</h3>
        {tempPassword ? (
          <div className="flex flex-col gap-3 text-[13px]">
            <p>
              Tạo tài khoản thành công. Mật khẩu tạm (chỉ hiện 1 lần):{" "}
              <b className="text-pms-primary">{tempPassword}</b>
            </p>
            <div className="cursor-pointer rounded-lg bg-pms-primary p-2.5 text-center font-semibold text-white" onClick={onCreated}>
              Đóng
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {err && <div className="text-[12.5px] text-red-500">{err}</div>}
            <input
              placeholder="Tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-lg border border-pms-border px-3 py-2 text-[13px]"
            />
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-pms-border px-3 py-2 text-[13px]"
            />
            <input
              placeholder="Họ tên"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-lg border border-pms-border px-3 py-2 text-[13px]"
            />
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="rounded-lg border border-pms-border px-3 py-2 text-[13px]">
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
            <div className="mt-2 flex justify-end gap-2.5">
              <div className="cursor-pointer rounded-lg border border-pms-border px-4 py-2 text-[13px] font-semibold" onClick={onClose}>
                Hủy
              </div>
              <div
                className="cursor-pointer rounded-lg bg-pms-primary px-4 py-2 text-[13px] font-semibold text-white"
                onClick={() => username && email && fullName && submit()}
              >
                {saving ? "Đang lưu..." : "Tạo tài khoản"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
