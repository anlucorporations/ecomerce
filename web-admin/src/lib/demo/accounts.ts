export interface DemoAccount {
  id: string;
  name: string;
  role: string;
  address: string;
  privateKey: string;
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'demo-seller',
    name: 'Vendedor Demo (Comercio)',
    role: 'Empresa / Vendedor',
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
    description: 'Cuenta de empresa comercial para despachar productos y recibir liberación de fondos.',
  },
  {
    id: 'demo-owner',
    name: 'Administrador Demo (Master)',
    role: 'Systems Admin',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    description: 'Cuenta con privilegios de gestión de plataforma y auditoría de contratos.',
  },
  {
    id: 'demo-buyer',
    name: 'Cliente Demo (Comprador)',
    role: 'Comprador Web3',
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    description: 'Cuenta cliente pre-cargada con ETH y EuroTokens de prueba lista para compras en escrow.',
  },
];

export function isDemoModeEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE !== undefined) {
    return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  }
  return true;
}
