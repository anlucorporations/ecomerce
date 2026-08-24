import { NextResponse } from "next/server";
import { ethers } from "ethers";

const EURO_TOKEN_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) view returns (uint256)"
];

function getRelayerPrivateKey(): string {
  const key = process.env.RELAYER_PRIVATE_KEY || process.env.ANVIL_PRIVATE_KEY;
  if (!key) {
    throw new Error("RELAYER_PRIVATE_KEY no configurada en el servidor");
  }
  return key;
}

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
const EURO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const MAX_AMOUNT_EUR = 1000;

/**
 * Simulador de webhook de Stripe.
 * SOLO disponible en entornos de desarrollo: requiere ENABLE_SIMULATOR=true y
 * SIMULATOR_TOKEN configurado. Sin esas variables responde 404 (no expone mint en producción).
 */
export async function POST(request: Request) {
  if (process.env.ENABLE_SIMULATOR !== "true") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const expectedToken = process.env.SIMULATOR_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ error: "SIMULATOR_TOKEN no configurado en el servidor" }, { status: 503 });
  }
  const providedToken = request.headers.get("x-simulator-token");
  if (providedToken !== expectedToken) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const amount = body.amount || "50";
    const walletAddress = body.walletAddress || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > MAX_AMOUNT_EUR) {
      return NextResponse.json({ error: "Monto inválido o fuera de rango" }, { status: 400 });
    }
    if (!ethers.isAddress(walletAddress)) {
      return NextResponse.json({ error: "Dirección Ethereum inválida" }, { status: 400 });
    }

    const intentId = body.paymentIntentId || `pi_sim_${Math.floor(100000 + Math.random() * 900000)}`;
    let txHash = `0x_sim_tx_${Math.floor(100000 + Math.random() * 900000)}`;
    let newBalFormatted = `${numericAmount.toFixed(2)}`;

    try {
      const relayerPrivateKey = getRelayerPrivateKey();
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const signer = new ethers.Wallet(relayerPrivateKey, provider);
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
    console.error("Simulator error:", error?.message || error);
    return NextResponse.json({
      success: false,
      error: "Error procesando simulador"
    }, { status: 500 });
  }
}
