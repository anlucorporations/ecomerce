'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { ethers } from 'ethers';

const EXPECTED_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '31337');
const OWNER_ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

const ECOMMERCE_ABI = [
  "function getCompanyByAddress(address _address) view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate))"
];

const EUROTOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)"
];

export function WalletConnect() {
  const { wallets, address, chainId, isConnected, isConnecting, connect, disconnect, switchNetwork, error, provider } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWallets, setShowWallets] = useState(false);
  const [switching, setSwitching] = useState(false);

  const [companyName, setCompanyName] = useState<string>("");
  const [ethBalance, setEthBalance] = useState<string>("0.0000");
  const [eurtBalance, setEurtBalance] = useState<string>("0.0000");

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const isWrongNetwork = isConnected && chainId !== EXPECTED_CHAIN_ID;
  const isOwner = address?.toLowerCase() === OWNER_ADDRESS;

  useEffect(() => {
    async function fetchWalletDetails() {
      if (!address) return;
      try {
        const rpcProvider = provider || new ethers.JsonRpcProvider("http://localhost:8545");

        // 1. Fetch ETH Balance
        const rawEth = await rpcProvider.getBalance(address);
        setEthBalance(parseFloat(ethers.formatEther(rawEth)).toFixed(4));

        // 2. Fetch EURT Balance
        try {
          const euroToken = new ethers.Contract(euroTokenAddress, EUROTOKEN_ABI, rpcProvider);
          const rawEurt = await euroToken.balanceOf(address);
          setEurtBalance((Number(rawEurt) / 1000000).toFixed(2));
        } catch (e) {
          console.warn("Could not fetch EURT balance in admin navbar:", e);
          setEurtBalance("0.00");
        }

        // 3. Fetch Company Name
        if (isOwner) {
          setCompanyName("⚡ Super Admin Owner");
        } else {
          try {
            const ecommerce = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);
            const comp = await ecommerce.getCompanyByAddress(address);
            if (comp && comp.companyId > BigInt(0) && comp.name) {
              setCompanyName(comp.name);
            } else {
              setCompanyName("");
            }
          } catch {
            setCompanyName("");
          }
        }
      } catch (err) {
        console.error("Error loading wallet dropdown details:", err);
      }
    }

    if (isConnected && address) {
      fetchWalletDetails();
      const interval = setInterval(fetchWalletDetails, 4000);
      return () => clearInterval(interval);
    }
  }, [address, isConnected, provider, isOwner]);

  const handleSwitchNetwork = async () => {
    try {
      setSwitching(true);
      await switchNetwork(EXPECTED_CHAIN_ID);
    } catch (err) {
      console.error('Failed to switch network:', err);
    } finally {
      setSwitching(false);
    }
  };

  if (isConnected && address) {
    const displayLabel = companyName || `Wallet ${address.slice(0, 6)}...${address.slice(-4)}`;

    return (
      <div className="relative">
        {/* Closed Button Header (Displays Company Name) */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2.5 bg-white border border-slate-200 hover:border-indigo-400 rounded-2xl px-3.5 py-2 shadow-xs transition cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-left">
            <span className="text-xs font-extrabold text-slate-900 block leading-tight max-w-[160px] sm:max-w-[220px] truncate">
              {displayLabel}
            </span>
            <span className="text-[10px] font-mono text-slate-400 block">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 min-w-[280px] space-y-4">
            {/* Header Info */}
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Comercio Conectado</span>
              <h4 className="text-sm font-extrabold text-slate-900 truncate">{displayLabel}</h4>
              <p className="font-mono text-[11px] text-slate-500 truncate mt-0.5">{address}</p>
            </div>

            {/* Balances Card */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Billetera & Criptoactivos</span>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-semibold">Balance ETH:</span>
                <span className="font-mono font-bold text-slate-900">{ethBalance} ETH</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-semibold">Balance Stablecoin:</span>
                <span className="font-mono font-extrabold text-emerald-600">€{eurtBalance} EURT</span>
              </div>
            </div>

            {/* Action: Recarga EURT con Stripe */}
            <a
              href="http://localhost:3003"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 group"
            >
              <span>💳 Recargar EURT (Stripe)</span>
              <span className="group-hover:translate-x-0.5 transition">→</span>
            </a>

            {/* Network switch / disconnect */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Red: Anvil 31337</span>
              <button
                onClick={() => {
                  disconnect();
                  setShowDropdown(false);
                }}
                className="text-rose-600 hover:text-rose-700 font-bold hover:underline"
              >
                Desconectar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowWallets(!showWallets)}
        disabled={isConnecting}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
        {isConnecting ? 'Conectando...' : 'Conectar Wallet Admin'}
      </button>

      {showWallets && wallets.length > 0 && (
        <div className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 min-w-[220px]">
          <h3 className="text-xs font-bold text-slate-700 mb-2 px-2">Seleccionar Billetera</h3>
          <div className="space-y-1">
            {wallets.map((wallet) => (
              <button
                key={wallet.uuid}
                onClick={() => {
                  connect(wallet);
                  setShowWallets(false);
                }}
                className="flex items-center gap-2.5 w-full p-2 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-800 transition"
              >
                {wallet.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={wallet.icon} alt={wallet.name} className="w-5 h-5 rounded-md" />
                )}
                <span>{wallet.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
