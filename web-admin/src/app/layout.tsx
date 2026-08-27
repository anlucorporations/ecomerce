"use client";

import { useEffect, useState, useCallback } from "react";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { WalletAssistant } from "../components/wallet-assistant";
import { useWallet } from "../hooks/useWallet";
import { detectWallets } from "../lib/wallet/provider";
import { Contract, JsonRpcProvider, formatEther } from "ethers";

const ECOMMERCE_ABI = [
  "function getEntityType(address account) view returns (uint8)",
  "function isSystemsAdmin(address account) view returns (bool)",
  "function getCompanyByAddress(address _address) view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate))"
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantVisible, setAssistantVisible] = useState(true);
  const [companyName, setCompanyName] = useState<string>("");
  const [userSectionExpanded, setUserSectionExpanded] = useState(true);
  const [ethBalance, setEthBalance] = useState<string>("0.0000");
  const [eurtBalance, setEurtBalance] = useState<string>("0.00");
  const [copiedAddress, setCopiedAddress] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const { address, isConnected, isConnecting, provider, connect, disconnect } = useWallet();

  // Conectar wallet detectada (web-admin exige walletInfo de mipd)
  const handleConnectWallet = async () => {
    try {
      const detected = await detectWallets();
      if (detected.length === 0) {
        alert("No se detectó ninguna billetera Web3. Instale MetaMask o Rabby y recargue la página.");
        return;
      }
      await connect(detected[0]);
    } catch (e: any) {
      console.warn("Error conectando wallet:", e);
    }
  };
  const [entityType, setEntityType] = useState<number>(0); // 0: Unregistered, 1: Company, 2: Customer, 3: Owner

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const isOwner = entityType === 3;

  // Initialize sidebar collapsed state & assistant preferences
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCollapse = localStorage.getItem("admin_sidebar_collapsed");
      if (savedCollapse !== null) {
        setSidebarCollapsed(savedCollapse === "true");
      }
      const savedAssistant = localStorage.getItem("barlo_wallet_assistant_enabled");
      if (savedAssistant !== null) {
        setAssistantVisible(savedAssistant === "true");
      }
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  const toggleAssistant = (enabled: boolean) => {
    setAssistantVisible(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("barlo_wallet_assistant_enabled", String(enabled));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const fetchUserData = useCallback(async () => {
    if (!address) {
      setEthBalance("0.0000");
      setEurtBalance("0.00");
      setCompanyName("");
      return;
    }

    try {
      const rpcProvider = provider || new JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");

      // 1. Fetch ETH Balance
      try {
        const rawEth = await rpcProvider.getBalance(address);
        setEthBalance(parseFloat(formatEther(rawEth)).toFixed(4));
      } catch {}

      // 2. Fetch EURT Balance
      try {
        const tokenContract = new Contract(
          euroTokenAddress,
          ["function balanceOf(address account) view returns (uint256)"],
          rpcProvider
        );
        const rawEurt = await tokenContract.balanceOf(address);
        setEurtBalance((Number(rawEurt) / 1e6).toFixed(2));
      } catch {}

      // 3. Fetch Entity Type & Company Details
      try {
        const contract = new Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);
        const eType = await contract.getEntityType(address);
        let typeNum = Number(eType);

        if (typeNum === 0) {
          try {
            const comp = await contract.getCompanyByAddress(address);
            if (comp && comp.companyId > BigInt(0)) {
              typeNum = 1;
              if (comp.name) setCompanyName(comp.name);
            }
          } catch {}
        } else if (typeNum === 1) {
          try {
            const comp = await contract.getCompanyByAddress(address);
            if (comp && comp.name) setCompanyName(comp.name);
          } catch {}
        } else if (typeNum === 3) {
          setCompanyName("Super Admin Owner");
        }

        setEntityType(typeNum);

        if (typeNum === 0 && pathname !== "/companies" && pathname !== "/help") {
          router.push("/companies");
        }
      } catch (err) {
        console.warn("Entity fetch warning:", err);
      }
    } catch (e) {
      console.warn("User data fetch error in admin layout:", e);
    }
  }, [address, provider, pathname, router, ecommerceAddress, euroTokenAddress]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const navItems = [
    {
      name: "Dashboard General",
      href: "/",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: "Inventario",
      href: "/inventory",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      name: "Gestión de Envíos",
      href: "/orders",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
    },
    {
      name: "Finanzas",
      href: "/finance",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Auditoría de Actividad",
      href: "/audit",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      name: "Centro de Ayuda",
      href: "/help",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const isAuthorizedMerchant = isConnected && (entityType === 1 || entityType === 3);

  return (
    <html lang="es" className="h-full bg-slate-50">
      <head>
        <title>BARLO-VENTAS Admin Platform</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
        <meta name="theme-color" content="#0077BB" />
      </head>
      <body className="h-full bg-slate-50 text-slate-900 flex flex-col md:flex-row antialiased">
        
        {/* PUBLIC GENERAL HEADER (No sidebar if wallet is not connected as company/owner) */}
        {!isAuthorizedMerchant ? (
          <div className="w-full flex flex-col min-h-screen">
            <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3.5 flex justify-between items-center sticky top-0 z-50 shadow-md">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.svg"
                  alt="BARLO-VENTAS"
                  width={110}
                  height={36}
                  className="h-8 w-auto object-contain brightness-125"
                  priority
                />
                <span className="hidden sm:inline text-xs font-bold text-slate-400 border-l border-slate-700 pl-3">
                  Consola Administrativa Web3
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {assistantVisible && (
                  <button
                    onClick={() => setIsAssistantOpen(true)}
                    className="px-3.5 py-2 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-bold text-xs rounded-xl border border-amber-500/30 transition flex items-center gap-1.5 min-h-[44px]"
                    title="Asistente Virtual Web3"
                  >
                    <span className="text-sm">🤖</span>
                    <span className="hidden sm:inline">Asistente</span>
                  </button>
                )}
                
                {/* Enhanced Top Navbar Help Button */}
                <Link
                  href="/help"
                  className="px-3.5 py-2 bg-[#0077BB]/20 hover:bg-[#0077BB]/30 text-sky-300 border border-[#0077BB]/40 font-bold text-xs rounded-xl transition flex items-center gap-1.5 min-h-[44px] shadow-xs"
                  title="Centro de Ayuda y Guías Web3"
                >
                  <span className="text-sm">❓</span>
                  <span className="hidden sm:inline">Centro de Ayuda</span>
                </Link>

                <button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-[#0077BB] hover:bg-[#005F96] text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 min-h-[44px]"
                >
                  {isConnecting ? "Conectando..." : "Conectar Wallet"}
                </button>
              </div>
            </header>

            {/* Warning if wallet is customer */}
            {isConnected && entityType === 2 && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 text-amber-900 text-xs flex flex-col sm:flex-row justify-between items-center gap-2">
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-base">⚠️</span>
                  <span>
                    <strong>Billetera Inscrita como Cliente:</strong> La billetera conectada (<code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded text-amber-900">{address?.slice(0, 6)}...{address?.slice(-4)}</code>) está registrada como Comprador. Utilice la consola administrativa con una billetera de Empresa/Comercio.
                  </span>
                </div>
                <a
                  href={process.env.NEXT_PUBLIC_WEB_CUSTOMER_URL || "https://mcc-web-customer-1095249147821.europe-west1.run.app"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition shrink-0"
                >
                  🛒 Ir a Tienda de Clientes →
                </a>
              </div>
            )}

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        ) : (
          /* CONNECTED MERCHANT LAYOUT (Sidebar with User Section + Clean Top Header) */
          <>
            {/* Mobile Header (< md) */}
            <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-40 shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Abrir Menú"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <Image
                  src="/logo.svg"
                  alt="BARLO-VENTAS"
                  width={100}
                  height={32}
                  className="h-7 w-auto object-contain"
                  priority
                />
              </div>
              <div className="flex items-center gap-2">
                {assistantVisible && (
                  <button
                    onClick={() => setIsAssistantOpen(true)}
                    className="p-2 text-amber-700 bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold min-h-[40px] min-w-[40px] flex items-center justify-center"
                    title="Asistente Virtual"
                  >
                    🤖
                  </button>
                )}
                <Link
                  href="/help"
                  className="p-2 bg-[#E6F4FA] text-[#0077BB] border border-[#0077BB]/30 rounded-xl text-xs font-bold min-h-[40px] min-w-[40px] flex items-center justify-center"
                  title="Centro de Ayuda"
                >
                  ❓
                </Link>
              </div>
            </div>

            {/* Mobile Drawer Backdrop */}
            {mobileMenuOpen && (
              <div
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
              />
            )}

            {/* Sidebar Navigation with Full USER Section */}
            <aside
              className={`fixed md:static inset-y-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col justify-between transform transition-all duration-200 ease-in-out overflow-y-auto ${
                mobileMenuOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"
              } ${!mobileMenuOpen && (sidebarCollapsed ? "md:w-20" : "md:w-72")}`}
            >
              <div className="flex flex-col">
                {/* 1. Sidebar Brand Header & Collapse Toggle */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className={`flex items-center gap-2 overflow-hidden ${sidebarCollapsed ? "md:hidden" : ""}`}>
                    <Image
                      src="/logo.svg"
                      alt="BARLO-VENTAS"
                      width={125}
                      height={38}
                      className="h-8 w-auto object-contain"
                      priority
                    />
                  </div>
                  
                  {/* Desktop Collapse / Expand Button */}
                  <button
                    onClick={toggleSidebar}
                    className="hidden md:flex p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition items-center justify-center mx-auto min-h-[40px] min-w-[40px]"
                    title={sidebarCollapsed ? "Expandir Barra Lateral" : "Contraer Barra Lateral"}
                    aria-label="Alternar barra lateral"
                  >
                    <svg className="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {sidebarCollapsed ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      )}
                    </svg>
                  </button>
                </div>

                {/* 2. DEDICATED USER SECTION (TRANSFERRED DROPDOWN MENU) */}
                <div className="p-3 border-b border-slate-200/80 bg-slate-50/70">
                  
                  {/* Collapsed Icon-only Avatar view */}
                  {sidebarCollapsed ? (
                    <div className="hidden md:flex flex-col items-center py-2 space-y-2">
                      <div
                        className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0077BB] to-[#FF8800] text-white flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer"
                        title={`${companyName || "Comercio"} (${address?.slice(0, 6)}...${address?.slice(-4)})`}
                        onClick={toggleSidebar}
                      >
                        {address?.slice(2, 4).toUpperCase()}
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" title="Conectado On-Chain" />
                    </div>
                  ) : (
                    /* Expanded Full User & Wallet Card */
                    <div className="space-y-3">
                      {/* User Header Accordion Trigger */}
                      <button
                        onClick={() => setUserSectionExpanded(!userSectionExpanded)}
                        className="w-full text-left p-2.5 rounded-2xl bg-white hover:bg-slate-100/80 border border-slate-200 transition shadow-xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0077BB] to-[#FF8800] text-white flex items-center justify-center font-black text-xs shadow-xs font-poppins">
                              {address?.slice(2, 4).toUpperCase()}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-[#0077BB] uppercase tracking-wider block font-poppins">
                              Cuenta & Perfil
                            </span>
                            <h4 className="text-xs font-black text-slate-800 truncate font-poppins">
                              {companyName || (isOwner ? "Super Owner Admin" : "Comercio Registrado")}
                            </h4>
                          </div>
                        </div>
                        <span className={`text-xs text-slate-400 font-bold transition-transform ${userSectionExpanded ? "rotate-180" : ""}`}>
                          ▾
                        </span>
                      </button>

                      {/* Expanded User Details & Controls */}
                      {userSectionExpanded && (
                        <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 animate-in fade-in duration-150">
                          
                          {/* Role & Address with Copy */}
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-poppins ${
                              isOwner ? "bg-purple-100 text-purple-800 border border-purple-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}>
                              {isOwner ? "⚡ Super Owner" : "✓ Empresa Verificada"}
                            </span>
                            
                            <button
                              onClick={() => copyToClipboard(address || "")}
                              className="font-mono text-[10px] text-slate-500 hover:text-[#0077BB] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition flex items-center gap-1 shrink-0"
                              title="Copiar dirección pública"
                            >
                              <span>{copiedAddress ? "✓ Copiado" : `${address?.slice(0, 6)}...${address?.slice(-4)}`}</span>
                              <span>📋</span>
                            </button>
                          </div>

                          {/* Balances Card */}
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-2">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-500 font-medium">EuroTokens (EURT):</span>
                              <span className="font-mono font-black text-emerald-600 text-xs">€{eurtBalance}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-500 font-medium">Gas Ethereum (ETH):</span>
                              <span className="font-mono font-bold text-slate-700 text-xs">{ethBalance} ETH</span>
                            </div>
                          </div>

                          {/* Action Button: Recarga EURT con Stripe */}
                          <Link
                            href="/topup"
                            onClick={() => setMobileMenuOpen(false)}
                            className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 font-poppins"
                          >
                            <span>💳 Recargar EURT (Stripe) ➔</span>
                          </Link>

                          {/* Asistente Virtual Web3 Toggle */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 font-poppins">
                              <span>🤖</span> Asistente Web3
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={assistantVisible}
                                onChange={(e) => toggleAssistant(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#0077BB]"></div>
                            </label>
                          </div>

                          {/* Disconnect Button */}
                          <div className="pt-2 border-t border-slate-100">
                            <button
                              onClick={() => {
                                disconnect();
                                setMobileMenuOpen(false);
                              }}
                              className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 font-poppins"
                            >
                              <span>🔌 Desconectar Wallet</span>
                            </button>
                          </div>

                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Sidebar Navigation Menu Items */}
                <nav className="p-3 space-y-1">
                  <span className={`px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 ${sidebarCollapsed ? "md:hidden" : ""}`}>
                    Navegación del Panel
                  </span>
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        title={sidebarCollapsed ? item.name : undefined}
                        className={`sidebar-item flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition min-h-[44px] ${
                          isActive
                            ? "bg-[#0077BB] text-white shadow-md shadow-[#0077BB]/20 font-poppins"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        } ${sidebarCollapsed ? "md:justify-center md:px-0" : ""}`}
                      >
                        {item.icon}
                        <span className={`${sidebarCollapsed ? "md:hidden" : ""}`}>{item.name}</span>
                      </Link>
                    );
                  })}

                  {/* Owner Super Admin "SISTEMAS" Link */}
                  {isOwner && (
                    <div className="pt-2">
                      <Link
                        href="/systems"
                        onClick={() => setMobileMenuOpen(false)}
                        title={sidebarCollapsed ? "Control de Sistemas" : undefined}
                        className={`sidebar-item flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition min-h-[44px] ${
                          pathname === "/systems" ? "border border-purple-400 ring-2 ring-purple-300/40" : ""
                        } ${sidebarCollapsed ? "md:justify-center md:px-0" : ""}`}
                      >
                        <svg className="w-5 h-5 text-purple-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className={`${sidebarCollapsed ? "md:hidden" : ""}`}>⚡ SISTEMAS</span>
                      </Link>
                    </div>
                  )}
                </nav>
              </div>

              {/* Sidebar Footer Info */}
              <div className={`p-3 border-t border-slate-100 bg-slate-50/50 ${sidebarCollapsed ? "md:hidden" : ""}`}>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-0.5">
                    <span className="text-[11px]">Red EVM:</span>
                    <span className="font-bold text-emerald-600 text-[11px]">Anvil On-Chain</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono truncate">Chain ID: 31337 (Puerto 8545)</p>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
              
              {/* Desktop Top Header Bar (Cleaned of dropdown) */}
              <header className="hidden md:flex bg-white border-b border-slate-200 px-6 lg:px-8 py-3.5 justify-between items-center sticky top-0 z-30 shadow-xs">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-extrabold text-slate-800 font-poppins">
                    Consola de Administración
                  </h2>
                  {isOwner ? (
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      Super Owner Activo
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Comercio On-Chain
                    </span>
                  )}
                </div>

                {/* Right Header: Assistant & Modified Help Button */}
                <div className="flex items-center gap-2.5">
                  {assistantVisible && (
                    <button
                      onClick={() => setIsAssistantOpen(true)}
                      className="px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 border border-amber-500/30 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-xs font-poppins min-h-[44px]"
                      title="Asistente Virtual Web3 (Guía y Configuración de Red)"
                    >
                      <span className="text-sm">🤖</span>
                      <span>Asistente Virtual</span>
                    </button>
                  )}

                  {/* 1. MODIFIED TOP NAVBAR HELP BUTTON */}
                  <Link
                    href="/help"
                    className="px-4 py-2 bg-[#E6F4FA] hover:bg-[#D4EDF7] text-[#0077BB] border border-[#0077BB]/30 text-xs font-extrabold rounded-xl transition flex items-center gap-2 shadow-xs font-poppins min-h-[44px]"
                    title="Centro de Ayuda, Guías y Documentación Web3"
                  >
                    <span className="text-base">❓</span>
                    <span>Centro de Ayuda</span>
                    <span className="px-1.5 py-0.2 bg-[#0077BB]/15 text-[#0077BB] rounded text-[10px] font-mono font-bold">
                      Docs
                    </span>
                  </Link>
                </div>
              </header>

              {/* Page Body Container */}
              <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
                {children}
              </main>
            </div>
          </>
        )}

        {/* WALLET ASSISTANT MODAL */}
        <WalletAssistant
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
        />
      </body>
    </html>
  );
}
