import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "HQ Console — Smart Hotel Group",
  description: "Trang quản trị nội bộ toàn công ty: đối tác, nhà cung cấp, khách hàng, thiết bị, hoa hồng.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
