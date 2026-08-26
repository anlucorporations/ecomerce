'use client';

import './globals.css';
import Link from 'next/link';
import Image from 'next/image';
import { UserDropdown } from '../components/user-dropdown';
import { Web3PaymentProvider } from '../providers/Web3PaymentProvider';
import { RegistrationCheck } from '../components/registration-check';
import { BottomNav } from '../components/bottom-nav';

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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#0077BB" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#F5F5F0] text-[#333333] font-sans antialiased selection:bg-[#FF8800] selection:text-white bg-wave-pattern pb-16 sm:pb-0">
        <Web3PaymentProvider>
          <RegistrationCheck />
          
          {/* TOP NAVIGATION NAVBAR - RESPONSIVE MOBILE-FIRST */}
          <header className="border-b border-white/60 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-sm glass-panel min-h-[56px]">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3">
              
              {/* 1. VISTA MÓVIL (< sm): Logo + Barra de Búsqueda Integrada (Sin botones) */}
              <div className="flex sm:hidden items-center gap-2.5 w-full">
                <Link href="/" className="shrink-0 flex items-center min-h-[40px]">
                  <Image
                    src="/logo.svg"
                    alt="BARLO-VENTAS Logo"
                    width={96}
                    height={32}
                    className="h-7 w-auto object-contain"
                    priority
                  />
                </Link>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="¿Qué producto buscas?..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement;
                        if (target.value.trim()) {
                          window.location.href = `/?search=${encodeURIComponent(target.value.trim())}#catalog`;
                        }
                      }
                    }}
                    className="w-full bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-[#0077BB] rounded-xl px-3 py-2 pl-8 text-xs text-[#333333] placeholder-[#A9A9A9] focus:outline-none transition shadow-inner font-medium"
                  />
                  <span className="absolute left-2.5 top-2 text-[#0077BB] text-xs pointer-events-none">🔍</span>
                </div>
              </div>

              {/* 2. VISTA ESCRITORIO (>= sm): Logo + Buscador Central + Ayuda + UserDropdown */}
              <div className="hidden sm:flex items-center justify-between gap-4">
                
                {/* Brand Logo */}
                <Link href="/" className="flex items-center gap-2 group shrink-0 min-h-[44px]">
                  <div className="h-9 sm:h-10 w-auto flex items-center justify-center transition-transform group-hover:scale-105">
                    <Image
                      src="/logo.svg"
                      alt="BARLO-VENTAS Logo"
                      width={120}
                      height={40}
                      className="h-8 sm:h-9 w-auto object-contain"
                      priority
                    />
                  </div>
                  <span className="hidden md:inline text-[10px] px-2 py-0.5 rounded-full bg-[#E6F4FA] text-[#0077BB] border border-[#0077BB]/30 font-mono font-bold">
                    Web3 Escrow
                  </span>
                </Link>

                {/* Centered Desktop Search Bar */}
                <div className="flex-1 max-w-lg mx-4 relative">
                  <input
                    type="text"
                    placeholder="¿Qué producto o empresa buscas en BARLO-VENTAS?..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement;
                        if (target.value.trim()) {
                          window.location.href = `/?search=${encodeURIComponent(target.value.trim())}#catalog`;
                        }
                      }
                    }}
                    className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-[#0077BB]/20 rounded-2xl px-4 py-2 pl-9 text-xs sm:text-sm text-[#333333] placeholder-[#A9A9A9] focus:outline-none focus:border-[#0077BB] focus:ring-2 focus:ring-[#0077BB]/20 transition shadow-inner"
                  />
                  <span className="absolute left-3 top-2.5 text-[#0077BB] text-xs pointer-events-none">🔍</span>
                </div>

                {/* Right Actions: Help (❓) & User Dropdown */}
                <div className="shrink-0 flex items-center gap-2">
                  <Link
                    href="/help"
                    className="flex items-center justify-center px-3.5 py-2 bg-[#E6F4FA] hover:bg-[#D4EDF7] text-[#0077BB] border border-[#0077BB]/30 text-xs font-extrabold rounded-2xl transition font-poppins shrink-0 shadow-xs min-h-[44px]"
                    title="Centro de Ayuda y Guías Web3"
                  >
                    <span className="text-sm">❓</span>
                    <span className="ml-1.5">Ayuda</span>
                  </Link>

                  <UserDropdown />
                </div>

              </div>

            </div>
          </header>

          <main className="min-h-[calc(100vh-180px)]">{children}</main>

          <footer className="bg-white/80 backdrop-blur-md border-t border-[#0077BB]/10 mt-16 pb-12 sm:pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-xs text-[#333333] space-y-2">
              <p className="font-bold text-[#0077BB] font-poppins text-sm">
                BARLO-VENTAS Web3 &copy; 2026 - El Ritmo de tus Compras
              </p>
              <p className="text-[11px] text-[#A9A9A9] font-mono">
                EuroToken (EURT) &bull; Red Ethereum Anvil GCP &bull; Custodia Escrow On-Chain
              </p>
            </div>
          </footer>

          {/* Bottom Navigation for Phones (< 640px) */}
          <BottomNav />
        </Web3PaymentProvider>
      </body>
    </html>
  );
}
