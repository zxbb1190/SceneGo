import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontSize: {
        xs: ["13px", { lineHeight: "19px" }],
        sm: ["15px", { lineHeight: "22px" }],
        base: ["17px", { lineHeight: "26px" }],
        lg: ["19px", { lineHeight: "28px" }],
        xl: ["22px", { lineHeight: "30px" }]
      },
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
