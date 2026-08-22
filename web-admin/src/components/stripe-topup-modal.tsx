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

  const compraUrl = process.env.NEXT_PUBLIC_COMPRA_STABLECOIN_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3003' : 'https://mcc-compra-stablecoin-1095249147821.europe-west1.run.app');
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

        authMessage = `Autorización de Recarga EURT - BARLO-VENTAS\n\nMonto a recargar: ${amount} EURT\nBilletera destino: ${signerAddress}\nTimestamp: ${timestamp}`;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white max-w-3xl w-full rounded-3xl shadow-2xl overflow-hidden relative border-2 border-indigo-200/80 flex flex-col max-h-[92vh]">
        
        {/* Header - Identidad Visual de la Plataforma BARLO-VENTAS */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-5 sm:p-6 flex items-center justify-between border-b border-indigo-900/50 relative overflow-hidden">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-emerald-500/20 border border-white/20">
              💳
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ✓ Stripe PCI-DSS
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  1 EUR = 1.00 EURT
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white font-poppins">
                Pasarela de Recarga EURT <span className="text-emerald-400">&bull; Web Admin</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-black transition text-base border border-slate-700 relative z-10"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector - Estilo Consola Plataforma */}
        <div className="bg-slate-900 p-2.5 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between px-6 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('iframe')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'iframe'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              <span>🖥️ Pasarela Embebida (Puerto 3003)</span>
            </button>
            <button
              onClick={() => setActiveTab('embedded')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'embedded'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              <span>💳 Consola Directa Stripe</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-300 font-bold bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
              {userAddress ? `${userAddress.slice(0, 8)}...${userAddress.slice(-6)}` : 'Billetera no conectada'}
            </span>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50">

          {activeTab === 'iframe' ? (
            /* TAB A: EMBEDDED IFRAME TO COMPRA-STABLECOIN (PORT 3003) WITH MATCHING STYLING */
            <div className="w-full h-[480px] rounded-2xl overflow-hidden border-2 border-indigo-100 shadow-inner bg-slate-900 relative">
              <iframe
                src={iframeSrc}
                title="Pasarela Embebida Recarga EURT"
                className="w-full h-full border-none"
                allow="payment; clipboard-write"
              />
            </div>
          ) : (
            /* TAB B: EMBEDDED DIRECT FORM WITH MATCHING PLATFORM VISUAL IDENTITY */
            <form onSubmit={handleExecuteTopup} className="space-y-4 text-xs">
              
              {status === 'error' && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl font-bold font-poppins">
                  ⚠️ {message}
                </div>
              )}

              {status === 'success' && (
                <div className="p-5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl space-y-2">
                  <h4 className="font-bold text-sm text-emerald-800 font-poppins">🎉 {message}</h4>
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 font-mono text-[11px] space-y-1">
                    {txDetails.stripeId && (
                      <p><span className="text-slate-400">Stripe ID:</span> {txDetails.stripeId}</p>
                    )}
                    {txDetails.mintHash && (
                      <p className="truncate"><span className="text-slate-400">Mint Tx Hash:</span> {txDetails.mintHash}</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-800 mb-1 font-poppins">
                  Billetera Destino (Wallet Empresa) *
                </label>
                <input
                  type="text"
                  required
                  value={targetWallet}
                  onChange={(e) => setTargetWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-emerald-700 font-mono font-extrabold text-xs focus:border-indigo-600 focus:outline-none transition shadow-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5 font-poppins">
                  Monto a Recargar (€ EURT) *
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {['25', '50', '100', '500'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`py-2.5 rounded-xl font-black text-xs font-mono border transition ${
                        amount === preset
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
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
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-extrabold font-mono text-sm focus:border-indigo-600 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-3">
                <label className="block font-bold text-slate-800 font-poppins">
                  Tarjeta de Crédito / Débito (Stripe Simulado PCI-DSS)
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-mono text-xs font-bold focus:border-indigo-600 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={status === 'processing'}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 uppercase tracking-wider disabled:opacity-50 transition flex items-center justify-center gap-2 font-poppins"
                >
                  {status === 'processing' ? message : `💳 Confirmar Pago (€${amount} EURT) y Autorizar en MetaMask ➔`}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">🔒</span> Cifrado Bancario SSL 256-bit &amp; Firma Web3 MetaMask
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 border border-slate-700 text-white font-bold rounded-xl hover:bg-slate-700 transition text-xs font-poppins"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
