import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ethers } from "ethers";

export const dynamic = 'force-dynamic';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_dummy";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-01-27.acacia" as any,
});

const EURO_TOKEN_ABI = [
  "function mint(address to, uint256 amount) external"
];

const ANVIL_PRIVATE_KEY = process.env.ANVIL_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://mcc-foundry-anvil-1095249147821.europe-west1.run.app";
const EURO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const processedIntents = new Set<string>();

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is provided
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err: any) {
        console.error("Webhook Signature Verification Failed:", err.message);
        return NextResponse.json({ error: `Firma de Webhook no válida: ${err.message}` }, { status: 400 });
      }
    } else {
      event = JSON.parse(rawBody);
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const intentId = paymentIntent.id;

      if (processedIntents.has(intentId)) {
        return NextResponse.json({ received: true, status: "already_processed" });
      }

      const walletAddress = paymentIntent.metadata?.walletAddress;
      const amountEur = paymentIntent.metadata?.amount || (paymentIntent.amount / 100).toString();

      if (walletAddress) {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const signer = new ethers.Wallet(ANVIL_PRIVATE_KEY, provider);
        const tokenContract = new ethers.Contract(EURO_TOKEN_ADDRESS, EURO_TOKEN_ABI, signer);

        const rawAmount = BigInt(Math.round(parseFloat(amountEur) * 1000000));
        const tx = await tokenContract.mint(walletAddress, rawAmount);
        await tx.wait();

        processedIntents.add(intentId);
        console.log(`[Stripe Webhook] Minted ${amountEur} EURT to ${walletAddress} for PaymentIntent ${intentId}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Stripe Webhook Error:", err);
    return NextResponse.json({ error: err?.message || "Error en Webhook de Stripe" }, { status: 500 });
  }
}
