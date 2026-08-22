import { GuestRoomView } from "@/components/guest/GuestRoomView";

// Trang công khai cho KHÁCH quét mã QR dán ở cửa phòng — KHÔNG nằm trong nhóm
// route (pms) nên KHÔNG bị RequireAuth chặn, không có sidebar/topbar (khách
// chưa đăng nhập, không có JWT). Server component chỉ để resolve `params`
// (Promise ở Next 16 App Router) rồi giao cho GuestRoomView ("use client")
// xử lý toàn bộ fetch()/state.
export default async function GuestRoomPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <GuestRoomView token={token} />;
}
