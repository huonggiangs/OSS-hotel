"use client";

// Popup xác nhận "Đã gửi yêu cầu dọn phòng" — pixel-perfect theo khối
// `showHousekeepingSent` (dòng 854-863). Đây là điểm đẩy việc sang app buồng phòng
// (ngoài phạm vi property-web hiện tại, xem smart-hotel-os/docs/MODULE_PMS_CORE.md).
export function HousekeepingSentModal({ roomNumber, onClose }: { roomNumber: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(23,26,31,.45)]">
      <div className="w-[380px] rounded-[14px] bg-white p-6 text-center">
        <div className="mb-2 text-[32px]">🧹</div>
        <b className="mb-1.5 block text-[15px]">Đã gửi yêu cầu dọn phòng {roomNumber}</b>
        <p className="m-0 mb-[18px] text-[13px] text-pms-muted">Thông báo đã được đẩy tới ứng dụng nhân viên buồng phòng.</p>
        <div className="cursor-pointer rounded-lg bg-pms-primary py-2.5 text-[13px] font-semibold text-white" onClick={onClose}>
          Đóng
        </div>
      </div>
    </div>
  );
}
