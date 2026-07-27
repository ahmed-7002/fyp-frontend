/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Each color reads from a CSS variable (defined in index.css for
        // :root and .dark separately) so the whole existing app becomes
        // theme-aware without touching a single component's class names.
        mist: "rgb(var(--color-mist) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        teal: {
          DEFAULT: "rgb(var(--color-teal) / <alpha-value>)",
          dark: "rgb(var(--color-teal-dark) / <alpha-value>)",
          light: "rgb(var(--color-teal-light) / <alpha-value>)",
        },
        lavender: {
          DEFAULT: "rgb(var(--color-lavender) / <alpha-value>)",
          light: "rgb(var(--color-lavender-light) / <alpha-value>)",
        },
        clay: {
          DEFAULT: "rgb(var(--color-clay) / <alpha-value>)",
          light: "rgb(var(--color-clay-light) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      boxShadow: {
        soft: "0 4px 24px rgba(30, 42, 40, 0.06)",
      },
    },
  },
  plugins: [],
};