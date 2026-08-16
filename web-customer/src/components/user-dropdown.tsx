'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useCart } from '../hooks/useCart';
import { ethers } from 'ethers';
import Link from 'next/link';
import { StripeTopupModal } from './stripe-topup-modal';
import { KycModal } from './kyc-modal';

export function UserDropdown() {
  const { provider, address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const { items, total } = useCart(provider, null, null, address);

  const [isOpen, setIsOpen] = useState(false);
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [eurtBalance, setEurtBalance] = useState<string>('0.00');
  const [ethBalance, setEthBalance] = useState<string>('0.0000');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [userName, setUserName] = useState<string>('');
  const [isRegistered, setIsRegistered] = useState<boolean>(true);
  const [isKycVerified, setIsKycVerified] = useState<boolean>(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState<boolean>(false);

  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';

  const fetchUserData = useCallback(async () => {
    if (!address) {
      setEurtBalance('0.00');
      setEthBalance('0.0000');
      setUserName('');
      setIsRegistered(true);
      setIsKycVerified(false);
      return;
    }
    try {
      const rpcProvider = provider || new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://mcc-foundry-anvil-1095249147821.europe-west1.run.app');

      // 1. Fetch ETH Balance
      const rawEth = await rpcProvider.getBalance(address);
      setEthBalance((Number(rawEth) / 1e18).toFixed(4));

      // 2. Fetch EURT Balance
      const tokenContract = new ethers.Contract(
        euroTokenAddress,
        ['function balanceOf(address account) view returns (uint256)'],
        rpcProvider
      );
      const rawEurt = await tokenContract.balanceOf(address);
      setEurtBalance((Number(rawEurt) / 1e6).toFixed(2));

      // 3. Fetch Registration, User Name & KYC Verification Status on-chain
      let isReg = false;
      let fetchedName = '';
      let kyc = false;

      try {
        const ecomContract = new ethers.Contract(
          ecommerceAddress,
          [
            'function isCustomerRegistered(address account) view returns (bool)',
            'function isKYCVerified(address account) view returns (bool)',
            'function getCustomer(address _customer) view returns (tuple(uint256 id, address customerAddress, string name, string contactEmail, string shippingAddress, bool isKYCVerified, uint256 registrationDate))'
          ],
          rpcProvider
        );

        isReg = await ecomContract.isCustomerRegistered(address);
        kyc = await ecomContract.isKYCVerified(address);

        const cust = await ecomContract.getCustomer(address);
        if (cust && cust.name && cust.name.trim() !== '') {
          fetchedName = cust.name;
        }
      } catch (e) {
        console.warn('KYC/Customer fetch warning:', e);
      }

      setIsRegistered(isReg);
      setUserName(fetchedName || (isReg ? `Cliente ${address.slice(0, 6)}...${address.slice(-4)}` : 'Cuenta No Inscrita'));
      setIsKycVerified(kyc);

    } catch (e) {
      console.warn('Error fetching user data:', e);
    }
  }, [address, provider, euroTokenAddress, ecommerceAddress]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatPrice = (price: bigint) => {
    return (Number(price) / 1_000_000).toFixed(2);
  };

  if (!isConnected || !address) {
    return (
      <button
        onClick={() => connect()}
        disabled={isConnecting}
        className="btn-cacao-pulse text-xs text-white font-bold transition disabled:opacity-50"
      >
        {isConnecting ? 'Conectando Wallet...' : 'Conectar Billetera Web3'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      {/* 1. REGISTRATION BUTTON IN TOP NAVBAR FOR UNREGISTERED CONNECTED WALLETS */}
      {!isRegistered && (
        <Link
          href="/profile?register=true"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#FF8800] via-[#E07700] to-[#FF8800] hover:from-[#E07700] hover:to-[#C66800] text-white font-black text-xs shadow-md shadow-[#FF8800]/30 animate-pulse hover:animate-none transition-all font-poppins shrink-0"
        >
          <span className="text-sm">📝</span>
          <span className="hidden sm:inline">Inscribir Cuenta Web3</span>
          <span className="sm:hidden">Inscribir</span>
        </Link>
      )}

      {/* 2. USER BADGE & DROPDOWN MENU */}
      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button in Navbar */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-50 border transition shadow-sm ${
            !isRegistered ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-[#0077BB]/20'
          }`}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md font-poppins ${
            !isRegistered ? 'bg-gradient-to-tr from-amber-500 to-orange-600' : 'bg-gradient-to-tr from-[#0077BB] to-[#FF8800]'
          }`}>
            {address.slice(2, 4).toUpperCase()}
          </div>
          <div className="text-left hidden sm:block">
            <span className="text-xs font-black text-[#333333] block leading-tight font-poppins max-w-[140px] truncate">
              {userName}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-[#2E8B57] font-mono font-bold">
                €{eurtBalance} EURT
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                !isRegistered 
                  ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                  : isKycVerified 
                  ? 'bg-[#EAF5EF] text-[#2E8B57]' 
                  : 'bg-[#FFF3E5] text-[#FF8800]'
              }`}>
                {!isRegistered ? '⚠️ No Inscrito' : isKycVerified ? '✓ Verificado' : '⚠️ Inscrito'}
              </span>
            </div>
          </div>
          <span className="text-xs text-[#0077BB] font-bold">▾</span>
        </button>

        {/* DROPDOWN MENU */}
        {isOpen && (
          <div className="absolute right-0 mt-3 w-84 glass-card p-4 z-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* Header */}
            <div className="border-b border-[#0077BB]/10 pb-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-[#0077BB] uppercase tracking-wider block font-poppins">
                  Estado de Usuario
                </span>
                <h3 className="font-black text-sm text-[#333333] truncate font-poppins">
                  {userName}
                </h3>
                <span className="font-mono text-[11px] text-[#A9A9A9] block">
                  {address.slice(0, 10)}...{address.slice(-6)}
                </span>
              </div>
              {!isRegistered ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 font-poppins shrink-0">
                  ⚠️ No Inscrito
                </span>
              ) : isKycVerified ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EAF5EF] text-[#2E8B57] border border-[#2E8B57]/30 font-poppins shrink-0">
                  ✓ Verificado
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FFF3E5] text-[#FF8800] border border-[#FF8800]/40 font-poppins shrink-0">
                  ⚠️ Inscrito
                </span>
              )}
            </div>

            {/* UNREGISTERED WALLET PROMPT BANNER */}
            {!isRegistered && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-400 p-3.5 rounded-xl space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-amber-900 font-poppins flex items-center gap-1">
                    <span>⚠️</span> Inscripción Obligatoria
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded font-mono">Paso 1/2</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-tight font-sans">
                  Tu billetera <strong>{address.slice(0, 6)}...{address.slice(-4)}</strong> no está inscripta en BARLO-VENTAS. Inscríbete para registrar tus datos on-chain y comprar con EuroTokens.
                </p>
                <Link
                  href="/profile?register=true"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2.5 bg-gradient-to-r from-[#FF8800] to-[#E07700] hover:from-[#E07700] hover:to-[#C66800] text-white font-black text-xs rounded-xl shadow-md transition font-poppins flex items-center justify-center gap-1.5"
                >
                  <span>📝</span> Completar Inscripción de Cuenta ➔
                </Link>
              </div>
            )}

            {/* KYC Prompt Banner if Registered but NOT Verified */}
            {isRegistered && !isKycVerified && (
              <div className="bg-[#FFF3E5] border border-[#FF8800]/40 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#FF8800] font-poppins">⚠️ Estado: Pendiente KYC</span>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Carrito Bloqueado</span>
                </div>
                <p className="text-[11px] text-[#333333] leading-tight">
                  Su cuenta está en estado <strong>Inscrito</strong>. Complete la verificación de identidad (DNI + Foto) para habilitar compras y recargas EURT.
                </p>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsKycModalOpen(true);
                  }}
                  className="w-full py-2 bg-[#FF8800] hover:bg-[#E07700] text-white font-black text-xs rounded-xl shadow-md transition font-poppins flex items-center justify-center gap-1.5"
                >
                  <span>🪪</span> Realizar Proceso de Verificación KYC ➔
                </button>
              </div>
            )}

          {/* Balances Card */}
          <div className="bg-white/80 border border-[#0077BB]/15 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-[#0077BB] block tracking-wider font-poppins">
                Saldos en Billetera
              </span>
              <Link
                href="/topup"
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-bold text-[#FF8800] hover:underline font-poppins flex items-center gap-0.5"
              >
                + Recargar
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#EAF5EF] p-2.5 rounded-lg border border-[#2E8B57]/20">
                <span className="text-[10px] text-[#2E8B57] font-mono block font-semibold">EuroToken (EURT)</span>
                <span className="text-sm font-black font-mono text-[#2E8B57]">€{eurtBalance}</span>
              </div>
              <div className="bg-[#E6F4FA] p-2.5 rounded-lg border border-[#0077BB]/20">
                <span className="text-[10px] text-[#0077BB] font-mono block font-semibold">Ethereum (ETH)</span>
                <span className="text-sm font-black font-mono text-[#0077BB]">{ethBalance} ETH</span>
              </div>
            </div>

            {/* Direct Link to /topup Section */}
            <Link
              href="/topup"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 bg-[#FFF3E5] hover:bg-[#FFE8CC] text-[#FF8800] border border-[#FF8800]/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 font-poppins"
            >
              <span>💳</span> Recargar EURT con Stripe ➔
            </Link>
          </div>

          {/* Cart Summary */}
          <div className="bg-white/80 border border-[#0077BB]/15 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#0077BB] uppercase block font-poppins">Resumen del Carrito</span>
              <span className="text-xs font-semibold text-[#333333]">
                {items.length} producto(s) &bull; €{formatPrice(total)} EURT
              </span>
            </div>
            <Link
              href="/cart"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 bg-[#FF8800] hover:bg-[#E07700] text-white rounded-lg text-xs font-bold shadow-sm transition font-poppins"
            >
              Ir al Carrito
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1 pt-1 border-t border-[#0077BB]/10">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#E6F4FA] text-xs font-bold text-[#333333] hover:text-[#0077BB] transition font-poppins"
            >
              <span>👤 Perfil y Direcciones de Envío</span>
            </Link>

            <Link
              href="/finance"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#E6F4FA] text-xs font-bold text-[#333333] hover:text-[#0077BB] transition font-poppins"
            >
              <span>📊 Finanzas del Usuario</span>
            </Link>

            <Link
              href="/orders"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#E6F4FA] text-xs font-bold text-[#333333] hover:text-[#0077BB] transition font-poppins"
            >
              <span>📦 Mis Pedidos y Facturas</span>
            </Link>
          </div>

          {/* Disconnect Button */}
          <div className="pt-2 border-t border-[#0077BB]/10">
            <button
              onClick={() => {
                disconnect();
                setIsOpen(false);
              }}
              className="w-full py-2 bg-[#FCEAEB] hover:bg-rose-100 text-[#CC2233] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 font-poppins"
            >
              <span>🔌 Desconectar Wallet</span>
            </button>
          </div>

        </div>
      )}

      {/* STRIPE TOP-UP MODAL */}
      <StripeTopupModal
        isOpen={isStripeModalOpen}
        onClose={() => setIsStripeModalOpen(false)}
        userAddress={address}
        onSuccess={fetchUserData}
      />

      {/* KYC VERIFICATION MODAL */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        userAddress={address}
        onSuccess={() => {
          setIsKycModalOpen(false);
          fetchUserData();
        }}
      />
    </div>
    </div>
  );
}
