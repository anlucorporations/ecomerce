import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const ECOMMERCE_ABI = [
  'function updateKYCStatus(address account, bool status) external',
  'function isKYCVerified(address account) view returns (bool)'
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, phone, birthDate, country, idImageHash, selfieHash, signature } = body;

    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({ error: 'Dirección Ethereum inválida' }, { status: 400 });
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
    const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || process.env.OWNER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const adminWallet = new ethers.Wallet(adminPrivateKey, provider);
    const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, adminWallet);

    // 1. Check if already verified on-chain
    try {
      const alreadyVerified = await contract.isKYCVerified(address);
      if (alreadyVerified) {
        return NextResponse.json({
          success: true,
          isKYCVerified: true,
          message: 'La billetera ya se encuentra verificada on-chain.'
        });
      }
    } catch (e) {
      console.warn('Error checking existing KYC status:', e);
    }

    // 2. Execute on-chain updateKYCStatus(address, true)
    console.log(`[API KYC] Aprobando KYC on-chain para: ${address}...`);
    const tx = await contract.updateKYCStatus(address, true);
    const receipt = await tx.wait();

    console.log(`[API KYC] KYC Aprobado on-chain en bloque #${receipt.blockNumber} (tx: ${receipt.hash})`);

    return NextResponse.json({
      success: true,
      isKYCVerified: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: 'Verificación KYC aprobada exitosamente on-chain.'
    });

  } catch (error: any) {
    console.error('[API KYC Error]:', error);
    return NextResponse.json(
      { error: error?.reason || error?.message || 'Error interno al procesar verificación KYC' },
      { status: 500 }
    );
  }
}
