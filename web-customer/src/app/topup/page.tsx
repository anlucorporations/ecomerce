'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { ethers } from 'ethers';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KycModal } from '@/components/kyc-modal';

import AddEurtModal from '@/components/add-eurt-modal';

export default function TopupPage() {
  const { provider, address, isConnected, connect } = useWallet();
  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  const [amount, setAmount] = useState<string>('50');
  const [targetWallet, setTargetWallet] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState<string>('12/28');
  const [cvc, setCvc] = useState<string>('123');
  const [holderName, setHolderName] = useState<string>('Cliente BARLO-VENTAS');

  const [eurtBalance, setEurtBalance] = useState<string>('0.00');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [txDetails, setTxDetails] = useState<{ stripeId?: string; mintHash?: string }>({});
  const [isEurtModalOpen, setIsEurtModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (address) {
      setTargetWallet(address);
    }
  }, [address]);

  const fetchBalance = async () => {
    if (!address && !targetWallet) return;
    const dest = targetWallet || address;
    if (!dest || !ethers.isAddress(dest)) return;

    try {
      const rpcProvider = provider || new ethers.JsonRpcProvider('http://localhost:8545');
      const tokenContract = new ethers.Contract(
        euroTokenAddress,
        ['function balanceOf(address account) view returns (uint256)'],
        rpcProvider
      );
      const rawEurt = await tokenContract.balanceOf(dest);
      setEurtBalance((Number(rawEurt) / 1e6).toFixed(2));
    } catch (e) {
      console.warn('Error fetching EURT balance:', e);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [address, targetWallet, provider, euroTokenAddress]);

  const [isKYCModalOpen, setIsKYCModalOpen] = useState<boolean>(false);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';

  const handleExecuteTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const dest = targetWallet || address;

    if (!dest || !ethers.isAddress(dest)) {
      setStatus('error');
      setMessage('Por favor introduzca o conecte una dirección de billetera Ethereum válida.');
      return;
    }

    const numericAmt = parseFloat(amount);
    if (isNaN(numericAmt) || numericAmt <= 0) {
      setStatus('error');
      setMessage('Introduzca un monto válido en Euros.');
      return;
    }

    // Enforce KYC Check (Inscrito vs Verificado)
    let isVerified = false;
    try {
      const rpcProvider = provider || new ethers.JsonRpcProvider('http://localhost:8545');
      const contract = new ethers.Contract(
        ecommerceAddress,
        ['function isKYCVerified(address account) view returns (bool)'],
        rpcProvider
      );
      isVerified = await contract.isKYCVerified(dest);
    } catch (e) {
      console.warn('isKYCVerified check warning:', e);
    }

    // Check local persistence for instant reflect after KycModal completes
    if (!isVerified && typeof window !== 'undefined') {
      const localKyc = localStorage.getItem(`kyc_verified_${dest.toLowerCase()}`);
      if (localKyc === 'true') {
        isVerified = true;
      }
    }

    if (!isVerified) {
      setIsKYCModalOpen(true);
      setStatus('error');
      setMessage('🔒 Acceso Restringido: Su cuenta está en estado "Inscrito". Complete la Verificación KYC para habilitar la compra de EURT con Stripe.');
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

      // Request Web3 signature authorization popup in MetaMask
      const authMessage = `Autorizar recarga de €${numericAmt.toFixed(2)} EURT para ${dest}`;
      let signature = '';
      try {
        signature = await walletSigner.signMessage(authMessage);
      } catch (sigErr) {
        console.warn('MetaMask signMessage warning, falling back to 0-ETH auth transaction:', sigErr);
        const authTx = await walletSigner.sendTransaction({
          to: dest,
          value: BigInt(0),
        });
        await authTx.wait();
      }

      setMessage('2/2 Procesando emisión de EuroTokens (EURT) en la blockchain...');

      let mintedOnChain = false;

      // 2. Call API checkout service
      try {
        const compraUrl = process.env.NEXT_PUBLIC_COMPRA_STABLECOIN_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3003' : 'https://mcc-compra-stablecoin-1095249147821.europe-west1.run.app');
        const res = await fetch(`${compraUrl}/api/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            walletAddress: dest,
            paymentMethodId: 'pm_card_visa',
            signature,
            authMessage
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
        throw new Error(apiErr?.message || "No se pudo conectar con el servicio de compra EURT.");
      }

      if (!mintedOnChain) {
        throw new Error("No se confirmó la emisión de tokens EURT por parte del servidor.");
      }

      setStatus('success');
      setMessage(`¡Recarga completada y autorizada con éxito! Se han emitido €${numericAmt.toFixed(2)} EURT a su billetera.`);
      fetchBalance();
    } catch (err: any) {
      console.error('Error during EURT topup:', err);
      setStatus('error');
      setMessage(err?.reason || err?.message || 'Error autorizando la recarga en MetaMask.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] py-10 px-4 sm:px-6 lg:px-8 selection:bg-[#FF8800] selection:text-white bg-wave-pattern">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* 1. HERO BANNER - AZUL CARIBE & NARANJA CACAO SOL */}
        <div className="bg-gradient-to-br from-[#0077BB] via-[#005F96] to-[#003B5C] text-white p-8 sm:p-10 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/30 font-poppins">
              <span>💳 Recarga Oficial &bull; BARLO-VENTAS Web3</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight font-poppins">
              Sección de Recarga en <span className="text-[#FF8800]">EuroToken (EURT)</span>
            </h1>
            <p className="text-xs sm:text-sm text-sky-100 font-medium max-w-2xl leading-relaxed">
              Adquiera EuroTokens a paridad 1 EUR = 1 EURT mediante Stripe sin comisiones de red. Los fondos quedan disponibles de inmediato en su billetera para realizar compras con Custodia Escrow.
            </p>

            <div className="pt-2">
              <button
                onClick={() => setIsEurtModalOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2 transform active:scale-95 font-poppins"
              >
                <span>🦊</span>
                <span>Agregar Token EURT a MetaMask</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. GUARANTEE CARDS (GLASSMORPHISM) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          <div className="glass-card p-5 space-y-2 border-l-4 border-l-[#2E8B57]">
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#2E8B57] text-white uppercase font-poppins">
                TASA FIJA 1:1
              </span>
              <span className="text-[11px] font-mono text-[#2E8B57] font-bold">1 EUR = 1 EURT</span>
            </div>
            <h3 className="text-base font-bold text-[#333333] font-poppins">Sin Comisiones de Conversión</h3>
            <p className="text-xs text-[#A9A9A9] leading-relaxed">
              Cada Euro abonado emite exactamente 1.00 EuroToken directo a su saldo en la blockchain.
            </p>
          </div>

          <div className="glass-card p-5 space-y-2 border-l-4 border-l-[#0077BB]">
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#0077BB] text-white uppercase font-poppins">
                EMISIÓN INSTANTÁNEA
              </span>
              <span className="text-[11px] font-mono text-[#0077BB] font-bold">&lt; 3 Segundos</span>
            </div>
            <h3 className="text-base font-bold text-[#333333] font-poppins">Minteo Directo On-Chain</h3>
            <p className="text-xs text-[#A9A9A9] leading-relaxed">
              Los tokens se mintean en el smart contract ERC-20 al instante tras confirmar el pago con tarjeta.
            </p>
          </div>

          <div className="glass-card p-5 space-y-2 border-l-4 border-l-[#FF8800]">
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#FF8800] text-white uppercase font-poppins">
                SEGURIDAD PCI-DSS
              </span>
              <span className="text-[11px] font-mono text-[#FF8800] font-bold">Stripe Protected</span>
            </div>
            <h3 className="text-base font-bold text-[#333333] font-poppins">Cifrado Bancario SSL 256-bit</h3>
            <p className="text-xs text-[#A9A9A9] leading-relaxed">
              Procesamiento de tarjeta auditado y protegido con estándares de seguridad PCI-DSS Nivel 1.
            </p>
          </div>

        </div>

        {/* 3. FORMULARIO COMPLETO DE RECARGA (ESTILO WEB CUSTOMER) */}
        <div className="max-w-2xl mx-auto">
          <div className="glass-card p-6 sm:p-8 shadow-2xl border-2 border-[#0077BB]/20 space-y-6 relative overflow-hidden">
            
            {/* Header Logo */}
            <div className="text-center space-y-2 border-b border-[#0077BB]/10 pb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0077BB] via-[#005F96] to-[#FF8800] text-white font-black text-2xl shadow-md font-poppins">
                💳
              </div>
              <h2 className="text-2xl font-black text-[#333333] font-poppins">
                Formulario de Recarga <span className="text-[#FF8800]">EURT</span>
              </h2>
              <p className="text-xs font-semibold text-[#0077BB] font-poppins">
                BARLO-VENTAS Web3 &bull; Saldo Disponible Actual: €{eurtBalance} EURT
              </p>
            </div>

            {/* Wallet Connection Status Banner */}
            {!isConnected || !address ? (
              <div className="bg-[#E6F4FA] border border-[#0077BB]/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔌</span>
                  <div className="text-left">
                    <span className="text-xs font-bold text-[#0077BB] block font-poppins">Billetera Web3 No Conectada</span>
                    <span className="text-[11px] text-[#333333]">Conecte su billetera MetaMask para autollenar la dirección de destino.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => connect()}
                  className="btn-cacao-pulse px-4 py-2 text-xs font-bold font-poppins shrink-0"
                >
                  Conectar MetaMask
                </button>
              </div>
            ) : (
              <div className="bg-[#EAF5EF] border border-[#2E8B57]/30 p-3 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-[#2E8B57] font-bold font-poppins">✓ Billetera Conectada:</span>
                <span className="font-mono font-bold text-[#333333]">{address.slice(0, 8)}...{address.slice(-6)}</span>
              </div>
            )}

            <form onSubmit={handleExecuteTopup} className="space-y-6">
              
              {/* Preset Amounts Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#333333] font-poppins">
                  Seleccione el Monto a Recargar en Euros (€):
                </label>

                <div className="grid grid-cols-5 gap-2">
                  {['10', '25', '50', '100', '250'].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setAmount(val)}
                      className={`py-2.5 rounded-xl text-xs font-black border transition font-poppins ${
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
                    placeholder="Monto personalizado"
                    className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-4 py-2.5 text-xs text-[#333333] font-mono font-bold focus:outline-none focus:border-[#0077BB]"
                    required
                  />
                  <span className="absolute right-3.5 top-3.5 text-xs font-bold text-[#A9A9A9] font-mono">EUR</span>
                </div>
              </div>

              {/* Destination Wallet Address Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-[#333333] font-poppins">
                    Billetera Ethereum de Destino (Wallet):
                  </label>
                  <button
                    type="button"
                    onClick={() => connect()}
                    className="text-[11px] text-[#0077BB] font-bold hover:underline font-poppins flex items-center gap-1"
                  >
                    <span>🦊</span> Detectar mi MetaMask
                  </button>
                </div>

                <input
                  type="text"
                  value={targetWallet}
                  onChange={(e) => setTargetWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#2E8B57] font-bold focus:outline-none focus:border-[#2E8B57]"
                  required
                />
              </div>

              {/* Stripe Credit Card Section */}
              <div className="bg-white/90 rounded-2xl p-4 border border-[#0077BB]/15 space-y-3 text-xs shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#333333] font-poppins">Datos de Tarjeta Stripe (Demo PCI-DSS):</span>
                  <span className="text-[10px] font-mono font-bold bg-[#E6F4FA] text-[#0077BB] px-2.5 py-0.5 rounded border border-[#0077BB]/20">
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

              {/* Status Feedback */}
              {status === 'processing' && (
                <div className="p-3.5 rounded-xl bg-[#FFF3E5] border border-[#FF8800]/40 text-[#FF8800] text-xs text-center font-bold animate-pulse font-poppins">
                  {message}
                </div>
              )}

              {status === 'success' && (
                <div className="p-4 rounded-xl bg-[#EAF5EF] border border-[#2E8B57]/40 text-[#2E8B57] text-xs space-y-2 text-center">
                  <p className="font-bold text-sm font-poppins">¡Recarga Procesada Exitosamente!</p>
                  <div className="text-[11px] text-[#333333] font-mono text-left bg-white p-3 rounded-lg border border-[#2E8B57]/20 space-y-1">
                    <p><span className="text-[#A9A9A9]">Stripe Payment ID:</span> {txDetails.stripeId}</p>
                    <p className="truncate"><span className="text-[#A9A9A9]">Mint Tx Hash:</span> {txDetails.mintHash}</p>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="p-3.5 rounded-xl bg-[#FCEAEB] border border-[#CC2233]/40 text-[#CC2233] text-xs text-center font-bold font-poppins">
                  {message}
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={status === 'processing'}
                className="btn-cacao-pulse w-full text-xs font-poppins uppercase tracking-wider text-center flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {status === 'processing' ? (
                  'Procesando en Stripe & Blockchain...'
                ) : (
                  <span>Comprar €{amount || '0'} EURT con Stripe ➔</span>
                )}
              </button>

            </form>

            <div className="text-center pt-2">
              <Link
                href="/cart"
                className="text-xs font-bold text-[#0077BB] hover:underline font-poppins"
              >
                ← Volver al Carrito de Compras
              </Link>
            </div>

          </div>
        </div>

      </div>

      <KycModal
        isOpen={isKYCModalOpen}
        onClose={() => setIsKYCModalOpen(false)}
        userAddress={targetWallet || address}
        onSuccess={() => {
          setIsKYCModalOpen(false);
          setStatus('idle');
          setMessage('');
          fetchBalance();
        }}
        customTitle="Verificación KYC Requerida para Comprar EURT"
        customReason="Su cuenta se encuentra actualmente en estado 'Inscrito'. Para adquirir o recargar EuroTokens (EURT) mediante Stripe PCI-DSS, debe completar la verificación de identidad."
      />

      {/* 🦊 MODAL AGREGAR EURT A METAMASK */}
      <AddEurtModal isOpen={isEurtModalOpen} onClose={() => setIsEurtModalOpen(false)} />
    </div>
  );
}
