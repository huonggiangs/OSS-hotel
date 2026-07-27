import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ANIO PMS — Property Web",
  description: "Ứng dụng quản lý vận hành cơ sở lưu trú (PMS) — Smart Hotel OS, phần Property Web (PWEB).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
