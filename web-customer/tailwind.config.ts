import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
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
      boxShadow: {
        'glass-glow': '0 8px 32px 0 rgba(0, 119, 187, 0.1)',
        'btn-glow': '0 4px 20px rgba(255, 136, 0, 0.35)',
      }
    },
  },
  plugins: [],
};

export default config;
