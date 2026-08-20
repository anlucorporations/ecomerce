import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ethers } from "ethers";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(stripeSecretKey || "dummy_key", {
  apiVersion: "2025-01-27.acacia" as any
});

const EURO_TOKEN_ABI = [
  "function mint(address to, uint256 amount) external"
];

const ECOMMERCE_ABI = [
  "function isRegisteredEntity(address account) view returns (bool)",
  "function isCustomerRegistered(address _customer) view returns (bool)"
];

// Relayer Wallet Private Key from environment configuration
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || process.env.ANVIL_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";
const EURO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0xDc64a140Aa3E981100a9becA4E685f962F0cF6C9";
const ECOMMERCE_MAIN_ADDRESS = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, walletAddress, paymentMethodId, signature, authMessage } = body;

    if (!amount || !walletAddress) {
      return NextResponse.json({ error: "Faltan parámetros requeridos (amount, walletAddress)" }, { status: 400, headers: corsHeaders });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    const euroTokenContract = new ethers.Contract(EURO_TOKEN_ADDRESS, EURO_TOKEN_ABI, relayerWallet);
    const ecommerceContract = new ethers.Contract(ECOMMERCE_MAIN_ADDRESS, ECOMMERCE_ABI, provider);

    // Verify Web3 signature authorization if provided
    if (signature && authMessage) {
      try {
        const recoveredAddress = ethers.verifyMessage(authMessage, signature);
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          return NextResponse.json({
            error: "La firma de autorización de MetaMask no coincide con la billetera destino."
          }, { status: 401, headers: corsHeaders });
        }
      } catch (sigErr) {
        console.warn("Signature verification warning:", sigErr);
      }
    }

    // Check destination wallet platform registration
    let isRegistered = false;
    try {
      const isEnt = await ecommerceContract.isRegisteredEntity(walletAddress);
      const isCust = await ecommerceContract.isCustomerRegistered(walletAddress);
      isRegistered = isEnt || isCust;
    } catch (e) {
      console.warn("Entity registration check warning:", e);
      isRegistered = true;
    }

    if (!isRegistered) {
      return NextResponse.json({
        error: "⚠️ Esta billetera no está inscripta. Debe registrarse en BARLO-VENTAS antes de adquirir EuroTokens (EURT)."
      }, { status: 403, headers: corsHeaders });
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);

    // Process Payment Intent via Stripe if live key present
    let paymentIntentId = `ch_stripe_demo_${Math.floor(100000 + Math.random() * 900000)}`;

    if (stripeSecretKey && stripeSecretKey !== "dummy_key" && !stripeSecretKey.startsWith("sk_test_mock")) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: "eur",
          payment_method_types: ["card"],
          description: `Compra de ${amount} EURT para ${walletAddress}`,
          confirm: true,
          payment_method: paymentMethodId || "pm_card_visa",
          return_url: process.env.NEXT_PUBLIC_COMPRA_STABLECOIN_URL || "http://localhost:3003"
        });
        paymentIntentId = paymentIntent.id;
      } catch (stripeErr: any) {
        console.error("Stripe payment processing failed:", stripeErr?.message);
        return NextResponse.json({
          error: "No se pudo completar el pago con la pasarela Stripe. La transacción fue cancelada."
        }, { status: 402, headers: corsHeaders });
      }
    }

    // Execute On-Chain EuroToken (EURT) Minting (Decimals: 6)
    const rawMintAmount = BigInt(Math.round(parseFloat(amount) * 1000000));
    const mintTx = await euroTokenContract.mint(walletAddress, rawMintAmount);
    const receipt = await mintTx.wait();

    return NextResponse.json({
      success: true,
      stripePaymentId: paymentIntentId,
      mintTxHash: receipt.hash,
      message: `¡${amount} EURT han sido emitidos y confirmados en blockchain para ${walletAddress}!`
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error("Checkout processing error:", error);
    return NextResponse.json({
      error: error?.message || "Error procesando el pago o la emisión de tokens en la blockchain."
    }, { status: 500, headers: corsHeaders });
  }
}
