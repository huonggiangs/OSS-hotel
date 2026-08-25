const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Không để bundle phía trình duyệt biết địa chỉ API nội bộ. Dù người dùng
  // truy cập qua IP LAN hay domain sau này, request luôn đi cùng origin rồi
  // Next.js proxy vào API phù hợp.
  async rewrites() {
    const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:14000";
    return [{ source: "/api/backend/:path*", destination: `${apiProxyTarget}/:path*` }];
  },
  // Chỉ định rõ root cho Turbopack = chính thư mục apps/web — tránh cảnh báo
  // "detected multiple lockfiles" khi có package-lock.json ở thư mục cha
  // (vd. root webadmin/) do lỡ chạy `npm install` sai chỗ ở phiên trước.
  turbopack: {
    root: path.join(__dirname),
  },
};
module.exports = nextConfig;
