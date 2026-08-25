const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Proxy cùng origin để UI dùng được từ máy khác trong LAN mà không gọi
  // nhầm localhost của thiết bị đang mở trình duyệt.
  async rewrites() {
    const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:14100";
    return [{ source: "/api/backend/:path*", destination: `${apiProxyTarget}/:path*` }];
  },
  // Chỉ định rõ root cho Turbopack = chính thư mục apps/web — tránh cảnh báo
  // "detected multiple lockfiles" nếu có package-lock.json ở thư mục cha.
  turbopack: {
    root: path.join(__dirname),
  },
};
module.exports = nextConfig;
