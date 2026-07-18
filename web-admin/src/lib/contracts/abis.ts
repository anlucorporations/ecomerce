// ABIs from monolithic Ecommerce contract
import EcommerceABI from '../../contracts/Ecommerce.json';

export const ABIS = {
  ecommerce: EcommerceABI,
} as const;

export type ContractName = keyof typeof ABIS;
