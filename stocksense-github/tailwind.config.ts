import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc7fc",
          400: "#36aaf7",
          500: "#0b8de9",
          600: "#026fc7",
          700: "#0359a1",
          800: "#074c84",
          900: "#0b3f6e",
          950: "#072849",
        },
        slate: {
          850: "#151e2e",
          925: "#0b111e",
        }
      },
    },
  },
  plugins: [],
};
export default config;
