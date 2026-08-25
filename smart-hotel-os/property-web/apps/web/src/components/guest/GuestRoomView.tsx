"use client";

import { useEffect, useState } from "react";

// Nội dung trang khách quét QR — tách thành client component riêng vì
// page.tsx (App Router, Next 16) nhận `params` dạng Promise, chỉ resolve được
// ở server component; toàn bộ logic fetch()/state ở đây vẫn cần "use client".
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/backend";

interface PublicRoomInfo {
  propertyName: string;
  propertyPhone: string | null;
  roomNumber: string;
  roomTypeName: string;
  floor: string;
  basePrice: string;
  roomCode: string;
}

interface SepayQrResponse {
  enabled: boolean;
  imgUrl?: string;
}

function formatVnd(v: string | number) {
  return Number(v).toLocaleString("vi-VN") + "đ";
}

// Bỏ dấu tiếng Việt — dùng cho tham số "desc" gửi sang cổng thanh toán SePay
// (chỉ chấp nhận ký tự ASCII thuần trong nội dung chuyển khoản).
const COMBINING_MARKS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function stripDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(COMBINING_MARKS_RE, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export function GuestRoomView({ token }: { token: string }) {
  const [room, setRoom] = useState<PublicRoomInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sepayImgUrl, setSepayImgUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRoom() {
      try {
        const res = await fetch(`${API_URL}/api/v1/public/rooms/${token}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("request failed");
        const data: PublicRoomInfo = await res.json();
        if (cancelled) return;
        setRoom(data);

        // Thanh toán trước qua SePay — endpoint công khai do phần khác của dự
        // án xây song song, có thể chưa triển khai/lỗi tại thời điểm chạy thử
        // ở đây — không để việc này làm hỏng cả trang, chỉ ẩn phần thanh toán.
        try {
          const amount = Math.round(Number(data.basePrice));
          const desc = stripDiacritics(`${data.roomCode} DAT COC`);
          const payRes = await fetch(
            `${API_URL}/api/v1/public/payments/sepay-qr?amount=${amount}&desc=${encodeURIComponent(desc)}`
          );
          if (payRes.ok) {
            const payData: SepayQrResponse = await payRes.json();
            if (!cancelled && payData.enabled && payData.imgUrl) {
              setSepayImgUrl(payData.imgUrl);
            }
          }
        } catch {
          // best-effort — im lặng bỏ qua, không hiển thị lỗi cho khách
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRoom();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-pms-bg px-4 py-10">
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-7 shadow-card">
        {loading && <p className="text-center text-[13px] text-pms-muted">Đang tải thông tin phòng...</p>}

        {!loading && notFound && (
          <p className="text-center text-[14px] text-pms-danger">Không tìm thấy thông tin phòng.</p>
        )}

        {!loading && room && (
          <>
            <div className="mb-5 text-center">
              <b className="block text-[18px]">{room.propertyName}</b>
              {room.propertyPhone && <span className="text-[12.5px] text-pms-muted">ĐT: {room.propertyPhone}</span>}
            </div>

            <div className="mb-5 rounded-xl bg-pms-divider px-4 py-4">
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span className="text-pms-muted">Phòng</span>
                <b>{room.roomNumber}</b>
              </div>
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span className="text-pms-muted">Loại phòng</span>
                <b>{room.roomTypeName}</b>
              </div>
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span className="text-pms-muted">Tầng</span>
                <b>{room.floor}</b>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-pms-muted">Giá</span>
                <b className="text-pms-primary">{formatVnd(room.basePrice)}</b>
              </div>
            </div>

            {sepayImgUrl && (
              <div className="text-center">
                <b className="mb-3 block text-[14px]">Quét mã để thanh toán trước</b>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sepayImgUrl} alt="Mã QR thanh toán SePay" className="mx-auto w-full max-w-[260px] rounded-lg border border-pms-border" />
                <p className="mt-2 text-[11.5px] text-pms-muted">Quét mã bằng ứng dụng ngân hàng để đặt cọc trước khi nhận phòng.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
