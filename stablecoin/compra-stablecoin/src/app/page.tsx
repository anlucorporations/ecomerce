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
    <div className="min-h-screen bg-[#F5F5F0] text-[#333333] font-sans pb-20 selection:bg-[#FF8800] selection:text-white">
      
      {/* 1. HERO BANNER - AZUL CARIBE & NARANJA CACAO SOL */}
      <section className="relative bg-gradient-to-br from-[#0077BB] via-[#005F96] to-slate-900 text-white py-14 px-4 sm:px-6 lg:px-8 shadow-xl overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/30 font-poppins">
            <span>💳 Stripe On-Ramp &bull; BARLO-VENTAS Web3</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight font-poppins">
            Compra de <span className="text-[#FF8800]">EuroToken (EURT)</span>
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 max-w-xl mx-auto font-medium">
            Adquiera EuroTokens al instante usando su tarjeta de débito/crédito con tasa paritaria 1:1 y sin comisiones de red.
          </p>
        </div>
      </section>

      {/* 2. PROMOTIONAL & SECURITY CARDS */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="glass-card p-5 space-y-2 border-l-4 border-l-[#2E8B57]">
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#2E8B57] text-white uppercase font-poppins">TASA PARITARIA</span>
              <span className="text-[11px] font-mono text-[#2E8B57] font-bold">1 EUR = 1 EURT</span>
            </div>
            <h3 className="text-base font-bold text-[#333333] font-poppins">Sin Comisiones Ocultas</h3>
            <p className="text-xs text-[#A9A9A9] leading-relaxed">
              Por cada 1 Euro abonado por Stripe, recibe exactamente 1.00 EURT acreditado en su billetera.
            </p>
          </div>

          <div className="glass-card p-5 space-y-2 border-l-4 border-l-[#0077BB]">
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#0077BB] text-white uppercase font-poppins">EMISIÓN INSTANTÁNEA</span>
              <span className="text-[11px] font-mono text-[#0077BB] font-bold">&lt; 3 Segundos</span>
            </div>
            <h3 className="text-base font-bold text-[#333333] font-poppins">Minteo Directo en Ethereum</h3>
            <p className="text-xs text-[#A9A9A9] leading-relaxed">
              Emisión ejecutada por el contrato inteligente EuroToken con verificación inmediata en la blockchain.
            </p>
          </div>

          <div className="glass-card p-5 space-y-2 border-l-4 border-l-[#FF8800]">
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#FF8800] text-white uppercase font-poppins">SEGURIDAD STRIPE</span>
              <span className="text-[11px] font-mono text-[#FF8800] font-bold">PCI-DSS Level 1</span>
            </div>
            <h3 className="text-base font-bold text-[#333333] font-poppins">Pagos Protegidos</h3>
            <p className="text-xs text-[#A9A9A9] leading-relaxed">
              Procesamiento cifrado punto a punto bajo los estándares de máxima seguridad financiera global.
            </p>
          </div>

        </div>
      </section>

      {/* 3. MAIN PURCHASE CONTAINER (BARLO-VENTAS GLASS-CARD STYLE) */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-card p-6 sm:p-8 shadow-2xl border-2 border-[#0077BB]/20 space-y-6">
          
          <div className="text-center border-b border-[#0077BB]/10 pb-4 space-y-1">
            <span className="px-3.5 py-1 text-[11px] font-bold text-[#2E8B57] bg-[#EAF5EF] border border-[#2E8B57]/30 rounded-full inline-block font-poppins">
              ✓ Paridad Garantizada 1 EUR = 1.00 EURT
            </span>
            <h2 className="text-2xl font-black text-[#333333] font-poppins">Formulario de Adquisición</h2>
            <p className="text-xs text-[#A9A9A9]">Seleccione el monto a abonar y la billetera receptora</p>
          </div>

          <form onSubmit={handleBuyTokens} className="space-y-6">
            
            {/* Preset Amount Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#333333] font-poppins">
                Seleccione el Monto en Euros (€):
              </label>

              <div className="grid grid-cols-5 gap-2">
                {["10", "25", "50", "100", "250"].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setAmount(val)}
                    className={`py-2.5 rounded-xl text-xs font-black border transition font-poppins ${
                      amount === val
                        ? "bg-[#FF8800] text-white border-[#FF8800] shadow-md shadow-[#FF8800]/25 scale-105"
                        : "bg-white text-[#333333] border-[#0077BB]/20 hover:border-[#0077BB] hover:bg-slate-50"
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
                  placeholder="Otro monto en euros"
                  className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-4 py-3 text-sm text-[#333333] font-mono font-bold focus:outline-none focus:border-[#0077BB]"
                  required
                />
                <span className="absolute right-4 top-4 text-xs font-bold text-[#A9A9A9] font-mono">EUR</span>
              </div>
            </div>

            {/* Target Wallet Address Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-[#333333] font-poppins">
                  Billetera Ethereum de Destino (Wallet):
                </label>
                <button
                  type="button"
                  onClick={connectWallet}
                  className="text-[11px] text-[#0077BB] font-bold hover:underline font-poppins flex items-center gap-1"
                >
                  <span>🦊</span> Usar mi MetaMask
                </button>
              </div>

              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-4 py-3 text-xs font-mono text-[#2E8B57] font-bold focus:outline-none focus:border-[#2E8B57]"
                required
              />
            </div>

            {/* Stripe Test Card Container */}
            <div className="bg-white/90 rounded-2xl p-4 border border-[#0077BB]/15 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#333333] font-bold font-poppins">Método de Pago (Stripe Demo):</span>
                <span className="text-[#0077BB] font-bold font-mono bg-[#E6F4FA] px-2 py-0.5 rounded">Visa Test PM</span>
              </div>

              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full bg-slate-50 border border-[#0077BB]/20 rounded-xl px-3 py-2 text-xs font-mono text-[#333333]"
              />

              <div className="flex justify-between items-center text-[10px] text-[#A9A9A9] font-mono">
                <span>Vencimiento: 12 / 28</span>
                <span>CVC: 123</span>
                <span>Entorno: PCI-DSS Test</span>
              </div>
            </div>

            {/* Status Messages */}
            {status === "processing" && (
              <div className="p-3.5 rounded-xl bg-[#FFF3E5] border border-[#FF8800]/40 text-[#FF8800] text-xs text-center font-bold animate-pulse font-poppins">
                {message}
              </div>
            )}

            {status === "success" && (
              <div className="p-4 rounded-xl bg-[#EAF5EF] border border-[#2E8B57]/40 text-[#2E8B57] text-xs space-y-2 text-center">
                <p className="font-bold text-sm font-poppins">¡Compra procesada con Éxito!</p>
                <div className="text-[11px] text-[#333333] space-y-1 font-mono text-left bg-white p-3 rounded-lg border border-[#2E8B57]/20">
                  <p><span className="text-[#A9A9A9]">Stripe ID:</span> {txDetails.stripeId}</p>
                  <p className="truncate"><span className="text-[#A9A9A9]">Blockchain Mint Tx:</span> {txDetails.mintHash}</p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="p-3.5 rounded-xl bg-[#FCEAEB] border border-[#CC2233]/40 text-[#CC2233] text-xs text-center font-semibold font-poppins">
                {message}
              </div>
            )}

            {/* Action Purchase Button with Pulse Animation */}
            <button
              type="submit"
              disabled={status === "processing"}
              className="w-full btn-cacao-pulse text-sm font-poppins uppercase tracking-wider text-center flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {status === "processing"
                ? "Procesando en Stripe & Blockchain..."
                : `Comprar €${amount || "0"} EURT con Stripe ➔`}
            </button>

          </form>

        </div>
      </section>

    </div>
  );
}
