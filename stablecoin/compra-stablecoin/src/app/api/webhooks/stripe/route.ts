import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

function getStripeSecretKey(): string {
  return process.env.STRIPE_SECRET_KEY || "sk_test_dummy";
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET no configurada en el servidor");
  }
  return secret;
}

const stripe = new Stripe(getStripeSecretKey(), {
  apiVersion: "2025-01-27.acacia" as any,
});

const EURO_TOKEN_ABI = [
  "function mint(address to, uint256 amount) external"
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

// ---- Idempotencia persistente (sobrevive reinicios; un PaymentIntent se mintea UNA vez) ----
const IDEMPOTENCY_FILE = path.join(process.cwd(), ".data", "processed-intents.json");

function readProcessedIntents(): Set<string> {
  try {
    const raw = fs.readFileSync(IDEMPOTENCY_FILE, "utf-8");
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persistProcessedIntent(intentId: string): void {
  const set = readProcessedIntents();
  set.add(intentId);
  try {
    fs.mkdirSync(path.dirname(IDEMPOTENCY_FILE), { recursive: true });
    fs.writeFileSync(IDEMPOTENCY_FILE, JSON.stringify([...set], null, 2));
  } catch (e) {
    console.error("[Webhook] No se pudo persistir idempotencia:", e);
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    // Firma OBLIGATORIA: sin whsec configurado o sin header se rechaza (no hay modo "crudo")
    let webhookSecret: string;
    try {
      webhookSecret = getWebhookSecret();
    } catch (e: any) {
      console.error("[Webhook] Configuración incompleta:", e?.message);
      return NextResponse.json({ error: "Webhook no configurado en el servidor" }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: "Falta el header stripe-signature" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook Signature Verification Failed:", err?.message);
      return NextResponse.json({ error: "Firma de Webhook no válida" }, { status: 400 });
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const intentId = paymentIntent.id;

      // Idempotencia persistente
      if (readProcessedIntents().has(intentId)) {
        return NextResponse.json({ received: true, status: "already_processed" });
      }

      // Validar estado real del pago
      if (paymentIntent.status !== "succeeded") {
        return NextResponse.json({ received: true, status: `ignored_${paymentIntent.status}` });
      }

      // Metadata es OBLIGATORIA: sin walletAddress/amount no se mintea nada
      const walletAddress = paymentIntent.metadata?.walletAddress;
      const amountEur = paymentIntent.metadata?.amount;
      if (!walletAddress || !ethers.isAddress(walletAddress)) {
        console.warn(`[Webhook] PaymentIntent ${intentId} sin walletAddress válida en metadata; ignorado.`);
        return NextResponse.json({ received: true, status: "ignored_no_metadata" });
      }
      if (!amountEur || Number.isNaN(Number(amountEur)) || Number(amountEur) <= 0) {
        console.warn(`[Webhook] PaymentIntent ${intentId} sin amount válido en metadata; ignorado.`);
        return NextResponse.json({ received: true, status: "ignored_no_metadata" });
      }

      // Validar que el monto en metadata coincida con el monto realmente cobrado (anti-manipulación)
      const expectedCents = Math.round(Number(amountEur) * 100);
      if (paymentIntent.amount !== expectedCents) {
        console.warn(`[Webhook] PaymentIntent ${intentId}: amount metadata (${expectedCents}) != amount cobrado (${paymentIntent.amount}); ignorado.`);
        return NextResponse.json({ received: true, status: "ignored_amount_mismatch" });
      }

      const provider = new ethers.JsonRpcProvider(RPC_URL);
      let relayerPrivateKey: string;
      try {
        relayerPrivateKey = getRelayerPrivateKey();
      } catch (e: any) {
        console.error("[Webhook] Relayer no configurado; no se mintea:", e?.message);
        return NextResponse.json({ received: true, status: "relayer_not_configured" });
      }
      const signer = new ethers.Wallet(relayerPrivateKey, provider);
      const tokenContract = new ethers.Contract(EURO_TOKEN_ADDRESS, EURO_TOKEN_ABI, signer);

      const rawAmount = BigInt(Math.round(Number(amountEur) * 1000000));
      const tx = await tokenContract.mint(walletAddress, rawAmount);
      await tx.wait();

      persistProcessedIntent(intentId);
      console.log(`[Stripe Webhook] Minted ${amountEur} EURT to ${walletAddress} for PaymentIntent ${intentId}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Stripe Webhook Error:", err?.message || err);
    return NextResponse.json({ error: "Error procesando el webhook" }, { status: 500 });
  }
}
