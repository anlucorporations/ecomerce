'use client';

import { useState, useEffect } from 'react';
import { getMobileDeepLinks, MobileDeepLinkWallet, detectWallets, WalletInfo, connectWallet } from '../lib/wallet/provider';

interface MobileWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectDirect?: (walletInfo?: WalletInfo) => Promise<void>;
}

export function MobileWalletModal({ isOpen, onClose, onConnectDirect }: MobileWalletModalProps) {
  const [deepLinks, setDeepLinks] = useState<MobileDeepLinkWallet[]>([]);
  const [injectedWallets, setInjectedWallets] = useState<WalletInfo[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDeepLinks(getMobileDeepLinks());
      detectWallets().then(setInjectedWallets).catch(console.warn);
    }
  }, [isOpen]);

  const copyCurrentUrl = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleInjectedConnect = async (wallet?: WalletInfo) => {
    try {
      setConnectingId(wallet?.uuid || 'injected');
      if (onConnectDirect) {
        await onConnectDirect(wallet);
      } else {
        await connectWallet(wallet);
      }
      onClose();
    } catch (err) {
      console.warn('Injected connect error:', err);
    } finally {
      setConnectingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal / Bottom Sheet Container */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in slide-in-from-bottom-6 duration-200 safe-area-bottom">
        
        {/* Mobile Pull Handle Indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0077BB] to-[#FF8800] text-white flex items-center justify-center text-lg shadow-md">
              👛
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 font-poppins">
                Conectar Billetera Web3
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Acceso directo móvil o navegador dApp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* 1. INJECTED WALLETS (If user is in dApp browser or has extensions) */}
          {injectedWallets.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#0077BB] uppercase tracking-wider block font-poppins">
                Billeteras Detectadas en este Navegador
              </span>
              <div className="space-y-1.5">
                {injectedWallets.map((wallet) => (
                  <button
                    key={wallet.uuid}
                    onClick={() => handleInjectedConnect(wallet)}
                    disabled={Boolean(connectingId)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#E6F4FA] hover:bg-[#D4EDF7] border border-[#0077BB]/30 transition text-left group"
                  >
                    <div className="flex items-center gap-3">
                      {wallet.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={wallet.icon} alt={wallet.name} className="w-7 h-7 rounded-xl object-contain shadow-xs" />
                      ) : (
                        <span className="text-xl">🔌</span>
                      )}
                      <div>
                        <h4 className="text-xs font-black text-slate-900 font-poppins">{wallet.name}</h4>
                        <span className="text-[10px] text-[#0077BB] font-semibold">Conectar en este navegador ➔</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#0077BB] bg-white/80 px-2.5 py-1 rounded-xl shadow-xs">
                      {connectingId === wallet.uuid ? 'Conectando...' : 'Conectar'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. UNIVERSAL DEEP LINKS (Open Installed Wallet App on Mobile) */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-poppins">
              Abrir en tu App Móvil Instalada (Deep Link)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {deepLinks.map((item) => (
                <a
                  key={item.id}
                  href={item.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition group"
                >
                  <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 font-poppins truncate">
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-tight truncate">
                      Abrir dApp
                    </p>
                  </div>
                  <span className="text-slate-400 text-xs font-bold group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* 3. DIRECT INJECTED FALLBACK BUTTON */}
          {injectedWallets.length === 0 && (
            <button
              onClick={() => handleInjectedConnect()}
              disabled={Boolean(connectingId)}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 font-poppins disabled:opacity-50"
            >
              <span>🌐</span>
              <span>{connectingId ? 'Solicitando permisos de cuenta...' : 'Conectar Proveedor Inyectado Directo'}</span>
            </button>
          )}

          {/* 4. HELPER TIP & COPY URL */}
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1">
                <span>💡</span> ¿Usas navegador dApp?
              </span>
              <button
                onClick={copyCurrentUrl}
                className="text-[10px] font-bold text-[#0077BB] bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-xs hover:bg-slate-50 transition"
              >
                {copiedLink ? '✓ URL Copiada' : 'Copiar URL'}
              </button>
            </div>
            <p className="text-[11px] text-slate-600 leading-tight">
              Pega este enlace en la pestaña <strong>Navegador / dApp</strong> de tu billetera móvil para operar sin comisiones ni pasos adicionales.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
