'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { Elements } from '@stripe/react-stripe-js';
import { useWallet } from '@/hooks/useWallet';
import { detectWallets } from '@/lib/wallet/provider';
import { TopupForm, stripePromise } from '@/components/stripe-topup-modal';

export default function TopupPage() {
  const { wallets, address, isConnected, connect } = useWallet();
  const [eurtBalance, setEurtBalance] = useState<string>('0.00');
  const [ethBalance, setEthBalance] = useState<string>('0.0000');
  const [loadingBalance, setLoadingBalance] = useState(false);

  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  const handleConnect = async () => {
    const detected = wallets && wallets.length > 0 ? wallets : await detectWallets();
    if (detected.length === 0) {
      alert('No se detectó ninguna billetera Web3. Instale MetaMask o Rabby y recargue la página.');
      return;
    }
    await connect(detected[0]);
  };

  const fetchBalances = useCallback(async () => {
    if (!address) return;
    try {
      setLoadingBalance(true);
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545');
      const eth = await provider.getBalance(address);
      setEthBalance(parseFloat(ethers.formatEther(eth)).toFixed(4));
      try {
        const token = new ethers.Contract(euroTokenAddress, ['function balanceOf(address) view returns (uint256)'], provider);
        const bal = await token.balanceOf(address);
        setEurtBalance((Number(bal) / 1e6).toFixed(2));
      } catch {
        setEurtBalance('0.00');
      }
    } catch (e) {
      console.warn('Error obteniendo saldos:', e);
    } finally {
      setLoadingBalance(false);
    }
  }, [address, euroTokenAddress]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">

        {/* Encabezado */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>💶 Recargar EURT</span>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                Stripe PCI-DSS
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Adquiera EuroToken (EURT) 1:1 con tarjeta a través del servicio de compra de BARLO-VENTAS.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs font-bold px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl border border-slate-700 transition"
          >
            ← Volver al Dashboard
          </Link>
        </div>

        {/* Estado de la billetera */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400 font-mono">
              {isConnected && address ? (
                <span className="text-emerald-400 font-bold">● Conectado: {address.slice(0, 8)}...{address.slice(-6)}</span>
              ) : (
                <span className="text-amber-400 font-bold">● Billetera no conectada</span>
              )}
            </div>
            {!isConnected && (
              <button
                onClick={handleConnect}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
              >
                🔌 Conectar Billetera Web3
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700">
              <span className="text-[10px] text-slate-400 font-mono block">EuroToken (EURT)</span>
              <span className="text-xl font-black font-mono text-emerald-400">€{eurtBalance}</span>
              {loadingBalance && <span className="text-[10px] text-slate-500"> · actualizando...</span>}
            </div>
            <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700">
              <span className="text-[10px] text-slate-400 font-mono block">Ethereum (ETH)</span>
              <span className="text-xl font-black font-mono text-sky-400">{ethBalance} ETH</span>
            </div>
          </div>
        </div>

        {/* Formulario de recarga (página completa, sin iframe) */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-700">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-500 flex items-center justify-center font-black text-xl shadow-lg border border-white/20">
                💳
              </div>
              <div>
                <h2 className="text-lg font-black font-poppins">
                  Compra de EURT <span className="text-emerald-400">· Servicio Stripe</span>
                </h2>
                <p className="text-[11px] text-slate-300 font-mono">1 EUR = 1.00 EURT · Emisión on-chain tras pago confirmado</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50">
            {!isConnected || !address ? (
              <div className="text-center py-10 space-y-3">
                <p className="text-slate-500 text-sm">
                  Conecte su billetera Web3 para autorizar la recarga y recibir los EURT.
                </p>
                <button
                  onClick={handleConnect}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition"
                >
                  🔌 Conectar Billetera Web3
                </button>
              </div>
            ) : stripePromise ? (
              <Elements stripe={stripePromise}>
                <TopupForm userAddress={address} onClose={() => {}} onSuccess={fetchBalances} />
              </Elements>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl font-bold font-poppins">
                ⚠️ Stripe no configurado: falta NEXT_PUBLIC_STRIPE_PUBLIC_KEY en web-admin/.env.local
              </div>
            )}
          </div>
        </div>

        {/* Nota informativa */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-[11px] text-slate-400 space-y-1.5 font-mono">
          <p>🔒 El pago se procesa en el <strong>servicio de compra de BARLO-VENTAS</strong> (Stripe, modo test). Los EURT se emiten on-chain únicamente cuando Stripe confirma el pago (status succeeded).</p>
          <p>💳 Tarjeta de prueba: <strong>4242 4242 4242 4242</strong> · Exp 12/34 · CVC 123 · ZIP 12345.</p>
          <p>🦊 Se requiere la firma Web3 de la billetera destino (autorización de recarga).</p>
        </div>

      </div>
    </div>
  );
}
