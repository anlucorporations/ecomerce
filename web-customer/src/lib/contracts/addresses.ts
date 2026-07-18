export const CONTRACT_ADDRESSES = {
  81234: {
    // Besu Network - Monolithic Ecommerce Contract
    ecommerce: process.env.NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS || '',
    euroToken: process.env.NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS || '',
  },
  // Keep 31337 for backwards compatibility if needed
  31337: {
    ecommerce: process.env.NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS || '',
    euroToken: process.env.NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS || '',
  },
};

type ContractName = 'ecommerce' | 'euroToken';

export function getContractAddress(chainId: number, contract: ContractName): string {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) {
    throw new Error(`Network ${chainId} not supported`);
  }
  const address = addresses[contract];
  if (!address) {
    throw new Error(`Contract ${contract} not deployed on network ${chainId}`);
  }
  return address;
}
