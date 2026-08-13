'use client';

import './globals.css';
import Link from 'next/link';
import { UserDropdown } from '../components/user-dropdown';
import { Web3PaymentProvider } from '../providers/Web3PaymentProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <title>BARLO-VENTAS | Marketplace & Delivery en EuroToken EURT</title>
        <meta name="description" content="Plataforma de e-commerce y delivery descentralizado BARLO-VENTAS con EuroToken EURT" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#F5F5F0] text-[#333333] font-sans antialiased selection:bg-[#FF8800] selection:text-white bg-wave-pattern">
        <Web3PaymentProvider>
          {/* TOP NAVIGATION NAVBAR - BARLO-VENTAS AZUL CARIBE BRANDING */}
          <header className="border-b border-white/60 bg-white/85 backdrop-blur-md sticky top-0 z-50 shadow-sm glass-panel">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center justify-between gap-4">
                
                {/* 1. BARLO-VENTAS Platform Logo */}
                <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0077BB] via-[#005F96] to-[#FF8800] flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#0077BB]/25 group-hover:scale-105 transition-transform">
                    B
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-xl font-black tracking-tight text-[#333333] group-hover:text-[#0077BB] transition-colors font-poppins">
                      BARLO-<span className="text-[#FF8800]">VENTAS</span> <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E6F4FA] text-[#0077BB] border border-[#0077BB]/30 font-mono font-bold">Web3</span>
                    </span>
                    <span className="text-[10px] text-[#0077BB] block font-semibold">El Ritmo de tus Compras</span>
                  </div>
                </Link>

                {/* 2. Centered Intuitive Search Bar */}
                <div className="flex-1 max-w-xl mx-2 sm:mx-6 relative">
                  <input
                    type="text"
                    placeholder="¿Qué producto o empresa buscas en BARLO-VENTAS? (Buscador intuitivo...)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement;
                        if (target.value.trim()) {
                          window.location.href = `/?search=${encodeURIComponent(target.value.trim())}#catalog`;
                        }
                      }
                    }}
                    className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-[#0077BB]/20 rounded-2xl px-4 py-2.5 pl-10 text-xs sm:text-sm text-[#333333] placeholder-[#A9A9A9] focus:outline-none focus:border-[#0077BB] focus:ring-2 focus:ring-[#0077BB]/20 transition shadow-inner"
                  />
                  <span className="absolute left-3.5 top-2.5 text-[#0077BB] text-sm pointer-events-none">🔍</span>
                </div>

                {/* 3. Connected User Dropdown Menu */}
                <div className="shrink-0">
                  <UserDropdown />
                </div>

              </div>
            </div>
          </header>

          <main>{children}</main>

          <footer className="bg-white/80 backdrop-blur-md border-t border-[#0077BB]/10 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-xs text-[#333333] space-y-2">
              <p className="font-bold text-[#0077BB] font-poppins text-sm">
                BARLO-VENTAS Web3 &copy; 2025 - El Ritmo de tus Compras
              </p>
              <p className="text-[11px] text-[#A9A9A9] font-mono">
                EuroToken (EURT) &bull; Red Ethereum Local &bull; Contratos Inteligentes Auditados
              </p>
            </div>
          </footer>
        </Web3PaymentProvider>
      </body>
    </html>
  );
}
