'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { loadStripe } from '@stripe/stripe-js';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';

// Clave publicable (test mode) â€” se tokeniza la tarjeta con Stripe Elements real
export const stripePromise = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY)
  : null;

const cardElementOptions = {
  style: {
    base: {
      fontSize: '14px',
      color: '#0f172a',
      fontFamily: 'monospace',
      '::placeholder': { color: '#94a3b8' },
    },
    invalid: { color: '#e11d48' },
  },
};

interface TopupFormProps {
  userAddress: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TopupForm({ userAddress, onClose, onSuccess }: TopupFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState<string>('50');
  const [targetWallet, setTargetWallet] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [txDetails, setTxDetails] = useState<{ stripeId?: string; mintHash?: string }>({});

  const compraUrl = process.env.NEXT_PUBLIC_COMPRA_STABLECOIN_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3003' : 'https://mcc-compra-stablecoin-1095249147821.europe-west1.run.app');

  useEffect(() => {
    if (userAddress) setTargetWallet(userAddress);
  }, [userAddress]);

  const handleExecuteTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const dest = targetWallet || userAddress;

    if (!stripe || !elements) {
      setStatus('error');
      setMessage('Stripe no estÃ¡ listo. Verifique NEXT_PUBLIC_STRIPE_PUBLIC_KEY.');
      return;
    }
    if (!dest || !ethers.isAddress(dest)) {
      setStatus('error');
      setMessage('Por favor introduzca una direcciÃ³n wallet Ethereum vÃ¡lida.');
      return;
    }
    const numericAmt = parseFloat(amount);
    if (isNaN(numericAmt) || numericAmt <= 0 || numericAmt > 10000) {
      setStatus('error');
      setMessage('Introduzca un monto vÃ¡lido en Euros (1 - 10000).');
      return;
    }

    try {
      setStatus('processing');
      setMessage('ðŸ¦Š 1/3: Solicitando autorizaciÃ³n y firma digital en su billetera MetaMask...');

      // 1. Firma Web3 (autorizaciÃ³n del titular de la wallet destino)
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

        authMessage = `AutorizaciÃ³n de Recarga EURT - BARLO-VENTAS\n\nMonto a recargar: ${amount} EURT\nBilletera destino: ${signerAddress}\nTimestamp: ${timestamp}`;
        try {
          signature = await activeSigner.signMessage(authMessage);
        } catch (sigErr: any) {
          throw new Error('Solicitud cancelada: Debe autorizar y firmar en MetaMask para realizar la recarga.');
        }
      } else {
        throw new Error('MetaMask no detectado en el navegador. Instale la extensiÃ³n para continuar.');
      }

      setMessage('ðŸ’³ 2/3: Procesando pago seguro con tarjeta en Stripe (Elements)...');

      // 2. Tokenizar la tarjeta con Stripe Elements (el PAN NUNCA toca el servidor)
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Elemento de tarjeta no disponible.');
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });
      if (pmError) throw new Error(pmError.message || 'Tarjeta invÃ¡lida.');
      if (!paymentMethod) throw new Error('No se pudo tokenizar la tarjeta.');

      // 3. Checkout on-chain: solo mintea EURT si Stripe confirma el pago
      const res = await fetch(`${compraUrl}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          walletAddress: dest,
          paymentMethodId: paymentMethod.id,
          signature,
          authMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.requiresAction && data.clientSecret) {
          throw new Error('El pago requiere verificaciÃ³n 3D Secure (tarjeta con desafÃ­o). Use una tarjeta de prueba sin 3DS (4242 4242 4242 4242).');
        }
        throw new Error(data.error || data.message || 'FallÃ³ la recarga en Stripe.');
      }

      setStatus('success');
      setTxDetails({
        stripeId: data.stripePaymentId,
        mintHash: data.mintTxHash,
      });
      setMessage(`Â¡Recarga exitosa! Se han emitido â‚¬${amount} EURT a su billetera comercial.`);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error en recarga Stripe embebida:', err);
      setStatus('error');
      setMessage(err.message || 'Error procesando la recarga.');
    }
  };

  return (
    <form onSubmit={handleExecuteTopup} className="space-y-4 text-xs">
      {status === 'error' && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl font-bold font-poppins">
          âš ï¸ {message}
        </div>
      )}

      {status === 'success' && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl space-y-2">
          <h4 className="font-bold text-sm text-emerald-800 font-poppins">ðŸŽ‰ {message}</h4>
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
          Monto a Recargar (â‚¬ EURT) *
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
              â‚¬{preset}
            </button>
          ))}
        </div>
        <input
          type="number"
          required
          min="1"
          max="10000"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-extrabold font-mono text-sm focus:border-indigo-600 focus:outline-none transition shadow-xs"
        />
      </div>

      <div className="pt-2 border-t border-slate-200 space-y-2">
        <label className="block font-bold text-slate-800 font-poppins">
          Tarjeta de CrÃ©dito / DÃ©bito (Stripe Elements â€” PCI-DSS)
        </label>
        <div className="bg-white border border-slate-300 rounded-xl px-4 py-3 shadow-xs">
          <CardElement options={cardElementOptions} />
        </div>
        <p className="text-[10px] text-slate-400 font-mono">
          Tarjeta de prueba: 4242 4242 4242 4242 Â· Exp 12/34 Â· CVC 123 Â· ZIP 12345
        </p>
      </div>

      <div className="pt-3">
        <button
          type="submit"
          disabled={status === 'processing' || !stripe}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 uppercase tracking-wider disabled:opacity-50 transition flex items-center justify-center gap-2 font-poppins"
        >
          {status === 'processing' ? message : `ðŸ’³ Confirmar Pago (â‚¬${amount} EURT) y Autorizar en MetaMask âž”`}
        </button>
      </div>
    </form>
  );
}

