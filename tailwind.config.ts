import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    screens: { sm: "480px", md: "768px", lg: "1024px", xl: "1280px" },
    extend: {
      colors: {
        canvas: token("canvas"),
        "surface-raised": token("surface-raised"),
        "surface-muted": token("surface-muted"),
        text: token("text"),
        "text-muted": token("text-muted"),
        line: token("line"),
        "line-strong": token("line-strong"),
        "node-ring": token("node-ring"),
        connector: token("connector"),
        accent: token("accent"),
        action: token("action"),
        "on-action": token("on-action"),
        citrine: "rgb(229 255 93 / <alpha-value>)",
        carbon: "rgb(11 11 11 / <alpha-value>)",
      },
      fontFamily: {
        sans: ['"Neue Haas Grotesk Text"', '"Neue Haas Grotesk Display"', '"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
        // No build-time font download: JetBrains Mono when installed, otherwise the system mono.
        mono: ["\"JetBrains Mono\"", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        display: ["80px", { lineHeight: "0.9", letterSpacing: "-0.01em" }],
        "display-sm": ["44px", { lineHeight: "0.95", letterSpacing: "-0.01em" }],
        heading: ["48px", { lineHeight: "1.1" }],
        "heading-m": ["34px", { lineHeight: "1.12" }],
        "heading-sm": ["24px", { lineHeight: "1.2" }],
        body: ["16px", { lineHeight: "1.5" }],
        small: ["14px", { lineHeight: "1.45" }],
        label: ["12px", { lineHeight: "1.2", letterSpacing: "0.032em" }],
        micro: ["10px", { lineHeight: "1.2", letterSpacing: "0.06em" }],
      },
      fontWeight: { normal: "400", medium: "500" },
      borderRadius: { tag: "4px", nav: "8px", card: "12px", deco: "20px", media: "28px" },
      maxWidth: { page: "1280px", measure: "560px" },
      spacing: { "section-gap": "80px", gutter: "80px" },
      transitionTimingFunction: { reveal: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
    },
  },
  plugins: [],
} satisfies Config;
