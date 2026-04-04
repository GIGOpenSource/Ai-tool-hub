import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // 管理后台低饱和中性色：长期盯屏减轻紫/青刺激
        admin: {
          bg: "#0e0e12",
          surface: "#17171e",
          border: "#2c2e36",
          link: "#9aa6b2",
          accent: "#8b96a3",
          highlight: "rgb(255 255 255 / 0.07)",
          btn: "#3e4654",
          "btn-hover": "#4e5766",
        },
      },
    },
  },
  plugins: [],
};
export default config;
