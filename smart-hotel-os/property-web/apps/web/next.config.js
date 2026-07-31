const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Chỉ định rõ root cho Turbopack = chính thư mục apps/web — tránh cảnh báo
  // "detected multiple lockfiles" nếu có package-lock.json ở thư mục cha.
  turbopack: {
    root: path.join(__dirname),
  },
};
module.exports = nextConfig;
