import type { Metadata } from 'next';
import './globals.css';
import { WalletConnect } from '../components/wallet-connect';

export const metadata: Metadata = {
  title: 'E-Commerce Admin',
  description: 'Admin panel for blockchain e-commerce',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">E-Commerce Admin</h1>
            </div>
            <WalletConnect />
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
