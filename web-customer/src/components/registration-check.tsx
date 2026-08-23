'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../hooks/useWallet';
import { ethers } from 'ethers';
import { useRouter, usePathname } from 'next/navigation';
import { CustomerRegistrationModal } from './customer-registration-modal';

const ECOMMERCE_ABI = [
  "function getEntityType(address account) view returns (uint8)",
  "function isCustomerRegistered(address _customer) view returns (bool)",
  "function getCustomer(address _customer) view returns (tuple(uint256 id, address customerAddress, string name, string contactEmail, string shippingAddress, bool isKYCVerified, uint256 registrationDate))"
];

export function RegistrationCheck() {
  const { address, isConnected, disconnect } = useWallet();
  const router = useRouter();
  const pathname = usePathname();

  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [checkedAddress, setCheckedAddress] = useState<string | null>(null);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const checkRegistration = useCallback(async () => {
    if (!isConnected || !address) {
      setIsRegistered(null);
      setShowModal(false);
      return;
    }

    try {
      // Query on-chain smart contract using direct RPC provider (Strict Source of Truth)
      const rpcProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

      let registered = false;
      try {
        registered = await contract.isCustomerRegistered(address);
      } catch (e) {
        console.warn("Could not query isCustomerRegistered:", e);
      }

      // Check entity type fallback
      if (!registered) {
        try {
          const type = await contract.getEntityType(address);
          if (Number(type) > 0) registered = true;
        } catch (e) {
          console.warn("Could not query getEntityType:", e);
        }
      }

      // Check local persistence fallback
      if (!registered && typeof window !== 'undefined') {
        const localReg = localStorage.getItem(`customer_reg_${address.toLowerCase()}`);
        if (localReg) registered = true;
      }

      setCheckedAddress(address);
      setIsRegistered(registered);

      if (registered) {
        setShowModal(false);
      } else if (pathname === '/profile' && typeof window !== 'undefined' && window.location.search.includes('register=true')) {
        setShowModal(true);
      }

    } catch (err) {
      console.warn("Registration check error:", err);
    }
  }, [isConnected, address, ecommerceAddress, pathname]);

  useEffect(() => {
    checkRegistration();
  }, [checkRegistration]);

  useEffect(() => {
    const handleOpenModal = () => setShowModal(true);
    window.addEventListener('open-customer-registration', handleOpenModal);
    return () => {
      window.removeEventListener('open-customer-registration', handleOpenModal);
    };
  }, []);

  return (
    <CustomerRegistrationModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      userAddress={address}
      onSuccess={() => {
        setIsRegistered(true);
        setShowModal(false);
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }}
    />
  );
}

