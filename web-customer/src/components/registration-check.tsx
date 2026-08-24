'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../hooks/useWallet';
import { ethers } from 'ethers';
import { useRouter, usePathname } from 'next/navigation';

// B7: tupla alineada con CustomerLib.Customer real
const ECOMMERCE_ABI = [
  "function getEntityType(address account) view returns (uint8)",
  "function isCustomerRegistered(address _customer) view returns (bool)"
];

/**
 * Vigilante global de registro (layout): si la wallet conectada NO está inscrita on-chain,
 * redirige a la página completa /register (sin formularios flotantes).
 */
export function RegistrationCheck() {
  const { address, isConnected } = useWallet();
  const router = useRouter();
  const pathname = usePathname();

  const [checked, setChecked] = useState(false);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const checkRegistration = useCallback(async () => {
    if (!isConnected || !address) {
      setChecked(false);
      return;
    }
    try {
      const rpcProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

      let registered = false;
      try { registered = await contract.isCustomerRegistered(address); } catch {}
      if (!registered) {
        try { const type = await contract.getEntityType(address); if (Number(type) > 0) registered = true; } catch {}
      }

      setChecked(true);

      // Si NO está inscrito y no está ya en /register ni en /help, redirigir a la página completa
      if (!registered && pathname !== '/register' && pathname !== '/help' && pathname !== '/companies') {
        const redirect = encodeURIComponent(pathname || '/');
        router.push(`/register?redirect=${redirect}`);
      }
    } catch (err) {
      console.warn("Registration check error:", err);
    }
  }, [isConnected, address, ecommerceAddress, pathname, router]);

  useEffect(() => {
    checkRegistration();
  }, [checkRegistration]);

  // Evento global (p. ej. carrito): redirigir a /register
  useEffect(() => {
    const handleOpenRegistration = () => {
      if (pathname === '/register') return;
      const redirect = encodeURIComponent(pathname || '/');
      router.push(`/register?redirect=${redirect}`);
    };
    window.addEventListener('open-customer-registration', handleOpenRegistration);
    return () => {
      window.removeEventListener('open-customer-registration', handleOpenRegistration);
    };
  }, [pathname, router]);

  return null;
}
