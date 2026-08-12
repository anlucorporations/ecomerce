'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useCart } from '../hooks/useCart';
import { ethers } from 'ethers';
import Link from 'next/link';

export function UserDropdown() {
  const { provider, signer, chainId, address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const { items, total } = useCart(provider, signer, chainId, address);

  const [isOpen, setIsOpen] = useState(false);
  const [eurtBalance, setEurtBalance] = useState<string>('0.00');
  const [ethBalance, setEthBalance] = useState<string>('0.0000');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  // Fetch EURT and ETH balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!address) {
        setEurtBalance('0.00');
        setEthBalance('0.0000');
        return;
      }
      try {
        const rpcProvider = provider || new ethers.JsonRpcProvider('http://localhost:8545');

        // Fetch ETH Balance
        const rawEth = await rpcProvider.getBalance(address);
        setEthBalance((Number(rawEth) / 1e18).toFixed(4));

        // Fetch EURT Balance
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
    };

    fetchBalances();
  }, [address, provider, euroTokenAddress, isOpen]);

  // Close dropdown on outside click
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
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition transform active:scale-95 disabled:opacity-50"
      >
        {isConnecting ? 'Conectando Wallet...' : 'Conectar Billetera Web3'}
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Connected User Button Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 shadow-sm transition"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md">
          {address.slice(2, 4).toUpperCase()}
        </div>
        <div className="text-left hidden sm:block">
          <span className="text-xs font-bold text-slate-800 block leading-tight">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <span className="text-[10px] text-emerald-600 font-mono font-semibold">
            €{eurtBalance} EURT
          </span>
        </div>
        <span className="text-xs text-slate-400 font-bold">▾</span>
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* 1. Wallet Status & Address Header */}
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Usuario Conectado</span>
              <span className="font-mono text-xs font-bold text-slate-900">
                {address.slice(0, 10)}...{address.slice(-6)}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
              ● Red Web3
            </span>
          </div>

          {/* 2. Wallet Balances Summary Card (EURT & ETH) */}
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 space-y-2">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
              Saldos en Billetera
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-mono block">EuroToken (EURT)</span>
                <span className="text-sm font-black font-mono text-emerald-600">€{eurtBalance}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-mono block">Ethereum (ETH)</span>
                <span className="text-sm font-black font-mono text-slate-800">{ethBalance} ETH</span>
              </div>
            </div>
          </div>

          {/* 3. Cart Summary Card */}
          <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-rose-800 uppercase block">Resumen del Carrito</span>
              <span className="text-xs font-semibold text-rose-950">
                {items.length} producto(s) &bull; €{formatPrice(total)} EURT
              </span>
            </div>
            <Link
              href="/cart"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
            >
              Ir al Carrito
            </Link>
          </div>

          {/* 4. Exclusive User Navigation Links */}
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 hover:text-slate-900 transition"
            >
              <span>👤 Perfil y Direcciones de Envío</span>
            </Link>

            <Link
              href="/finance"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 hover:text-slate-900 transition"
            >
              <span>📊 Finanzas del Usuario</span>
            </Link>

            <Link
              href="/orders"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 hover:text-slate-900 transition"
            >
              <span>📦 Mis Pedidos y Facturas</span>
            </Link>
          </div>

          {/* 5. Disconnect Button */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                disconnect();
                setIsOpen(false);
              }}
              className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <span>🔌 Desconectar Wallet</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
