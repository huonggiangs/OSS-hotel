const COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  DEPLOYED: "bg-green-100 text-green-800",
  APPROVED: "bg-green-100 text-green-800",
  PAID: "bg-green-100 text-green-800",
  RESOLVED: "bg-green-100 text-green-800",
  IN_STOCK: "bg-blue-100 text-blue-800",
  CALCULATED: "bg-blue-100 text-blue-800",
  OPEN: "bg-blue-100 text-blue-800",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  UNDER_WARRANTY_CLAIM: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  OVERDUE: "bg-amber-100 text-amber-800",
  SUSPENDED: "bg-red-100 text-red-800",
  TERMINATED: "bg-red-100 text-red-800",
  REJECTED: "bg-red-100 text-red-800",
  RETIRED: "bg-gray-100 text-gray-700",
  CLOSED: "bg-gray-100 text-gray-700",
  INACTIVE: "bg-gray-100 text-gray-700",
};

// Không chỉ dùng màu để thể hiện trạng thái — luôn kèm chữ (đúng nguyên tắc UI
// dùng chung xuyên suốt dự án, xem smart-hotel-os/docs/UI_SITEMAP.md mục 5).
export function StatusBadge({ status }: { status: string }) {
  const color = COLORS[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
