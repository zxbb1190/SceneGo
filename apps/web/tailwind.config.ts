import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        panel: "#f7f8fb",
        line: "#d9dee8",
        accent: "#2563eb"
      }
    }
  },
  plugins: []
} satisfies Config;

