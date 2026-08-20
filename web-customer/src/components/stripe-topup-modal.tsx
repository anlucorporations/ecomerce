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
  const [amount, setAmount] = useState<string>('50');
  const [targetWallet, setTargetWallet] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState<string>('12/28');
  const [cvc, setCvc] = useState<string>('123');
  const [holderName, setHolderName] = useState<string>('Cliente BARLO-VENTAS');

  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [txDetails, setTxDetails] = useState<{ stripeId?: string; mintHash?: string }>({});

  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

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
      setMessage('🦊 Paso 1/2: Autorice la recarga en su billetera MetaMask conectada...');

      // 1. Mandatory MetaMask connected wallet authorization
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('Billetera MetaMask no disponible. Por favor instale o desbloquee MetaMask para autorizar la recarga.');
      }
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      const walletSigner = await browserProvider.getSigner();

      // Send 0 ETH transaction to request explicit user authorization popup in MetaMask
      const authTx = await walletSigner.sendTransaction({
        to: dest,
        value: BigInt(0),
      });
      await authTx.wait();

      setMessage('2/2 Procesando emisión de EuroTokens (EURT) en la blockchain...');

      let mintedOnChain = false;

      // 2. Try calling API checkout endpoint
      try {
        const compraUrl = process.env.NEXT_PUBLIC_COMPRA_STABLECOIN_URL || 'https://mcc-compra-stablecoin-1095249147821.europe-west1.run.app';
        const res = await fetch(`${compraUrl}/api/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            walletAddress: dest,
            paymentMethodId: 'pm_card_visa',
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          mintedOnChain = true;
          setTxDetails({
            stripeId: data.stripePaymentId,
            mintHash: data.mintTxHash,
          });
        } else if (data && data.error) {
          throw new Error(data.error);
        }
      } catch (apiErr: any) {
        console.error("API checkout endpoint error:", apiErr);
        throw new Error(apiErr?.message || "No se pudo procesar la recarga con el servidor.");
      }

      if (!mintedOnChain) {
        throw new Error("No se confirmó la emisión de tokens EURT por parte del servidor.");
      }

      setStatus('success');
      setMessage(`¡Recarga exitosa y autorizada! Se han acreditado €${numericAmt.toFixed(2)} EURT a su billetera.`);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error during Stripe EURT topup:', err);
      setStatus('error');
      setMessage(err?.reason || err?.message || 'Error autorizando la recarga en MetaMask.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="glass-card max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-[#0077BB]/30 space-y-6 relative overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A9A9A9] hover:text-[#CC2233] font-black text-base w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center transition"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 border-b border-[#0077BB]/10 pb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0077BB] via-[#005F96] to-[#FF8800] text-white font-black text-2xl shadow-md font-poppins">
            💳
          </div>
          <h2 className="text-xl font-black text-[#333333] font-poppins">
            Recarga de Billetera <span className="text-[#FF8800]">EURT</span>
          </h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF5EF] border border-[#2E8B57]/30 text-[#2E8B57] text-[11px] font-bold font-poppins">
            <span>✓ Stripe PCI-DSS</span>
            <span>&bull;</span>
            <span>Tasa 1 EUR = 1.00 EURT</span>
          </div>
        </div>

        <form onSubmit={handleExecuteTopup} className="space-y-5">
          
          {/* Preset Amounts Grid */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#333333] font-poppins">
              Monto a Recargar en Euros (€):
            </label>
            <div className="grid grid-cols-5 gap-2">
              {['10', '25', '50', '100', '250'].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`py-2 rounded-xl text-xs font-black border transition font-poppins ${
                    amount === val
                      ? 'bg-[#FF8800] text-white border-[#FF8800] shadow-md shadow-[#FF8800]/25 scale-105'
                      : 'bg-white text-[#333333] border-[#0077BB]/20 hover:border-[#0077BB] hover:bg-slate-50'
                  }`}
                >
                  €{val}
                </button>
              ))}
            </div>

            <div className="relative pt-1">
              <input
                type="number"
                min="1"
                max="5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Otro monto personalizado"
                className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-4 py-2.5 text-xs text-[#333333] font-mono font-bold focus:outline-none focus:border-[#0077BB]"
                required
              />
              <span className="absolute right-3.5 top-3 text-xs font-bold text-[#A9A9A9] font-mono">EUR</span>
            </div>
          </div>

          {/* Wallet Address Destination */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#333333] font-poppins">
              Billetera de Destino (Wallet Ethereum):
            </label>
            <input
              type="text"
              value={targetWallet}
              onChange={(e) => setTargetWallet(e.target.value)}
              placeholder="0x..."
              className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#2E8B57] font-bold focus:outline-none focus:border-[#2E8B57]"
              required
            />
          </div>

          {/* Stripe Card Container */}
          <div className="bg-white/90 rounded-2xl p-4 border border-[#0077BB]/15 space-y-3 text-xs shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#333333] font-poppins">Datos de Tarjeta Stripe (Demo):</span>
              <span className="text-[10px] font-mono font-bold bg-[#E6F4FA] text-[#0077BB] px-2 py-0.5 rounded border border-[#0077BB]/20">
                Visa / Mastercard
              </span>
            </div>

            <div>
              <label className="block text-[10px] text-[#A9A9A9] uppercase font-mono mb-0.5">Titular de la Tarjeta:</label>
              <input
                type="text"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                className="w-full bg-slate-50 border border-[#0077BB]/20 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#333333]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#A9A9A9] uppercase font-mono mb-0.5">Número de Tarjeta:</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full bg-slate-50 border border-[#0077BB]/20 rounded-lg px-3 py-1.5 text-xs font-mono text-[#333333]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-[#A9A9A9] uppercase font-mono mb-0.5">Expiración:</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full bg-slate-50 border border-[#0077BB]/20 rounded-lg px-3 py-1.5 text-xs font-mono text-[#333333]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#A9A9A9] uppercase font-mono mb-0.5">CVC:</label>
                <input
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  className="w-full bg-slate-50 border border-[#0077BB]/20 rounded-lg px-3 py-1.5 text-xs font-mono text-[#333333]"
                />
              </div>
            </div>
          </div>

          {/* Status Indicators */}
          {status === 'processing' && (
            <div className="p-3 rounded-xl bg-[#FFF3E5] border border-[#FF8800]/40 text-[#FF8800] text-xs text-center font-bold animate-pulse font-poppins">
              {message}
            </div>
          )}

          {status === 'success' && (
            <div className="p-4 rounded-xl bg-[#EAF5EF] border border-[#2E8B57]/40 text-[#2E8B57] text-xs space-y-1.5 text-center">
              <p className="font-bold text-sm font-poppins">¡Recarga Completada!</p>
              <div className="text-[11px] text-[#333333] font-mono text-left bg-white p-2.5 rounded-lg border border-[#2E8B57]/20 space-y-0.5">
                <p><span className="text-[#A9A9A9]">Stripe ID:</span> {txDetails.stripeId}</p>
                <p className="truncate"><span className="text-[#A9A9A9]">Mint Tx Hash:</span> {txDetails.mintHash}</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="p-3 rounded-xl bg-[#FCEAEB] border border-[#CC2233]/40 text-[#CC2233] text-xs text-center font-bold font-poppins">
              {message}
            </div>
          )}

          {/* Action Button */}
          {status !== 'success' ? (
            <button
              type="submit"
              disabled={status === 'processing'}
              className="w-full btn-cacao-pulse text-xs font-poppins uppercase tracking-wider text-center flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {status === 'processing' ? (
                'Procesando en Stripe & Blockchain...'
              ) : (
                <span>Comprar €{amount || '0'} EURT con Stripe ➔</span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-[#0077BB] hover:bg-[#005F96] text-white font-bold rounded-full text-xs transition font-poppins"
            >
              Cerrar y Volver
            </button>
          )}

        </form>

      </div>
    </div>
  );
}
