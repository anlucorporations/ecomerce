'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useWallet } from '../hooks/useWallet';
import { useCart } from '../hooks/useCart';
import { ethers } from 'ethers';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { provider, address, isConnected, isConnecting, connect } = useWallet();
  const { items } = useCart(provider, null, null, address);

  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isKycVerified, setIsKycVerified] = useState<boolean>(false);

  const cartCount = items.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';

  // Check Registration & KYC Status on-chain for the connected wallet
  useEffect(() => {
    async function checkVerification() {
      if (!address) {
        setIsRegistered(false);
        setIsKycVerified(false);
        return;
      }
      try {
        const rpcProvider = provider || new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545');
        const contract = new ethers.Contract(
          ecommerceAddress,
          [
            'function isCustomerRegistered(address account) view returns (bool)',
            'function isKYCVerified(address account) view returns (bool)',
          ],
          rpcProvider
        );
        const [reg, kyc] = await Promise.all([
          contract.isCustomerRegistered(address).catch(() => false),
          contract.isKYCVerified(address).catch(() => false),
        ]);
        setIsRegistered(Boolean(reg));
        setIsKycVerified(Boolean(kyc));
      } catch (e) {
        console.warn('BottomNav verification check warning:', e);
      }
    }

    checkVerification();
  }, [address, provider, ecommerceAddress]);

  const navItems = [
    {
      name: 'Inicio',
      href: '/',
      icon: '🏠',
    },
    {
      name: 'Catálogo',
      href: '/#catalog',
      icon: '🛍️',
    },
    {
      name: 'Carrito',
      href: '/cart',
      icon: '🛒',
      badge: cartCount > 0 ? cartCount : null,
    },
    {
      name: 'Pedidos',
      href: '/orders',
      icon: '📦',
    },
  ];

  // Handler for Wallet Button Click
  const handleWalletClick = () => {
    if (!isConnected || !address) {
      connect();
    } else if (!isRegistered) {
      router.push('/profile?register=true');
    } else {
      router.push('/profile');
    }
  };

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-2xl px-2 py-1.5 safe-area-bottom">
      <div className="flex items-center justify-around">
        
        {/* Regular Navigation Items */}
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition min-w-[54px] min-h-[48px] ${
                isActive
                  ? 'text-[#0077BB] font-black'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative text-lg leading-none">
                <span>{item.icon}</span>
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 bg-[#FF8800] text-white text-[10px] font-black rounded-full min-w-[16px] text-center shadow-xs animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-poppins mt-1 tracking-tight">{item.name}</span>
            </Link>
          );
        })}

        {/* 3. BILLETERA WEB3 CON ESTADOS (Desconectado / Conectado / Escudo Verde / Escudo Amarillo) */}
        <button
          onClick={handleWalletClick}
          className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition min-w-[58px] min-h-[48px] ${
            pathname === '/profile'
              ? 'text-[#0077BB] font-black'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
          title={
            !isConnected
              ? 'Billetera Desconectada - Clic para Conectar'
              : isKycVerified
              ? 'Usuario Verificado On-Chain'
              : 'Usuario No Verificado (Pendiente KYC / Inscripción)'
          }
        >
          {/* ESTADO 1: DESCONECTADO */}
          {!isConnected || !address ? (
            <>
              <div className="relative">
                <svg className="w-5 h-5 text-slate-400 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-slate-400 ring-2 ring-white" />
              </div>
              <span className="text-[10px] font-poppins mt-1 text-slate-500 font-bold">
                {isConnecting ? '...' : 'Conectar'}
              </span>
            </>
          ) : isKycVerified ? (
            /* ESTADO 3: USUARIO VERIFICADO (ESCUDO DE COLOR VERDE) */
            <>
              <div className="relative animate-in fade-in zoom-in-90 duration-150">
                <svg className="w-5 h-5 text-emerald-600 fill-emerald-500/25 stroke-emerald-600 stroke-2 drop-shadow-xs" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
              </div>
              <span className="text-[10px] font-poppins mt-1 text-emerald-700 font-extrabold">
                Verificado
              </span>
            </>
          ) : (
            /* ESTADO 4: USUARIO NO VERIFICADO / PENDIENTE (ESCUDO DE COLOR AMARILLO) */
            <>
              <div className="relative animate-in fade-in zoom-in-90 duration-150">
                <svg className="w-5 h-5 text-amber-500 fill-amber-400/25 stroke-amber-600 stroke-2 drop-shadow-xs" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M12 8v4m0 4h.01" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
              </div>
              <span className="text-[10px] font-poppins mt-1 text-amber-700 font-extrabold truncate max-w-[58px]">
                {!isRegistered ? 'Inscribir' : 'Sin KYC'}
              </span>
            </>
          )}
        </button>

      </div>
    </nav>
  );
}
