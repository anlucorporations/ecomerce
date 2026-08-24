'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

// B7: ABI alineada con el contrato real. registerCustomer() no se invoca aquí;
// la verificación KYC se resuelve vía /api/kyc/verify (firma + owner). Solo se consulta isKYCVerified.
const ECOMMERCE_ABI = [
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Requirement 2: Requested fields ONLY: Phone, Birth Date, Country, ID Image, Selfie Image
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState('España');

  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const [idCardFileName, setIdCardFileName] = useState<string>('');
  const [selfieFileName, setSelfieFileName] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  if (!isOpen || !userAddress) return null;

  // Helper to compute SHA-256 Hash of files (Requirement 3: Only store image hashes)
  const computeFileSHA256 = async (file: File | null, defaultName: string): Promise<string> => {
    if (file) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        console.warn('Crypto.subtle fallback to ethers.id:', e);
      }
    }
    return ethers.id(file ? file.name : defaultName);
  };

  const handleIdCardFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIdCardFile(file);
      setIdCardFileName(file.name);
    }
  };

  const handleSelfieFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelfieFile(file);
      setSelfieFileName(file.name);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim() || !birthDate.trim() || !country.trim()) {
      alert("⚠️ El teléfono, la fecha de nacimiento y el país de residencia son ESTRICTAMENTE OBLIGATORIOS.");
      return;
    }

    if (!idCardFileName && !idCardFile) {
      alert("⚠️ Por favor adjunte la imagen de su DNI o Cédula de Identidad.");
      return;
    }

    if (!selfieFileName && !selfieFile) {
      alert("⚠️ Por favor adjunte la foto Selfie de confirmación.");
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
        alert("Por favor conecte su billetera MetaMask para firmar la verificación KYC.");
        setSubmitting(false);
        return;
      }

      // Requirement 3: Calculate SHA-256 Hashes of ID Image and Selfie (Privacy preserving)
      const idImageHash = await computeFileSHA256(idCardFile, idCardFileName || 'dni_cedula.png');
      const selfieHash = await computeFileSHA256(selfieFile, selfieFileName || 'selfie_confirmacion.png');

      const timestamp = new Date().toISOString();
      const kycDeclaration = `ATESTACIÓN DE VERIFICACIÓN KYC - PLATAFORMA WEB3 BARLO-VENTAS\n\nBilletera Titular: ${userAddress}\nTeléfono: ${phone}\nFecha de Nacimiento: ${birthDate}\nPaís de Residencia: ${country}\nHash DNI/Cédula (SHA-256): ${idImageHash}\nHash Selfie (SHA-256): ${selfieHash}\nFecha de Emisión: ${timestamp}\n\nAl firmar con su billetera MetaMask, usted certifica la veracidad de estos datos on-chain. Únicamente los hashes criptográficos de sus imágenes son almacenados preservando su privacidad.`;

      // 1. Mandatory MetaMask Wallet Signature Popup
      let kycSignature = '';
      try {
        kycSignature = await activeSigner.signMessage(kycDeclaration);
        console.log("Firma criptográfica KYC obtenida en MetaMask:", kycSignature);
      } catch (signErr: any) {
        console.error("Firma cancelada o rechazada en MetaMask:", signErr);
        alert("⚠️ Operación cancelada: La verificación KYC requiere ser firmada criptográficamente con su billetera MetaMask.");
        setSubmitting(false);
        return;
      }

      // 2. On-Chain Contract Update: Call /api/kyc/verify API to approve KYC on-chain via Owner Admin
      // El resultado de la API es AUTORITATIVO: si la aprobación on-chain falla, NO se marca verificado.
      const response = await fetch('/api/kyc/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userAddress,
          phone,
          birthDate,
          country,
          idImageHash,
          selfieHash,
          signature: kycSignature,
          timestamp
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData?.error || 'La verificación KYC no pudo completarse on-chain. Intente nuevamente.');
      }
      console.log("[KYC API] Aprobado on-chain con éxito:", resData);

      // 3. Store local persistence with SHA-256 hashes and signature proof (solo tras éxito real)
      const kycRecord = {
        address: userAddress,
        phone,
        birthDate,
        country,
        idImageHash,
        selfieHash,
        signature: kycSignature,
        isVerified: true,
        verifiedAt: Date.now()
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(`kyc_verified_${userAddress.toLowerCase()}`, 'true');
        localStorage.setItem(`kyc_data_${userAddress.toLowerCase()}`, JSON.stringify(kycRecord));
        localStorage.setItem(`kyc_signature_${userAddress.toLowerCase()}`, kycSignature);
        window.dispatchEvent(new CustomEvent('kyc-status-updated', { detail: { address: userAddress, isVerified: true } }));
      }

      alert("¡Verificación KYC Aprobada! Su registro ha sido actualizado on-chain como VERIFICADO 🟢. Ya puede realizar compras y agregar productos.");

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error en proceso KYC:", error);
      alert("Error procesando verificación KYC: " + (error?.reason || error?.message || "Operación cancelada"));
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
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
            <span>🪪 Verificación de Identidad KYC &bull; Registro On-Chain</span>
          </div>
          <h2 className="text-2xl font-black text-[#333333] tracking-tight font-poppins">
            {customTitle || "Verificación KYC de Usuario"}
          </h2>
          <p className="text-xs text-[#A9A9A9] leading-relaxed">
            {customReason || "Complete sus datos de contacto e identifique su billetera. En la blockchain únicamente se registrará el Hash SHA-256 de sus imágenes."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerifySubmit} className="space-y-4 text-xs">
          {/* Teléfono */}
          <div>
            <label className="block font-bold text-[#333333] mb-1 font-poppins">
              1. Teléfono de Contacto *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. +34 612 345 678"
              className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3.5 py-2.5 text-[#333333] focus:border-[#FF8800] focus:outline-none transition"
            />
          </div>

          {/* Fecha de Nacimiento & País */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#333333] mb-1 font-poppins">
                2. Fecha de Nacimiento *
              </label>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3.5 py-2.5 text-[#333333] focus:border-[#FF8800] focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-[#333333] mb-1 font-poppins">
                3. País donde Vive *
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3.5 py-2.5 text-[#333333] focus:border-[#FF8800] focus:outline-none transition"
              >
                <option value="España">España</option>
                <option value="Venezuela">Venezuela</option>
                <option value="Colombia">Colombia</option>
                <option value="México">México</option>
                <option value="Argentina">Argentina</option>
                <option value="Chile">Chile</option>
                <option value="Perú">Perú</option>
                <option value="Estados Unidos">Estados Unidos</option>
                <option value="Otro">Otro País</option>
              </select>
            </div>
          </div>

          {/* Adjuntos: DNI/Cédula + Selfie */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block font-bold text-[#333333] mb-1 font-poppins">
                4. Imagen del DNI / Cédula de Identidad * <span className="text-[10px] text-[#A9A9A9] font-normal">(Solo se guardará su HASH SHA-256)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleIdCardFileChange}
                  className="hidden"
                  id="idcard-file-input"
                />
                <label
                  htmlFor="idcard-file-input"
                  className="cursor-pointer px-3.5 py-2 bg-white border border-[#0077BB]/20 rounded-xl text-[#0077BB] font-bold hover:bg-[#E6F4FA] transition shrink-0"
                >
                  📷 Seleccionar DNI / Cédula
                </label>
                <span className="text-[11px] text-[#2E8B57] font-mono font-bold truncate">
                  {idCardFileName || "Ninguna imagen seleccionada"}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#333333] mb-1 font-poppins">
                5. Foto Selfie de Confirmación * <span className="text-[10px] text-[#A9A9A9] font-normal">(Solo se guardará su HASH SHA-256)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSelfieFileChange}
                  className="hidden"
                  id="selfie-file-input"
                />
                <label
                  htmlFor="selfie-file-input"
                  className="cursor-pointer px-3.5 py-2 bg-white border border-[#0077BB]/20 rounded-xl text-[#0077BB] font-bold hover:bg-[#E6F4FA] transition shrink-0"
                >
                  🤳 Seleccionar Selfie
                </label>
                <span className="text-[11px] text-[#2E8B57] font-mono font-bold truncate">
                  {selfieFileName || "Ninguna selfie seleccionada"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#EAF5EF] p-3 rounded-xl border border-[#2E8B57]/30 text-[#2E8B57] text-[11px] font-mono leading-tight">
            🔒 <strong>Privacidad Web3:</strong> Las imágenes del DNI y Selfie se convierten a hashes criptográficos SHA-256. Su billetera será verificada on-chain sin exponer imágenes personales.
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-cacao-pulse py-3 text-xs font-bold uppercase tracking-wider font-poppins disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? 'Firmando en MetaMask...' : '🪪 Firmar con MetaMask y Obtener Estado VERIFICADO'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );

  if (mounted && typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
