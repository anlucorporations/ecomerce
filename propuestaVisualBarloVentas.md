```python
import os
import json
import zipfile

# Create workspace directory structure
base_dir = "/tmp/barlo_ventas_assets"
os.makedirs(base_dir, exist_ok=True)

# 1. generate theme.config.ts / colors design tokens
theme_config = '''/**
 * BARLO-VENTAS Web3 - Theme & Color Tokens
 * Framework: Next.js 15.5.4 (App Router) + TailwindCSS
 */

export const barloTheme = {
  colors: {
    primary: {
      caribe: '#0077BB', // Azul Caribe Digital - Confianza, Mar Caribe
      caribeHover: '#005F96',
      caribeLight: '#E6F4FA',
      cacao: '#FF8800',  // Naranja Cacao Sol - Energía, Acción, Cacao
      cacaoHover: '#E07700',
      cacaoLight: '#FFF3E5',
    },
    secondary: {
      sanJuan: '#CC2233', // Rojo San Juan - Ritmo, Tradición, Urgencia
      sanJuanHover: '#A81B29',
      sanJuanLight: '#FCEAEB',
      manglar: '#2E8B57',  // Verde Manglar - Sostenibilidad, Naturaleza
      manglarLight: '#EAF5EF',
    },
    neutral: {
      arena: '#F5F5F0',    // Blanco Arena - Fondo cálido
      asfalto: '#333333',  // Gris Asfalto - Texto principal
      niebla: '#A9A9A9',   // Gris Niebla - Subtítulos/Bordes
      surface: '#FFFFFF',
      glass: 'rgba(255, 255, 255, 0.75)',
      glassBorder: 'rgba(255, 255, 255, 0.4)',
    },
    web3: {
      eth: '#627EEA',
      solana: '#14F195',
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
'''

# 2. generate globals.css (Tailwind directives + Glassmorphism + Micro-animations)
globals_css = '''@import "tailwindcss";

@layer base {
  :root {
    --font-poppins: 'Poppins', sans-serif;
    --font-inter: 'Inter', sans-serif;
    
    --color-caribe: #0077BB;
    --color-cacao: #FF8800;
    --color-san-juan: #CC2233;
    --color-manglar: #2E8B57;
    --color-arena: #F5F5F0;
    --color-asfalto: #333333;
    --color-niebla: #A9A9A9;
  }

  body {
    background-color: var(--color-arena);
    color: var(--color-asfalto);
    font-family: var(--font-inter);
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-poppins);
  }
}

/* Glassmorphism Classes */
.glass-panel {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 32px 0 rgba(0, 119, 187, 0.06);
}

.glass-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 1.25rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px 0 rgba(0, 119, 187, 0.12);
}

/* Micro-animations: Tambor Pulse & Waves */
@keyframes tamborPulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 136, 0, 0.5);
  }
  70% {
    transform: scale(1.03);
    box-shadow: 0 0 0 14px rgba(255, 136, 0, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 136, 0, 0);
  }
}

.btn-cacao-pulse {
  background: linear-gradient(135deg, #FF8800 0%, #E07700 100%);
  color: #FFFFFF;
  font-family: var(--font-poppins);
  font-weight: 600;
  border-radius: 9999px;
  padding: 0.75rem 1.75rem;
  transition: all 0.25s ease-in-out;
  box-shadow: 0 4px 15px rgba(255, 136, 0, 0.3);
}

.btn-cacao-pulse:hover {
  animation: tamborPulse 1.2s infinite;
  background: linear-gradient(135deg, #FFA033 0%, #FF8800 100%);
}

@keyframes waveMove {
  0% { background-position-x: 0; }
  100% { background-position-x: 1000px; }
}

.bg-wave-pattern {
  background-image: radial-gradient(rgba(0, 119, 187, 0.08) 1px, transparent 0);
  background-size: 24px 24px;
}
'''

# 3. generate tailwind.config.ts
tailwind_config = '''import type { Config } from 'tailwindcss';

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
      backdropBlur: {
        xs: '2px',
        glass: '16px',
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
'''

# 4. generate layout.tsx (Next.js 15.5.4 App Router Root Layout with Google Fonts)
layout_tsx = '''import type { Metadata } from 'next';
import { Poppins, Inter } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BARLO-VENTAS Web3 | El Ritmo de tus Compras',
  description: 'Plataforma e-commerce Web3 inspirada en Barlovento. Conectando comercio digital, NFT tokens y cultura con la máxima eficiencia.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${poppins.variable} ${inter.variable}`}>
      <body className="bg-arena text-asfalto min-h-screen flex flex-col antialiased selection:bg-cacao selection:text-white">
        {children}
      </body>
    </html>
  );
}
'''

# 5. generate Web3Button.tsx component
web3_button_tsx = ''''use client';

import React, { useState } from 'react';
import { ethers } from 'ethers';

interface Web3ButtonProps {
  onConnect?: (address: string) => void;
}

export const Web3Button: React.FC<Web3ButtonProps> = ({ onConnect }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        setIsConnecting(true);
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        const userAddress = accounts[0];
        setAccount(userAddress);
        if (onConnect) onConnect(userAddress);
      } catch (error) {
        console.error('Error conectando a la Web3 Wallet:', error);
      } finally {
        setIsConnecting(false);
      }
    } else {
      alert('Por favor instala MetaMask u otra billetera Web3 para continuar.');
    }
  };

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="relative inline-flex items-center justify-center gap-2 px-6 py-3 font-poppins font-semibold text-sm text-white bg-gradient-to-r from-caribe to-caribe-hover rounded-full shadow-lg hover:shadow-caribe/30 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
    >
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      </svg>
      {isConnecting ? (
        'Conectando...'
      ) : account ? (
        `${account.substring(0, 6)}...${account.substring(account.length - 4)}`
      ) : (
        'Conectar Billetera Web3'
      )}
    </button>
  );
};
'''

# Write files
with open(os.path.join(base_dir, "theme.config.ts"), "w") as f:
    f.write(theme_config)

with open(os.path.join(base_dir, "globals.css"), "w") as f:
    f.write(globals_css)

with open(os.path.join(base_dir, "tailwind.config.ts"), "w") as f:
    f.write(tailwind_config)

with open(os.path.join(base_dir, "layout.tsx"), "w") as f:
    f.write(layout_tsx)

with open(os.path.join(base_dir, "Web3Button.tsx"), "w") as f:
    f.write(web3_button_tsx)

# Create zip archive
zip_path = "/tmp/BARLO_VENTAS_Web3_Style_Assets.zip"
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, base_dir)
            zipf.write(file_path, arcname)

print(f"Zip created at {zip_path}")


```

```text
Zip created at /tmp/BARLO_VENTAS_Web3_Style_Assets.zip


```

Se han generado los archivos de estilo visual y código técnico para la arquitectura **BARLO-VENTAS Web3**, estructurados conforme al stack tecnológico solicitado:

* **Framework:** Next.js 15.5.4 (App Router & Turbopack Engine)
* **UI & Programación:** React 19, TypeScript 5.x (Strict Type Checking)
* **Web3 Integration:** Ethers.js v6 (`ethers@6.13.5`)
* **Diseño Visual:** TailwindCSS, Vanilla CSS Custom Tokens, Glassmorphic UI y Micro-animaciones.

---

### Resumen de Archivos Creados

1. `theme.config.ts`
* Exporta los tokens centrales en TypeScript (paleta de colores **Azul Caribe Digital**, **Naranja Cacao Sol**, **Rojo San Juan**, **Verde Manglar** y **Blanco Arena**, tipografías *Poppins* y *Inter*, y sombras Glassmorphism).


2. `globals.css`
* Configuración de variables CSS nativas, reglas `@layer base`, clases de utilidades Glassmorphism (`.glass-panel`, `.glass-card`) y micro-animación pulsante de ritmo de tambor (`@keyframes tamborPulse` / `.btn-cacao-pulse`).


3. `tailwind.config.ts`
* Configuración completa compatible con TailwindCSS y Next.js App Router, extendiendo los colores de marca, fuentes e identidades visuales.


4. `layout.tsx`
* Layout raíz de Next.js 15.5.4 configurado con `next/font/google` para carga optimizada de **Poppins** y **Inter** con variables CSS.


5. `Web3Button.tsx`
* Componente UI funcional para conexión de billeteras Web3 con Ethers.js v6, estilizado con estética Glassmorphism e interfaz responsiva.



---

### Código de Muestra de los Componentes

#### Tokens de Diseño (`theme.config.ts`)

```typescript
export const barloTheme = {
  colors: {
    primary: {
      caribe: '#0077BB',     // Azul Caribe Digital (Confianza)
      cacao: '#FF8800',      // Naranja Cacao Sol (Energía / CTA)
    },
    secondary: {
      sanJuan: '#CC2233',    // Rojo San Juan (Ritmo / Promociones)
      manglar: '#2E8B57',    // Verde Manglar (Sostenibilidad)
    },
    neutral: {
      arena: '#F5F5F0',      // Blanco Arena (Fondo principal)
      asfalto: '#333333',    // Gris Asfalto (Texto)
      glass: 'rgba(255, 255, 255, 0.75)',
    }
  },
  typography: {
    fontTitles: 'var(--font-poppins), sans-serif',
    fontBody: 'var(--font-inter), sans-serif',
  }
} as const;

```

#### Micro-animaciones y Glassmorphism (`globals.css`)

```css
/* Efecco Glassmorphism */
.glass-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 1.25rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Micro-animación "Ritmo de Tambor" para CTA */
@keyframes tamborPulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 136, 0, 0.5); }
  70% { transform: scale(1.03); box-shadow: 0 0 0 14px rgba(255, 136, 0, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 136, 0, 0); }
}

.btn-cacao-pulse {
  background: linear-gradient(135deg, #FF8800 0%, #E07700 100%);
  color: #FFFFFF;
  font-family: var(--font-poppins);
  font-weight: 600;
  border-radius: 9999px;
  padding: 0.75rem 1.75rem;
}

.btn-cacao-pulse:hover {
  animation: tamborPulse 1.2s infinite;
}

```