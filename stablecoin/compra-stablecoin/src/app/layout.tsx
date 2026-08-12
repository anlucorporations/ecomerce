'use client';

import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <title>BARLO-VENTAS | Compra de EuroToken (EURT) - Stripe On-Ramp</title>
        <meta name="description" content="Plataforma de e-commerce y delivery descentralizado BARLO-VENTAS - Adquisición de EURT" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen flex flex-col selection:bg-[#FF8800] selection:text-white">
        
        {/* TOP NAVIGATION NAVBAR - EXACT WEB CUSTOMER NAVBAR HEADER */}
        <header className="border-b border-white/60 bg-white/85 backdrop-blur-md sticky top-0 z-50 shadow-sm glass-panel">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between gap-4">
              
              {/* 1. BARLO-VENTAS Platform Logo */}
              <a href="http://localhost:3001" className="flex items-center gap-2.5 group shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0077BB] via-[#005F96] to-[#FF8800] flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#0077BB]/25 group-hover:scale-105 transition-transform">
                  B
                </div>
                <div className="hidden sm:block">
                  <span className="text-xl font-black tracking-tight text-[#333333] group-hover:text-[#0077BB] transition-colors font-poppins">
                    BARLO-<span className="text-[#FF8800]">VENTAS</span> <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E6F4FA] text-[#0077BB] border border-[#0077BB]/30 font-mono font-bold">Web3</span>
                  </span>
                  <span className="text-[10px] text-[#0077BB] block font-semibold">El Ritmo de tus Compras</span>
                </div>
              </a>

              {/* 2. Centered Intuitive Search Bar (Exact Web Customer Style) */}
              <div className="flex-1 max-w-xl mx-2 sm:mx-6 relative">
                <input
                  type="text"
                  placeholder="¿Qué producto o empresa buscas en BARLO-VENTAS? (Ir al catálogo...)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      if (target.value.trim()) {
                        window.location.href = `http://localhost:3001/?search=${encodeURIComponent(target.value.trim())}#catalog`;
                      }
                    }
                  }}
                  className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-[#0077BB]/20 rounded-2xl px-4 py-2.5 pl-10 text-xs sm:text-sm text-[#333333] placeholder-[#A9A9A9] focus:outline-none focus:border-[#0077BB] focus:ring-2 focus:ring-[#0077BB]/20 transition shadow-inner"
                />
                <span className="absolute left-3.5 top-2.5 text-[#0077BB] text-sm pointer-events-none">🔍</span>
              </div>

              {/* 3. Navigation Shortcuts & Web Customer Style Direct Menu */}
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="http://localhost:3001"
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-[#333333] hover:text-[#0077BB] font-bold text-xs rounded-xl border border-[#0077BB]/15 transition font-poppins hidden md:inline-flex items-center gap-1.5"
                >
                  <span>🏪 Tienda (3001)</span>
                </a>

                <a
                  href="http://localhost:3001/orders"
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-[#333333] hover:text-[#0077BB] font-bold text-xs rounded-xl border border-[#0077BB]/15 transition font-poppins hidden sm:inline-flex items-center gap-1.5"
                >
                  <span>📦 Pedidos</span>
                </a>

                <a
                  href="http://localhost:3001/finance"
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-[#333333] hover:text-[#0077BB] font-bold text-xs rounded-xl border border-[#0077BB]/15 transition font-poppins hidden lg:inline-flex items-center gap-1.5"
                >
                  <span>📊 Finanzas</span>
                </a>

                <a
                  href="http://localhost:3003"
                  className="px-3.5 py-2 bg-[#FF8800] text-white font-black text-xs rounded-xl shadow-md transition font-poppins flex items-center gap-1.5"
                >
                  <span>💳 Recarga EURT</span>
                </a>
              </div>

            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="bg-white border-t border-slate-200 py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 space-y-1">
            <p className="font-bold text-[#0077BB] font-poppins">
              BARLO-VENTAS Web3 &copy; 2025 - El Ritmo de tus Compras
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              EuroToken (EURT) &bull; Red Ethereum Local &bull; Contratos Inteligentes Auditados
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
