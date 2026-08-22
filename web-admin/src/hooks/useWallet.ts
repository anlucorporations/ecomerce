'use client';

import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider } from 'ethers';
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
        localStorage.removeItem('userDisconnected');
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
      localStorage.setItem('userDisconnected', 'true');
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

      // If user explicitly disconnected, do not auto-connect
      if (localStorage.getItem('userDisconnected') === 'true') {
        return;
      }

      const savedWallet = localStorage.getItem('selectedWallet');
      if (savedWallet) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 300));
          const walletInfo = JSON.parse(savedWallet);
          await connect(walletInfo, true);
          console.log('Auto-reconnected successfully via saved wallet');
          return;
        } catch (error) {
          console.warn('Auto-connect via saved wallet failed:', error);
        }
      }

      // Fallback auto-connect via window.ethereum directly
      if (window.ethereum) {
        try {
          const browserProvider = new BrowserProvider(window.ethereum as any);
          const accounts = await browserProvider.send('eth_accounts', []);
          if (accounts && accounts.length > 0) {
            const activeSigner = await browserProvider.getSigner();
            const network = await browserProvider.getNetwork();
            setState((prev) => ({
              ...prev,
              provider: browserProvider,
              signer: activeSigner,
              address: accounts[0],
              chainId: Number(network.chainId),
              isConnecting: false,
              error: null,
            }));
            console.log('Auto-connected via window.ethereum directly:', accounts[0]);
          }
        } catch (err) {
          console.warn('Direct window.ethereum auto-connect failed:', err);
        }
      }
    }

    autoConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = async (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnect();
      } else {
        try {
          const browserProvider = new BrowserProvider(window.ethereum as any);
          const activeSigner = await browserProvider.getSigner();
          setState((prev) => ({ ...prev, address: accounts[0], provider: browserProvider, signer: activeSigner }));
          if (typeof window !== 'undefined') {
            localStorage.setItem('connectedAddress', accounts[0]);
          }
        } catch (e) {
          console.error('Error handling accountsChanged:', e);
        }
      }
    };

    const handleChainChanged = async (...args: unknown[]) => {
      const chainIdHex = args[0] as string;
      const chainId = parseInt(chainIdHex, 16);
      try {
        if (window.ethereum) {
          const browserProvider = new BrowserProvider(window.ethereum as any);
          const activeSigner = await browserProvider.getSigner();
          setState((prev) => ({ ...prev, chainId, provider: browserProvider, signer: activeSigner }));
        }
      } catch (e) {
        console.error('Error handling chainChanged:', e);
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
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    switchNetwork,
    isConnected: !!state.address,
  };
}
