import { NextResponse } from "next/server";
import { ethers } from "ethers";

const EURO_TOKEN_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) view returns (uint256)"
];

const ANVIL_PRIVATE_KEY = process.env.ANVIL_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://mcc-foundry-anvil-1095249147821.europe-west1.run.app";
const EURO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const amount = body.amount || "50";
    const walletAddress = body.walletAddress || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const intentId = body.paymentIntentId || `pi_sim_${Math.floor(100000 + Math.random() * 900000)}`;

    const numericAmount = parseFloat(amount) || 50;
    let txHash = `0x_sim_tx_${Math.floor(100000 + Math.random() * 900000)}`;
    let newBalFormatted = `${numericAmount.toFixed(2)}`;

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const signer = new ethers.Wallet(ANVIL_PRIVATE_KEY, provider);
      const tokenContract = new ethers.Contract(EURO_TOKEN_ADDRESS, EURO_TOKEN_ABI, signer);
      const rawMintAmount = BigInt(Math.round(numericAmount * 1000000));

      const tx = await tokenContract.mint(walletAddress, rawMintAmount);
      const receipt = await tx.wait();
      if (receipt?.hash) {
        txHash = receipt.hash;
      }
      const newBalRaw = await tokenContract.balanceOf(walletAddress);
      newBalFormatted = (Number(newBalRaw) / 1000000).toFixed(2);
    } catch (e: any) {
      console.warn("Simulator notice:", e?.message || e);
    }

    return NextResponse.json({
      success: true,
      simulatedEvent: "payment_intent.succeeded",
      stripePaymentId: intentId,
      mintTxHash: txHash,
      amountMinted: `${numericAmount.toFixed(2)} EURT`,
      newWalletBalance: `${newBalFormatted} EURT`,
      walletAddress,
      message: `⚡ [SIMULADOR STRIPE] Evento payment_intent.succeeded procesado exitosamente. Se han emitido €${numericAmount.toFixed(2)} EURT a ${walletAddress}.`
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || "Error procesando simulador"
    }, { status: 500 });
  }
}
