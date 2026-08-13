'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../hooks/useWallet';
import { ethers } from 'ethers';
import { CustomerRegistrationModal } from './customer-registration-modal';

const ECOMMERCE_ABI = [
  "function getEntityType(address account) view returns (uint8)",
  "function isCustomerRegistered(address _customer) view returns (bool)"
];

export function RegistrationCheck() {
  const { provider, address, isConnected } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [checkedAddress, setCheckedAddress] = useState<string | null>(null);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const checkRegistration = useCallback(async () => {
    if (!isConnected || !address) {
      setShowModal(false);
      return;
    }

    if (checkedAddress === address) return;

    try {
      // 1. Check local storage persistence first
      if (typeof window !== 'undefined') {
        const localReg = localStorage.getItem(`customer_reg_${address.toLowerCase()}`);
        if (localReg) {
          setCheckedAddress(address);
          setShowModal(false);
          return;
        }
      }

      // 2. Query on-chain smart contract
      const rpcProvider = provider || new ethers.JsonRpcProvider("http://localhost:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

      try {
        const entityType = await contract.getEntityType(address);
        if (Number(entityType) > 0) {
          setCheckedAddress(address);
          setShowModal(false);
          return;
        }
      } catch (e) {
        console.warn("Could not query getEntityType on-chain:", e);
      }

      // Address is connected but NOT registered on-chain or locally -> Prompt registration
      setCheckedAddress(address);
      setShowModal(true);

    } catch (err) {
      console.warn("Registration check error:", err);
    }
  }, [isConnected, address, provider, ecommerceAddress, checkedAddress]);

  useEffect(() => {
    checkRegistration();
  }, [checkRegistration]);

  return (
    <CustomerRegistrationModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      userAddress={address}
      onSuccess={() => {
        setShowModal(false);
      }}
    />
  );
}
