
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {

        "brand-blue": {
          DEFAULT: "#2230C6",
          soft: "#4451DC",
          tint: "#E4E7FA",
          deep: "#1A26A0",
          darker: "#131C7A",
        },
        gold: {
          from: "#A89968",
          to: "#C9B888",
          pale: "#E8DEC4",
        },
        ink: {
          DEFAULT: "#1F2937",
          soft: "#4B5563",
        },
        surface: {
          0: "#FFFFFF",
          1: "#F6F7F9",
          2: "#FAF7EE",
        },
      },
      fontFamily: {
        sans: [
          '"TT Commons"',
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      keyframes: {
        loginPop: {
          "0%": { opacity: "0", transform: "translateY(14px) scale(.98)" },
          "100%": { opacity: "1", transform: "none" },
        },
        liveBlink: {
          "0%": {
            boxShadow: "0 0 0 0 rgba(229, 57, 53, 0.6)",
            transform: "scale(1)",
          },
          "70%": {
            boxShadow: "0 0 0 12px rgba(229, 57, 53, 0)",
            transform: "scale(1.1)",
          },
          "100%": {
            boxShadow: "0 0 0 0 rgba(229, 57, 53, 0)",
            transform: "scale(1)",
          },
        },
        "live-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(255, 255, 255, .9)",
            opacity: "1",
          },
          "50%": {
            boxShadow: "0 0 0 5px rgba(255, 255, 255, 0)",
            opacity: ".55",
          },
        },
        tmFade: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        tmPop: {
          from: { opacity: "0", transform: "translateY(14px) scale(.97)" },
          to: { opacity: "1", transform: "none" },
        },
        userMenuIn: {
          from: { opacity: "0", transform: "translateY(-6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        chatIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
        reactRise: {
          "0%": { opacity: "0", transform: "translateY(0) scale(.6)" },
          "15%": { opacity: "1", transform: "translateY(-30px) scale(1.05)" },
          "70%": {
            opacity: "1",
            transform: "translateY(-260px) scale(1) rotate(-6deg)",
          },
          "100%": {
            opacity: "0",
            transform: "translateY(-360px) scale(.85) rotate(6deg)",
          },
        },
        revealUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "none" },
        },
        "partners-marquee": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "login-pop": "loginPop .55s cubic-bezier(.34, 1.56, .64, 1) both",
        "live-blink": "liveBlink 1.6s ease-out infinite",
        "live-pulse": "live-pulse 1.4s ease-in-out infinite",
        "tm-fade": "tmFade .25s ease",
        "tm-pop": "tmPop .35s cubic-bezier(.34, 1.56, .64, 1) both",
        "tm-pop-success": "tmPop .5s cubic-bezier(.34, 1.56, .64, 1) both",
        "user-menu-in": "userMenuIn .14s ease",
        "chat-in": "chatIn .25s ease-out",
        "react-rise": "reactRise 2s ease-out forwards",
        "reveal-up": "revealUp 600ms cubic-bezier(.2,.8,.2,1) both",
        "partners-marquee": "partners-marquee 40s linear infinite",
      },
      maxWidth: {
        "screen-page": "1300px",
      },
    },
  },

  corePlugins: {
    preflight: false,
  },
};
