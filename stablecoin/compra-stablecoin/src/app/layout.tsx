import "./globals.css";

export const metadata = {
  title: "BARLO-VENTAS | Compra de EuroToken (EURT) - Stripe On-Ramp",
  description: "Plataforma de e-commerce y delivery descentralizado BARLO-VENTAS - Adquisición de EURT",
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
      <body className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen flex flex-col selection:bg-[#FF8800] selection:text-white">
        
        {/* STANDALONE MINIMALIST CONTAINER - NO HEADER NAVBAR */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {children}
        </main>

        <footer className="bg-white border-t border-slate-200 py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 space-y-1">
            <p className="font-bold text-[#0077BB] font-poppins">
              BARLO-VENTAS Web3 &copy; 2025 - El Ritmo de tus Compras
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              EuroToken (EURT) &bull; Red Ethereum Local &bull; Adquisición Stripe PCI-DSS
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
