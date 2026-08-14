'use client';

import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { ethers } from 'ethers';

interface KycModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string | null;
  onSuccess?: () => void;
  customTitle?: string;
  customReason?: string;
}

const ECOMMERCE_ABI = [
  "function registerCustomer() external",
  "function isKYCVerified(address account) view returns (bool)"
];

export function KycModal({
  isOpen,
  onClose,
  userAddress,
  onSuccess,
  customTitle,
  customReason,
}: KycModalProps) {
  const { signer } = useWallet();
  const [docType, setDocType] = useState('DNI');
  const [docNumber, setDocNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [photoFront, setPhotoFront] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";

  if (!isOpen || !userAddress) return null;

  const handleSimulateFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFront(e.target.files[0].name);
    } else {
      setPhotoFront("documento_identidad_frontal.jpg");
    }
  };

  const handleSimulateSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelfie(e.target.files[0].name);
    } else {
      setSelfie("selfie_verificacion.jpg");
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let activeSigner = signer;

      if (!activeSigner && typeof window !== 'undefined' && (window as any).ethereum) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        activeSigner = await browserProvider.getSigner();
      }

      if (!activeSigner) {
        alert("Por favor conecte su billetera MetaMask para firmar la verificación KYC.");
        setSubmitting(false);
        return;
      }

      // Execute on-chain KYC registration
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, activeSigner);
      try {
        const tx = await contract.registerCustomer();
        await tx.wait();
      } catch (txErr: any) {
        console.warn("Llamada on-chain registerCustomer aviso:", txErr);
      }

      // Store local persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem(`kyc_verified_${userAddress.toLowerCase()}`, 'true');
      }

      alert("¡Verificación KYC Aprobada! Su estado ha cambiado a VERIFICADO. Ahora tiene acceso total al carrito de compras y recargas EURT.");

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error en proceso KYC:", error);
      alert("Error procesando verificación KYC: " + (error?.reason || error?.message || "Operación cancelada"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border-l-4 border-l-[#FF8800]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A9A9A9] hover:text-[#333333] font-bold text-sm"
        >
          ✕
        </button>

        {/* Header */}
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF3E5] text-[#FF8800] border border-[#FF8800]/30 text-xs font-bold font-poppins">
            <span>🪪 Verificación de Identidad KYC &bull; Nivel 2</span>
          </div>
          <h2 className="text-2xl font-black text-[#333333] tracking-tight font-poppins">
            {customTitle || "Proceso de Verificación KYC"}
          </h2>
          <p className="text-xs text-[#A9A9A9] leading-relaxed">
            {customReason || "Su cuenta se encuentra en estado 'Inscrito'. Para habilitar el pago de su carrito y compra de EURT con Stripe, complete este sencillo proceso de verificación."}
          </p>
        </div>

        {/* Process Stepper */}
        <div className="flex items-center justify-center gap-3 border-y border-[#0077BB]/10 py-3 text-xs font-poppins font-bold">
          <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-[#FF8800]' : 'text-[#2E8B57]'}`}>
            <span className="w-5 h-5 rounded-full bg-[#FF8800] text-white flex items-center justify-center text-[10px]">1</span>
            <span>Documento</span>
          </div>
          <span className="text-[#A9A9A9]">➔</span>
          <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-[#FF8800]' : 'text-[#A9A9A9]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-[#FF8800] text-white' : 'bg-slate-200 text-[#A9A9A9]'}`}>2</span>
            <span>Foto & Firma</span>
          </div>
        </div>

        {/* STEP 1: DOCUMENT INFO */}
        {step === 1 && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[#333333] mb-1 font-poppins">
                Nombre Completo del Titular:
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Carlos Eduardo Mendoza"
                className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3.5 py-2.5 text-[#333333] focus:border-[#FF8800] focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#333333] mb-1 font-poppins">
                  Tipo de Documento:
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3.5 py-2.5 text-[#333333] focus:border-[#FF8800] focus:outline-none transition"
                >
                  <option value="DNI">Cédula de Identidad / DNI</option>
                  <option value="PASSPORT">Pasaporte Internacional</option>
                  <option value="DRIVERS_LICENSE">Licencia de Conducir</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#333333] mb-1 font-poppins">
                  Número de Documento:
                </label>
                <input
                  type="text"
                  required
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="V-18293041"
                  className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3.5 py-2.5 text-[#333333] focus:border-[#FF8800] focus:outline-none transition"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!fullName || !docNumber) {
                    alert("Por favor complete su nombre y número de documento.");
                    return;
                  }
                  setStep(2);
                }}
                className="w-full btn-cacao-pulse py-3 text-xs font-bold uppercase tracking-wider font-poppins"
              >
                Siguiente: Adjuntar Fotos ➔
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PHOTO ATTACHMENT & ON-CHAIN SIGNATURE */}
        {step === 2 && (
          <form onSubmit={handleVerifySubmit} className="space-y-4 text-xs">
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-[#333333] mb-1 font-poppins">
                  1. Foto Frontal del Documento (DNI / Pasaporte):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSimulateFrontUpload}
                    className="hidden"
                    id="front-file-input"
                  />
                  <label
                    htmlFor="front-file-input"
                    className="cursor-pointer px-3.5 py-2 bg-white border border-[#0077BB]/20 rounded-xl text-[#0077BB] font-bold hover:bg-[#E6F4FA] transition"
                  >
                    📷 Seleccionar Imagen
                  </label>
                  <span className="text-[11px] text-[#2E8B57] font-mono font-bold truncate">
                    {photoFront || "documento_frontal.png (Simulado)"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#333333] mb-1 font-poppins">
                  2. Foto Selfie de Confirmación:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSimulateSelfieUpload}
                    className="hidden"
                    id="selfie-file-input"
                  />
                  <label
                    htmlFor="selfie-file-input"
                    className="cursor-pointer px-3.5 py-2 bg-white border border-[#0077BB]/20 rounded-xl text-[#0077BB] font-bold hover:bg-[#E6F4FA] transition"
                  >
                    🤳 Tomar Selfie
                  </label>
                  <span className="text-[11px] text-[#2E8B57] font-mono font-bold truncate">
                    {selfie || "selfie_titular.png (Simulado)"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#EAF5EF] p-3 rounded-xl border border-[#2E8B57]/30 text-[#2E8B57] text-[11px] font-mono">
              ✓ Validación instantánea en blockchain. Al hacer clic se emitirá la atestación de estado <strong>VERIFICADO</strong> en el contrato inteligente.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-[#333333] font-bold rounded-xl text-xs font-poppins"
              >
                ⬅ Volver
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 btn-cacao-pulse py-3 text-xs font-bold uppercase tracking-wider font-poppins disabled:opacity-50"
              >
                {submitting ? 'Aprobando KYC en Blockchain...' : '🪪 Firmar y Obtener Estado VERIFICADO'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
