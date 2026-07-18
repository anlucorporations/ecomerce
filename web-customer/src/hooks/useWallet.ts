'use client';

import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, JsonRpcSigner } from 'ethers';

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

interface WalletState {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    provider: null,
    signer: null,
    address: null,
    chainId: null,
    isConnecting: false,
    error: null,
  });

  // Connect to MetaMask
  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = accounts[0];
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      setState({
        provider,
        signer,
        address,
        chainId,
        isConnecting: false,
        error: null,
      });

      // Store address in localStorage
      localStorage.setItem('walletAddress', address);
      localStorage.setItem('walletConnected', 'true');

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: err.message || 'Failed to connect wallet',
      }));
      throw error;
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setState({
      provider: null,
      signer: null,
      address: null,
      chainId: null,
      isConnecting: false,
      error: null,
    });

    localStorage.removeItem('walletAddress');
    localStorage.removeItem('walletConnected');
  }, []);

  // Switch network
  const switchNetwork = useCallback(
    async (chainId: number) => {
      if (!window.ethereum) throw new Error('MetaMask not installed');

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });

        if (state.provider) {
          const network = await state.provider.getNetwork();
          setState((prev) => ({ ...prev, chainId: Number(network.chainId) }));
        }
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState((prev) => ({ ...prev, error: err.message || 'Failed to switch network' }));
        throw error;
      }
    },
    [state.provider]
  );

  // Auto-reconnect on page load
  useEffect(() => {
    async function autoConnect() {
      if (typeof window === 'undefined' || !window.ethereum) return;

      const wasConnected = localStorage.getItem('walletConnected');
      const savedAddress = localStorage.getItem('walletAddress');

      if (!wasConnected || !savedAddress) return;

      try {
        setState((prev) => ({ ...prev, isConnecting: true }));

        // Check if still connected
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        }) as string[];

        if (accounts.length === 0) {
          // No longer connected
          disconnect();
          return;
        }

        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = accounts[0];
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);

        setState({
          provider,
          signer,
          address,
          chainId,
          isConnecting: false,
          error: null,
        });

        // Update stored address if changed
        if (address !== savedAddress) {
          localStorage.setItem('walletAddress', address);
        }
      } catch (error) {
        console.error('Auto-connect failed:', error);
        disconnect();
      }
    }

    autoConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Listen for account/chain changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = async (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnect();
      } else if (state.provider) {
        try {
          const signer = await state.provider.getSigner();
          const address = accounts[0];
          setState((prev) => ({ ...prev, address, signer }));
          localStorage.setItem('walletAddress', address);
        } catch (error) {
          console.error('Error handling account change:', error);
        }
      }
    };

    const handleChainChanged = async () => {
      // Reload the page on chain change (recommended by MetaMask)
      window.location.reload();
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum && typeof window.ethereum.removeListener === 'function') {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [state.provider, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    switchNetwork,
    isConnected: !!state.address,
  };
}
