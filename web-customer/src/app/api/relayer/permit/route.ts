import { NextRequest, NextResponse } from 'next/server';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';

const EURO_TOKEN_ABI = [
  'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function nonces(address owner) view returns (uint256)',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { owner, spender, value, deadline, v, r, s } = body;

    if (!owner || !spender || !value || deadline === undefined || !v || !r || !s) {
      return NextResponse.json(
        { success: false, error: 'Parámetros de firma EIP-712 incompletos' },
        { status: 400 }
      );
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
    const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    
    // Relayer private key (Platform backend pays the gas)
    const relayerKey = process.env.RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

    const provider = new JsonRpcProvider(rpcUrl);
    const relayerWallet = new Wallet(relayerKey, provider);
    const tokenContract = new Contract(euroTokenAddress, EURO_TOKEN_ABI, relayerWallet);

    // Broadcast the permit transaction on-chain (Relayer pays gas in ETH)
    const tx = await tokenContract.permit(
      owner,
      spender,
      BigInt(value),
      BigInt(deadline),
      Number(v),
      r,
      s
    );

    const receipt = await tx.wait(1);

    // Verify allowance updated
    const newAllowance = await tokenContract.allowance(owner, spender);

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      allowance: newAllowance.toString(),
    });
  } catch (error: any) {
    console.error('Relayer permit execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.reason || error?.message || 'Error al ejecutar la meta-transacción permit en la blockchain',
      },
      { status: 500 }
    );
  }
}
