import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          600: "#3457d5",
          700: "#2a44ab",
        },
      },
    },
  },
  plugins: [],
};
export default config;
