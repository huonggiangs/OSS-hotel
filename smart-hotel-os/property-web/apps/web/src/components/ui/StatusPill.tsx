// Nhãn trạng thái dạng pill (dùng ở bảng Đặt phòng, Hoá đơn...) — pixel-perfect theo
// style lặp lại trong bản gốc: padding 4px 10px, border-radius 999px, font-size 11px, font-weight 600.
export function StatusPill({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}
