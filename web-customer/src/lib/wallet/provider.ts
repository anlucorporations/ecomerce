'use client';

import { createStore, Store } from 'mipd';
import { BrowserProvider, JsonRpcSigner, Eip1193Provider } from 'ethers';

export interface WalletInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface WalletState {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string | null;
  chainId: number | null;
  wallets: WalletInfo[];
  selectedWallet: WalletInfo | null;
  isConnecting: boolean;
  error: string | null;
}

let store: Store | null = null;

export function getWalletStore(): Store {
  if (typeof window !== 'undefined' && !store) {
    store = createStore();
  }
  return store!;
}

export async function detectWallets(): Promise<WalletInfo[]> {
  if (typeof window === 'undefined') return [];

  const walletStore = getWalletStore();
  const providers = walletStore.getProviders();

  return providers.map((provider) => ({
    uuid: provider.info.uuid,
    name: provider.info.name,
    icon: provider.info.icon,
    rdns: provider.info.rdns,
  }));
}

export async function connectWallet(walletInfo: WalletInfo): Promise<{
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  address: string;
  chainId: number;
}> {
  const walletStore = getWalletStore();
  const providers = walletStore.getProviders();

  const selectedProvider = providers.find((p) => p.info.uuid === walletInfo.uuid);
  if (!selectedProvider) {
    throw new Error('Wallet not found');
  }

  const eip1193Provider = selectedProvider.provider as Eip1193Provider;

  // Request accounts
  const accounts = await eip1193Provider.request({
    method: 'eth_requestAccounts',
  }) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found');
  }

  const provider = new BrowserProvider(eip1193Provider);
  const signer = await provider.getSigner();
  const address = accounts[0];
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  return { provider, signer, address, chainId };
}

export async function switchNetwork(chainId: number): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet found');
  }

  const chainIdHex = `0x${chainId.toString(16)}`;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (error: unknown) {
    // Chain not added, try to add it
    const err = error as { code?: number };
    if (err.code === 4902) {
      // For Besu network
      if (chainId === 81234) {
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://besu1.proyectos.codecrypto.academy';
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: chainIdHex,
              chainName: 'Besu Network',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: [rpcUrl],
            },
          ],
        });
      } else if (chainId === 31337) {
        // For backwards compatibility with localhost/Anvil
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: chainIdHex,
              chainName: 'Localhost 8545',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['http://localhost:8545'],
            },
          ],
        });
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
}

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
