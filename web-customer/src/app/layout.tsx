import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { WalletConnect } from '../components/wallet-connect';

export const metadata: Metadata = {
  title: 'E-Commerce Store',
  description: 'Blockchain-powered e-commerce',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-8">
                <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
                  E-Shop
                </Link>
                <nav className="hidden md:flex gap-6 items-center">
                  <Link href="/products" className="text-gray-900 hover:text-blue-600 font-medium transition-colors">
                    Productos
                  </Link>
                  <Link href="/cart" className="text-gray-900 hover:text-blue-600 font-medium transition-colors">
                    Carrito
                  </Link>
                  <Link href="/orders" className="text-gray-900 hover:text-blue-600 font-medium transition-colors">
                    Mis Pedidos
                  </Link>
                  <a
                    href="http://localhost:3003"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1"
                  >
                    <span>💳 Comprar EURT (Stripe)</span>
                  </a>
                </nav>
              </div>
              <WalletConnect />
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="bg-gray-100 border-t mt-16">
          <div className="container mx-auto px-4 py-8 text-center text-gray-600">
            <p>&copy; 2025 Blockchain E-Commerce. Powered by Ethereum & EURT.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
