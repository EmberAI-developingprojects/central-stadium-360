/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette — mirrors the CSS custom properties in styles.css :root.
        // Phase 1 keeps both systems coexisting; once Tailwind has full coverage
        // (Phase 5) the :root vars can be deleted and these become the source.
        'brand-blue': {
          DEFAULT: '#2230C6',
          soft: '#4451DC',
          tint: '#E4E7FA',
          deep: '#1A26A0',
          darker: '#131C7A',
        },
        gold: {
          from: '#A89968',
          to: '#C9B888',
          pale: '#E8DEC4',
        },
        ink: {
          DEFAULT: '#1F2937',
          soft: '#4B5563',
        },
        surface: {
          0: '#FFFFFF',
          1: '#F6F7F9',
          2: '#FAF7EE',
        },
      },
      fontFamily: {
        sans: ['"TT Commons"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        loginPop: {
          '0%':   { opacity: '0', transform: 'translateY(14px) scale(.98)' },
          '100%': { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'login-pop': 'loginPop .55s cubic-bezier(.34, 1.56, .64, 1) both',
      },
    },
  },
  // Disable the preflight global reset — styles.css already owns the base
  // layer and we want zero risk of overriding its values during the migration.
  corePlugins: {
    preflight: false,
  },
};
