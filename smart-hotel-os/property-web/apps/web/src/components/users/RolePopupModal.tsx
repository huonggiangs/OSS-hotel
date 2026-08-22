"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

export interface PermissionGroup {
  group: string;
  perms: string[];
}
export interface RoleScope {
  name: string;
  label: string;
  scope: string;
  // Ghi lại các quyền được tick trong modal — CHỈ mang tính MÔ TẢ/THAM KHẢO
  // (xem cảnh báo bên dưới), không phải cấu hình RBAC thật.
  selectedPerms?: string[];
}
export interface RolesData {
  scopes: RoleScope[];
  permissionGroups: PermissionGroup[];
}

// 4 vai trò THẬT SỰ được middleware requireRole(...) kiểm tra ở backend (xem
// apps/api/src/types/domain.ts -> PropertyUserRole). Đây là danh sách CỐ ĐỊNH,
// không đổi theo dữ liệu người dùng nhập ở đây.
const REAL_ROLE_NAMES = ["OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"] as const;

const COMBINING_MARKS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function slugifyRoleName(label: string): string {
  const noDiacritics = label.normalize("NFD").replace(COMBINING_MARKS_RE, "").replace(/đ/gi, "d");
  const slug = noDiacritics
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || `ROLE_${Date.now()}`;
}

// Modal "Thêm vai trò mới" / "Sửa quyền: <tên>" — ĐÃ NỐI THẬT vào property_settings
// nhóm "roles": tên vai trò + mô tả phạm vi quyền được lưu thật vào scopes[],
// checkbox quyền bind vào permissionGroups THẬT (không còn đọc mock-data.ts).
//
// RANH GIỚI QUAN TRỌNG (không bịa, không sáng tạo): bảng "roles" này CHỈ LÀ MÔ
// TẢ/TÀI LIỆU. Phân quyền THẬT ở backend (requireRole(...) rải trong từng file
// route) chỉ nhận đúng 4 giá trị: OWNER/MANAGER/RECEPTIONIST/HOUSEKEEPING. Sửa
// dữ liệu ở đây KHÔNG và KHÔNG THỂ thay đổi quyền hạn thật của các vai trò đó
// trong hệ thống — vì vậy khi người dùng thêm 1 vai trò MỚI (không khớp 4 vai
// trò thật), modal bắt buộc hiển thị cảnh báo rõ ràng trước khi lưu.
export function RolePopupModal({
  role,
  rolesData,
  onClose,
  onSave,
}: {
  role: RoleScope | null;
  rolesData: RolesData;
  onClose: () => void;
  onSave: (next: RolesData) => Promise<void> | void;
}) {
  const [label, setLabel] = useState(role?.label ?? "");
  const [scopeText, setScopeText] = useState(role?.scope ?? "");
  const [selectedPerms, setSelectedPerms] = useState<string[]>(role?.selectedPerms ?? []);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>(
    rolesData.permissionGroups.map((g) => ({ group: g.group, perms: [...g.perms] }))
  );
  const [newGroupName, setNewGroupName] = useState("");
  const [newPermByGroup, setNewPermByGroup] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedLabel = label.trim();
  const matchesRealRole = rolesData.scopes.some(
    (s) =>
      (REAL_ROLE_NAMES as readonly string[]).includes(s.name) &&
      s.label.trim().toLowerCase() === trimmedLabel.toLowerCase()
  );
  const isEditingRealRole = !!role && (REAL_ROLE_NAMES as readonly string[]).includes(role.name);
  const showNewRoleWarning = trimmedLabel.length > 0 && !matchesRealRole && !isEditingRealRole;

  function togglePerm(key: string) {
    setSelectedPerms((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  function addGroup() {
    const name = newGroupName.trim();
    if (!name || permissionGroups.some((g) => g.group === name)) return;
    setPermissionGroups((prev) => [...prev, { group: name, perms: [] }]);
    setNewGroupName("");
  }

  function addPerm(groupName: string) {
    const text = (newPermByGroup[groupName] ?? "").trim();
    if (!text) return;
    setPermissionGroups((prev) =>
      prev.map((g) => (g.group === groupName && !g.perms.includes(text) ? { ...g, perms: [...g.perms, text] } : g))
    );
    setNewPermByGroup((prev) => ({ ...prev, [groupName]: "" }));
  }

  async function handleSave() {
    if (!trimmedLabel) {
      setError("Vui lòng nhập tên vai trò.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      let nextScopes: RoleScope[];
      if (isEditingRealRole && role) {
        // Đang sửa 1 trong 4 vai trò thật — chỉ cập nhật mô tả + quyền tick,
        // giữ nguyên "name" (khoá thật gắn với RBAC backend).
        nextScopes = rolesData.scopes.map((s) => (s.name === role.name ? { ...s, label: trimmedLabel, scope: scopeText, selectedPerms } : s));
      } else {
        const realMatch = rolesData.scopes.find(
          (s) => (REAL_ROLE_NAMES as readonly string[]).includes(s.name) && s.label.trim().toLowerCase() === trimmedLabel.toLowerCase()
        );
        if (realMatch) {
          nextScopes = rolesData.scopes.map((s) => (s.name === realMatch.name ? { ...s, scope: scopeText, selectedPerms } : s));
        } else {
          const targetName = role?.name ?? slugifyRoleName(trimmedLabel);
          const existingIndex = rolesData.scopes.findIndex((s) => s.name === targetName);
          const updatedEntry: RoleScope = { name: targetName, label: trimmedLabel, scope: scopeText, selectedPerms };
          nextScopes =
            existingIndex >= 0
              ? rolesData.scopes.map((s, i) => (i === existingIndex ? updatedEntry : s))
              : [...rolesData.scopes, updatedEntry];
        }
      }
      await onSave({ scopes: nextScopes, permissionGroups });
      onClose();
    } catch {
      setError("Lưu vai trò thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={role ? `Sửa quyền: ${role.label}` : "Thêm vai trò mới"}
      onClose={onClose}
      width={560}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={handleSave}>{saving ? "Đang lưu..." : "Lưu"}</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] text-red-600">{error}</div>}

        <div>
          <label className="mb-1.5 block text-[12px]">Tên vai trò</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="VD: Lễ tân, Quản lý ca, Kế toán..."
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[12px]">Mô tả phạm vi quyền</label>
          <textarea
            value={scopeText}
            onChange={(e) => setScopeText(e.target.value)}
            placeholder="VD: Xem báo cáo doanh thu, không sửa được cấu hình"
            className="min-h-[64px] w-full rounded-lg border border-pms-border p-3 text-[13px]"
          />
        </div>

        {showNewRoleWarning && (
          <div className="rounded-lg border border-[#F0B429] bg-[#FFF8E6] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#946200]">
            <b>Lưu ý:</b> vai trò mới chỉ được ghi lại để mô tả/tham khảo. Hệ thống hiện chỉ thực sự phân quyền cho 4
            vai trò: Chủ sở hữu, Quản lý, Lễ tân, Buồng phòng — để vai trò mới có quyền hạn riêng thật sự trong hệ
            thống, cần một bước phát triển kỹ thuật riêng (mở rộng danh sách vai trò ở tầng backend) và cần được
            duyệt trước khi thực hiện.
          </div>
        )}

        <div>
          <label className="mb-2.5 block text-[12px]">Danh sách quyền (tick để mô tả/tham khảo)</label>
          {permissionGroups.map((g) => (
            <div key={g.group} className="mb-3.5">
              <div className="mb-2 text-[13px] font-semibold">{g.group}</div>
              <div className="grid grid-cols-2 gap-2.5">
                {g.perms.map((p) => {
                  const key = `${g.group}:${p}`;
                  const checked = selectedPerms.includes(key);
                  return (
                    <label key={p} className="flex cursor-pointer items-center gap-2 text-[12.5px]">
                      <input type="checkbox" checked={checked} onChange={() => togglePerm(key)} />
                      {p}
                    </label>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={newPermByGroup[g.group] ?? ""}
                  onChange={(e) => setNewPermByGroup((prev) => ({ ...prev, [g.group]: e.target.value }))}
                  placeholder="+ Thêm quyền"
                  className="w-40 rounded-md border border-pms-border px-2 py-1.5 text-[12px]"
                  onKeyDown={(e) => e.key === "Enter" && addPerm(g.group)}
                />
                <span className="cursor-pointer text-[12px] font-semibold text-pms-primary" onClick={() => addPerm(g.group)}>
                  + Thêm quyền
                </span>
              </div>
            </div>
          ))}
          <div className="mt-2 flex items-center gap-2 border-t border-pms-divider pt-3">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Tên nhóm quyền mới"
              className="w-48 rounded-md border border-pms-border px-2 py-1.5 text-[12px]"
              onKeyDown={(e) => e.key === "Enter" && addGroup()}
            />
            <span className="cursor-pointer text-[12px] font-semibold text-pms-primary" onClick={addGroup}>
              + Thêm nhóm quyền
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
