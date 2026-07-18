'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  detectWallets,
  connectWallet as connectWalletProvider,
  switchNetwork as switchNetworkProvider,
  WalletInfo,
  WalletState,
  getWalletStore,
} from '../lib/wallet/provider';

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    provider: null,
    signer: null,
    address: null,
    chainId: null,
    wallets: [],
    selectedWallet: null,
    isConnecting: false,
    error: null,
  });

  // Detect available wallets
  useEffect(() => {
    async function detect() {
      const wallets = await detectWallets();
      setState((prev) => ({ ...prev, wallets }));
    }
    detect();

    // Listen for new providers
    if (typeof window !== 'undefined') {
      const store = getWalletStore();
      const unsubscribe = store.subscribe(() => {
        detect();
      });
      return unsubscribe;
    }
  }, []);

  // Connect to wallet
  const connect = useCallback(async (walletInfo: WalletInfo, silent: boolean = false) => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const { provider, signer, address, chainId } = await connectWalletProvider(walletInfo, silent);

      setState((prev) => ({
        ...prev,
        provider,
        signer,
        address,
        chainId,
        selectedWallet: walletInfo,
        isConnecting: false,
        error: null,
      }));

      // Store in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedWallet', JSON.stringify(walletInfo));
        localStorage.setItem('connectedAddress', address);
        localStorage.setItem('connectedChainId', chainId.toString());
      }
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
      wallets: state.wallets,
      selectedWallet: null,
      isConnecting: false,
      error: null,
    });

    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedWallet');
      localStorage.removeItem('connectedAddress');
      localStorage.removeItem('connectedChainId');
    }
  }, [state.wallets]);

  // Switch network
  const switchNetwork = useCallback(
    async (chainId: number) => {
      try {
        await switchNetworkProvider(chainId);

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
      if (typeof window === 'undefined') return;

      const savedWallet = localStorage.getItem('selectedWallet');
      if (!savedWallet) return;

      try {
        // Wait for wallets to be detected first
        await new Promise(resolve => setTimeout(resolve, 500));

        const walletInfo = JSON.parse(savedWallet);
        // Use silent mode to reconnect without prompting the user
        await connect(walletInfo, true);
        console.log('Auto-reconnected successfully');
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.warn('Auto-connect failed:', err.message);
        // Set a flag that auto-connect failed, but keep the wallet info
        // so user can see they need to reconnect manually
        setState((prev) => ({
          ...prev,
          error: 'Please reconnect your wallet',
          isConnecting: false,
        }));
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
      } else if (state.provider && state.selectedWallet) {
        const signer = await state.provider.getSigner();
        setState((prev) => ({ ...prev, address: accounts[0], signer }));
        if (typeof window !== 'undefined') {
          localStorage.setItem('connectedAddress', accounts[0]);
        }
      }
    };

    const handleChainChanged = async (...args: unknown[]) => {
      const chainIdHex = args[0] as string;
      const chainId = parseInt(chainIdHex, 16);
      if (state.provider) {
        const signer = await state.provider.getSigner();
        setState((prev) => ({ ...prev, chainId, signer }));
        if (typeof window !== 'undefined') {
          localStorage.setItem('connectedChainId', chainId.toString());
        }
      }
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [state.provider, state.selectedWallet, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    switchNetwork,
    isConnected: !!state.address,
  };
}
