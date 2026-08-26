export interface NetworkConfig {
  chainId: number;
  chainIdHex: string;
  chainName: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  euroTokenAddress: string;
  ecommerceAddress: string;
  euroTokenDecimals: number;
  euroTokenSymbol: string;
}

export const ANVIL_GCP_NETWORK: NetworkConfig = {
  chainId: 31337,
  chainIdHex: '0x7a69',
  chainName: 'BARLO-VENTAS GCP (Anvil)',
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://mcc-foundry-anvil-1095249147821.europe-west1.run.app',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  euroTokenAddress: process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  ecommerceAddress: process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  euroTokenDecimals: 6,
  euroTokenSymbol: 'EURT',
};
