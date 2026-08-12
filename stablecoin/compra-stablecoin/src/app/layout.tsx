import "./globals.css";

export const metadata = {
  title: "BARLO-VENTAS Admin | Compra de EuroToken (EURT) - Stripe",
  description: "Módulo de Adquisición y Emisión de EuroToken (EURT) con Stripe PCI-DSS",
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen flex flex-col">
        {/* TOP NAVIGATION NAVBAR - WEB ADMIN STYLE */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
            <div className="flex items-center justify-between gap-4">
              
              {/* 1. Web Admin Branding Logo */}
              <a href="http://localhost:3000" className="flex items-center gap-3 group shrink-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-xs group-hover:bg-indigo-700 transition">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900 font-poppins">
                      BARLO-VENTAS <span className="text-indigo-600 font-extrabold">Admin</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Stripe EURT
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block font-medium">
                    Consola de Adquisición & Emisión Stablecoin
                  </span>
                </div>
              </a>

              {/* 2. Direct Shortcuts */}
              <div className="flex items-center gap-3">
                <a
                  href="http://localhost:3000/finance"
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  📊 Finanzas Admin (Puerto 3000)
                </a>
                <a
                  href="http://localhost:3001"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  🛒 Tienda Customer (Puerto 3001)
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
            <p className="font-bold text-slate-700 font-poppins">
              BARLO-VENTAS Admin &copy; 2025 - Consola de Recarga & Emisión EURT (Stripe On-Ramp)
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              EuroToken (EURT) &bull; Tasa Paritaria 1 EUR = 1 EURT &bull; Certificación PCI-DSS Compliant
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
