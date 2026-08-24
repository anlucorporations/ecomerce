import type { Config } from 'tailwindcss';

// B12: configuración explícita de `content` — sin ella Tailwind v3 no escanea
// las clases usadas en src/ y el CSS de utilidades quedaría vacío en build.
const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        caribe: {
          DEFAULT: '#0077BB',
          hover: '#005F96',
          light: '#E6F4FA',
        },
        cacao: {
          DEFAULT: '#FF8800',
          hover: '#E07700',
          light: '#FFF3E5',
        },
        sanJuan: {
          DEFAULT: '#CC2233',
          hover: '#A81B29',
          light: '#FCEAEB',
        },
        manglar: {
          DEFAULT: '#2E8B57',
          light: '#EAF5EF',
        },
        arena: '#F5F5F0',
        asfalto: '#333333',
        niebla: '#A9A9A9',
      },
      fontFamily: {
        poppins: ['var(--font-poppins)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
