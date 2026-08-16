"use client";

import { useEffect, useState } from "react";
import "./globals.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WalletConnect } from "../components/wallet-connect";
import { useWallet } from "../hooks/useWallet";
import { ethers } from "ethers";

import { CompanyRegistrationModal } from "../components/company-registration-modal";

const ECOMMERCE_ABI = [
  "function getEntityType(address account) view returns (uint8)",
  "function getCompanyByAddress(address _address) view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate))"
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { address, isConnected, provider } = useWallet();
  const [entityType, setEntityType] = useState<number>(0); // 0: Unregistered, 1: Company, 2: Customer, 3: Owner
  const [showCompanyRegModal, setShowCompanyRegModal] = useState<boolean>(false);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const isOwner = address?.toLowerCase() === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

  useEffect(() => {
    async function checkEntityType() {
      if (address) {
        try {
          const rpcProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "https://mcc-foundry-anvil-1095249147821.europe-west1.run.app");
          const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);
          const eType = await contract.getEntityType(address);
          let typeNum = Number(eType);

          // Check company by address fallback
          if (typeNum === 0 && !isOwner) {
            try {
              const comp = await contract.getCompanyByAddress(address);
              if (comp && comp.companyId > BigInt(0)) {
                typeNum = 1;
              }
            } catch {}
          }

          // Check local storage fallback
          if (typeNum === 0 && typeof window !== "undefined") {
            const localReg = localStorage.getItem(`company_reg_${address.toLowerCase()}`);
            if (localReg) {
              typeNum = 1;
            }
          }

          if (isOwner) typeNum = 3;

          setEntityType(typeNum);

          // If connected wallet is unregistered (0), prompt registration modal in place
          if (typeNum === 0) {
            setShowCompanyRegModal(true);
          } else {
            setShowCompanyRegModal(false);
          }
        } catch (e) {
          console.warn("Failed to fetch entity type in layout:", e);
        }
      } else {
        setEntityType(0);
        setShowCompanyRegModal(false);
      }
    }
    checkEntityType();
  }, [address, provider, pathname, router, ecommerceAddress, isOwner]);

  const handleCompanyRegSuccess = () => {
    setEntityType(1);
    setShowCompanyRegModal(false);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const navItems = [
    {
      name: "Dashboard General",
      href: "/",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: "Inventario",
      href: "/inventory",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      name: "Gestión de Envíos",
      href: "/orders",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
    },
    {
      name: "Finanzas",
      href: "/finance",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Auditoría de Actividad",
      href: "/audit",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
  ];

  // Show full layout with sidebar only if wallet is connected and registered as company (1) or owner (3)
  const isAuthorizedMerchant = isConnected && (entityType === 1 || entityType === 3);

  return (
    <html lang="es" className="h-full bg-slate-50">
      <head>
        <title>BARLO-VENTAS Admin Platform</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="h-full bg-slate-50 text-slate-900 flex flex-col md:flex-row antialiased">
        {/* PUBLIC GENERAL HEADER (No sidebar, no section links for public landing page) */}
        {!isAuthorizedMerchant ? (
          <div className="w-full flex flex-col min-h-screen">
            {/* Top Corporate Landing Header */}
            <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/30">
                  B
                </div>
                <div>
                  <h1 className="font-extrabold text-base text-white tracking-tight leading-none">BARLO-VENTAS</h1>
                  <span className="text-[11px] font-semibold text-indigo-400">Plataforma Comercial E-Commerce</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <a
                  href={process.env.NEXT_PUBLIC_WEB_CUSTOMER_URL || "https://mcc-web-customer-1095249147821.europe-west1.run.app"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex px-4 py-2 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 font-bold text-xs rounded-xl border border-emerald-500/30 transition"
                >
                  🛒 Tienda de Clientes
                </a>
                <WalletConnect />
              </div>
            </header>

            {/* Public Landing Body Container */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        ) : (
          /* CONNECTED MERCHANT LAYOUT (Full Sidebar Navigation & Section Links) */
          <>
            {/* Mobile Header */}
            <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-40 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                  aria-label="Abrir Menú"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <span className="font-bold text-base text-slate-900 tracking-tight">E-Com Admin</span>
              </div>
              <WalletConnect />
            </div>

            {/* Backdrop overlay for mobile drawer */}
            {mobileMenuOpen && (
              <div
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
              />
            )}

            {/* Sidebar Navigation */}
            <aside
              className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transform transition-transform duration-200 ease-in-out ${
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
              }`}
            >
              <div>
                {/* Sidebar Brand Header */}
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-600/20">
                    B
                  </div>
                  <div>
                    <h1 className="font-bold text-sm text-slate-900 leading-tight">BARLO-VENTAS</h1>
                    <span className="text-[11px] font-semibold text-indigo-600">Admin Platform</span>
                  </div>
                </div>

                {/* Sidebar Menu Items */}
                <nav className="p-4 space-y-1">
                  <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Navegación Principal</span>
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`sidebar-item ${isActive ? "active" : ""}`}
                      >
                        {item.icon}
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}

                  {/* Owner Super Admin "SISTEMAS" Link */}
                  {isOwner && (
                    <div className="pt-3">
                      <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-purple-600">Control de Plataforma</span>
                      <Link
                        href="/systems"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`sidebar-item text-purple-700 bg-purple-50 hover:bg-purple-100 mt-1 font-bold ${
                          pathname === "/systems" ? "active border-purple-600 text-purple-900" : ""
                        }`}
                      >
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>⚡ SISTEMAS</span>
                      </Link>
                    </div>
                  )}
                </nav>
              </div>

              {/* Sidebar Footer Info */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span>Rol Actual:</span>
                    <span className={`font-bold ${isOwner ? "text-purple-600" : "text-indigo-600"}`}>
                      {isOwner ? "Super Owner Admin" : "Comerciante"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">Chain ID: 31337 (Port 8545)</p>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
              {/* Desktop Top Header Bar */}
              <header className="hidden md:flex bg-white border-b border-slate-200 px-8 py-4 justify-between items-center sticky top-0 z-30 shadow-xs">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-slate-800">Panel de Administración de Plataforma</h2>
                  {isOwner && (
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      Acceso Owner Activo
                    </span>
                  )}
                </div>
                <WalletConnect />
              </header>

              {/* Page Body Container */}
              <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
                {children}
              </main>
            </div>
          </>
        )}

        <CompanyRegistrationModal
          isOpen={showCompanyRegModal && isConnected && !isAuthorizedMerchant}
          onClose={() => setShowCompanyRegModal(false)}
          userAddress={address}
          onSuccess={handleCompanyRegSuccess}
        />
      </body>
    </html>
  );
}
