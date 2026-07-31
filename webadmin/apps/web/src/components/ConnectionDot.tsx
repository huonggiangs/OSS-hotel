const DOT_COLORS: Record<string, string> = {
  ONLINE: "bg-green-500",
  OFFLINE: "bg-red-500",
  UNKNOWN: "bg-gray-400",
};

const LABELS: Record<string, string> = {
  ONLINE: "Đang kết nối",
  OFFLINE: "Mất kết nối",
  UNKNOWN: "Chưa rõ",
};

// Chấm màu + chữ thể hiện trạng thái kết nối thiết bị (xanh/đỏ/xám) — luôn kèm
// chữ, không chỉ dùng màu (đúng nguyên tắc UI chung của dự án).
export function ConnectionDot({ status }: { status: string }) {
  const color = DOT_COLORS[status] ?? "bg-gray-400";
  const label = LABELS[status] ?? status;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
