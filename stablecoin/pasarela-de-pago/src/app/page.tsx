"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ethers } from "ethers";

const EURO_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
  "function nonces(address owner) view returns (uint256)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",
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
          setErrorMessage("⚠️ Esta billetera no está registrada en BARLO-VENTAS. Por favor inscribe tu cuenta en el catálogo antes de proceder al pago.");
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
    <div className="min-h-screen bg-[#F5F5F0] text-[#333333] font-sans pb-20 selection:bg-[#FF8800] selection:text-white">
      
      {/* 1. HERO BANNER - AZUL CARIBE & NARANJA CACAO SOL */}
      <section className="relative bg-gradient-to-br from-[#0077BB] via-[#005F96] to-slate-900 text-white py-14 px-4 sm:px-6 lg:px-8 shadow-xl overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/30 font-poppins">
            <span>🛡️ Pasarela Inmutable Web3 &bull; BARLO-VENTAS</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight font-poppins">
            Liquidación de Pago en <span className="text-[#FF8800]">EuroToken (EURT)</span>
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 max-w-xl mx-auto font-medium">
            Confirme la transferencia de custodia para procesar la orden comercial y emitir su comprobante en blockchain.
          </p>
        </div>
      </section>

      {/* 2. SECURITY & GUARANTEE CARDS */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="glass-card p-5 space-y-2 border-l-4 border-l-[#2E8B57]">
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#2E8B57] text-white uppercase font-poppins">CUSTODIA ESCROW</span>
              <span className="text-[11px] font-mono text-[#2E8B57] font-bold">100% Protegido</span>
            </div>
            <h3 className="text-base font-bold text-[#333333] font-poppins">Fondos Retenidos</h3>
            <p className="text-xs text-[#A9A9A9] leading-relaxed">
              Los EuroTokens permanecen seguros en el contrato de custodia hasta que confirme la recepción de su compra.
            </p>
          </div>

          <div className="glass-card p-5 space-y-2 border-l-4 border-l-[#0077BB]">
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#0077BB] text-white uppercase font-poppins">FACTURACIÓN WEB3</span>
              <span className="text-[11px] font-mono text-[#0077BB] font-bold">Sin Intermediarios</span>
            </div>
            <h3 className="text-base font-bold text-[#333333] font-poppins">Comprobante Blockchain</h3>
            <p className="text-xs text-[#A9A9A9] leading-relaxed">
              Factura electrónica auditada e inmutable generada directamente en Ethereum Local.
            </p>
          </div>

          <div className="glass-card p-5 space-y-2 border-l-4 border-l-[#FF8800]">
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#FF8800] text-white uppercase font-poppins">DESPACHO GARANTIZADO</span>
              <span className="text-[11px] font-mono text-[#FF8800] font-bold">15-30 Minutos</span>
            </div>
            <h3 className="text-base font-bold text-[#333333] font-poppins">Tracking en Vivo</h3>
            <p className="text-xs text-[#A9A9A9] leading-relaxed">
              Asignación inmediata de número de guía y seguimiento de transporte en tiempo real.
            </p>
          </div>

        </div>
      </section>

      {/* 3. MAIN PAYMENT CONTAINER (BARLO-VENTAS GLASS-CARD STYLE) */}
      <section className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-card p-6 sm:p-8 shadow-2xl border-2 border-[#0077BB]/20 space-y-6 relative overflow-hidden">
          
          {/* Header Logo */}
          <div className="text-center space-y-2 border-b border-[#0077BB]/10 pb-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0077BB] to-[#FF8800] text-white font-black text-2xl shadow-md font-poppins">
              B
            </div>
            <h2 className="text-2xl font-black text-[#333333] font-poppins">
              BARLO-<span className="text-[#FF8800]">VENTAS</span> Web3
            </h2>
            <p className="text-xs font-semibold text-[#0077BB] font-poppins">
              Confirmación de Pago & Depósito en Custodia Escrow
            </p>
          </div>

          {/* Order Details Summary */}
          <div className="bg-white/90 rounded-2xl p-5 border border-[#0077BB]/15 space-y-3 shadow-xs">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#A9A9A9] font-medium">Comercio Vendedor:</span>
              <span className="font-bold text-[#333333] font-poppins">{merchantParam}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#A9A9A9] font-medium">Factura / Orden ID:</span>
              <span className="font-mono text-[#0077BB] font-bold">#{invoiceIdParam}</span>
            </div>
            <div className="border-t border-[#0077BB]/10 pt-3 flex justify-between items-baseline">
              <span className="text-base font-bold text-[#333333] font-poppins">Total a Transferir:</span>
              <span className="text-2xl font-black font-mono text-[#2E8B57]">
                €{numericAmount.toFixed(2)} <span className="text-xs text-[#2E8B57] font-normal">EURT</span>
              </span>
            </div>
          </div>

          {/* Wallet Status */}
          {walletAddress ? (
            <div className="bg-[#E6F4FA] border border-[#0077BB]/30 rounded-2xl p-4 flex justify-between items-center text-xs">
              <div>
                <span className="text-[#0077BB] font-bold block font-poppins">Billetera Conectada:</span>
                <span className="font-mono text-[#333333] font-bold">
                  {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[#0077BB] font-bold block font-poppins">Saldo Disponible:</span>
                <span className="font-bold font-mono text-[#2E8B57]">€{balance} EURT</span>
              </div>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="w-full py-3 rounded-2xl bg-white hover:bg-slate-50 text-[#0077BB] font-bold text-xs border border-[#0077BB]/30 transition shadow-xs flex items-center justify-center gap-2 font-poppins"
            >
              <span>🦊</span> Conectar Billetera MetaMask
            </button>
          )}

          {/* Status Messages */}
          {status === "approving" && (
            <div className="p-3.5 rounded-xl bg-[#FFF3E5] border border-[#FF8800]/40 text-[#FF8800] text-xs text-center font-bold animate-pulse font-poppins">
              1/2 Aprobando transferencia de EuroTokens en MetaMask...
            </div>
          )}

          {status === "paying" && (
            <div className="p-3.5 rounded-xl bg-[#E6F4FA] border border-[#0077BB]/40 text-[#0077BB] text-xs text-center font-bold animate-pulse font-poppins">
              2/2 Ejecutando depósito en Custodia Escrow...
            </div>
          )}

          {status === "success" && (
            <div className="p-4 rounded-xl bg-[#EAF5EF] border border-[#2E8B57]/40 text-[#2E8B57] text-xs text-center space-y-1">
              <p className="font-bold text-sm font-poppins">¡Pago Procesado y Depositado en Custodia!</p>
              <p className="font-mono text-[10px] text-[#A9A9A9] truncate">Tx Hash: {txHash}</p>
              <p className="text-[#333333] pt-1 font-poppins">Redirigiendo a sus pedidos...</p>
            </div>
          )}

          {status === "error" && (
            <div className="p-3.5 rounded-xl bg-[#FCEAEB] border border-[#CC2233]/40 text-[#CC2233] text-xs text-center font-semibold font-poppins">
              {errorMessage}
            </div>
          )}

          {/* Pay Action Button with Pulse Animation */}
          {status !== "success" && (
            <button
              onClick={handleExecutePayment}
              disabled={status === "approving" || status === "paying"}
              className="w-full btn-cacao-pulse text-sm font-poppins uppercase tracking-wider text-center flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {status === "approving" || status === "paying" ? (
                <span>Procesando en Red Web3...</span>
              ) : (
                <span>Confirmar Pago de €{numericAmount.toFixed(2)} EURT ➔</span>
              )}
            </button>
          )}

        </div>
      </section>

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
