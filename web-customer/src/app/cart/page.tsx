'use client';

import { useState, useEffect } from 'react';
import { useContract } from '@/hooks/useContract';
import { useWallet } from '@/hooks/useWallet';
import { useCart } from '@/hooks/useCart';
import { ethers } from 'ethers';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StripeTopupModal } from '@/components/stripe-topup-modal';
import { KycModal } from '@/components/kyc-modal';

const ECOMMERCE_ABI = [
  "function getEntityType(address account) view returns (uint8)",
  "function isKYCVerified(address account) view returns (bool)",
  "function registerCustomerSelf(string _name, string _contactEmail, string _shippingAddress)",
  "function addToCart(uint256 _productId, uint256 _quantity)",
  "function getCart(address _customerAddress) view returns (tuple(uint256 productId, uint256 quantity, uint256 unitPrice)[])",
  "function createInvoice(address _customerAddress, uint256 _companyId) returns (uint256)",
  "function processPayment(address customer, uint256 amount, uint256 invoiceId) returns (bool)",
  "function checkoutMultiCompany(uint256[] _companyIds, uint256[] _productIds, uint256[] _quantities) returns (uint256[])",
  "function getInvoice(uint256 _invoiceId) view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, string paymentTxHash, uint8 status, string trackingNumber, uint256 shippedTimestamp, uint256 deliveredTimestamp))",
  "function getCustomerInvoices(address customer) view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, string paymentTxHash, uint8 status, string trackingNumber, uint256 shippedTimestamp, uint256 deliveredTimestamp)[])",
  "function getCompany(uint256 _companyId) view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate))",
  "function euroTokenAddress() view returns (address)"
];

const formatPrice = (price: bigint | number | string) => {
  const num = typeof price === 'bigint' ? Number(price) : Number(price || 0);
  return (num / 1000000).toFixed(2);
};

export default function CartPage() {
  const router = useRouter();
  const { provider, signer, chainId, address, isConnected, connect } = useWallet();
  const ecommerce = useContract('ecommerce', provider, signer, chainId);
  const {
    items,
    total,
    loading,
    eurtBalance,
    removeFromCart,
    updateQuantity,
    clearCart,
    syncGuestCartToContract,
    refreshBalance,
  } = useCart(provider, signer, chainId, address);

  const [processing, setProcessing] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<string>('');
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [isKYCModalOpen, setIsKYCModalOpen] = useState(false);
  const [kycForm, setKycForm] = useState({
    name: '',
    contactEmail: '',
    shippingAddress: '',
  });

  // Customer Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    shippingAddress: '',
  });

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const SURPLUS_BUFFER = BigInt(1_500_000); // 1.50 EURT surplus buffer (6 decimals)
  const requiredEurt = total > BigInt(0) ? total + SURPLUS_BUFFER : BigInt(0);
  const hasSufficientEurt = eurtBalance >= requiredEurt;

  // Group cart items by companyId
  const itemsByCompany = items.reduce((acc, item) => {
    const compId = item.companyId.toString();
    if (!acc[compId]) {
      acc[compId] = [];
    }
    acc[compId].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const handleCheckout = async () => {
    if (items.length === 0) {
      alert('Tu carrito está vacío. Agrega productos para continuar.');
      return;
    }

    // Step 1: Wallet Connection Check
    let activeSigner = signer;
    let activeAddress = address;

    if (!activeAddress) {
      try {
        await connect();
        return;
      } catch {
        alert('Por favor conecta tu billetera MetaMask para procesar la compra.');
        return;
      }
    }

    try {
      setProcessing(true);
      setCheckoutStep('Verificando registro en plataforma...');
      const rpcProvider = provider || new ethers.JsonRpcProvider("http://localhost:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

      // Step 2: Check Entity Registration Status
      const entityType = await contract.getEntityType(activeAddress);

      // EntityType 0: Unregistered -> Show Customer Registration Modal
      if (Number(entityType) === 0) {
        setShowRegisterModal(true);
        setProcessing(false);
        setCheckoutStep('');
        return;
      }

      // Step 2b: Check KYC Status (Inscrito vs Verificado)
      let isVerified = false;
      try {
        const isKyc = await contract.isKYCVerified(activeAddress);
        if (isKyc) isVerified = true;
      } catch (e) {
        console.warn("isKYCVerified check warning:", e);
      }

      if (!isVerified && typeof window !== 'undefined') {
        const localKyc = localStorage.getItem(`kyc_verified_${activeAddress.toLowerCase()}`);
        if (localKyc === 'true') isVerified = true;
      }

      // If status is ONLY "Inscrito" (NOT Verificado), block payment and trigger KYC Modal!
      if (!isVerified) {
        setIsKYCModalOpen(true);
        setProcessing(false);
        setCheckoutStep('');
        return;
      }

      if (!activeSigner && typeof window !== "undefined" && window.ethereum) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum as any);
        activeSigner = await browserProvider.getSigner();
      }

      // Step 3: Execute Single-Transaction Multi-Company Checkout
      await executeInvoiceCreation(activeAddress, activeSigner);
    } catch (error: unknown) {
      console.error('Error en proceso de checkout:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      alert(`Error en checkout: ${err.message || String(error)}`);
      setProcessing(false);
      setCheckoutStep('');
    }
  };

  // Submit Customer Registration on Blockchain
  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    try {
      setProcessing(true);
      setCheckoutStep('Inscribiendo comprador en blockchain...');
      let activeSigner = signer;

      if (!activeSigner && typeof window !== "undefined" && window.ethereum) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum as any);
        activeSigner = await browserProvider.getSigner();
      }

      if (!activeSigner) {
        alert("Desbloquee su extensión MetaMask para firmar el registro.");
        setProcessing(false);
        setCheckoutStep('');
        return;
      }

      if (!registerForm.name.trim() || !registerForm.email.trim() || !registerForm.shippingAddress.trim()) {
        alert("⚠️ El nombre, correo electrónico y dirección de despacho son ESTRICTAMENTE OBLIGATORIOS.");
        setProcessing(false);
        setCheckoutStep('');
        return;
      }

      // Check email uniqueness across all existing customers on-chain
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
      const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
      const readContract = new ethers.Contract(ecommerceAddress, [
        "function getAllCustomers() view returns (tuple(address customerAddress, string name, string contactEmail, string shippingAddress, uint256 totalPurchases, uint256 totalSpent, uint256 registrationDate, uint256 lastPurchaseDate, bool isActive)[])"
      ], rpcProvider);

      try {
        const allCustomers = await readContract.getAllCustomers();
        const inputEmailLower = registerForm.email.trim().toLowerCase();
        const existingCust = Array.from(allCustomers).find((c: any) => 
          c.contactEmail && 
          c.contactEmail.trim().toLowerCase() === inputEmailLower && 
          c.customerAddress.toLowerCase() !== address.toLowerCase()
        );

        if (existingCust) {
          alert(`⚠️ El correo electrónico "${registerForm.email}" ya se encuentra registrado por otro comprador en la plataforma. No se permiten correos duplicados.`);
          setProcessing(false);
          setCheckoutStep('');
          return;
        }
      } catch (err) {
        console.warn("Could not check duplicate email on-chain:", err);
      }

      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, activeSigner);
      const tx = await contract.registerCustomerSelf(
        registerForm.name,
        registerForm.email,
        registerForm.shippingAddress,
        { value: ethers.parseEther("3.0") }
      );
      await tx.wait();

      alert("¡Inscripción de comprador exitosa en blockchain! Procediendo al pago...");
      setShowRegisterModal(false);

      // Execute Single-Transaction Multi-Company Invoice Creation & Payment
      await executeInvoiceCreation(address, activeSigner);
    } catch (err: any) {
      console.error("Failed to register customer:", err);
      alert("Error registrando usuario: " + (err?.reason || err?.message || "Transacción fallida"));
      setProcessing(false);
      setCheckoutStep('');
    }
  };

const EURO_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)"
];

  const executeInvoiceCreation = async (customerAddr: string, activeSigner: any) => {
    try {
      if (!activeSigner && typeof window !== "undefined" && (window as any).ethereum) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        activeSigner = await browserProvider.getSigner();
      }

      if (!activeSigner) throw new Error("MetaMask no disponible o bloqueado.");

      let activeEuroToken = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, activeSigner);
      try {
        const onChainToken = await contract.euroTokenAddress();
        if (onChainToken && onChainToken !== ethers.ZeroAddress) {
          activeEuroToken = onChainToken;
        }
      } catch {}
      const euroToken = new ethers.Contract(activeEuroToken, EURO_TOKEN_ABI, activeSigner);

      if (items.length === 0) throw new Error('Carrito vacío');

      // Extract unique company IDs and product arrays
      const companyIds = Object.keys(itemsByCompany).map(id => BigInt(id));
      const productIds = items.map(item => BigInt(item.productId));
      const quantities = items.map(item => BigInt(item.quantity));

      // Compute total order amount across all items
      const grandTotal = items.reduce(
        (sum, item) => sum + BigInt(item.unitPrice) * BigInt(item.quantity),
        BigInt(0)
      );

      // STEP 1: Verify & Approve EURT Allowance (ONLY if current allowance is insufficient)
      const currentAllowance = await euroToken.allowance(customerAddr, ecommerceAddress);
      if (BigInt(currentAllowance) < grandTotal) {
        setCheckoutStep('Autorizando límite de gasto de EURT en billetera MetaMask...');
        const approveTx = await euroToken.approve(ecommerceAddress, ethers.MaxUint256);
        await approveTx.wait();
      }

      // STEP 2: Process SINGLE-TRANSACTION Multi-Company Checkout & Escrow Deposit
      setCheckoutStep(`Procesando pedido para ${companyIds.length} empresa(s) y depositando en Custodia Escrow...`);
      
      const tx = await contract.checkoutMultiCompany(companyIds, productIds, quantities);
      await tx.wait();

      // Clear all local & contract cart state upon successful checkout
      if (typeof window !== 'undefined') {
        localStorage.removeItem('guest_cart');
        if (customerAddr) {
          localStorage.removeItem(`wallet_cart_${customerAddr.toLowerCase()}`);
        }
      }
      await clearCart();

      alert(`¡Pago completado con éxito! Se han generado ${companyIds.length} orden(es) individuales de servicio en Custodia Escrow y tu pedido ha sido registrado en la blockchain.`);
      router.push('/orders');
    } catch (err: any) {
      console.error('Error procesando pago unificado:', err);
      alert('Error procesando la compra: ' + (err?.reason || err?.message || String(err)));
      setProcessing(false);
      setCheckoutStep('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>🛒 Carrito de Compras</span>
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full">
                Web3 Powered
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Catálogo descentralizado con liquidación instantánea en EURT
            </p>
          </div>
          <Link
            href="/products"
            className="text-xs font-bold px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl border border-slate-700 transition"
          >
            ← Volver al Catálogo
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-12 text-center shadow-xl">
            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              🛍️
            </div>
            <p className="text-slate-300 font-semibold text-lg mb-2">Tu carrito está vacío</p>
            <p className="text-xs text-slate-400 mb-6">Explora nuestros productos verificados en blockchain y agrega tus favoritos.</p>
            <Link
              href="/products"
              className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition"
            >
              Explorar Catálogo de Productos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Cart Items grouped by Merchant */}
            <div className="lg:col-span-2 space-y-6">
              {Object.entries(itemsByCompany).map(([compId, companyItems]) => (
                <div key={compId} className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
                  {/* Merchant Badge Header */}
                  <div className="bg-slate-800 px-6 py-3 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Empresa Vendedora ID #{compId}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {companyItems.length} producto(s)
                    </span>
                  </div>

                  {/* Items List */}
                  <ul className="divide-y divide-slate-700/60">
                    {companyItems.map((item) => (
                      <li key={item.productId.toString()} className="p-6 hover:bg-slate-800/40 transition">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-base font-bold text-white">
                              {item.productName}
                            </h3>
                            <p className="text-xs font-mono text-slate-400 mt-0.5">
                              €{formatPrice(item.unitPrice)} EURT / unidad
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Quantity Controls */}
                            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1">
                              <button
                                onClick={() => {
                                  const newQty = item.quantity - BigInt(1);
                                  if (newQty > BigInt(0)) {
                                    updateQuantity(item.productId, newQty);
                                  } else {
                                    if (confirm(`¿Desea eliminar "${item.productName}" del carrito?`)) {
                                      removeFromCart(item.productId);
                                    }
                                  }
                                }}
                                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center font-bold text-sm transition"
                                title="Disminuir cantidad"
                              >
                                -
                              </button>
                              <span className="w-10 text-center font-mono text-sm font-bold text-white">
                                {item.quantity.toString()}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity + BigInt(1))}
                                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center font-bold text-sm transition"
                                title="Aumentar cantidad"
                              >
                                +
                              </button>
                            </div>

                            {/* Subtotal */}
                            <div className="text-right w-24">
                              <span className="text-sm font-extrabold font-mono text-emerald-400 block">
                                €{formatPrice(item.unitPrice * item.quantity)}
                              </span>
                              <span className="text-[10px] text-slate-500 uppercase font-mono">EURT</span>
                            </div>

                            {/* Explicit Remove / Delete button */}
                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar "${item.productName}" de tu carrito?`)) {
                                  removeFromCart(item.productId);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1"
                              title="Eliminar producto del carrito"
                            >
                              <span>🗑️</span>
                              <span className="hidden sm:inline">Eliminar</span>
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Right Column: Checkout Summary & EURT Balance Widget */}
            <div className="space-y-6">
              {/* EURT Balance Widget */}
              <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 shadow-xl">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>💶 Saldo Billetera (EURT)</span>
                  <button
                    onClick={refreshBalance}
                    className="text-[10px] text-indigo-400 hover:underline"
                  >
                    🔄 Actualizar
                  </button>
                </h2>

                <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 mb-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Disponible en Wallet</span>
                    <span className="text-2xl font-black font-mono text-white">
                      €{formatPrice(eurtBalance)} <span className="text-xs text-emerald-400 font-normal">EURT</span>
                    </span>
                  </div>
                  {hasSufficientEurt ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ Saldo Suficiente
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ⚠️ Requiere Recarga
                    </span>
                  )}
                </div>

                {/* Warning & Buy EURT Stripe Shortcut */}
                {!hasSufficientEurt && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
                    <p className="text-xs text-amber-200 leading-relaxed">
                      Tu saldo actual es menor que el total de la orden (€{formatPrice(total)} EURT).
                    </p>
                    <a
                      href={`${process.env.NEXT_PUBLIC_COMPRA_STABLECOIN_URL || "https://mcc-compra-stablecoin-1095249147821.europe-west1.run.app"}${address ? `?address=${encodeURIComponent(address)}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition"
                    >
                      💳 Adquirir EURT con Stripe ↗
                    </a>
                  </div>
                )}
              </div>

                {/* Order Total & Checkout Button */}
                <div className="glass-card p-6 shadow-xl space-y-6">
                  <div className="border-b border-[#0077BB]/10 pb-4 space-y-2">
                    <div className="flex justify-between text-xs text-[#A9A9A9]">
                      <span>Subtotal Productos:</span>
                      <span className="font-mono text-[#333333]">€{formatPrice(total)} EURT</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#A9A9A9]">
                      <span>Comisión de Transacción:</span>
                      <span className="font-mono text-[#2E8B57]">0.00 EURT (Red BARLO-VENTAS)</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#A9A9A9]">
                      <span>Excedente Mínimo Requerido:</span>
                      <span className="font-mono text-[#FF8800] font-bold">1.50 EURT</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-[#0077BB]/10">
                      <span className="text-lg font-bold text-[#333333] font-poppins">Total con Excedente</span>
                      <span className="text-2xl font-black font-mono text-[#2E8B57]">
                        €{(Number(requiredEurt) / 1_000_000).toFixed(2)} <span className="text-xs text-[#333333]">EURT</span>
                      </span>
                    </div>
                  </div>

                  {!hasSufficientEurt && (
                    <div className="bg-[#FFF3E5] border border-[#FF8800]/40 rounded-xl p-3.5 space-y-2">
                      <p className="text-xs text-[#CC2233] font-bold leading-relaxed font-poppins">
                        ⚠️ Saldo Insuficiente en EURT. Se requiere un excedente de 1.50 EURT en tu cuenta. Dispones de €{(Number(eurtBalance) / 1_000_000).toFixed(2)} EURT pero necesitas al menos €{(Number(requiredEurt) / 1_000_000).toFixed(2)} EURT.
                      </p>
                      <Link
                        href="/topup"
                        className="btn-cacao-pulse w-full text-xs font-poppins uppercase tracking-wider text-center block"
                      >
                        💳 Ir a la Sección de Recarga EURT con Stripe ➔
                      </Link>
                    </div>
                  )}

                  {/* Progress Feedback Indicator */}
                  {processing && (
                    <div className="bg-[#E6F4FA] border border-[#0077BB]/30 rounded-xl p-3.5 text-center space-y-2">
                      <div className="inline-block w-5 h-5 border-2 border-[#0077BB] border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-bold text-[#0077BB] font-poppins">{checkoutStep}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {!isConnected || !address ? (
                      <div className="bg-[#E6F4FA] border border-[#0077BB]/30 p-4 rounded-2xl text-center space-y-3">
                        <div className="flex items-center justify-center gap-2 text-[#0077BB] font-bold text-xs font-poppins">
                          <span>🔌</span> Billetera Web3 No Conectada
                        </div>
                        <p className="text-xs text-[#333333]">
                          Conecte su billetera MetaMask para generar la factura electrónica y pagar en EURT.
                        </p>
                        <button
                          type="button"
                          onClick={() => connect()}
                          className="btn-cacao-pulse w-full py-3 text-xs font-bold font-poppins uppercase tracking-wider"
                        >
                          Conectar MetaMask para Pagar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleCheckout}
                        disabled={processing || !hasSufficientEurt}
                        className="w-full btn-cacao-pulse text-sm font-poppins uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:animation-none text-center"
                      >
                        {processing ? 'Procesando Transacción...' : 'Pagar Factura en Pasarela Web3 ➔'}
                      </button>
                    )}

                    <button
                      onClick={clearCart}
                      className="w-full bg-white hover:bg-slate-100 text-[#A9A9A9] hover:text-[#CC2233] px-6 py-2.5 rounded-xl text-xs font-bold border border-slate-200 transition font-poppins"
                    >
                      Vaciar Carrito
                    </button>
                  </div>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* CUSTOMER REGISTRATION MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-[#0077BB]/30 space-y-4 relative">
            
            {/* Top Right Close Button */}
            <button
              type="button"
              onClick={() => setShowRegisterModal(false)}
              className="absolute top-4 right-4 text-[#A9A9A9] hover:text-[#CC2233] font-black text-base w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 flex items-center justify-center transition"
              title="Cerrar formulario"
            >
              ✕
            </button>

            <div className="border-b border-[#0077BB]/10 pb-3 pr-8">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF3E5] text-[#FF8800] border border-[#FF8800]/30 mb-2 inline-block font-poppins">
                ⚠️ Billetera No Registrada
              </span>
              <h2 className="text-xl font-bold text-[#333333] font-poppins">Inscripción de Usuario Comprador</h2>
              <p className="text-xs text-[#A9A9A9] mt-1 leading-relaxed">
                Para cumplir con la política de seguridad y poder facturar en blockchain, complete sus datos de despacho una única vez.
              </p>
            </div>

            <form onSubmit={handleRegisterCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Email / Contacto:</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  placeholder="juan@ejemplo.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Dirección Completa de Envío:</label>
                <textarea
                  value={registerForm.shippingAddress}
                  onChange={(e) => setRegisterForm({ ...registerForm, shippingAddress: e.target.value })}
                  placeholder="Calle, Número, Ciudad, Código Postal..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-slate-400 font-semibold hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {processing ? "Inscribiendo..." : "Completar Registro & Pagar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STRIPE TOP-UP MODAL */}
      <StripeTopupModal
        isOpen={isStripeModalOpen}
        onClose={() => setIsStripeModalOpen(false)}
        userAddress={address}
        onSuccess={refreshBalance}
      />

      {/* KYC VERIFICATION MODAL */}
      <KycModal
        isOpen={isKYCModalOpen}
        onClose={() => setIsKYCModalOpen(false)}
        userAddress={address}
        onSuccess={() => {
          setIsKYCModalOpen(false);
          handleCheckout();
        }}
        customTitle="Verificación KYC Necesaria para Pagar Carrito"
        customReason="Su cuenta se encuentra actualmente en estado 'Inscrito'. Para procesar el pago de su carrito de compras y generar facturas con Custodia Escrow, complete este rápido paso de verificación de identidad."
      />
    </div>
  );
}

