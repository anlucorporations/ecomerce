'use client';

import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { ethers } from 'ethers';

interface CustomerRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string | null;
  onSuccess?: () => void;
}

const ECOMMERCE_ABI = [
  "function registerCustomerSelf(string _name, string _contactEmail, string _shippingAddress) payable"
];

export function CustomerRegistrationModal({
  isOpen,
  onClose,
  userAddress,
  onSuccess
}: CustomerRegistrationModalProps) {
  const { signer } = useWallet();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    shippingAddress: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  if (!isOpen || !userAddress) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Mandatory Fields Validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.shippingAddress.trim()) {
      alert("⚠️ El nombre completo, correo electrónico y dirección principal de despacho son ESTRICTAMENTE OBLIGATORIOS.");
      return;
    }

    setSubmitting(true);

    try {
      let activeSigner = signer;

      if (!activeSigner && typeof window !== 'undefined' && (window as any).ethereum) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        activeSigner = await browserProvider.getSigner();
      }

      if (!activeSigner) {
        alert("Por favor instale o desbloquee su extensión MetaMask para proceder con el registro.");
        setSubmitting(false);
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
        const inputEmailLower = formData.email.trim().toLowerCase();
        const existingCust = Array.from(allCustomers).find((c: any) => 
          c.contactEmail && 
          c.contactEmail.trim().toLowerCase() === inputEmailLower && 
          c.customerAddress.toLowerCase() !== userAddress.toLowerCase()
        );

        if (existingCust) {
          alert(`⚠️ El correo electrónico "${formData.email}" ya se encuentra registrado en la plataforma por otro cliente. No se permiten correos duplicados.`);
          setSubmitting(false);
          return;
        }
      } catch (err) {
        console.warn("Could not check duplicate email on-chain:", err);
      }

      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, activeSigner);
      const requiredWei = ethers.parseEther("3.0");

      // Check User ETH Balance
      let balanceWei = BigInt(0);
      try {
        if (activeSigner.provider) {
          balanceWei = await activeSigner.provider.getBalance(userAddress);
        }
      } catch (e) {
        console.warn("Could not check balance:", e);
      }

      let tx;
      if (balanceWei >= requiredWei) {
        try {
          // Attempt sending with 3.0 ETH deposit
          tx = await contract.registerCustomerSelf(
            formData.name,
            formData.email,
            formData.shippingAddress,
            { value: requiredWei }
          );
        } catch (valErr) {
          console.warn("Error sending 3 ETH deposit, falling back to 0 ETH register:", valErr);
          tx = await contract.registerCustomerSelf(
            formData.name,
            formData.email,
            formData.shippingAddress
          );
        }
      } else {
        // Fallback for demo testnet accounts with lower ETH balance
        tx = await contract.registerCustomerSelf(
          formData.name,
          formData.email,
          formData.shippingAddress
        );
      }

      await tx.wait();

      // Store local persistence for instant verification
      const regObject = {
        address: userAddress,
        name: formData.name,
        email: formData.email,
        shippingAddress: formData.shippingAddress,
        registrationDate: Date.now()
      };

      // Requirement 1: Save the address entered during registration as the user's primary/first shipping address
      const primaryAddressObj = [
        {
          id: Date.now().toString(),
          label: 'Dirección Principal (Inscripción)',
          street: formData.shippingAddress,
          city: 'Principal',
          postalCode: '',
          instructions: 'Dirección registrada en inscripción Web3',
          isDefault: true,
        }
      ];

      if (typeof window !== 'undefined') {
        localStorage.setItem(`customer_reg_${userAddress.toLowerCase()}`, JSON.stringify(regObject));
        localStorage.setItem(`user_addresses_${userAddress.toLowerCase()}`, JSON.stringify(primaryAddressObj));
      }

      alert("¡Inscripción de cliente registrada con éxito en blockchain!");

      if (onSuccess) onSuccess();
      onClose();

    } catch (error: any) {
      console.error("Error en inscripción de comprador:", error);
      alert("Error en la inscripción: " + (error?.reason || error?.message || "Transacción cancelada o fallida"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border-l-4 border-l-[#0077BB]">
        
        {/* Header */}
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F4FA] text-[#0077BB] border border-[#0077BB]/30 text-xs font-bold font-poppins">
            <span>🛵 BARLO-VENTAS Web3 &bull; Inscripción de Cliente</span>
          </div>
          <h2 className="text-2xl font-black text-[#333333] tracking-tight font-poppins">
            Registro Obligatorio de Comprador
          </h2>
          <p className="text-xs text-[#A9A9A9] leading-relaxed">
            Su billetera <span className="font-mono text-[#0077BB] font-bold">{userAddress.slice(0, 6)}...{userAddress.slice(-4)}</span> debe completar la información de contacto y despacho para registrarse en el sistema.
          </p>
        </div>

        {/* Depósito Alert Badge */}
        <div className="bg-[#FFF3E5] border border-[#FF8800]/40 p-3.5 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <div>
              <span className="font-bold text-[#FF8800] block font-poppins">Depósito Recomendado</span>
              <span className="text-[11px] text-[#333333]">Garantía de cuenta en blockchain:</span>
            </div>
          </div>
          <span className="px-3 py-1 bg-[#FF8800] text-white font-black text-xs rounded-xl shadow-xs font-mono">
            3.0 ETH
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#333333] mb-1 font-poppins">
              Nombre Completo / Razón Social *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej. Gloria Burgos"
              className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3.5 py-2.5 text-[#333333] focus:border-[#0077BB] focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block font-bold text-[#333333] mb-1 font-poppins">
              Correo Electrónico de Contacto * <span className="text-rose-500 font-bold">(Obligatorio)</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="anlucorporations@gmail.com"
              className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3.5 py-2.5 text-[#333333] focus:border-[#0077BB] focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block font-bold text-[#333333] mb-1 font-poppins">
              Dirección Principal de Despacho * <span className="text-rose-500 font-bold">(Obligatorio)</span>
            </label>
            <input
              type="text"
              required
              value={formData.shippingAddress}
              onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
              placeholder="Av. Principal de La Urbina, Res. San Jose"
              className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3.5 py-2.5 text-[#333333] focus:border-[#0077BB] focus:outline-none transition"
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-cacao-pulse py-3.5 text-xs font-black uppercase tracking-wider font-poppins disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? 'Registrando en Blockchain...' : '✍️ Inscribir y Registrar en Blockchain'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

