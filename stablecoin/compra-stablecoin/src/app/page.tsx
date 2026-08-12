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
    <div className="min-h-screen flex flex-col justify-between items-center p-6 bg-[#F5F5F0] text-[#333333] font-sans bg-wave-pattern">
      {/* Navbar */}
      <header className="w-full max-w-4xl flex justify-between items-center py-4 px-6 glass-card shadow-sm border border-[#0077BB]/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0077BB] via-[#005F96] to-[#FF8800] flex items-center justify-center font-black text-white text-lg shadow-md font-poppins">
            B
          </div>
          <div>
            <h1 className="font-extrabold text-lg leading-none font-poppins text-[#333333]">
              BARLO-<span className="text-[#FF8800]">VENTAS</span> EURT
            </h1>
            <span className="text-xs text-[#0077BB] font-semibold">Adquisición de EuroToken con Stripe (PCI-DSS Compliant)</span>
          </div>
        </div>
        <button
          onClick={connectWallet}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-[#E6F4FA] hover:bg-sky-100 text-[#0077BB] border border-[#0077BB]/30 transition font-poppins"
        >
          {walletAddress ? `Wallet: ${walletAddress.substring(0, 6)}...` : "Conectar Wallet"}
        </button>
      </header>

      {/* Main Card */}
      <main className="w-full max-w-lg glass-card rounded-3xl p-8 my-8 border border-[#0077BB]/15 shadow-2xl relative">
        <div className="mb-6 text-center">
          <span className="inline-block px-3.5 py-1 text-[11px] font-bold text-[#2E8B57] bg-[#EAF5EF] border border-[#2E8B57]/30 rounded-full mb-2 font-poppins">
            1 EUR = 1.00 EURT (Sin comisiones)
          </span>
          <h2 className="text-2xl font-black text-[#333333] font-poppins">Adquiere EuroTokens</h2>
          <p className="text-xs text-[#A9A9A9] mt-1">Paga con tarjeta de prueba e inmediatamente recibe la emisión en tu billetera</p>
        </div>

        <form onSubmit={handleBuyTokens} className="space-y-5">
          {/* Preset Amount Selector */}
          <div>
            <label className="block text-xs font-bold text-[#333333] mb-2 font-poppins">Selecciona el monto en Euros (€):</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {["10", "25", "50", "100"].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`py-2 rounded-xl text-sm font-bold border transition font-poppins ${
                    amount === val
                      ? "bg-[#FF8800] text-white border-[#FF8800] shadow-md shadow-[#FF8800]/25"
                      : "bg-white text-[#333333] border-[#0077BB]/20 hover:border-[#0077BB]"
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
              className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-4 py-3 text-sm text-[#333333] focus:outline-none focus:border-[#0077BB]"
              required
            />
          </div>

          {/* Wallet Address Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-[#333333] font-poppins">Dirección Wallet de Destino:</label>
              <button type="button" onClick={connectWallet} className="text-[11px] text-[#0077BB] font-bold hover:underline">
                Usar mi wallet
              </button>
            </div>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-4 py-3 text-sm font-mono text-[#2E8B57] font-bold focus:outline-none focus:border-[#2E8B57]"
              required
            />
          </div>

          {/* Stripe Test Card Selector Info */}
          <div className="bg-white/80 rounded-2xl p-4 border border-[#0077BB]/15 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#333333] font-bold font-poppins">Tarjeta de Prueba Stripe:</span>
              <span className="text-[#0077BB] font-bold font-mono">Visa Test PM</span>
            </div>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full bg-slate-50 border border-[#0077BB]/20 rounded-lg px-3 py-2 text-xs font-mono text-[#333333]"
            />
            <p className="text-[10px] text-[#A9A9A9]">
              Utiliza cualquier fecha futura (ej. 12/28) y CVC (123) para pruebas del entorno PCI-DSS.
            </p>
          </div>

          {/* Status Message Display */}
          {status === "processing" && (
            <div className="p-3 rounded-xl bg-[#FFF3E5] border border-[#FF8800]/40 text-[#FF8800] text-xs text-center font-bold animate-pulse font-poppins">
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
            <div className="p-3 rounded-xl bg-[#FCEAEB] border border-[#CC2233]/40 text-[#CC2233] text-xs text-center font-semibold font-poppins">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "processing"}
            className="w-full btn-cacao-pulse text-sm font-poppins uppercase tracking-wider text-center flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {status === "processing" ? "Procesando en Stripe & Blockchain..." : `Comprar €${amount} EURT con Stripe`}
          </button>
        </form>
      </main>

      <footer className="text-center text-xs text-[#A9A9A9] font-mono py-4">
        BARLO-VENTAS Web3 &copy; 2025 - Adquisición de Stablecoins
      </footer>
    </div>
  );
}
