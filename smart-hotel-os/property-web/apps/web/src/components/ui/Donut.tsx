// Biểu đồ tròn dùng conic-gradient — dùng lại ở panel "Khu vực/Tầng/Trạng thái/Loại phòng"
// (Rooms) và "Biểu đồ sử dụng phòng/Tổng quan lịch sử đặt" (Dashboard).
export function Donut({
  size = 100,
  holeSize,
  gradient,
  onClick,
  title,
  children,
}: {
  size?: number;
  holeSize?: number;
  gradient: string;
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const hole = holeSize ?? Math.round(size * 0.66);
  return (
    <div
      className="donut cursor-pointer"
      style={{ width: size, height: size, background: gradient }}
      onClick={onClick}
      title={title}
    >
      <div className="donut-hole" style={{ width: hole, height: hole }}>
        {children}
      </div>
    </div>
  );
}

export function buildConicGradient(segments: { color: string; from: number; to: number }[]) {
  return `conic-gradient(${segments.map((s) => `${s.color} ${s.from}% ${s.to}%`).join(", ")})`;
}
