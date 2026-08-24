'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '../../hooks/useWallet';
import { ethers } from 'ethers';

const ECOMMERCE_ABI = [
  'function registerCustomerSelf(string _name, string _contactEmail, string _shippingAddress) external',
  'function isCustomerRegistered(address _customer) view returns (bool)',
  'function getEntityType(address account) view returns (uint8)',
  'function getAllCustomers() view returns (tuple(address customerAddress, string name, string contactEmail, string shippingAddress, uint256 totalPurchases, uint256 totalSpent, uint256 registrationDate, uint256 lastPurchaseDate, bool isActive)[])'
];

type RegStatus = 'idle' | 'checking' | 'processing' | 'success' | 'error';

/**
 * Página completa de inscripción de comprador (Web3).
 * El registro se ejecuta como una transacción firmada con MetaMask
 * (registerCustomerSelf) — sin formularios flotantes.
 */
export default function RegisterPage() {
  const { address, signer, provider, connect, isConnecting, error: walletError } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/profile';

  const [formData, setFormData] = useState({ name: '', email: '', shippingAddress: '' });
  const [status, setStatus] = useState<RegStatus>('idle');
  const [message, setMessage] = useState('');
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';

  // Verificar estado de inscripción on-chain (única fuente de verdad)
  const checkRegistration = useCallback(async () => {
    if (!address) { setIsRegistered(null); return; }
    try {
      const rpcProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545');
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);
      let reg = false;
      try { reg = await contract.isCustomerRegistered(address); } catch {}
      if (!reg) {
        try { const t = Number(await contract.getEntityType(address)); if (t > 0) reg = true; } catch {}
      }
      setIsRegistered(reg);
    } catch {
      setIsRegistered(null);
    }
  }, [address, ecommerceAddress]);

  useEffect(() => { checkRegistration(); }, [checkRegistration]);

  // Si ya está inscrito, avisar y redirigir
  useEffect(() => {
    if (isRegistered === true) {
      const t = setTimeout(() => router.push(redirectTo), 2500);
      return () => clearTimeout(t);
    }
  }, [isRegistered, router, redirectTo]);

  const handleConnect = async () => {
    try { await connect(); } catch (e: any) { setStatus('error'); setMessage(e?.message || 'No se pudo conectar la wallet.'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) { setStatus('error'); setMessage('Conecte su billetera Web3 para inscribirse.'); return; }
    if (!formData.name.trim() || !formData.email.trim() || !formData.shippingAddress.trim()) {
      setStatus('error');
      setMessage('El nombre completo, correo electrónico y dirección de despacho son obligatorios.');
      return;
    }

    let activeSigner = signer;
    if (!activeSigner && typeof window !== 'undefined' && (window as any).ethereum) {
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      activeSigner = await browserProvider.getSigner();
    }
    if (!activeSigner) { setStatus('error'); setMessage('No se pudo obtener el firmante de MetaMask.'); return; }

    setStatus('processing');
    setMessage('Firmando la inscripción en su billetera MetaMask...');

    try {
      // 1. Verificar unicidad de email on-chain
      const rpcProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545');
      const readContract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);
      try {
        const allCustomers = await readContract.getAllCustomers();
        const inputEmailLower = formData.email.trim().toLowerCase();
        const existing = Array.from(allCustomers).find((c: any) =>
          c.contactEmail && c.contactEmail.trim().toLowerCase() === inputEmailLower &&
          c.customerAddress.toLowerCase() !== address.toLowerCase()
        );
        if (existing) {
          setStatus('error');
          setMessage(`⚠️ El correo electrónico "${formData.email}" ya se encuentra registrado por otro cliente. No se permiten correos duplicados.`);
          return;
        }
      } catch (err) {
        console.warn('No se pudo verificar unicidad de email on-chain:', err);
      }

      // 2. Transacción on-chain (firma MetaMask)
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, activeSigner);
      setMessage('Confirmando la transacción en MetaMask...');
      const tx = await contract.registerCustomerSelf(formData.name, formData.email, formData.shippingAddress);
      await tx.wait();

      setStatus('success');
      setMessage('¡Inscripción de cliente registrada con éxito en blockchain! Redirigiendo...');
      setIsRegistered(true);
      setTimeout(() => router.push(redirectTo), 2000);
    } catch (err: any) {
      console.error('Error en inscripción:', err);
      setStatus('error');
      setMessage(err?.reason || err?.shortMessage || err?.message || 'Transacción cancelada o fallida.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F4FA] text-[#0077BB] border border-[#0077BB]/30 text-xs font-bold font-poppins mb-3">
            <span>🛵 BARLO-VENTAS Web3 &bull; Inscripción de Cliente</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#333333] tracking-tight font-poppins">
            Registro Obligatorio de Comprador
          </h1>
          <p className="text-xs text-[#A9A9A9] mt-2 leading-relaxed max-w-md mx-auto">
            Complete sus datos de contacto y despacho una única vez. La inscripción se registra en
            blockchain mediante una transacción firmada con su billetera MetaMask.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-[#0077BB]/20 bg-white">
          {/* Estado: wallet no conectada */}
          {!address && (
            <div className="text-center space-y-4 py-8">
              <div className="text-5xl">🦊</div>
              <p className="text-sm font-bold text-[#333333] font-poppins">Conecte su billetera MetaMask para inscribirse</p>
              <p className="text-xs text-[#A9A9A9]">Necesita conectar su wallet para firmar la transacción de inscripción on-chain.</p>
              {walletError && <p className="text-xs text-rose-600 font-bold">{walletError}</p>}
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-6 py-3 bg-gradient-to-r from-[#FF8800] to-[#F57C00] hover:opacity-95 text-white font-black text-xs rounded-xl shadow-lg shadow-[#FF8800]/25 uppercase tracking-wider disabled:opacity-50 font-poppins"
              >
                {isConnecting ? 'Conectando...' : '🦊 Conectar Wallet Web3'}
              </button>
            </div>
          )}

          {/* Estado: ya inscrito */}
          {address && isRegistered === true && (
            <div className="text-center space-y-4 py-8">
              <div className="text-5xl">✅</div>
              <p className="text-sm font-black text-[#2E8B57] font-poppins">¡Su billetera ya está inscrita!</p>
              <p className="text-xs text-[#A9A9A9] font-mono break-all">{address}</p>
              <p className="text-xs text-[#A9A9A9]">Redirigiendo a su perfil...</p>
              <Link href={redirectTo} className="inline-block px-5 py-2.5 bg-[#0077BB] text-white font-bold text-xs rounded-xl">
                Ir a mi perfil ahora
              </Link>
            </div>
          )}

          {/* Estado: verificando */}
          {address && isRegistered === null && (
            <div className="text-center py-10 space-y-3">
              <div className="w-10 h-10 border-4 border-[#0077BB] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#A9A9A9] font-mono">Verificando estado de inscripción on-chain...</p>
            </div>
          )}

          {/* Formulario de inscripción */}
          {address && isRegistered === false && (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {status === 'error' && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl font-bold font-poppins">
                  ⚠️ {message}
                </div>
              )}
              {status === 'success' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl font-bold font-poppins">
                  🎉 {message}
                </div>
              )}
              {status === 'processing' && (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl font-bold font-poppins">
                  ⏳ {message}
                </div>
              )}

              <div>
                <label className="block font-bold text-[#333333] mb-1 font-poppins">Nombre Completo / Razón Social *</label>
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
                  Correo Electrónico de Contacto * <span className="text-rose-500">(Obligatorio)</span>
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
                  Dirección Principal de Despacho * <span className="text-rose-500">(Obligatorio)</span>
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={status === 'processing'}
                  className="w-full btn-cacao-pulse py-3.5 text-xs font-black uppercase tracking-wider font-poppins disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {status === 'processing' ? 'Firmando en MetaMask...' : '✍️ Inscribir y Registrar en Blockchain'}
                </button>
              </div>

              <p className="text-[10px] text-[#A9A9A9] text-center font-mono">
                La inscripción es gratuita. Al confirmar, su billetera <span className="text-[#0077BB] font-bold break-all">{address}</span> quedará inscrita on-chain.
              </p>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href={redirectTo} className="text-xs text-[#0077BB] font-bold hover:underline font-poppins">
            ← Volver
          </Link>
        </div>
      </div>
    </div>
  );
}
