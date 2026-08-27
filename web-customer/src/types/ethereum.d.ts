// Declaración global del proveedor EIP-1193 (window.ethereum)
// MetaMask, Rabby, Trust y demás wallets inyectan este objeto en el navegador.

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  removeAllListeners?: (event?: string) => void;
  isMetaMask?: boolean;
  selectedAddress?: string;
  chainId?: string;
  networkVersion?: string;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
