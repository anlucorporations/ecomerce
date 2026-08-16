export const CONTRACT_ADDRESSES = {
  81234: {
    ecommerce: process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || process.env.NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS || '0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650',
    euroToken: process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  },
  31337: {
    ecommerce: process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || process.env.NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS || '0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650',
    euroToken: process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  },
};

type ContractName = 'ecommerce' | 'euroToken';

export function getContractAddress(chainId: number, contract: ContractName): string {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] || CONTRACT_ADDRESSES[31337];
  const address = addresses[contract] || (contract === 'ecommerce' ? process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707' : process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3');
  
  if (!address) {
    throw new Error(`Contract ${contract} not deployed on network ${chainId}`);
  }
  return address;
}
