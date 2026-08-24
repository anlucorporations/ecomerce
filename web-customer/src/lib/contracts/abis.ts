// ABIs from monolithic Ecommerce contract
import EcommerceABI from '../../contracts/Ecommerce.json';

// B6: el token desplegado es EuroTokenOptimized (ver stablecoin/sc/src/EuroTokenOptimized.sol),
// que hereda ERC20Permit (OpenZeppelin 5.0.2) y SÍ expone permit/nonces/DOMAIN_SEPARATOR.
// Estas firmas están alineadas 1:1 con ese contrato desplegado.
export const ABIS = {
  ecommerce: EcommerceABI,
  euroToken: [
    'function approve(address spender, uint256 amount) returns (bool)',
    // ERC-2612 Permit (EuroTokenOptimized / ERC20Permit OZ 5.0.2)
    'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
    'function nonces(address owner) view returns (uint256)',
    'function DOMAIN_SEPARATOR() view returns (bytes32)',
    'function balanceOf(address account) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
  ],
} as const;

export type ContractName = keyof typeof ABIS;
