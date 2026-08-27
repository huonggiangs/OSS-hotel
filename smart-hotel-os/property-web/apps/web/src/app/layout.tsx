import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { PmsLocaleProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "ANIO PMS — Property Web",
  description: "Ứng dụng quản lý vận hành cơ sở lưu trú (PMS) — Smart Hotel OS, phần Property Web (PWEB).",
};

// AuthProvider bọc toàn app (cả /login lẫn route group (pms)) — đây là nơi lưu
// user/token dùng chung, do <RootLayout> vẫn là server component nên chỉ import
// component "use client" vào, không tự thành client component (giữ hydration nhẹ).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider><PmsLocaleProvider>{children}</PmsLocaleProvider></AuthProvider>
      </body>
    </html>
  );
}
