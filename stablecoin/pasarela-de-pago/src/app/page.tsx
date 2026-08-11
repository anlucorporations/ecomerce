"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ethers } from "ethers";

const EURO_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function decimals() view returns (uint8)"
];

const ECOMMERCE_ABI = [
  "function processPayment(address customer, uint256 amount, uint256 invoiceId) returns (bool)",
  "function getInvoice(uint256 invoiceId) view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, string paymentTxHash, uint8 status, string trackingNumber, uint256 shippedTimestamp, uint256 deliveredTimestamp))",
  "function isRegisteredEntity(address account) view returns (bool)"
];

function PaymentGatewayContent() {
  const searchParams = useSearchParams();
  const amountParam = searchParams.get("amount") || "10.00";
  const invoiceIdParam = searchParams.get("invoiceId") || "1";
  const merchantParam = searchParams.get("merchant") || "Tienda Demo";
  const redirectUrlParam = searchParams.get("redirectUrl") || "http://localhost:3001/orders";

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isRegistered, setIsRegistered] = useState<boolean>(true);
  const [status, setStatus] = useState<"idle" | "connecting" | "approving" | "paying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // Amount in 6 decimals (1 EURT = 1,000,000 units)
  const numericAmount = parseFloat(amountParam);
  const rawAmountBigInt = BigInt(Math.round(numericAmount * 1000000));

  const connectWallet = async () => {
    try {
      setStatus("connecting");
      setErrorMessage("");
      if (!window.ethereum) {
        throw new Error("No se detectó MetaMask. Instale la extensión para continuar.");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        throw new Error("No se seleccionó ninguna cuenta.");
      }

      const account = accounts[0];
      setWalletAddress(account);

      // Check Registration
      try {
        const ecommerceContract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, provider);
        const regStatus = await ecommerceContract.isRegisteredEntity(account);
        setIsRegistered(regStatus);
        if (!regStatus) {
          setErrorMessage("⚠️ Esta billetera no está registrada en la plataforma. Por favor regístrese en la tienda antes de realizar pagos.");
        }
      } catch (e) {
        console.warn("Error checking entity registration:", e);
      }

      // Fetch Balance
      const euroTokenContract = new ethers.Contract(euroTokenAddress, EURO_TOKEN_ABI, provider);
      const balRaw = await euroTokenContract.balanceOf(account);
      const formattedBal = (Number(balRaw) / 1000000).toFixed(2);
      setBalance(formattedBal);

      setStatus("idle");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Error al conectar la wallet");
    }
  };

  const handleExecutePayment = async () => {
    try {
      if (!walletAddress || !window.ethereum) {
        await connectWallet();
        return;
      }

      if (!isRegistered) {
        alert("Su billetera no está registrada como Usuario o Empresa en la plataforma. Por favor inscríbase en la tienda (http://localhost:3001) para realizar pagos.");
        return;
      }

      setStatus("approving");
      setErrorMessage("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const euroTokenContract = new ethers.Contract(euroTokenAddress, EURO_TOKEN_ABI, signer);
      const ecommerceContract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, signer);

      // 1. Check Allowance
      const currentAllowance = await euroTokenContract.allowance(walletAddress, ecommerceAddress);
      if (BigInt(currentAllowance) < rawAmountBigInt) {
        const approveTx = await euroTokenContract.approve(ecommerceAddress, rawAmountBigInt);
        await approveTx.wait();
      }

      // 2. Execute Payment
      setStatus("paying");
      const payTx = await ecommerceContract.processPayment(walletAddress, rawAmountBigInt, invoiceIdParam);
      const receipt = await payTx.wait();

      setTxHash(receipt.hash);
      setStatus("success");

      // Notify parent / opener window via postMessage
      if (window.opener) {
        window.opener.postMessage({
          type: "PAYMENT_SUCCESS",
          txHash: receipt.hash,
          invoiceId: invoiceIdParam
        }, "*");
      }

      // Auto redirect after 3 seconds
      setTimeout(() => {
        if (redirectUrlParam) {
          window.location.href = redirectUrlParam;
        }
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMessage(err?.reason || err?.message || "Falló el procesamiento del pago Web3.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950">
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-indigo-500/20 shadow-2xl relative overflow-hidden">
        {/* Top Glow Decor */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 mb-3 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Pasarela Web3 EURT</h1>
          <p className="text-sm text-gray-400 mt-1">Pago seguro en Ethereum con EuroToken</p>
        </div>

        {/* Order Details Summary */}
        <div className="bg-slate-900/60 rounded-2xl p-4 mb-6 border border-gray-800 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Comercio:</span>
            <span className="font-semibold text-gray-200">{merchantParam}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">ID de Factura / Orden:</span>
            <span className="font-mono text-indigo-300">#{invoiceIdParam}</span>
          </div>
          <div className="border-t border-gray-800 pt-2 flex justify-between items-baseline">
            <span className="text-base font-semibold text-gray-300">Monto a Pagar:</span>
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              €{numericAmount.toFixed(2)} <span className="text-xs text-emerald-400 font-normal">EURT</span>
            </span>
          </div>
        </div>

        {/* Wallet Status */}
        {walletAddress ? (
          <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-2xl p-3 mb-6 flex justify-between items-center text-xs">
            <div>
              <span className="text-gray-400 block">Billetera conectada:</span>
              <span className="font-mono text-indigo-200 font-medium">
                {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-gray-400 block">Saldo EURT:</span>
              <span className="font-bold text-emerald-400">€{balance}</span>
            </div>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="w-full py-3 mb-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium text-sm border border-indigo-500/30 transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
            Conectar MetaMask
          </button>
        )}

        {/* Status Messages */}
        {status === "approving" && (
          <div className="p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center animate-pulse">
            1/2 Aprobando uso de EuroTokens en MetaMask...
          </div>
        )}

        {status === "paying" && (
          <div className="p-3 mb-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs text-center animate-pulse">
            2/2 Procesando transferencia en Blockchain...
          </div>
        )}

        {status === "success" && (
          <div className="p-4 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center space-y-1">
            <p className="font-bold text-sm">¡Pago Completado con Éxito!</p>
            <p className="font-mono text-[10px] text-gray-400 truncate">Tx: {txHash}</p>
            <p className="text-gray-300 pt-1">Redirigiendo a la tienda...</p>
          </div>
        )}

        {status === "error" && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
            {errorMessage}
          </div>
        )}

        {/* Pay Action Button */}
        {status !== "success" && (
          <button
            onClick={handleExecutePayment}
            disabled={status === "approving" || status === "paying"}
            className="w-full py-4 rounded-2xl font-bold text-white text-base glow-btn disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === "approving" || status === "paying" ? (
              <span>Procesando...</span>
            ) : (
              <span>Confirmar Pago de €{numericAmount.toFixed(2)} EURT</span>
            )}
          </button>
        )}
      </div>

      <footer className="mt-8 text-center text-xs text-gray-500">
        Pasarela de Pago Descentralizada - Master Code Crypto © 2026
      </footer>
    </div>
  );
}

export default function PaymentGatewayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex justify-center items-center text-indigo-400">
        Cargando pasarela de pago...
      </div>
    }>
      <PaymentGatewayContent />
    </Suspense>
  );
}
