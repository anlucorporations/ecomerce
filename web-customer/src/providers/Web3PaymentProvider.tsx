'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface Web3PaymentContextType {
  account: string | null;
  eurtBalance: string;
  ethBalance: string;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  refreshBalances: () => Promise<void>;
}

const Web3PaymentContext = createContext<Web3PaymentContextType>({
  account: null,
  eurtBalance: '0.00',
  ethBalance: '0.0000',
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  refreshBalances: async () => {},
});

const EURO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mcc-foundry-anvil-1095249147821.europe-west1.run.app';

const EURO_TOKEN_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
  'function nonces(address owner) view returns (uint256)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
  'function decimals() view returns (uint8)',
];

export function Web3PaymentProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [eurtBalance, setEurtBalance] = useState<string>('0.00');
  const [ethBalance, setEthBalance] = useState<string>('0.0000');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const fetchBalancesForAddress = useCallback(async (targetAddr: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      
      // ETH Balance
      const rawEth = await provider.getBalance(targetAddr);
      setEthBalance(parseFloat(ethers.formatEther(rawEth)).toFixed(4));

      // EURT Balance
      const tokenContract = new ethers.Contract(EURO_TOKEN_ADDRESS, EURO_TOKEN_ABI, provider);
      const rawEurt = await tokenContract.balanceOf(targetAddr);
      setEurtBalance((Number(rawEurt) / 1e6).toFixed(2));
    } catch (err) {
      console.warn('Error fetching Web3 balances:', err);
    }
  }, []);

  const refreshBalances = useCallback(async () => {
    if (account) {
      await fetchBalancesForAddress(account);
    }
  }, [account, fetchBalancesForAddress]);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Instale MetaMask para conectar su billetera Web3.');
      return;
    }

    try {
      setIsConnecting(true);
      const browserProvider = new ethers.BrowserProvider(window.ethereum as any);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      if (accounts && accounts.length > 0) {
        const userAddr = accounts[0];
        setAccount(userAddr);
        await fetchBalancesForAddress(userAddr);
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [fetchBalancesForAddress]);

  // Auto-connect if accounts already present
  useEffect(() => {
    async function checkExistingAccounts() {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const browserProvider = new ethers.BrowserProvider(window.ethereum as any);
          const accounts = await browserProvider.send('eth_accounts', []);
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            fetchBalancesForAddress(accounts[0]);
          }
        } catch (e) {
          console.warn('Auto-connect check warning:', e);
        }
      }
    }
    checkExistingAccounts();
  }, [fetchBalancesForAddress]);

  // Poll balances every 8 seconds for live sync
  useEffect(() => {
    if (!account) return;
    const interval = setInterval(() => {
      fetchBalancesForAddress(account);
    }, 8000);
    return () => clearInterval(interval);
  }, [account, fetchBalancesForAddress]);

  return (
    <Web3PaymentContext.Provider
      value={{
        account,
        eurtBalance,
        ethBalance,
        isConnected: !!account,
        isConnecting,
        connect,
        refreshBalances,
      }}
    >
      {children}
    </Web3PaymentContext.Provider>
  );
}

export function useWeb3Payment() {
  return useContext(Web3PaymentContext);
}
