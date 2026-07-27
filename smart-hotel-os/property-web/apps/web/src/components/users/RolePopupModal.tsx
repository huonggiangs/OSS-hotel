"use client";

import { Modal, ButtonGhost, ButtonPrimary, FieldBox } from "@/components/ui/Modal";
import { permissionGroups } from "@/lib/mock-data";

// Modal "Thêm vai trò mới" / "Sửa quyền: <tên>" — pixel-perfect theo khối
// `showRolePopup` (dòng 1355-1381 bản gốc). Danh sách quyền là checkbox tĩnh đúng bản
// gốc (không bind state thật).
export function RolePopupModal({ roleName, onClose }: { roleName: string | null; onClose: () => void }) {
  return (
    <Modal title={roleName ? `Sửa quyền: ${roleName}` : "Thêm vai trò mới"} onClose={onClose} width={520} footer={
      <>
        <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
        <ButtonPrimary onClick={onClose}>Lưu</ButtonPrimary>
      </>
    }>
      <div className="flex flex-col gap-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-[12px]">Tên vai trò</label>
          <FieldBox placeholder>VD: Lễ tân, Quản lý ca...</FieldBox>
        </div>
        <div>
          <label className="mb-2.5 block text-[12px]">Danh sách quyền</label>
          {permissionGroups.map((g) => (
            <div key={g.group} className="mb-3.5">
              <div className="mb-2 text-[13px] font-semibold">{g.group}</div>
              <div className="grid grid-cols-2 gap-2.5">
                {g.perms.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-[12.5px]">
                    <span className="inline-block h-[15px] w-[15px] flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
