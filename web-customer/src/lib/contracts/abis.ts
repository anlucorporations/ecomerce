// ABIs from monolithic Ecommerce contract
import EcommerceABI from '../../contracts/Ecommerce.json';

export const ABIS = {
  ecommerce: EcommerceABI,
  euroToken: [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
  ],
} as const;

export type ContractName = keyof typeof ABIS;
