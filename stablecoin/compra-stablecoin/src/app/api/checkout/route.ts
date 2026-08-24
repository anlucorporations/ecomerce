import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ethers } from "ethers";

// CORS restringido: solo orígenes explícitamente permitidos (nunca "*")
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002,http://127.0.0.1:3003"
).split(",").map((s) => s.trim()).filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return NextResponse.json({}, { headers: corsHeaders(origin) });
}

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "dummy_key" || key.startsWith("sk_test_mock")) {
    throw new Error("STRIPE_SECRET_KEY no configurada: la pasarela de pago no está operativa");
  }
  return key;
}

function getRelayerPrivateKey(): string {
  const key = process.env.RELAYER_PRIVATE_KEY || process.env.ANVIL_PRIVATE_KEY;
  if (!key) {
    throw new Error("RELAYER_PRIVATE_KEY no configurada en el servidor");
  }
  return key;
}

const EURO_TOKEN_ABI = [
  "function mint(address to, uint256 amount) external"
];

const ECOMMERCE_ABI = [
  "function isRegisteredEntity(address account) view returns (bool)",
  "function isCustomerRegistered(address _customer) view returns (bool)"
];

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";
const EURO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ECOMMERCE_MAIN_ADDRESS = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

const MAX_AMOUNT_EUR = 10000;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  // Rechazo CORS explícito para orígenes no permitidos
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403, headers: corsHeaders(origin) });
  }

  // Claves requeridas: se resuelven por petición (si faltan, la API responde 503 sin mintear)
  let stripe: Stripe;
  let relayerPrivateKey: string;
  try {
    const stripeSecretKey = getStripeSecretKey();
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-01-27.acacia" as any
    });
    relayerPrivateKey = getRelayerPrivateKey();
  } catch (e: any) {
    console.error("[Checkout] Configuración incompleta:", e?.message);
    return NextResponse.json({
      error: "La pasarela de pago no está configurada en el servidor."
    }, { status: 503, headers: corsHeaders(origin) });
  }

  try {
    const body = await request.json();
    const { amount, walletAddress, paymentMethodId, signature, authMessage } = body;

    if (!amount || !walletAddress) {
      return NextResponse.json({ error: "Faltan parámetros requeridos (amount, walletAddress)" }, { status: 400, headers: corsHeaders(origin) });
    }

    // Validación estricta del monto
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > MAX_AMOUNT_EUR) {
      return NextResponse.json({ error: "Monto inválido o fuera de rango" }, { status: 400, headers: corsHeaders(origin) });
    }
    if (!ethers.isAddress(walletAddress)) {
      return NextResponse.json({ error: "Dirección Ethereum de destino inválida" }, { status: 400, headers: corsHeaders(origin) });
    }

    // Verificación de firma Web3 OBLIGATORIA (autorización del titular de la wallet)
    if (!signature || !authMessage) {
      return NextResponse.json({ error: "Firma de autorización obligatoria" }, { status: 401, headers: corsHeaders(origin) });
    }
    try {
      const recoveredAddress = ethers.verifyMessage(authMessage, signature);
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return NextResponse.json({
          error: "La firma de autorización de MetaMask no coincide con la billetera destino."
        }, { status: 401, headers: corsHeaders(origin) });
      }
    } catch {
      return NextResponse.json({ error: "Firma de autorización inválida" }, { status: 401, headers: corsHeaders(origin) });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const relayerWallet = new ethers.Wallet(relayerPrivateKey, provider);
    const euroTokenContract = new ethers.Contract(EURO_TOKEN_ADDRESS, EURO_TOKEN_ABI, relayerWallet);
    const ecommerceContract = new ethers.Contract(ECOMMERCE_MAIN_ADDRESS, ECOMMERCE_ABI, provider);

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
      }, { status: 403, headers: corsHeaders(origin) });
    }

    const amountInCents = Math.round(numericAmount * 100);

    // Stripe PaymentIntent SIEMPRE (no existe modo demo sin pago)
    // Idempotency: misma firma => misma intención de pago (evita cargos duplicados en reintentos)
    const idempotencyKey = `checkout_${ethers.id(`${walletAddress.toLowerCase()}:${amountInCents}:${signature}`)}`;

    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountInCents,
          currency: "eur",
          payment_method_types: ["card"],
          description: `Compra de ${numericAmount} EURT para ${walletAddress}`,
          confirm: true,
          payment_method: paymentMethodId || "pm_card_visa",
          return_url: process.env.NEXT_PUBLIC_COMPRA_STABLECOIN_URL || "http://localhost:3003",
          metadata: {
            walletAddress,
            amount: numericAmount.toString(),
            platform: "barlo-ventas"
          }
        },
        { idempotencyKey }
      );
    } catch (stripeErr: any) {
      console.error("Stripe payment processing failed:", stripeErr?.message);
      return NextResponse.json({
        error: "No se pudo completar el pago con la pasarela Stripe. La transacción fue cancelada."
      }, { status: 402, headers: corsHeaders(origin) });
    }

    // SOLO se mintea si el pago quedó confirmado (cubre requires_action / 3DS)
    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({
        error: `Pago pendiente de confirmación (${paymentIntent.status}). No se emitieron tokens.`,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret
      }, { status: 402, headers: corsHeaders(origin) });
    }

    // Execute On-Chain EuroToken (EURT) Minting (Decimals: 6)
    const rawMintAmount = BigInt(Math.round(numericAmount * 1000000));
    const mintTx = await euroTokenContract.mint(walletAddress, rawMintAmount);
    const receipt = await mintTx.wait();

    return NextResponse.json({
      success: true,
      stripePaymentId: paymentIntent.id,
      mintTxHash: receipt.hash,
      message: `¡${numericAmount} EURT han sido emitidos y confirmados en blockchain para ${walletAddress}!`
    }, { status: 200, headers: corsHeaders(origin) });

  } catch (error: any) {
    console.error("Checkout processing error:", error?.message || error);
    return NextResponse.json({
      error: "Error procesando el pago o la emisión de tokens. Verifique la configuración del servidor."
    }, { status: 500, headers: corsHeaders(origin) });
  }
}
