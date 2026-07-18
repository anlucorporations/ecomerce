import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ethers } from 'ethers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const EUROTOKEN_ABI = [
  "function mint(address to, uint256 amount) external",
  "function owner() view returns (address)",
  "function decimals() view returns (uint8)"
];

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle payment_intent.succeeded event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    try {
      await mintTokens(paymentIntent);
      console.log('Tokens minted successfully for payment:', paymentIntent.id);
    } catch (error) {
      console.error('Error minting tokens:', error);
      return NextResponse.json({ error: 'Failed to mint tokens' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

async function mintTokens(paymentIntent: Stripe.PaymentIntent) {
  const walletAddress = paymentIntent.metadata.walletAddress;
  const amountInEur = paymentIntent.amount / 100; // Convert from cents to EUR

  if (!walletAddress) {
    throw new Error('No wallet address in payment metadata');
  }

  // Get RPC URL from environment variables, default to localhost for backwards compatibility
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
  
  if (!process.env.OWNER_PRIVATE_KEY) {
    throw new Error('OWNER_PRIVATE_KEY is not set in environment variables');
  }

  // Connect to blockchain
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const signer = new ethers.Wallet(
    process.env.OWNER_PRIVATE_KEY,
    provider
  );

  const contract = new ethers.Contract(
    process.env.NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS!,
    EUROTOKEN_ABI,
    signer
  );

  // Calculate amount with 6 decimals (1 EUR = 1 EURT)
  const amountToMint = ethers.parseUnits(amountInEur.toString(), 6);

  // Mint tokens to user's wallet
  const tx = await contract.mint(walletAddress, amountToMint);
  await tx.wait();

  console.log(`Minted ${amountInEur} EURT to ${walletAddress}`);
  console.log('Transaction hash:', tx.hash);
}