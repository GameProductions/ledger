/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./template/**/*.{js,ts,jsx,tsx}",
    "../**/*.{js,ts,jsx,tsx}" // Support for mono-repo structures
  ],
  theme: {
    extend: {
      colors: {
        primary: "#06b6d4", // Cyan 500 (GP Infrastructure Standard)
        secondary: "#1e293b", // Slate 800
        muted: "#64748b", // Slate 500
        danger: "#ef4444", // Red 500
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "in": "fade-in 0.3s ease-out, slide-in 0.3s ease-out",
        "shimmer": "shimmer 2s infinite",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "slide-in": { "0%": { transform: "translateY(10px)" }, "100%": { transform: "translateY(0)" } },
        "shimmer": { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(100%)" } },
      }
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}
