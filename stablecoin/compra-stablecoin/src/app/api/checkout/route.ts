import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ethers } from "ethers";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-01-27.acacia" as any
});

const EURO_TOKEN_ABI = [
  "function mint(address to, uint256 amount) external"
];

// Anvil Default Deployer Private Key (#0)
const ANVIL_PRIVATE_KEY = process.env.ANVIL_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";
const EURO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const ECOMMERCE_ABI = [
  "function isRegisteredEntity(address account) view returns (bool)"
];

const ECOMMERCE_MAIN_ADDRESS = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, walletAddress, paymentMethodId } = body;

    if (!amount || !walletAddress) {
      return NextResponse.json({ error: "Faltan parámetros requeridos (amount, walletAddress)" }, { status: 400 });
    }

    // 0. Check destination wallet platform registration
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const ecommerceContract = new ethers.Contract(ECOMMERCE_MAIN_ADDRESS, ECOMMERCE_ABI, provider);
    
    try {
      const isRegistered = await ecommerceContract.isRegisteredEntity(walletAddress);
      if (!isRegistered) {
        return NextResponse.json({
          error: "⚠️ Esta billetera no está registrada. Debe estar inscrito como Usuario Comprador o Empresa en la plataforma para adquirir EuroTokens (EURT)."
        }, { status: 403 });
      }
    } catch (e) {
      console.warn("Entity registration check warning:", e);
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);

    // 1. Process Payment Intent via Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "eur",
      payment_method_types: ["card"],
      description: `Compra de ${amount} EURT para ${walletAddress}`,
      confirm: true,
      payment_method: paymentMethodId || "pm_card_visa", // Use test card default if provided
      return_url: "http://localhost:3003"
    });

    if (paymentIntent.status === "succeeded" || paymentIntent.status === "requires_capture") {
      // 2. Automatically Mint EuroToken (EURT) to user's wallet
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(ANVIL_PRIVATE_KEY, provider);
      const euroTokenContract = new ethers.Contract(EURO_TOKEN_ADDRESS, EURO_TOKEN_ABI, wallet);

      // Amount in 6 decimals (1 EURT = 1,000,000 units)
      const rawMintAmount = BigInt(Math.round(parseFloat(amount) * 1000000));
      const mintTx = await euroTokenContract.mint(walletAddress, rawMintAmount);
      const receipt = await mintTx.wait();

      return NextResponse.json({
        success: true,
        stripePaymentId: paymentIntent.id,
        mintTxHash: receipt.hash,
        message: `¡${amount} EURT han sido acuñados y enviados con éxito a ${walletAddress}!`
      });
    } else {
      return NextResponse.json({
        success: false,
        status: paymentIntent.status,
        message: "El pago no pudo completarse en Stripe."
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Stripe/Mint Error:", error);
    return NextResponse.json({
      error: error?.message || "Error procesando el pago con Stripe o la emisión de tokens."
    }, { status: 500 });
  }
}
