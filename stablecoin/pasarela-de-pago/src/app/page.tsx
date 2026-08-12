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
  const merchantParam = searchParams.get("merchant") || "Tienda BARLO-VENTAS";
  const redirectUrlParam = searchParams.get("redirectUrl") || "http://localhost:3001/orders";

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isRegistered, setIsRegistered] = useState<boolean>(true);
  const [status, setStatus] = useState<"idle" | "connecting" | "approving" | "paying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

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

      try {
        const ecommerceContract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, provider);
        const regStatus = await ecommerceContract.isRegisteredEntity(account);
        setIsRegistered(regStatus);
        if (!regStatus) {
          setErrorMessage("⚠️ Esta billetera no está registrada en BARLO-VENTAS. Por favor inscribe tu cuenta antes de proceder al pago.");
        }
      } catch (e) {
        console.warn("Error checking entity registration:", e);
      }

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
        alert("Su billetera no está registrada en BARLO-VENTAS. Por favor inscribe tu cuenta en http://localhost:3001.");
        return;
      }

      setStatus("approving");
      setErrorMessage("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const euroTokenContract = new ethers.Contract(euroTokenAddress, EURO_TOKEN_ABI, signer);
      const ecommerceContract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, signer);

      const currentAllowance = await euroTokenContract.allowance(walletAddress, ecommerceAddress);
      if (BigInt(currentAllowance) < rawAmountBigInt) {
        const approveTx = await euroTokenContract.approve(ecommerceAddress, rawAmountBigInt);
        await approveTx.wait();
      }

      setStatus("paying");
      const payTx = await ecommerceContract.processPayment(walletAddress, rawAmountBigInt, invoiceIdParam);
      const receipt = await payTx.wait();

      setTxHash(receipt.hash);
      setStatus("success");

      if (window.opener) {
        window.opener.postMessage({
          type: "PAYMENT_SUCCESS",
          txHash: receipt.hash,
          invoiceId: invoiceIdParam
        }, "*");
      }

      setTimeout(() => {
        if (redirectUrlParam) {
          window.location.href = redirectUrlParam;
        }
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMessage(err?.reason || err?.message || "Falló el procesamiento del pago Web3 en BARLO-VENTAS.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#F5F5F0] text-[#333333] font-sans antialiased bg-wave-pattern">
      <div className="glass-card w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
        
        {/* Header Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0077BB] to-[#FF8800] text-white font-black text-2xl mb-3 shadow-lg shadow-[#0077BB]/30 font-poppins">
            B
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#333333] font-poppins">
            BARLO-<span className="text-[#FF8800]">VENTAS</span> Web3
          </h1>
          <p className="text-xs font-semibold text-[#0077BB] mt-1 font-poppins">
            Pasarela de Pago Inmutable en EuroToken (EURT)
          </p>
        </div>

        {/* Order Details Summary */}
        <div className="bg-white/80 rounded-2xl p-4 mb-6 border border-[#0077BB]/15 space-y-3 shadow-sm">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#A9A9A9] font-medium">Comercio Vendedor:</span>
            <span className="font-bold text-[#333333] font-poppins">{merchantParam}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#A9A9A9] font-medium">Factura / Orden ID:</span>
            <span className="font-mono text-[#0077BB] font-bold">#{invoiceIdParam}</span>
          </div>
          <div className="border-t border-[#0077BB]/10 pt-2 flex justify-between items-baseline">
            <span className="text-base font-bold text-[#333333] font-poppins">Total a Pagar:</span>
            <span className="text-2xl font-black font-mono text-[#2E8B57]">
              €{numericAmount.toFixed(2)} <span className="text-xs text-[#2E8B57] font-normal">EURT</span>
            </span>
          </div>
        </div>

        {/* Wallet Status */}
        {walletAddress ? (
          <div className="bg-[#E6F4FA] border border-[#0077BB]/30 rounded-2xl p-3.5 mb-6 flex justify-between items-center text-xs">
            <div>
              <span className="text-[#0077BB] font-semibold block font-poppins">Billetera Conectada:</span>
              <span className="font-mono text-[#333333] font-bold">
                {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[#0077BB] font-semibold block font-poppins">Saldo Disponible:</span>
              <span className="font-bold font-mono text-[#2E8B57]">€{balance} EURT</span>
            </div>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="w-full py-3 mb-6 rounded-xl bg-white hover:bg-slate-50 text-[#0077BB] font-bold text-xs border border-[#0077BB]/30 transition shadow-xs flex items-center justify-center gap-2 font-poppins"
          >
            <svg className="w-5 h-5 fill-current text-[#0077BB]" viewBox="0 0 24 24">
              <path d="M19 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
            Conectar MetaMask
          </button>
        )}

        {/* Status Messages */}
        {status === "approving" && (
          <div className="p-3 mb-4 rounded-xl bg-[#FFF3E5] border border-[#FF8800]/40 text-[#FF8800] text-xs text-center font-bold animate-pulse font-poppins">
            1/2 Aprobando transferencia de EuroTokens en MetaMask...
          </div>
        )}

        {status === "paying" && (
          <div className="p-3 mb-4 rounded-xl bg-[#E6F4FA] border border-[#0077BB]/40 text-[#0077BB] text-xs text-center font-bold animate-pulse font-poppins">
            2/2 Ejecutando pago inmutable en Blockchain...
          </div>
        )}

        {status === "success" && (
          <div className="p-4 mb-4 rounded-xl bg-[#EAF5EF] border border-[#2E8B57]/40 text-[#2E8B57] text-xs text-center space-y-1">
            <p className="font-bold text-sm font-poppins">¡Pago Completado con Éxito!</p>
            <p className="font-mono text-[10px] text-[#A9A9A9] truncate">Tx Hash: {txHash}</p>
            <p className="text-[#333333] pt-1">Redirigiendo a la tienda BARLO-VENTAS...</p>
          </div>
        )}

        {status === "error" && (
          <div className="p-3 mb-4 rounded-xl bg-[#FCEAEB] border border-[#CC2233]/40 text-[#CC2233] text-xs text-center font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Pay Action Button */}
        {status !== "success" && (
          <button
            onClick={handleExecutePayment}
            disabled={status === "approving" || status === "paying"}
            className="w-full btn-cacao-pulse text-sm font-poppins uppercase tracking-wider text-center flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {status === "approving" || status === "paying" ? (
              <span>Procesando en Red...</span>
            ) : (
              <span>Confirmar Pago de €{numericAmount.toFixed(2)} EURT</span>
            )}
          </button>
        )}
      </div>

      <footer className="mt-8 text-center text-xs text-[#A9A9A9] font-mono">
        BARLO-VENTAS Web3 &copy; 2025 - Pasarela de Pago Descentralizada
      </footer>
    </div>
  );
}

export default function PaymentGatewayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex justify-center items-center text-[#0077BB] font-mono text-xs">
        Cargando pasarela de pago BARLO-VENTAS...
      </div>
    }>
      <PaymentGatewayContent />
    </Suspense>
  );
}
