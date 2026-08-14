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
      // 1. Check local storage persistence first
      if (typeof window !== 'undefined') {
        const localReg = localStorage.getItem(`customer_reg_${address.toLowerCase()}`);
        if (localReg) {
          setCheckedAddress(address);
          setIsRegistered(true);
          setShowModal(false);
          return;
        }
      }

      // 2. Query on-chain smart contract using direct RPC provider
      const rpcProvider = new ethers.JsonRpcProvider("http://localhost:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

      let registered = false;

      try {
        const isReg = await contract.isCustomerRegistered(address);
        if (isReg) registered = true;
      } catch (e) {
        console.warn("Could not query isCustomerRegistered:", e);
      }

      if (!registered) {
        try {
          const entityType = await contract.getEntityType(address);
          if (Number(entityType) > 0) registered = true;
        } catch (e) {
          console.warn("Could not query getEntityType:", e);
        }
      }

      setCheckedAddress(address);
      setIsRegistered(registered);

      if (registered) {
        setShowModal(false);
      } else {
        // Address is connected but NOT registered on-chain or locally -> MANDATORY REDIRECT TO PROFILE REGISTRATION!
        setShowModal(true);
        if (pathname !== '/profile') {
          router.replace('/profile?register=true');
        }
      }

    } catch (err) {
      console.warn("Registration check error:", err);
    }
  }, [isConnected, address, ecommerceAddress, pathname, router]);

  useEffect(() => {
    checkRegistration();
  }, [checkRegistration]);

  // MANDATORY ROUTE GUARD: If connected wallet is unregistered, enforce /profile navigation
  useEffect(() => {
    if (isConnected && address && isRegistered === false && pathname !== '/profile') {
      setShowModal(true);
      router.replace('/profile?register=true');
    }
  }, [isConnected, address, isRegistered, pathname, router]);

  return (
    <CustomerRegistrationModal
      isOpen={showModal && isConnected && isRegistered === false}
      onClose={() => {
        // Closing modal without registration is restricted unless disconnected
        setShowModal(false);
      }}
      userAddress={address}
      onSuccess={() => {
        setIsRegistered(true);
        setShowModal(false);
        if (typeof window !== 'undefined') {
          window.location.href = '/profile';
        }
      }}
    />
  );
}
