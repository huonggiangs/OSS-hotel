import { redirect } from "next/navigation";

// Trang gốc luôn chuyển hướng vào Tổng quan (Dashboard) — giống hành vi mặc định
// của bản thiết kế gốc (tab "dashboard" là tab khởi động của Component).
export default function RootPage() {
  redirect("/dashboard");
}
