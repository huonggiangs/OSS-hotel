import { stubLabels } from "@/lib/nav";

// Trang giữ chỗ cho các màn hình chưa implement pixel-perfect ở đợt này — đúng tinh
// thần khối `isStub` có sẵn trong bản thiết kế gốc (không phải hàng giả tự chế thêm):
// "Chức năng ... sẽ được thiết kế chi tiết ở đợt tiếp theo."
export default async function StubPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const label = stubLabels[key] ?? key;
  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">{label}</h1>
      <div className="mt-5 rounded-xl bg-white p-10 text-center text-[13px] text-pms-muted shadow-card">
        Chức năng &quot;{label}&quot; sẽ được thiết kế chi tiết ở đợt tiếp theo.
      </div>
    </div>
  );
}
