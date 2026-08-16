'use client';

import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';

interface CompanyRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string | null;
  onSuccess?: () => void;
}

const ECOMMERCE_ABI = [
  "function registerCompanySelf(string _name, string _description, uint8 _businessType) payable returns (uint256)"
];

export function CompanyRegistrationModal({
  isOpen,
  onClose,
  userAddress,
  onSuccess
}: CompanyRegistrationModalProps) {
  const router = useRouter();
  const { signer } = useWallet();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    businessType: 0 // 0: Venta de Productos, 1: Prestacion de Servicios
  });
  const [submitting, setSubmitting] = useState(false);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  if (!isOpen || !userAddress) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim()) {
      alert("⚠️ El nombre comercial y la descripción de la empresa son ESTRICTAMENTE OBLIGATORIOS.");
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
        alert("Por favor instale o desbloquee su extensión MetaMask para proceder con la inscripción.");
        setSubmitting(false);
        return;
      }

      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, activeSigner);
      const feeAmount = ethers.parseEther("3.0");

      let tx;
      try {
        tx = await contract.registerCompanySelf(
          formData.name,
          formData.description,
          formData.businessType,
          { value: feeAmount }
        );
      } catch (valErr) {
        console.warn("Attempting fallback 0 ETH registration for company:", valErr);
        tx = await contract.registerCompanySelf(
          formData.name,
          formData.description,
          formData.businessType
        );
      }

      await tx.wait();

      // Local persistence for instant reflection
      const newCompany = {
        companyId: Date.now(),
        companyAddress: userAddress,
        name: formData.name,
        description: formData.description,
        businessType: formData.businessType,
        isActive: true,
        registrationDate: Math.floor(Date.now() / 1000)
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(`company_reg_${userAddress.toLowerCase()}`, JSON.stringify(newCompany));
      }

      alert("¡Inscripción de Empresa registrada exitosamente en Blockchain!");

      if (onSuccess) onSuccess();
      onClose();

    } catch (error: any) {
      console.error("Error en inscripción de empresa:", error);
      alert("Error en la inscripción: " + (error?.reason || error?.message || "Transacción cancelada o fallida"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white max-w-lg w-full p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 relative border-l-4 border-l-indigo-600">
        
        {/* Header */}
        <div className="space-y-2 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold font-poppins">
            <span>🏢 BARLO-VENTAS &bull; Inscripción de Empresa Comercial</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Inscripción Obligatoria de Empresa
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Su billetera <span className="font-mono text-indigo-600 font-bold">{userAddress.slice(0, 6)}...{userAddress.slice(-4)}</span> está conectada, pero debe inscribir los datos comerciales de su Empresa en la Blockchain para acceder a la Consola de Administración.
          </p>
        </div>

        {/* Depósito Alert Badge */}
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <div>
              <span className="font-bold text-amber-800 block">Registro Comercial Web3</span>
              <span className="text-[11px] text-amber-700">Verificación de entidad vendedora:</span>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-500 text-white font-black text-xs rounded-xl font-mono shadow-xs">
            3.0 ETH
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Nombre Comercial / Razón Social *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej. TechMarket Iberia S.L."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Descripción de la Empresa / Actividad Comercial *
            </label>
            <textarea
              required
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ej. Distribuidora especializada en dispositivos electrónicos y hardware corporativo"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Tipo de Negocio Comercial *
            </label>
            <select
              value={formData.businessType}
              onChange={(e) => setFormData({ ...formData, businessType: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none transition"
            >
              <option value={0}>🛒 Venta y Distribución de Productos</option>
              <option value={1}>🛠️ Prestación de Servicios Profesionales</option>
            </select>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 uppercase tracking-wider disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {submitting ? 'Inscribiendo Empresa en Blockchain...' : '✍️ Inscribir Empresa en Blockchain'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
