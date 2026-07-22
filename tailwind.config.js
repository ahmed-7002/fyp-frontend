/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        mist: "#F3F6F5",       // page background
        surface: "#FFFFFF",
        ink: "#1E2A28",        // primary text
        muted: "#5B6B68",      // secondary text
        teal: {
          DEFAULT: "#2B6F6B",
          dark: "#1E4F4C",
          light: "#E4EFEE",
        },
        lavender: {
          DEFAULT: "#8C7AA9",
          light: "#EFEBF4",
        },
        clay: {
          DEFAULT: "#C97B63",  // used sparingly - disclaimer / warning accent
          light: "#F6E9E5",
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
