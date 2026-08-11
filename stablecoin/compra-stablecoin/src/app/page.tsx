"use client";

import { useState } from "react";
import { ethers } from "ethers";

export default function CompraStablecoinPage() {
  const [amount, setAmount] = useState<string>("50");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("4242 4242 4242 4242");
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [txDetails, setTxDetails] = useState<{ stripeId?: string; mintHash?: string }>({});

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Instale MetaMask para detectar su dirección automáticamente.");
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      }
    } catch (err: any) {
      alert("Error conectando wallet: " + err.message);
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
    <div className="min-h-screen flex flex-col justify-between items-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      {/* Navbar */}
      <header className="w-full max-w-4xl flex justify-between items-center py-4 px-6 glass-card rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-lg shadow-lg">
            €
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Compra EuroToken (EURT)</h1>
            <span className="text-xs text-slate-400">Pasarela Fiat-to-Crypto con Stripe (PCI-DSS Compliant)</span>
          </div>
        </div>
        <button
          onClick={connectWallet}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 transition"
        >
          {walletAddress ? `Wallet: ${walletAddress.substring(0, 6)}...` : "Conectar Wallet"}
        </button>
      </header>

      {/* Main Card */}
      <main className="w-full max-w-lg glass-card rounded-3xl p-8 my-8 border border-slate-800 shadow-2xl relative">
        <div className="mb-6 text-center">
          <span className="inline-block px-3 py-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 rounded-full mb-2">
            1 EUR = 1.00 EURT (Sin comisiones)
          </span>
          <h2 className="text-2xl font-extrabold text-white">Adquiere EuroTokens</h2>
          <p className="text-xs text-slate-400 mt-1">Paga con tarjeta de prueba y recibe los tokens automáticamente</p>
        </div>

        <form onSubmit={handleBuyTokens} className="space-y-5">
          {/* Preset Amount Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Selecciona el monto en Euros (€):</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {["10", "25", "50", "100"].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`py-2 rounded-xl text-sm font-bold border transition ${
                    amount === val
                      ? "bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/20"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  €{val}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Otro monto"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Wallet Address Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-slate-300">Dirección Wallet de Destino:</label>
              <button type="button" onClick={connectWallet} className="text-[11px] text-emerald-400 hover:underline">
                Usar mi wallet
              </button>
            </div>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Stripe Test Card Selector Info */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Tarjeta de Prueba Stripe:</span>
              <span className="text-indigo-400 font-bold">Stripe Elements (Pruebas)</span>
            </div>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
            />
            <p className="text-[10px] text-slate-500">
              Usa cualquier fecha futura (ej. 12/28) y CVC (123) para pruebas PCI-DSS.
            </p>
          </div>

          {/* Status Message Display */}
          {status === "processing" && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center animate-pulse">
              {message}
            </div>
          )}

          {status === "success" && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2 text-center">
              <p className="font-bold text-sm">¡Compra procesada con Éxito!</p>
              <div className="text-[11px] text-slate-300 space-y-1 font-mono text-left bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <p><span className="text-slate-500">Stripe ID:</span> {txDetails.stripeId}</p>
                <p className="truncate"><span className="text-slate-500">Blockchain Mint Tx:</span> {txDetails.mintHash}</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "processing"}
            className="w-full py-4 rounded-2xl font-extrabold text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 hover:opacity-95 shadow-xl shadow-emerald-500/20 transition disabled:opacity-50 text-base"
          >
            {status === "processing" ? "Procesando en Stripe & Blockchain..." : `Comprar €${amount} EURT con Stripe`}
          </button>
        </form>
      </main>

      <footer className="text-center text-xs text-slate-600 py-4">
        Servicio de Adquisición de Stablecoins - Master Code Crypto © 2026
      </footer>
    </div>
  );
}
