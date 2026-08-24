import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

interface PaymentRequest {
  transactionHash: string;
  merchantAddress: string;
  customerAddress: string;
  amount: string;
  invoice: string;
  date: string;
}

interface PaymentResponse {
  success: boolean;
  transactionHash: string;
  paymentData: {
    merchant_address: string;
    address_customer: string;
    amount: string;
    invoice: string;
    date: string;
  };
  processedAt: string;
  status: 'completed' | 'pending' | 'failed';
  verification: {
    receiptStatus: number | null;
    blockNumber: number | null;
  };
}

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || "http://127.0.0.1:8545";

/**
 * A12: La API nunca reporta "success" sin antes verificar el estado real de la
 * transacción on-chain. Sin receipt => "pending" (pendiente de verificación);
 * receipt con status 1 => "completed"; status 0 => "failed".
 */
async function verifyTransaction(transactionHash: string): Promise<{ status: 'completed' | 'pending' | 'failed'; receiptStatus: number | null; blockNumber: number | null }> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const receipt = await provider.getTransactionReceipt(transactionHash);
  if (!receipt) {
    return { status: 'pending', receiptStatus: null, blockNumber: null };
  }
  const status = receipt.status === 1 ? 'completed' : 'failed';
  return { status, receiptStatus: receipt.status, blockNumber: receipt.blockNumber };
}

function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

export async function POST(request: NextRequest) {
  try {
    const paymentData: PaymentRequest = await request.json();

    if (!paymentData.transactionHash ||
        !paymentData.merchantAddress ||
        !paymentData.customerAddress ||
        !paymentData.amount ||
        !paymentData.invoice ||
        !paymentData.date) {
      return NextResponse.json(
        { error: 'Missing required payment data' },
        { status: 400 }
      );
    }

    if (!isValidTxHash(paymentData.transactionHash)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash' },
        { status: 400 }
      );
    }

    const verification = await verifyTransaction(paymentData.transactionHash);
    const status = verification.status;

    const response: PaymentResponse = {
      success: status === 'completed',
      transactionHash: paymentData.transactionHash,
      paymentData: {
        merchant_address: paymentData.merchantAddress,
        address_customer: paymentData.customerAddress,
        amount: paymentData.amount,
        invoice: paymentData.invoice,
        date: paymentData.date
      },
      processedAt: new Date().toISOString(),
      status,
      verification: {
        receiptStatus: verification.receiptStatus,
        blockNumber: verification.blockNumber
      }
    };

    console.log('Payment verification result:', {
      transactionHash: paymentData.transactionHash,
      status,
      receiptStatus: verification.receiptStatus,
      timestamp: new Date().toISOString()
    });

    // 200 solo cuando la transacción está confirmada; 202 mientras está
    // pendiente de verificación; 422 cuando la transacción falló on-chain.
    const httpStatus = status === 'completed' ? 200 : status === 'pending' ? 202 : 422;
    return NextResponse.json(response, { status: httpStatus });

  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      {
        error: 'Failed to process payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const transactionHash = searchParams.get('transactionHash');

  if (!transactionHash) {
    return NextResponse.json(
      { error: 'Transaction hash is required' },
      { status: 400 }
    );
  }

  if (!isValidTxHash(transactionHash)) {
    return NextResponse.json(
      { error: 'Invalid transaction hash' },
      { status: 400 }
    );
  }

  try {
    const verification = await verifyTransaction(transactionHash);

    const response = {
      transactionHash,
      status: verification.status,
      verifiedAt: new Date().toISOString(),
      verification: {
        receiptStatus: verification.receiptStatus,
        blockNumber: verification.blockNumber
      }
    };

    const httpStatus = verification.status === 'completed' ? 200 : verification.status === 'pending' ? 202 : 422;
    return NextResponse.json(response, { status: httpStatus });

  } catch (error) {
    console.error('Error getting payment status:', error);
    return NextResponse.json(
      { error: 'Failed to get payment status' },
      { status: 500 }
    );
  }
}
