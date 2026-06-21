module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        saffron: "#D97706",
        mint: "#0F766E"
      }
    }
  },
  plugins: []
};
