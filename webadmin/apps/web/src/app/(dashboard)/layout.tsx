"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/partners", label: "Đối tác" },
  { href: "/suppliers", label: "Nhà cung cấp" },
  { href: "/customers", label: "Khách hàng" },
  { href: "/hardware-assets", label: "Thiết bị phần cứng" },
  { href: "/commissions", label: "Hoa hồng" },
  { href: "/purchase-orders", label: "Mua hàng / tồn kho" },
  { href: "/releases", label: "Release Console" },
  { href: "/users", label: "Người dùng & phân quyền" },
  { href: "/audit-logs", label: "Audit log" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Đang tải...</div>;
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <p className="text-sm font-semibold text-gray-900">HQ Console</p>
          <p className="text-xs text-gray-500">Smart Hotel Group</p>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium ${
                  active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-gray-200 px-5 py-4">
          <p className="text-sm text-gray-700">{user.full_name}</p>
          <p className="text-xs text-gray-500">{user.role}</p>
          <button onClick={logout} className="mt-2 text-xs font-medium text-brand-600 hover:underline">
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-gray-50 px-8 py-6">{children}</main>
    </div>
  );
}
