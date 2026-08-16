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

  // Auto-detect wallet address from URL query parameter or window.ethereum
  useEffect(() => {
    async function autoDetect() {
      // 1. Check URL parameters (?address=0x... or ?wallet=0x...)
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const paramAddress = urlParams.get("address") || urlParams.get("wallet");
        if (paramAddress && ethers.isAddress(paramAddress)) {
          setWalletAddress(paramAddress);
          return;
        }
      }

      // 2. Check window.ethereum connected accounts
      if (typeof window !== "undefined" && (window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          let accounts = await provider.send("eth_accounts", []);
          if (!accounts || accounts.length === 0) {
            accounts = await provider.send("eth_requestAccounts", []);
          }
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (e) {
          console.warn("Could not auto-detect wallet address:", e);
        }
      }
    }

    autoDetect();

    // 3. Listen for account changes in MetaMask
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const handleAccountsChanged = (accs: string[]) => {
        if (accs && accs.length > 0) {
          setWalletAddress(accs[0]);
        }
      };
      (window as any).ethereum.on?.("accountsChanged", handleAccountsChanged);
      return () => {
        (window as any).ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      };
    }
  }, []);

  const connectWallet = async () => {
    try {
      if (typeof window === "undefined" || !(window as any).ethereum) {
        alert("Instale la extensión MetaMask para detectar su dirección automáticamente.");
        return;
      }
      const provider = new ethers.BrowserProvider((window as any).ethereum);
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
      setMessage("1/2 Verificando pago seguro en Stripe PCI-DSS...");

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
      setMessage(`¡Recarga exitosa! Se han emitido €${amount} EURT a su billetera.`);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Error procesando la solicitud.");
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* 1. HEADER HERO - MINIMALIST DESIGN */}
      <div className="card-minimal p-6 sm:p-8 bg-white border border-slate-200/80 shadow-xs rounded-3xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-bold font-poppins">
              <span>💳 Recarga Instantánea Stripe &bull; 1 EUR = 1 EURT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-poppins">
              Adquisición de EuroToken (EURT)
            </h1>
            <p className="text-xs text-slate-500 max-w-lg font-medium leading-relaxed">
              Consola minimalista para la emisión e ingreso directo de stablecoins EuroToken a su billetera Web3.
            </p>
          </div>

          <button
            type="button"
            onClick={connectWallet}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition font-poppins shrink-0 flex items-center justify-center gap-2"
          >
            <span>🦊</span>
            <span>{walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Conectar Wallet"}</span>
          </button>
        </div>
      </div>

      {/* 2. MINIMALIST KPI BADGES GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        <div className="card-minimal p-4 text-center space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Tasa Fija</span>
          <span className="text-base font-black text-emerald-600 block font-mono">1 EUR = 1 EURT</span>
        </div>

        <div className="card-minimal p-4 text-center space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Emisión On-Chain</span>
          <span className="text-base font-black text-indigo-600 block font-mono">&lt; 3 Segundos</span>
        </div>

        <div className="card-minimal p-4 text-center space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Seguridad</span>
          <span className="text-base font-black text-purple-600 block font-mono">Stripe PCI-DSS</span>
        </div>

        <div className="card-minimal p-4 text-center space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Comisión Red</span>
          <span className="text-base font-black text-amber-600 block font-mono">0.00 EURT</span>
        </div>

      </div>

      {/* 3. MAIN FORM CONTAINER WITH DEFINED GEOMETRIC SHAPES */}
      <div className="card-minimal p-6 sm:p-8 bg-white border border-slate-200/80 shadow-sm rounded-3xl space-y-6">
        
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-poppins">Formulario de Compra</h2>
            <p className="text-xs text-slate-500">Seleccione el monto y complete los datos de pago.</p>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono font-bold rounded-xl border border-slate-200">
            Paso 1 de 1
          </span>
        </div>

        <form onSubmit={handleBuyTokens} className="space-y-6">
          
          {/* Preset Amount Pills */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 font-poppins">
              Monto a Abonar en Euros (€):
            </label>

            <div className="grid grid-cols-5 gap-2.5">
              {["10", "25", "50", "100", "250"].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`btn-preset-pill py-3 text-xs font-mono font-bold transition-all ${
                    amount === val ? "active" : ""
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
                placeholder="Otro monto en EUR..."
                className="input-minimal w-full font-mono font-bold text-slate-900"
                required
              />
              <span className="absolute right-4 top-4 text-xs font-bold text-slate-400 font-mono">EUR</span>
            </div>
          </div>

          {/* Wallet Address Input Box */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-700 font-poppins">
                Billetera Ethereum de Destino:
              </label>
              <button
                type="button"
                onClick={connectWallet}
                className="text-[11px] text-indigo-600 font-bold hover:underline font-poppins flex items-center gap-1"
              >
                <span>🦊</span> Detectar Wallet
              </button>
            </div>

            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              className="input-minimal w-full font-mono text-emerald-700 font-bold"
              required
            />
          </div>

          {/* Stripe Card Mockup Container */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-800 font-bold font-poppins">Tarjeta de Crédito / Débito (Stripe):</span>
              <span className="text-indigo-700 font-bold font-mono bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                Visa / Mastercard
              </span>
            </div>

            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="input-minimal w-full bg-white font-mono text-slate-900 text-xs"
            />

            <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono pt-0.5">
              <span>Vencimiento: 12 / 28</span>
              <span>CVC: 123</span>
              <span className="text-emerald-600 font-bold">✓ Cifrado SSL 256-bit</span>
            </div>
          </div>

          {/* Status Feedback */}
          {status === "processing" && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300/80 text-amber-900 text-xs text-center font-bold animate-pulse font-poppins">
              {message}
            </div>
          )}

          {status === "success" && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs space-y-2 text-center">
              <p className="font-bold text-sm font-poppins">¡Recarga Procesada Exitosamente!</p>
              <div className="text-[11px] text-slate-800 space-y-1 font-mono text-left bg-white p-3 rounded-xl border border-emerald-200">
                <p><span className="text-slate-400">Stripe Payment ID:</span> {txDetails.stripeId}</p>
                <p className="truncate"><span className="text-slate-400">Mint Tx Hash:</span> {txDetails.mintHash}</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs text-center font-semibold font-poppins">
              {message}
            </div>
          )}

          {/* Primary Minimalist Action Button */}
          <button
            type="submit"
            disabled={status === "processing"}
            className="btn-minimal-primary w-full text-xs font-poppins uppercase tracking-wider text-center flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {status === "processing"
              ? "Procesando en Red..."
              : `Comprar €${amount || "0"} EURT con Stripe ➔`}
          </button>

          {/* Stripe Webhook Simulator Button for Local Anvil Testing */}
          <div className="pt-2 text-center">
            <button
              type="button"
              disabled={status === "processing"}
              onClick={async () => {
                if (!walletAddress || !ethers.isAddress(walletAddress)) {
                  setStatus("error");
                  setMessage("Por favor introduzca una billetera Ethereum válida para probar la simulación.");
                  return;
                }
                try {
                  setStatus("processing");
                  setMessage("⚡ Ejecutando Simulador de Webhook Stripe (payment_intent.succeeded)...");
                  const res = await fetch("/api/webhooks/simulate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount, walletAddress })
                  });
                  const data = await res.json();
                  if (!res.ok || !data.success) {
                    throw new Error(data.error || "Falló la simulación de Webhook");
                  }
                  setStatus("success");
                  setTxDetails({ stripeId: data.stripePaymentId, mintHash: data.mintTxHash });
                  setMessage(data.message || `¡Webhook simulado! Se emitieron €${amount} EURT a ${walletAddress}.`);
                } catch (e: any) {
                  setStatus("error");
                  setMessage(e.message || "Error al ejecutar el simulador de Webhook.");
                }
              }}
              className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-2xl text-xs font-bold font-mono transition flex items-center justify-center gap-2"
            >
              <span>⚡ Simular Webhook Stripe (`payment_intent.succeeded`)</span>
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
