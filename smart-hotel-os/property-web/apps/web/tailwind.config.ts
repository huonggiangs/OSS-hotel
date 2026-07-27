import type { Config } from "tailwindcss";

// Màu/khoảng cách lấy đúng theo giá trị dùng trong "Hotel PMS.dc.html"
// (thiết kế gốc dùng hex trực tiếp, không qua biến CSS design-system —
// nên khai báo lại nguyên xi ở đây để pixel-perfect, không tự sáng tạo màu mới).
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Be Vietnam Pro'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "'Helvetica Neue'", "Arial", "sans-serif"],
      },
      colors: {
        pms: {
          primary: "#284AB1",
          "primary-hover": "#1d3585",
          "primary-soft": "#EEF1FB",
          bg: "#FAFAFA",
          surface: "#FFFFFF",
          border: "#E6E8EC",
          divider: "#F4F5F6",
          text: "#23262F",
          muted: "#777E90",
          "muted-2": "#B1B5C3",
          success: "#00C853",
          "success-bg": "#E6F9EE",
          danger: "#CC2F42",
          "danger-bg": "#FCEAEC",
          warning: "#FAB505",
          "warning-bg": "#FFF7E0",
          "warning-fg": "#946200",
        },
      },
      boxShadow: {
        card: "0 4px 20px rgba(0,0,0,.06)",
        popover: "0 8px 24px rgba(0,0,0,.12)",
      },
    },
  },
  plugins: [],
};
export default config;
