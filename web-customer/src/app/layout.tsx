'use client';

import './globals.css';
import Link from 'next/link';
import { UserDropdown } from '../components/user-dropdown';

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
      </head>
      <body className="bg-slate-50 text-slate-900 font-sans selection:bg-rose-500 selection:text-white antialiased">
        {/* TOP NAVIGATION NAVBAR - BARLO-VENTAS BRANDING */}
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between gap-4">
              
              {/* 1. BARLO-VENTAS Platform Logo */}
              <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-red-500 to-amber-400 flex items-center justify-center text-white font-black text-xl shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
                  B
                </div>
                <div className="hidden sm:block">
                  <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-rose-600 transition-colors">
                    BARLO-<span className="text-rose-500">VENTAS</span> <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-mono font-bold">Web3</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">Marketplace & Delivery EURT</span>
                </div>
              </Link>

              {/* 2. Centered Intuitive Search Bar */}
              <div className="flex-1 max-w-xl mx-2 sm:mx-6 relative">
                <input
                  type="text"
                  placeholder="¿Qué producto o empresa buscas hoy en BARLO-VENTAS? (Buscador intuitivo...)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      if (target.value.trim()) {
                        window.location.href = `/?search=${encodeURIComponent(target.value.trim())}#catalog`;
                      }
                    }
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-2xl px-4 py-2.5 pl-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition shadow-inner"
                />
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm pointer-events-none">🔍</span>
              </div>

              {/* 3. Connected User Dropdown Menu */}
              <div className="shrink-0">
                <UserDropdown />
              </div>

            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="bg-white border-t border-slate-200 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">
              BARLO-VENTAS Web3 &copy; 2025 - Comercio Electrónico Descentralizado
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              EuroToken (EURT) &bull; Red Ethereum Local &bull; Contratos Inteligentes Auditaos
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
