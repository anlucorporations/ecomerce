/**
 * BARLO-VENTAS Web3 - Theme & Color Tokens
 * Framework: Next.js 15.5.4 (App Router) + TailwindCSS
 */

export const barloTheme = {
  colors: {
    primary: {
      caribe: '#0077BB',      // Azul Caribe Digital - Confianza, Marca
      caribeHover: '#005F96',
      caribeLight: '#E6F4FA',
      cacao: '#FF8800',       // Naranja Cacao Sol - Energía, Acción (CTA)
      cacaoHover: '#E07700',
      cacaoLight: '#FFF3E5',
    },
    secondary: {
      sanJuan: '#CC2233',     // Rojo San Juan - Ritmo, Promociones, Urgencia
      sanJuanHover: '#A81B29',
      sanJuanLight: '#FCEAEB',
      manglar: '#2E8B57',     // Verde Manglar - Sostenibilidad, Saldos EURT
      manglarLight: '#EAF5EF',
    },
    neutral: {
      arena: '#F5F5F0',       // Blanco Arena - Fondo cálido principal
      asfalto: '#333333',     // Gris Asfalto - Texto principal
      niebla: '#A9A9A9',      // Gris Niebla - Subtítulos/Bordes
      surface: '#FFFFFF',
      glass: 'rgba(255, 255, 255, 0.75)',
      glassBorder: 'rgba(255, 255, 255, 0.5)',
    },
    web3: {
      eth: '#627EEA',
      eurt: '#10B981',
      accentGlow: 'rgba(0, 119, 187, 0.15)',
    }
  },
  typography: {
    fontTitles: 'var(--font-poppins), sans-serif',
    fontBody: 'var(--font-inter), sans-serif',
  },
  shadows: {
    card: '0 8px 32px 0 rgba(0, 119, 187, 0.08)',
    glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
    buttonGlow: '0 4px 20px rgba(255, 136, 0, 0.35)',
  }
} as const;

export type BarloTheme = typeof barloTheme;
