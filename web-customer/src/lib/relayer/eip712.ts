'use client';

import { JsonRpcSigner, Contract, Signature, JsonRpcProvider } from 'ethers';

export interface PermitSignaturePayload {
  owner: string;
  spender: string;
  value: string;
  deadline: number;
  v: number;
  r: string;
  s: string;
}

const EURO_TOKEN_PERMIT_ABI = [
  'function nonces(address owner) view returns (uint256)',
  'function name() view returns (string)',
  'function version() view returns (string)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
];

/**
 * Sign an EIP-2612 typed Permit message using EIP-712 (0 Gas for Customer)
 */
export async function signPermitEIP712(
  signer: JsonRpcSigner,
  euroTokenAddress: string,
  spenderAddress: string,
  value: bigint | string,
  deadlineSeconds: number = 3600 // 1 hour validity by default
): Promise<PermitSignaturePayload> {
  const owner = await signer.getAddress();
  const provider = signer.provider || new JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545');

  const tokenContract = new Contract(euroTokenAddress, EURO_TOKEN_PERMIT_ABI, provider);

  // 1. Fetch current on-chain nonce for the owner
  const nonce: bigint = await tokenContract.nonces(owner);

  // 2. Fetch network chain ID
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  // 3. Compute deadline timestamp
  const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;

  // 4. Define EIP-712 Domain Separator (matches OpenZeppelin ERC20Permit)
  const domain = {
    name: 'EuroToken',
    version: '1',
    chainId: chainId,
    verifyingContract: euroTokenAddress,
  };

  // 5. Define EIP-712 Types according to EIP-2612 standard
  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  // 6. Value payload
  const valueStr = value.toString();
  const message = {
    owner: owner,
    spender: spenderAddress,
    value: valueStr,
    nonce: nonce.toString(),
    deadline: deadline,
  };

  // 7. Request typed data signature from mobile/desktop wallet
  const rawSignature = await signer.signTypedData(domain, types, message);

  // 8. Split signature into (v, r, s)
  const sig = Signature.from(rawSignature);

  return {
    owner,
    spender: spenderAddress,
    value: valueStr,
    deadline,
    v: sig.v,
    r: sig.r,
    s: sig.s,
  };
}

/**
 * Submit signed permit payload to platform relayer API
 */
export async function submitPermitToRelayer(payload: PermitSignaturePayload): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const response = await fetch('/api/relayer/permit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Error al procesar la meta-transacción en el Relayer');
  }

  return data;
}
