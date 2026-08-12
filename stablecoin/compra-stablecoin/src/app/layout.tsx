import "./globals.css";

export const metadata = {
  title: "BARLO-VENTAS | Compra & Recarga de EuroToken (EURT) con Stripe",
  description: "Adquiere EuroToken (EURT) 1:1 con tarjeta mediante la pasarela Stripe PCI-DSS para BARLO-VENTAS Web3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#F5F5F0] text-[#333333] font-sans antialiased selection:bg-[#FF8800] selection:text-white bg-wave-pattern min-h-screen flex flex-col">
        {/* TOP NAVIGATION NAVBAR - BARLO-VENTAS AZUL CARIBE BRANDING */}
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
                    BARLO-<span className="text-[#FF8800]">VENTAS</span> <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF5EF] text-[#2E8B57] border border-[#2E8B57]/30 font-mono font-bold">Stripe EURT</span>
                  </span>
                  <span className="text-[10px] text-[#0077BB] block font-semibold">El Ritmo de tus Compras &bull; Adquisición Stablecoin</span>
                </div>
              </a>

              {/* 2. Direct Shortcuts */}
              <div className="flex items-center gap-3">
                <a
                  href="http://localhost:3001"
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-[#0077BB] font-bold text-xs rounded-xl border border-[#0077BB]/20 transition shadow-xs font-poppins"
                >
                  ← Ir a la Tienda (Puerto 3001)
                </a>
              </div>

            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-white/80 backdrop-blur-md border-t border-[#0077BB]/10 py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-[#333333] space-y-2">
            <p className="font-bold text-[#0077BB] font-poppins text-sm">
              BARLO-VENTAS Web3 &copy; 2025 - Pasarela de Recarga EURT (Stripe On-Ramp)
            </p>
            <p className="text-[11px] text-[#A9A9A9] font-mono">
              EuroToken (EURT) &bull; Tasa Paritaria 1 EUR = 1 EURT &bull; Certificación PCI-DSS Compliant
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
