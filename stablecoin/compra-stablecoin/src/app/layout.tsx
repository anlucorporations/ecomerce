import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compra EuroToken (EURT) - Stripe On-Ramp",
  description: "Adquiere EuroToken con tarjeta de crédito/débito mediante Stripe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-[#090d16] text-slate-100 flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}
