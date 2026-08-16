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
        alert("Instale o desbloquee la extensión MetaMask para detectar su dirección automáticamente.");
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

    if (typeof window === "undefined" || !(window as any).ethereum) {
      setStatus("error");
      setMessage("Por favor instale o desbloquee la extensión MetaMask para autorizar la recarga.");
      return;
    }

    try {
      setStatus("processing");
      setMessage("🦊 1/3 Solicitando autorización y firma digital en su billetera MetaMask...");

      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      
      if (!accounts || accounts.length === 0) {
        throw new Error("No se detectó ninguna cuenta activa en MetaMask.");
      }

      const activeSigner = await browserProvider.getSigner();
      const targetAddress = await activeSigner.getAddress();
      setWalletAddress(targetAddress);

      const timestamp = Math.floor(Date.now() / 1000);
      const authMessage = `Autorizacion de Recarga EURT - BARLO-VENTAS\n\nMonto a recargar: ${amount} EURT\nBilletera destino: ${targetAddress}\nTimestamp: ${timestamp}`;
      
      let signature = "";
      try {
        signature = await activeSigner.signMessage(authMessage);
      } catch (sigErr: any) {
        throw new Error("Solicitud cancelada: Debe autorizar y firmar la transacción en MetaMask para efectuar la recarga.");
      }

      setMessage("💳 2/3 Procesando pago seguro con tarjeta en Stripe PCI-DSS...");

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          walletAddress: targetAddress,
          paymentMethodId: "pm_card_visa",
          signature,
          authMessage
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
      setMessage(`¡Recarga autorizada y exitosa! Se han emitido €${amount} EURT a su billetera tras confirmación en MetaMask.`);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Error procesando la solicitud.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* BARLO-VENTAS PLATFORM HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold font-poppins">
              <span>💳 BARLO-VENTAS &bull; Pasarela de Recarga EURT (Stripe)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-poppins">
              Adquisición de EuroTokens (EURT)
            </h1>
            <p className="text-xs text-slate-300 max-w-lg font-medium leading-relaxed">
              Consola oficial para la compra e ingreso instantáneo de EuroTokens en blockchain mediante tarjeta bancaria.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              type="button"
              onClick={connectWallet}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition font-poppins flex items-center justify-center gap-2 cursor-pointer border border-indigo-400/30"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Conectar MetaMask"}</span>
            </button>
            <span className="text-[10px] font-mono text-slate-400">1 EURT = €1.00 EUR</span>
          </div>

        </div>
      </div>

      {/* KPI METRICS BADGES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        <div className="card-minimal p-4 text-center space-y-1 border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Tasa de Cambio</span>
          <span className="text-base font-black text-emerald-600 block font-mono">1 EUR = 1 EURT</span>
        </div>

        <div className="card-minimal p-4 text-center space-y-1 border-l-4 border-l-indigo-600">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Tiempo de Emisión</span>
          <span className="text-base font-black text-indigo-600 block font-mono">&lt; 3 Segundos</span>
        </div>

        <div className="card-minimal p-4 text-center space-y-1 border-l-4 border-l-purple-600">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Seguridad Bancaria</span>
          <span className="text-base font-black text-purple-600 block font-mono">Stripe PCI-DSS</span>
        </div>

        <div className="card-minimal p-4 text-center space-y-1 border-l-4 border-l-amber-500">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Comisión de Red</span>
          <span className="text-base font-black text-amber-600 block font-mono">0.00 EURT</span>
        </div>

      </div>

      {/* MAIN FORM CONTAINER */}
      <div className="card-minimal p-6 sm:p-8 bg-white border border-slate-200/80 shadow-md rounded-3xl space-y-6">
        
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 font-poppins">Formulario de Recarga Comercial</h2>
            <p className="text-xs text-slate-500">Seleccione el saldo a abonar y autorice la transacción en su billetera Web3.</p>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-mono font-bold rounded-xl border border-indigo-200">
            Firma Web3 Protegida
          </span>
        </div>

        <form onSubmit={handleBuyTokens} className="space-y-6">
          
          {/* Preset Amount Pills */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-800 font-poppins">
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
                placeholder="Otro monto personalizado en EUR..."
                className="input-minimal w-full font-mono font-extrabold text-slate-900 text-base"
                required
              />
              <span className="absolute right-4 top-4.5 text-xs font-bold text-slate-400 font-mono">EUR</span>
            </div>
          </div>

          {/* Destination Wallet Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-800 font-poppins">
                Billetera Ethereum Destino:
              </label>
              <button
                type="button"
                onClick={connectWallet}
                className="text-[11px] text-indigo-600 font-bold hover:underline font-poppins flex items-center gap-1 cursor-pointer"
              >
                <span>🦊</span> Re-Detectar Wallet
              </button>
            </div>

            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              className="input-minimal w-full font-mono text-emerald-700 font-extrabold"
              required
            />
          </div>

          {/* Stripe Card Mockup */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-800 font-bold font-poppins">Tarjeta de Crédito / Débito (Stripe Simulado):</span>
              <span className="text-indigo-700 font-bold font-mono bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                Visa / Mastercard PCI-DSS
              </span>
            </div>

            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="input-minimal w-full bg-white font-mono text-slate-900 text-xs font-bold"
            />

            <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono pt-1">
              <span>Vencimiento: 12 / 28</span>
              <span>CVC: 123</span>
              <span className="text-emerald-600 font-bold">✓ Cifrado SSL 256-bit</span>
            </div>
          </div>

          {/* Status Messages */}
          {status === "processing" && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs text-center font-bold animate-pulse font-poppins">
              {message}
            </div>
          )}

          {status === "success" && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs space-y-2 text-center">
              <p className="font-bold text-sm font-poppins">🎉 ¡Recarga Procesada y Confirmada!</p>
              <p className="text-emerald-800 font-medium">{message}</p>
              <div className="text-[11px] text-slate-800 space-y-1 font-mono text-left bg-white p-3.5 rounded-xl border border-emerald-200 mt-2">
                <p><span className="text-slate-400 font-semibold">Stripe Payment ID:</span> {txDetails.stripeId}</p>
                <p className="truncate"><span className="text-slate-400 font-semibold">Mint Tx Hash:</span> {txDetails.mintHash}</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs text-center font-bold font-poppins">
              ⚠️ {message}
            </div>
          )}

          {/* Main Action Button */}
          <button
            type="submit"
            disabled={status === "processing"}
            className="btn-minimal-primary w-full text-xs font-poppins uppercase tracking-wider text-center flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {status === "processing"
              ? "Procesando en Blockchain..."
              : `💳 Comprar €${amount || "0"} EURT y Autorizar en MetaMask ➔`}
          </button>

          {/* Stripe Webhook Simulator Button */}
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
              className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-2xl text-xs font-bold font-mono transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>⚡ Probar Simulación Webhook Stripe (Desarrollo)</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
