"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
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
  "function isRegisteredEntity(address account) view returns (bool)",
  "function isCustomerRegistered(address _customer) view returns (bool)"
];

function sanitizeText(str: string): string {
  return str.replace(/[<>]/g, "").trim().substring(0, 100);
}

// ---------------------------------------------------------------------------
// A12: Open-redirect & postMessage hardening.
// Only hosts listed in the allowed env URLs (or localhost) are accepted as
// redirect destinations / postMessage target origins.
// ---------------------------------------------------------------------------
const DEFAULT_WEB_CUSTOMER_URL = "https://mcc-web-customer-1095249147821.europe-west1.run.app";

function buildAllowedRedirectHosts(): Set<string> {
  const hosts = new Set<string>(["localhost", "127.0.0.1"]);
  const candidates = [
    process.env.NEXT_PUBLIC_WEB_CUSTOMER_URL || DEFAULT_WEB_CUSTOMER_URL,
    process.env.NEXT_PUBLIC_WEB_ADMIN_URL,
    process.env.NEXT_PUBLIC_COMPRA_STABLECOIN_URL,
  ];
  for (const url of candidates) {
    if (!url) continue;
    try {
      hosts.add(new URL(url).hostname.toLowerCase());
    } catch {
      // Ignorar valores de entorno mal formados
    }
  }
  return hosts;
}

const ALLOWED_REDIRECT_HOSTS = buildAllowedRedirectHosts();

function isAllowedRedirectUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return ALLOWED_REDIRECT_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

// Origin concreto de la ventana padre (nunca "*"). Se deriva de document.referrer
// y solo se usa si pertenece a un host permitido.
function getOpenerTargetOrigin(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const referrer = new URL(document.referrer);
    if (isAllowedRedirectUrl(referrer.toString())) {
      return referrer.origin;
    }
  } catch {
    // Sin referrer o no parseable: no se envía postMessage
  }
  return null;
}

function PaymentGatewayContent() {
  const searchParams = useSearchParams();

  // --- Validación estricta del query string (A12) ---
  const rawAmount = searchParams.get("amount") || "10.00";
  const parsedAmount = Number(rawAmount);
  const isAmountValid = /^(?:\d+)(?:\.\d+)?$/.test(rawAmount.trim()) && parsedAmount > 0;
  const numericAmount = isAmountValid ? parsedAmount : 0;
  const rawAmountBigInt = isAmountValid ? BigInt(Math.round(parsedAmount * 1000000)) : BigInt(0);

  const rawInvoiceId = searchParams.get("invoiceId");
  let invoiceIdParam = "1";
  let isInvoiceValid = true;
  if (rawInvoiceId !== null) {
    const parsedInvoice = Number(rawInvoiceId);
    isInvoiceValid = Number.isInteger(parsedInvoice) && parsedInvoice > 0;
    if (isInvoiceValid) invoiceIdParam = String(parsedInvoice);
  }
  const invoiceIdBigInt = isInvoiceValid ? BigInt(invoiceIdParam) : BigInt(1);

  const rawMerchant = searchParams.get("merchant") || "Tienda BARLO-VENTAS";
  const merchantParam = sanitizeText(rawMerchant);
  const defaultCustomerOrdersUrl = (process.env.NEXT_PUBLIC_WEB_CUSTOMER_URL || DEFAULT_WEB_CUSTOMER_URL) + "/orders";
  const rawRedirectUrl = searchParams.get("redirectUrl");
  const redirectUrlParam = rawRedirectUrl && isAllowedRedirectUrl(rawRedirectUrl) ? rawRedirectUrl : defaultCustomerOrdersUrl;

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isRegistered, setIsRegistered] = useState<boolean>(true);
  const [status, setStatus] = useState<"idle" | "connecting" | "approving" | "paying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [inputError, setInputError] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // Refleja en la UI los errores de validación del query string
  useEffect(() => {
    if (!isAmountValid) {
      setInputError("El parámetro 'amount' debe ser un número mayor que 0.");
    } else if (rawInvoiceId !== null && !isInvoiceValid) {
      setInputError("El parámetro 'invoiceId' debe ser un número entero positivo.");
    } else {
      setInputError("");
    }
  }, [isAmountValid, isInvoiceValid, rawInvoiceId]);

  const checkWalletState = useCallback(async (account: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");
      
      // 1. Check Registration
      const ecommerceContract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);
      let regStatus = false;
      try {
        const isEnt = await ecommerceContract.isRegisteredEntity(account);
        const isCust = await ecommerceContract.isCustomerRegistered(account);
        regStatus = isEnt || isCust;
      } catch (e) {
        console.warn("Error checking entity registration:", e);
      }

      setIsRegistered(regStatus);
      if (!regStatus) {
        setErrorMessage("⚠️ Esta billetera no está inscripta en BARLO-VENTAS. Por favor inscribe tu cuenta antes de proceder al pago.");
      } else {
        setErrorMessage("");
      }

      // 2. Check Balance
      const euroTokenContract = new ethers.Contract(euroTokenAddress, EURO_TOKEN_ABI, rpcProvider);
      const balRaw = await euroTokenContract.balanceOf(account);
      setBalance((Number(balRaw) / 1000000).toFixed(2));

    } catch (e) {
      console.warn("Error checking wallet state:", e);
    }
  }, [ecommerceAddress, euroTokenAddress]);

  const connectWallet = async () => {
    try {
      setStatus("connecting");
      setErrorMessage("");
      if (!window.ethereum) {
        throw new Error("No se detectó la extensión MetaMask. Por favor instálela o desbloquéela para autorizar la compra.");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        throw new Error("No se seleccionó ninguna cuenta en MetaMask.");
      }

      const account = accounts[0];
      setWalletAddress(account);
      await checkWalletState(account);
      setStatus("idle");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Error al conectar la wallet con MetaMask");
    }
  };

  // Auto-connect if MetaMask is already connected & listen to account changes
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;
      const provider = new ethers.BrowserProvider(ethereum);
      
      provider.send("eth_accounts", []).then((accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          checkWalletState(accounts[0]);
        }
      }).catch(console.warn);

      const handleAccountsChanged = (accounts: any) => {
        if (Array.isArray(accounts) && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          checkWalletState(accounts[0]);
        } else {
          setWalletAddress(null);
        }
      };

      if (ethereum.on) {
        ethereum.on("accountsChanged", handleAccountsChanged);
      }

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener("accountsChanged", handleAccountsChanged);
        }
      };
    }
  }, [checkWalletState]);

  const handleExecutePayment = async () => {
    try {
      if (!isAmountValid) {
        setStatus("error");
        setErrorMessage("El monto indicado en la URL es inválido. Verifique el parámetro 'amount' (debe ser un número mayor que 0).");
        return;
      }

      if (!walletAddress || !window.ethereum) {
        await connectWallet();
        return;
      }

      if (!isRegistered) {
        const profileUrl = (process.env.NEXT_PUBLIC_WEB_CUSTOMER_URL || "https://mcc-web-customer-1095249147821.europe-west1.run.app") + "/profile";
        alert(`Su billetera no está inscripta en BARLO-VENTAS. Por favor inscribe tu cuenta en ${profileUrl}.`);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const euroTokenContract = new ethers.Contract(euroTokenAddress, EURO_TOKEN_ABI, signer);
      const ecommerceContract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, signer);

      // Paso 1: Verificar Aprobación (Allowance)
      const currentAllowance = await euroTokenContract.allowance(walletAddress, ecommerceAddress);
      
      if (BigInt(currentAllowance) < rawAmountBigInt) {
        setStatus("approving");
        setErrorMessage("");
        
        // Dispara la solicitud de transacción en la billetera MetaMask conectada
        const approveTx = await euroTokenContract.approve(ecommerceAddress, rawAmountBigInt);
        await approveTx.wait();
      }

      // Paso 2: Ejecutar Procesamiento de Pago en Blockchain
      setStatus("paying");
      const payTx = await ecommerceContract.processPayment(walletAddress, rawAmountBigInt, invoiceIdBigInt);
      const receipt = await payTx.wait();

      setTxHash(receipt.hash);
      setStatus("success");

      if (window.opener) {
        // targetOrigin explícito (allowlist), nunca "*"
        const targetOrigin = getOpenerTargetOrigin();
        if (targetOrigin) {
          window.opener.postMessage({
            type: "PAYMENT_SUCCESS",
            txHash: receipt.hash,
            invoiceId: invoiceIdParam
          }, targetOrigin);
        }
      }

      setTimeout(() => {
        if (redirectUrlParam) {
          window.location.href = redirectUrlParam;
        }
      }, 2500);

    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMessage(err?.reason || err?.message || "Transacción cancelada o rechazada en la billetera MetaMask.");
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
            Autorización de Pago en <span className="text-[#FF8800]">EuroToken (EURT)</span>
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 max-w-xl mx-auto font-medium">
            Autorice la compra directamente con su billetera MetaMask conectada para procesar la custodia Escrow y emitir la factura en blockchain.
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
              Autorización con Billetera MetaMask Conectada
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
              <span className="text-base font-bold text-[#333333] font-poppins">Total a Autorizar:</span>
              <span className="text-2xl font-black font-mono text-[#2E8B57]">
                €{numericAmount.toFixed(2)} <span className="text-xs text-[#2E8B57] font-normal">EURT</span>
              </span>
            </div>
          </div>

          {/* Wallet Status Card */}
          {walletAddress ? (
            <div className="bg-[#E6F4FA] border border-[#0077BB]/30 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-[#0077BB] font-bold block font-poppins">Billetera Conectada (MetaMask):</span>
                  <span className="font-mono text-[#333333] font-bold">
                    {walletAddress.substring(0, 8)}...{walletAddress.substring(walletAddress.length - 6)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[#0077BB] font-bold block font-poppins">Saldo EURT:</span>
                  <span className="font-bold font-mono text-[#2E8B57]">€{balance} EURT</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-[#0077BB]/10">
                <span className="text-[#333333]">Estado de Inscripción:</span>
                {isRegistered ? (
                  <span className="font-bold text-[#2E8B57] bg-[#EAF5EF] px-2 py-0.5 rounded border border-[#2E8B57]/30">
                    ✓ Billetera Inscripta
                  </span>
                ) : (
                  <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    ⚠️ Pendiente Inscripción
                  </span>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0077BB] font-bold text-xs border border-[#0077BB]/30 transition shadow-xs flex items-center justify-center gap-2 font-poppins"
            >
              <span>🦊</span> Conectar Billetera MetaMask
            </button>
          )}

          {/* Status Messages */}
          {inputError && (
            <div className="p-3.5 rounded-xl bg-[#FCEAEB] border border-[#CC2233]/40 text-[#CC2233] text-xs text-center font-semibold font-poppins">
              ⚠️ {inputError}
            </div>
          )}

          {status === "approving" && (
            <div className="p-4 rounded-xl bg-[#FFF3E5] border border-[#FF8800]/40 text-[#FF8800] text-xs text-center space-y-1 font-poppins">
              <p className="font-bold">🦊 Paso 1 de 2: Autorice en su ventana emergente de MetaMask</p>
              <p className="text-[11px] text-[#333333]">Aprobando el límite de gasto del EuroToken (EURT)...</p>
            </div>
          )}

          {status === "paying" && (
            <div className="p-4 rounded-xl bg-[#E6F4FA] border border-[#0077BB]/40 text-[#0077BB] text-xs text-center space-y-1 font-poppins">
              <p className="font-bold">🦊 Paso 2 de 2: Confirme la transferencia en MetaMask</p>
              <p className="text-[11px] text-[#333333]">Depositando €{numericAmount.toFixed(2)} EURT en la Custodia Escrow...</p>
            </div>
          )}

          {status === "success" && (
            <div className="p-4 rounded-xl bg-[#EAF5EF] border border-[#2E8B57]/40 text-[#2E8B57] text-xs text-center space-y-1.5">
              <p className="font-black text-sm font-poppins">🎉 ¡Compra Autorizada y Pago Procesado con Éxito!</p>
              <p className="font-mono text-[10px] text-[#2E8B57] bg-white/60 p-1.5 rounded truncate">Tx Hash: {txHash}</p>
              <p className="text-[#333333] pt-1 font-poppins">Redirigiendo a sus pedidos comerciales...</p>
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
              disabled={status === "approving" || status === "paying" || !!inputError}
              className="w-full btn-cacao-pulse text-sm font-poppins uppercase tracking-wider text-center flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {status === "approving" || status === "paying" ? (
                <span>🦊 Esperando Firma en MetaMask...</span>
              ) : (
                <span>🦊 Autorizar Compra con MetaMask (€{numericAmount.toFixed(2)} EURT) ➔</span>
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

