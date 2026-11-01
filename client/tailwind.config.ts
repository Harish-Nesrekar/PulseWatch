import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#090d16",
        panel: "#101725",
        line: "#202b3b",
        muted: "#8491a5",
        mint: "#5ee0b5"
      },
      boxShadow: {
        glow: "0 0 40px rgba(94, 224, 181, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
