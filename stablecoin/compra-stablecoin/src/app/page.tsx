"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";

export default function CompraStablecoinPage() {
  const [amount, setAmount] = useState<string>("50");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("4242 4242 4242 4242");
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [txDetails, setTxDetails] = useState<{ stripeId?: string; mintHash?: string }>({});

  // Auto-connect wallet if MetaMask is available
  useEffect(() => {
    async function autoDetect() {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum as any);
          const accounts = await provider.send("eth_accounts", []);
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (e) {
          console.warn("Could not auto-detect wallet address:", e);
        }
      }
    }
    autoDetect();
  }, []);

  const connectWallet = async () => {
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        alert("Instale la extensión MetaMask para detectar su dirección automáticamente.");
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      }
    } catch (err: any) {
      alert("Error conectando billetera Web3: " + (err?.reason || err?.message || String(err)));
    }
  };

  const handleBuyTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      setStatus("error");
      setMessage("Por favor introduzca o conecte una dirección de wallet Ethereum válida.");
      return;
    }

    try {
      setStatus("processing");
      setMessage("1/2 Procesando pago en Stripe con Tarjeta de Prueba...");

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          walletAddress,
          paymentMethodId: "pm_card_visa"
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Falló la compra en Stripe.");
      }

      setStatus("success");
      setTxDetails({
        stripeId: data.stripePaymentId,
        mintHash: data.mintTxHash
      });
      setMessage(`¡Éxito! Se han emitido €${amount} EURT a su billetera.`);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Error procesando la solicitud.");
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 1. HEADER BANNER - EXACT WEB ADMIN STYLE */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-bold text-xs rounded-full inline-block font-poppins">
            💳 Módulo de Adquisición Stripe On-Ramp
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-poppins">
            Compra de EuroToken (EURT) &bull; Consola Admin
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            Emisión de stablecoins paritarias 1:1 en blockchain mediante procesamiento seguro con tarjeta de crédito/débito bajo cumplimiento PCI-DSS.
          </p>
        </div>
      </div>

      {/* 2. KPI METRICS CARDS - EXACT WEB ADMIN STYLE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="admin-card p-5 border-l-4 border-l-emerald-500 bg-white">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Tasa Paritaria</span>
          <span className="text-2xl font-black text-emerald-600 font-mono">1 EUR = 1 EURT</span>
          <p className="text-xs text-slate-500 mt-1">Sin comisiones de conversión</p>
        </div>

        <div className="admin-card p-5 border-l-4 border-l-indigo-600 bg-white">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Tiempo de Emisión</span>
          <span className="text-2xl font-black text-indigo-700 font-mono">&lt; 3 Segundos</span>
          <p className="text-xs text-slate-500 mt-1">Minteo directo on-chain</p>
        </div>

        <div className="admin-card p-5 border-l-4 border-l-purple-600 bg-white">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Seguridad Stripe</span>
          <span className="text-2xl font-black text-purple-700 font-mono">PCI-DSS L1</span>
          <p className="text-xs text-slate-500 mt-1">Cifrado de extremo a extremo</p>
        </div>

        <div className="admin-card p-5 border-l-4 border-l-amber-500 bg-white">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Comisión de Red</span>
          <span className="text-2xl font-black text-amber-600 font-mono">0.00 EURT</span>
          <p className="text-xs text-slate-500 mt-1">Red Demo BARLO-VENTAS</p>
        </div>

      </div>

      {/* 3. MAIN PURCHASE FORM CONTAINER - WEB ADMIN CARD STYLE */}
      <div className="max-w-2xl mx-auto">
        <div className="admin-card p-6 sm:p-8 space-y-6 bg-white border border-slate-200">
          
          <div className="border-b border-slate-100 pb-4 space-y-1">
            <h2 className="text-lg font-bold text-slate-900 font-poppins">
              Formulario de Emisión e Ingreso de Fondos
            </h2>
            <p className="text-xs text-slate-500">
              Seleccione el monto en Euros a abonar y la billetera receptora en la red local.
            </p>
          </div>

          <form onSubmit={handleBuyTokens} className="space-y-6">
            
            {/* Preset Amount Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 font-poppins">
                Seleccione el Monto en Euros (€):
              </label>

              <div className="grid grid-cols-5 gap-2">
                {["10", "25", "50", "100", "250"].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setAmount(val)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition font-mono ${
                      amount === val
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    €{val}
                  </button>
                ))}
              </div>

              <div className="relative pt-1">
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Otro monto personalizado"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-600"
                  required
                />
                <span className="absolute right-4 top-3 text-xs font-bold text-slate-400 font-mono">EUR</span>
              </div>
            </div>

            {/* Target Wallet Address Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-700 font-poppins">
                  Billetera Ethereum de Destino (Wallet):
                </label>
                <button
                  type="button"
                  onClick={connectWallet}
                  className="text-[11px] text-indigo-600 font-bold hover:underline font-poppins flex items-center gap-1"
                >
                  <span>🦊</span> Detectar mi MetaMask
                </button>
              </div>

              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono text-emerald-700 font-bold focus:outline-none focus:border-emerald-600"
                required
              />
            </div>

            {/* Stripe Test Card Container */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-800 font-bold font-poppins">Método de Pago (Stripe Demo):</span>
                <span className="text-indigo-700 font-bold font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Visa Test PM
                </span>
              </div>

              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900"
              />

              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                <span>Expiración: 12 / 28</span>
                <span>CVC: 123</span>
                <span>PCI-DSS Test Mode</span>
              </div>
            </div>

            {/* Status Messages */}
            {status === "processing" && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs text-center font-bold animate-pulse font-poppins">
                {message}
              </div>
            )}

            {status === "success" && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs space-y-2 text-center">
                <p className="font-bold text-sm font-poppins">¡Emisión y Recarga Completada!</p>
                <div className="text-[11px] text-slate-800 space-y-1 font-mono text-left bg-white p-3 rounded-lg border border-emerald-200">
                  <p><span className="text-slate-400">Stripe ID:</span> {txDetails.stripeId}</p>
                  <p className="truncate"><span className="text-slate-400">Blockchain Mint Tx:</span> {txDetails.mintHash}</p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs text-center font-semibold font-poppins">
                {message}
              </div>
            )}

            {/* Action Purchase Button */}
            <button
              type="submit"
              disabled={status === "processing"}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition uppercase tracking-wider font-poppins disabled:opacity-50"
            >
              {status === "processing"
                ? "Procesando en Stripe & Blockchain..."
                : `Comprar €${amount || "0"} EURT con Stripe ➔`}
            </button>

          </form>

        </div>
      </div>

    </div>
  );
}
