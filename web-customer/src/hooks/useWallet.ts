'use client';

import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { connectWallet, switchNetwork as switchWalletNetwork, WalletInfo, isInAppDappBrowser, isMobileDevice } from '../lib/wallet/provider';

const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);

interface WalletState {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isMobile: boolean;
  isInAppBrowser: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    provider: null,
    signer: null,
    address: null,
    chainId: null,
    isConnecting: false,
    isMobile: false,
    isInAppBrowser: false,
    error: null,
  });

  // Detect mobile & in-app browser environment on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setState((prev) => ({
        ...prev,
        isMobile: isMobileDevice(),
        isInAppBrowser: isInAppDappBrowser(),
      }));
    }
  }, []);

  // Connect to Wallet (with EIP-6963, In-App DApp Browser or generic window.ethereum)
  const connect = useCallback(async (walletInfo?: WalletInfo) => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const { provider, signer, address, chainId } = await connectWallet(walletInfo);

      // Forzar la red correcta (31337 Anvil GCP/local) al conectar:
      // si la wallet está en otra red, las transacciones (registro, checkout) irían a la red
      // equivocada y nunca se minarían -> la inscripción "no queda registrada".
      if (chainId !== EXPECTED_CHAIN_ID) {
        try {
          await switchWalletNetwork(EXPECTED_CHAIN_ID);
        } catch (switchErr) {
          console.warn('No se pudo cambiar a la red correcta:', switchErr);
        }
      }

      setState((prev) => ({
        ...prev,
        provider,
        signer,
        address,
        chainId: EXPECTED_CHAIN_ID,
        isConnecting: false,
        error: null,
      }));

      // Persist connection state
      if (typeof window !== 'undefined') {
        localStorage.setItem('walletAddress', address);
        localStorage.setItem('walletConnected', 'true');
        localStorage.removeItem('userDisconnected');
      }

      return { provider, signer, address, chainId };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: err.message || 'Error conectando billetera',
      }));
      throw error;
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setState((prev) => ({
      ...prev,
      provider: null,
      signer: null,
      address: null,
      chainId: null,
      isConnecting: false,
      error: null,
    }));

    if (typeof window !== 'undefined') {
      localStorage.removeItem('walletAddress');
      localStorage.removeItem('walletConnected');
      localStorage.setItem('userDisconnected', 'true');
    }
  }, []);

  // Switch network
  const switchNetwork = useCallback(
    async (chainId: number) => {
      try {
        await switchWalletNetwork(chainId);
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

  // Auto-connect on page load & Auto-detect In-App Mobile Browser
  useEffect(() => {
    async function autoConnect() {
      if (typeof window === 'undefined') return;

      const inApp = isInAppDappBrowser();
      const wasConnected = localStorage.getItem('walletConnected') === 'true';
      const savedAddress = localStorage.getItem('walletAddress');
      const userDisconnected = localStorage.getItem('userDisconnected') === 'true';

      // If user is inside an in-app dApp browser, or previously connected
      if ((inApp && !userDisconnected) || (wasConnected && savedAddress && !userDisconnected)) {
        try {
          const eth = (window as any).ethereum;
          if (!eth) return;

          setState((prev) => ({ ...prev, isConnecting: true }));

          // Silent check accounts
          const accounts = (await eth.request({ method: 'eth_accounts' })) as string[];

          if (accounts && accounts.length > 0) {
            const provider = new BrowserProvider(eth);
            const signer = await provider.getSigner();
            const address = accounts[0];
            const network = await provider.getNetwork();
            const chainId = Number(network.chainId);

            setState((prev) => ({
              ...prev,
              provider,
              signer,
              address,
              chainId,
              isConnecting: false,
              error: null,
            }));

            localStorage.setItem('walletAddress', address);
            localStorage.setItem('walletConnected', 'true');
          } else if (inApp) {
            // Inside in-app browser with no active account authorized yet: prompt eth_requestAccounts
            const { provider, signer, address, chainId } = await connectWallet();
            setState((prev) => ({
              ...prev,
              provider,
              signer,
              address,
              chainId,
              isConnecting: false,
              error: null,
            }));
            localStorage.setItem('walletAddress', address);
            localStorage.setItem('walletConnected', 'true');
          } else {
            setState((prev) => ({ ...prev, isConnecting: false }));
          }
        } catch (err) {
          console.warn('Auto-connect silent notice:', err);
          setState((prev) => ({ ...prev, isConnecting: false }));
        }
      }
    }

    autoConnect();
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;
    const eth = (window as any).ethereum;

    const handleAccountsChanged = async (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (!accounts || accounts.length === 0) {
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
      window.location.reload();
    };

    if (eth.on) {
      eth.on('accountsChanged', handleAccountsChanged);
      eth.on('chainChanged', handleChainChanged);

      return () => {
        if (eth.removeListener) {
          eth.removeListener('accountsChanged', handleAccountsChanged);
          eth.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [state.provider, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    switchNetwork,
    isConnected: Boolean(state.address),
  };
}
