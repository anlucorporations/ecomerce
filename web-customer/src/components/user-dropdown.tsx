'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useCart } from '../hooks/useCart';
import { ethers } from 'ethers';
import Link from 'next/link';
import { StripeTopupModal } from './stripe-topup-modal';

export function UserDropdown() {
  const { provider, address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const { items, total } = useCart(provider, null, null, address);

  const [isOpen, setIsOpen] = useState(false);
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [eurtBalance, setEurtBalance] = useState<string>('0.00');
  const [ethBalance, setEthBalance] = useState<string>('0.0000');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  const fetchBalances = useCallback(async () => {
    if (!address) {
      setEurtBalance('0.00');
      setEthBalance('0.0000');
      return;
    }
    try {
      const rpcProvider = provider || new ethers.JsonRpcProvider('http://localhost:8545');

      const rawEth = await rpcProvider.getBalance(address);
      setEthBalance((Number(rawEth) / 1e18).toFixed(4));

      const tokenContract = new ethers.Contract(
        euroTokenAddress,
        ['function balanceOf(address account) view returns (uint256)'],
        rpcProvider
      );
      const rawEurt = await tokenContract.balanceOf(address);
      setEurtBalance((Number(rawEurt) / 1e6).toFixed(2));
    } catch (e) {
      console.warn('Error fetching user balances:', e);
    }
  }, [address, provider, euroTokenAddress]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatPrice = (price: bigint) => {
    return (Number(price) / 1_000_000).toFixed(2);
  };

  if (!isConnected || !address) {
    return (
      <button
        onClick={() => connect()}
        disabled={isConnecting}
        className="btn-cacao-pulse text-xs text-white font-bold transition disabled:opacity-50"
      >
        {isConnecting ? 'Conectando Wallet...' : 'Conectar Billetera Web3'}
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-50 border border-[#0077BB]/20 shadow-sm transition"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0077BB] to-[#FF8800] flex items-center justify-center text-white font-black text-xs shadow-md font-poppins">
          {address.slice(2, 4).toUpperCase()}
        </div>
        <div className="text-left hidden sm:block">
          <span className="text-xs font-bold text-[#333333] block leading-tight font-poppins">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <span className="text-[10px] text-[#2E8B57] font-mono font-bold">
            €{eurtBalance} EURT
          </span>
        </div>
        <span className="text-xs text-[#0077BB] font-bold">▾</span>
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 glass-card p-4 z-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header */}
          <div className="border-b border-[#0077BB]/10 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#0077BB] uppercase tracking-wider block font-poppins">
                Usuario BARLO-VENTAS
              </span>
              <span className="font-mono text-xs font-bold text-[#333333]">
                {address.slice(0, 10)}...{address.slice(-6)}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF5EF] text-[#2E8B57] border border-[#2E8B57]/30 font-poppins">
              ● Red Web3
            </span>
          </div>

          {/* Balances Card */}
          <div className="bg-white/80 border border-[#0077BB]/15 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-[#0077BB] block tracking-wider font-poppins">
                Saldos en Billetera
              </span>
              <a
                href="http://localhost:3003"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-bold text-[#FF8800] hover:underline font-poppins flex items-center gap-0.5"
              >
                + Recargar ↗
              </a>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#EAF5EF] p-2.5 rounded-lg border border-[#2E8B57]/20">
                <span className="text-[10px] text-[#2E8B57] font-mono block font-semibold">EuroToken (EURT)</span>
                <span className="text-sm font-black font-mono text-[#2E8B57]">€{eurtBalance}</span>
              </div>
              <div className="bg-[#E6F4FA] p-2.5 rounded-lg border border-[#0077BB]/20">
                <span className="text-[10px] text-[#0077BB] font-mono block font-semibold">Ethereum (ETH)</span>
                <span className="text-sm font-black font-mono text-[#0077BB]">{ethBalance} ETH</span>
              </div>
            </div>

            {/* Direct Stripe Button in Dropdown (New Tab) */}
            <a
              href="http://localhost:3003"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 bg-[#FFF3E5] hover:bg-[#FFE8CC] text-[#FF8800] border border-[#FF8800]/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 font-poppins"
            >
              <span>💳</span> Recargar EURT con Stripe (Puerto 3003) ↗
            </a>
          </div>

          {/* Cart Summary */}
          <div className="bg-white/80 border border-[#0077BB]/15 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#0077BB] uppercase block font-poppins">Resumen del Carrito</span>
              <span className="text-xs font-semibold text-[#333333]">
                {items.length} producto(s) &bull; €{formatPrice(total)} EURT
              </span>
            </div>
            <Link
              href="/cart"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 bg-[#FF8800] hover:bg-[#E07700] text-white rounded-lg text-xs font-bold shadow-sm transition font-poppins"
            >
              Ir al Carrito
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1 pt-1 border-t border-[#0077BB]/10">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#E6F4FA] text-xs font-bold text-[#333333] hover:text-[#0077BB] transition font-poppins"
            >
              <span>👤 Perfil y Direcciones de Envío</span>
            </Link>

            <Link
              href="/finance"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#E6F4FA] text-xs font-bold text-[#333333] hover:text-[#0077BB] transition font-poppins"
            >
              <span>📊 Finanzas del Usuario</span>
            </Link>

            <Link
              href="/orders"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#E6F4FA] text-xs font-bold text-[#333333] hover:text-[#0077BB] transition font-poppins"
            >
              <span>📦 Mis Pedidos y Facturas</span>
            </Link>
          </div>

          {/* Disconnect Button */}
          <div className="pt-2 border-t border-[#0077BB]/10">
            <button
              onClick={() => {
                disconnect();
                setIsOpen(false);
              }}
              className="w-full py-2 bg-[#FCEAEB] hover:bg-rose-100 text-[#CC2233] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 font-poppins"
            >
              <span>🔌 Desconectar Wallet</span>
            </button>
          </div>

        </div>
      )}

      {/* STRIPE TOP-UP MODAL */}
      <StripeTopupModal
        isOpen={isStripeModalOpen}
        onClose={() => setIsStripeModalOpen(false)}
        userAddress={address}
        onSuccess={fetchBalances}
      />
    </div>
  );
}
