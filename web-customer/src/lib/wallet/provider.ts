'use client';

import { createStore, Store } from 'mipd';
import { BrowserProvider, JsonRpcSigner, Eip1193Provider } from 'ethers';

export interface WalletInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface MobileDeepLinkWallet {
  id: string;
  name: string;
  icon: string;
  color: string;
  deepLink: string;
  description: string;
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

/**
 * Detect if the client is running on a mobile smartphone or tablet
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || navigator.vendor || (window as any).opera
  );
}

/**
 * Detect if the client is currently running inside an In-App dApp Browser
 * (e.g. MetaMask Mobile Browser, Trust Wallet dApp Browser, Phantom, Coinbase)
 */
export function isInAppDappBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const eth = (window as any).ethereum;
  if (!eth) return false;

  const isMetaMaskMobile = Boolean(eth.isMetaMask && /Mobile|Android|iPhone/i.test(navigator.userAgent));
  const isTrust = Boolean(eth.isTrust || eth.isTrustWallet);
  const isCoinbase = Boolean(eth.isCoinbaseWallet || eth.isCoinbaseBrowser);
  const isPhantom = Boolean((window as any).phantom?.ethereum?.isPhantom);
  const isBraveMobile = Boolean(navigator.userAgent.includes('Brave') && isMobileDevice());
  const isRabby = Boolean(eth.isRabby);

  return Boolean(isMetaMaskMobile || isTrust || isCoinbase || isPhantom || isBraveMobile || isRabby || (isMobileDevice() && eth.isMetaMask));
}

/**
 * Generate universal deep links to open the current dApp in installed mobile wallet apps
 */
export function getMobileDeepLinks(customUrl?: string): MobileDeepLinkWallet[] {
  if (typeof window === 'undefined') return [];

  const currentHref = customUrl || window.location.href;
  const cleanHost = window.location.host;
  const cleanHostAndPath = currentHref.replace(/^https?:\/\//, '');
  const encodedFullUrl = encodeURIComponent(currentHref);

  return [
    {
      id: 'metamask',
      name: 'MetaMask Mobile',
      icon: '🦊',
      color: '#F6851B',
      description: 'Abrir dApp en la app oficial de MetaMask',
      deepLink: `https://metamask.app.link/dapp/${cleanHostAndPath}`,
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      icon: '🛡️',
      color: '#0500FF',
      description: 'Navegar en el navegador Web3 de Trust Wallet',
      deepLink: `https://link.trustwallet.com/open_url?coin_id=60&url=${encodedFullUrl}`,
    },
    {
      id: 'phantom',
      name: 'Phantom Wallet',
      icon: '👻',
      color: '#AB9FF2',
      description: 'Conectar con Phantom Multi-Chain',
      deepLink: `https://phantom.app/ul/browse/${encodedFullUrl}?ref=${encodeURIComponent(cleanHost)}`,
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '🔵',
      color: '#0052FF',
      description: 'Abrir en Coinbase Wallet dApp Browser',
      deepLink: `https://go.cb-w.com/dapp?cb_url=${encodedFullUrl}`,
    },
  ];
}

/**
 * Discover EIP-6963 Injected Wallets
 */
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

/**
 * Connect to an EIP-6963 provider or generic window.ethereum
 */
export async function connectWallet(walletInfo?: WalletInfo): Promise<{
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  address: string;
  chainId: number;
}> {
  let eip1193Provider: Eip1193Provider | null = null;

  if (walletInfo) {
    const walletStore = getWalletStore();
    const providers = walletStore.getProviders();
    const selectedProvider = providers.find((p) => p.info.uuid === walletInfo.uuid);
    if (selectedProvider) {
      eip1193Provider = selectedProvider.provider as Eip1193Provider;
    }
  }

  if (!eip1193Provider && typeof window !== 'undefined' && (window as any).ethereum) {
    eip1193Provider = (window as any).ethereum as Eip1193Provider;
  }

  if (!eip1193Provider) {
    throw new Error('No se detectó ninguna billetera Web3 compatible.');
  }

  // Request accounts
  const accounts = (await eip1193Provider.request({
    method: 'eth_requestAccounts',
  })) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error('No se otorgaron permisos de cuenta.');
  }

  const provider = new BrowserProvider(eip1193Provider);
  const signer = await provider.getSigner();
  const address = accounts[0];
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  return { provider, signer, address, chainId };
}

export async function switchNetwork(chainId: number): Promise<void> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('No wallet found');
  }

  const chainIdHex = `0x${chainId.toString(16)}`;

  try {
    await (window as any).ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 4902) {
      if (chainId === 81234) {
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://besu1.proyectos.codecrypto.academy';
        await (window as any).ethereum.request({
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
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: chainIdHex,
              chainName: 'Anvil Localhost 8545',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545'],
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
