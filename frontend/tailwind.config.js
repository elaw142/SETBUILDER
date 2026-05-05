export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F2EFE6",
        ink: "#111111",
        acid: "#CCFF00",
        hot: "#FF2D78",
        muted: "#888880",
      },
      fontFamily: {
        display: ["Bebas Neue", "Impact", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
