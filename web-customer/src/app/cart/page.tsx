'use client';

import { useState } from 'react';
import { useContract } from '@/hooks/useContract';
import { useWallet } from '@/hooks/useWallet';
import { useCart } from '@/hooks/useCart';
import { ethers } from 'ethers';
import Link from 'next/link';

const ECOMMERCE_ABI = [
  "function getEntityType(address account) view returns (uint8)",
  "function registerCustomerSelf(string _name, string _contactEmail, string _shippingAddress)",
  "function createInvoice(address _customerAddress, uint256 _companyId) returns (uint256)",
  "function getInvoice(uint256 _invoiceId) view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, string paymentTxHash, uint8 status, string trackingNumber, uint256 shippedTimestamp, uint256 deliveredTimestamp))",
  "function getCompany(uint256 _companyId) view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate))"
];

export default function CartPage() {
  const { provider, signer, chainId, address, isConnected, connect, wallets } = useWallet();
  const ecommerce = useContract('ecommerce', provider, signer, chainId);
  const { items, total, loading, removeFromCart, updateQuantity, clearCart } = useCart(
    provider,
    signer,
    chainId,
    address
  );
  const [processing, setProcessing] = useState(false);

  // Customer Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    shippingAddress: '',
  });

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";

  const formatPrice = (price: bigint) => {
    return (Number(price) / 1_000_000).toFixed(2);
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      alert('Tu carrito está vacío. Agrega productos para continuar.');
      return;
    }

    // Step 1: Prompt Wallet Connection if not connected
    let activeSigner = signer;
    let activeAddress = address;

    if (!activeAddress) {
      if (wallets.length > 0) {
        try {
          await connect(wallets[0]);
          return;
        } catch {
          alert('Por favor conecta tu billetera MetaMask para procesar la compra.');
          return;
        }
      } else {
        alert('Por favor conecta tu billetera Web3 para proceder.');
        return;
      }
    }

    try {
      setProcessing(true);
      const rpcProvider = provider || new ethers.JsonRpcProvider("http://localhost:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

      // Step 2: Check Entity Type in Contract
      const entityType = await contract.getEntityType(activeAddress);
      console.log("Connected entity type:", entityType);

      // EntityType 0: Unregistered -> Show Customer Registration Modal
      if (Number(entityType) === 0) {
        setShowRegisterModal(true);
        setProcessing(false);
        return;
      }

      // Step 3: EntityType 1 (Company), 2 (Customer), 3 (Owner) -> Proceed to Invoice & Web3 Payment
      await executeInvoiceCreation(activeAddress);
    } catch (error: unknown) {
      console.error('Error in checkout handler:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      alert(`Error en checkout: ${err.message || String(error)}`);
      setProcessing(false);
    }
  };

  // Submit Customer Self Registration on Blockchain
  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    try {
      setProcessing(true);
      let activeSigner = signer;

      if (!activeSigner && typeof window !== "undefined" && window.ethereum) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum as any);
        activeSigner = await browserProvider.getSigner();
      }

      if (!activeSigner) {
        alert("Desbloquee su extensión MetaMask para firmar el registro.");
        setProcessing(false);
        return;
      }

      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, activeSigner);
      const tx = await contract.registerCustomerSelf(
        registerForm.name,
        registerForm.email,
        registerForm.shippingAddress
      );
      await tx.wait();

      alert("¡Inscripción de comprador exitosa en blockchain! Procediendo al pago...");
      setShowRegisterModal(false);

      // Execute Invoice Creation
      await executeInvoiceCreation(address);
    } catch (err: any) {
      console.error("Failed to register customer:", err);
      alert("Error registrando usuario: " + (err?.reason || err?.message || "Transacción fallida"));
      setProcessing(false);
    }
  };

  const executeInvoiceCreation = async (customerAddr: string) => {
    try {
      let activeSigner = signer;
      if (!activeSigner && typeof window !== "undefined" && window.ethereum) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum as any);
        activeSigner = await browserProvider.getSigner();
      }

      if (!activeSigner) throw new Error("Signer not available");

      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, activeSigner);

      // Group items by company
      const itemsByCompany = items.reduce((acc, item) => {
        const companyId = item.companyId.toString();
        if (!acc[companyId]) {
          acc[companyId] = [];
        }
        acc[companyId].push(item);
        return acc;
      }, {} as Record<string, typeof items>);

      const companyIds = Object.keys(itemsByCompany);
      if (companyIds.length === 0) throw new Error('No items in cart');

      const firstCompanyId = companyIds[0];
      const tx = await contract.createInvoice(customerAddr, BigInt(firstCompanyId));
      const receipt = await tx.wait();

      const invoiceCreatedEvent = receipt.logs
        .map((log: any) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((event: any) => event?.name === 'InvoiceCreated');

      const invoiceId = invoiceCreatedEvent?.args?.invoiceId;
      if (!invoiceId) throw new Error('Failed to get invoice ID');

      await clearCart();

      const invoice = await contract.getInvoice(invoiceId);
      const company = await contract.getCompany(BigInt(firstCompanyId));

      const paymentUrl = new URL('http://localhost:3002/');
      paymentUrl.searchParams.set('merchant', company.name || 'Tienda E-Commerce');
      paymentUrl.searchParams.set('amount', formatPrice(invoice.totalAmount));
      paymentUrl.searchParams.set('invoiceId', invoiceId.toString());
      paymentUrl.searchParams.set('redirectUrl', `${window.location.origin}/orders`);

      window.location.href = paymentUrl.toString();
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      alert('Error generando factura: ' + (err?.reason || err?.message));
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Carrito de Compras</h1>
          <Link
            href="/products"
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            ← Continuar Comprando
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">Tu carrito está vacío</p>
            <Link
              href="/products"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Explorar Catálogo
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item) => (
                  <li key={item.productId.toString()} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {item.productName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          €{formatPrice(item.unitPrice)} c/u
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newQty = item.quantity - BigInt(1);
                              if (newQty > BigInt(0)) {
                                updateQuantity(item.productId, newQty);
                              }
                            }}
                            className="w-8 h-8 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            -
                          </button>
                          <span className="w-12 text-center text-gray-900 dark:text-white font-bold">
                            {item.quantity.toString()}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + BigInt(1))}
                            className="w-8 h-8 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 w-28 text-right">
                          €{formatPrice(item.unitPrice * item.quantity)}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 text-xs font-semibold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cart Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-semibold text-gray-900 dark:text-white">Total</span>
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  €{formatPrice(total)} EURT
                </span>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleCheckout}
                  disabled={processing}
                  className="w-full bg-indigo-600 text-white px-6 py-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-bold text-base shadow-md transition"
                >
                  {processing ? 'Procesando Pago...' : 'Proceed to Payment (Pasarela Web3)'}
                </button>
                <button
                  onClick={clearCart}
                  className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2.5 rounded-xl hover:bg-gray-200 font-semibold text-sm"
                >
                  Vaciar Carrito
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CUSTOMER REGISTRATION MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-indigo-100 space-y-4">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 mb-2 inline-block">
                ⚠️ Wallet No Inscrita
              </span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Registro de Usuario Comprador</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Complete su información de despacho para vincular su billetera en blockchain antes de pagar.
              </p>
            </div>

            <form onSubmit={handleRegisterCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Email / Contacto:</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  placeholder="juan@ejemplo.com"
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Dirección Completa de Envío:</label>
                <textarea
                  value={registerForm.shippingAddress}
                  onChange={(e) => setRegisterForm({ ...registerForm, shippingAddress: e.target.value })}
                  placeholder="Calle, Número, Ciudad, Código Postal..."
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-gray-900 dark:text-white"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {processing ? "Registrando..." : "Completar Registro & Pagar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
