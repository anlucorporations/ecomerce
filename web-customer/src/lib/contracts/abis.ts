// ABIs from monolithic Ecommerce contract
import EcommerceABI from '../../contracts/Ecommerce.json';

export const ABIS = {
  ecommerce: EcommerceABI,
  euroToken: [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
    'function nonces(address owner) view returns (uint256)',
    'function DOMAIN_SEPARATOR() view returns (bytes32)',
    'function balanceOf(address account) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
  ],
} as const;

export type ContractName = keyof typeof ABIS;
