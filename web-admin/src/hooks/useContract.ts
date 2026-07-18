'use client';

import { useMemo } from 'react';
import { Contract, BrowserProvider, JsonRpcSigner } from 'ethers';
import { getContractAddress } from '../lib/contracts/addresses';
import { ABIS, type ContractName } from '../lib/contracts/abis';

export type { ContractName };

export function useContract(
  contractName: ContractName,
  provider: BrowserProvider | null,
  signer: JsonRpcSigner | null,
  chainId: number | null
) {
  return useMemo(() => {
    if (!provider || !signer || !chainId) return null;

    try {
      const address = getContractAddress(chainId, contractName);
      const abi = ABIS[contractName];
      return new Contract(address, abi, signer);
    } catch (error) {
      console.error(`Failed to load contract ${contractName}:`, error);
      return null;
    }
  }, [contractName, provider, signer, chainId]);
}

export function useContracts(
  provider: BrowserProvider | null,
  signer: JsonRpcSigner | null,
  chainId: number | null
) {
  console.log('useContracts', provider, signer, chainId);
  const ecommerce = useContract('ecommerce', provider, signer, chainId);

  return {
    ecommerce,
  };
}
