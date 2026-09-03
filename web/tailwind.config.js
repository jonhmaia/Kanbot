/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0E0E0F',
        coal: '#161617',
        graphite: '#1E1E20',
        panel: 'rgba(255,255,255,0.062)',
        panelStrong: 'rgba(255,255,255,0.095)',
        line: 'rgba(255,255,255,0.10)',
        lineSoft: 'rgba(255,255,255,0.065)',
        amber: {
          DEFAULT: '#F5A524',
          soft: '#FFC15E',
          deep: '#D98B0F',
        },
        ice: {
          DEFAULT: '#BFE3F2',
          light: '#E6F4FA',
          deep: '#8FC9E0',
        },
        mint: '#8FE3B0',
        rose: '#E5484D',
        lilac: '#C4B5FD',
        chalk: '#EDEDED',
        dust: '#9A9A9C',
        smoke: '#6E6E71',
      },
      fontFamily: {
        sans: ['"Inter Tight"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '28px',
        '5xl': '34px',
      },
      boxShadow: {
        card: '0 20px 45px -25px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04)',
        lift: '0 30px 60px -30px rgba(0,0,0,0.95)',
        pop: '0 18px 40px -18px rgba(0,0,0,0.85)',
        amberGlow: '0 12px 30px -12px rgba(245,165,36,0.55)',
      },
      backgroundImage: {
        'ice-card': 'linear-gradient(150deg, #DCEFF8 0%, #C6E4F3 46%, #AFD9EE 100%)',
        'amber-btn': 'linear-gradient(180deg, #FFB941 0%, #F5A524 100%)',
      },
      keyframes: {
        floatIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        wave: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        floatIn: 'floatIn .45s cubic-bezier(.22,1,.36,1) both',
        wave: 'wave 18s linear infinite',
        pulseSoft: 'pulseSoft 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
