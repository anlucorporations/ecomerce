'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface StripeTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string | null;
  onSuccess?: () => void;
}

export function StripeTopupModal({
  isOpen,
  onClose,
  userAddress,
  onSuccess,
}: StripeTopupModalProps) {
  const [activeTab, setActiveTab] = useState<'iframe' | 'embedded'>('iframe');
  const [amount, setAmount] = useState<string>('50');
  const [targetWallet, setTargetWallet] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('4242 4242 4242 4242');

  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [txDetails, setTxDetails] = useState<{ stripeId?: string; mintHash?: string }>({});

  const compraUrl = process.env.NEXT_PUBLIC_COMPRA_STABLECOIN_URL || 'https://mcc-compra-stablecoin-1095249147821.europe-west1.run.app';
  const iframeSrc = `${compraUrl}${userAddress ? `?address=${encodeURIComponent(userAddress)}` : ''}`;

  useEffect(() => {
    if (userAddress) {
      setTargetWallet(userAddress);
    }
  }, [userAddress]);

  if (!isOpen) return null;

  const handleExecuteTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const dest = targetWallet || userAddress;

    if (!dest || !ethers.isAddress(dest)) {
      setStatus('error');
      setMessage('Por favor introduzca una dirección wallet Ethereum válida.');
      return;
    }

    const numericAmt = parseFloat(amount);
    if (isNaN(numericAmt) || numericAmt <= 0) {
      setStatus('error');
      setMessage('Introduzca un monto válido en Euros.');
      return;
    }

    try {
      setStatus('processing');
      setMessage('🦊 1/3: Solicitando autorización y firma digital en su billetera MetaMask...');

      let activeSigner: ethers.Signer | null = null;
      let signature = '';
      let authMessage = '';
      const timestamp = Math.floor(Date.now() / 1000);

      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        await browserProvider.send('eth_requestAccounts', []);
        activeSigner = await browserProvider.getSigner();
        const signerAddress = await activeSigner.getAddress();
        setTargetWallet(signerAddress);

        authMessage = `Autorizacion de Recarga EURT - BARLO-VENTAS\n\nMonto a recargar: ${amount} EURT\nBilletera destino: ${signerAddress}\nTimestamp: ${timestamp}`;
        try {
          signature = await activeSigner.signMessage(authMessage);
        } catch (sigErr: any) {
          throw new Error('Solicitud cancelada: Debe autorizar y firmar en MetaMask para realizar la recarga.');
        }
      } else {
        throw new Error('MetaMask no detectado en el navegador. Instale la extensión para continuar.');
      }

      setMessage('💳 2/3: Procesando pago seguro con tarjeta en Stripe PCI-DSS...');

      const res = await fetch(`${compraUrl}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          walletAddress: dest,
          paymentMethodId: 'pm_card_visa',
          signature,
          authMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Falló la recarga en Stripe.');
      }

      setStatus('success');
      setTxDetails({
        stripeId: data.stripePaymentId,
        mintHash: data.mintTxHash,
      });
      setMessage(`¡Recarga exitosa! Se han emitido €${amount} EURT a su billetera comercial.`);

      if (onSuccess) onSuccess();

    } catch (err: any) {
      console.error('Error en recarga Stripe embebida:', err);
      setStatus('error');
      setMessage(err.message || 'Error procesando la recarga.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden relative border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-emerald-500/20">
              💳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Recarga EURT (Stripe In-App)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  1 EUR = 1 EURT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Plataforma Embebida de Adquisición de EuroTokens para Empresas Comercializadoras
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold transition text-sm hover:bg-slate-700"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('iframe')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'iframe'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>🖥️ Pasarela Embebida (Puerto 3003)</span>
            </button>
            <button
              onClick={() => setActiveTab('embedded')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'embedded'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>💳 Consola Directa Stripe</span>
            </button>
          </div>
          
          <span className="text-[11px] font-mono text-slate-500">
            {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Billetera no conectada'}
          </span>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {activeTab === 'iframe' ? (
            /* TAB A: EMBEDDED IFRAME TO COMPRA-STABLECOIN (PORT 3003 / GCP) */
            <div className="w-full h-[460px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50 relative">
              <iframe
                src={iframeSrc}
                title="Pasarela de Recarga EURT Stripe"
                className="w-full h-full border-none"
                allow="payment; clipboard-write"
              />
            </div>
          ) : (
            /* TAB B: EMBEDDED DIRECT FORM */
            <form onSubmit={handleExecuteTopup} className="space-y-4 text-xs">
              
              {status === 'error' && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
                  {message}
                </div>
              )}

              {status === 'success' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl space-y-2">
                  <h4 className="font-bold text-sm text-emerald-800">✅ {message}</h4>
                  {txDetails.stripeId && (
                    <p className="font-mono text-[11px] text-emerald-700">Stripe ID: {txDetails.stripeId}</p>
                  )}
                  {txDetails.mintHash && (
                    <p className="font-mono text-[11px] text-emerald-700">Tx Hash: {txDetails.mintHash.slice(0, 16)}...</p>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Billetera Destino (Wallet Empresa) *
                </label>
                <input
                  type="text"
                  required
                  value={targetWallet}
                  onChange={(e) => setTargetWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-xs focus:border-indigo-600 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Monto a Recargar (€ EURT) *
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {['25', '50', '100', '500'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`py-2 rounded-xl font-bold border transition ${
                        amount === preset
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      €{preset}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-extrabold text-sm focus:border-indigo-600 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="block font-bold text-slate-800">
                  Tarjeta de Crédito / Débito (Stripe Simulado PCI-DSS)
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-xs focus:border-indigo-600 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={status === 'processing'}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 uppercase tracking-wider disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {status === 'processing' ? message : `💳 Confirmar Pago (€${amount} EURT) y Autorizar en MetaMask`}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
          <span>🔒 Proceso cifrado PCI-DSS &amp; Firma Web3 MetaMask</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
