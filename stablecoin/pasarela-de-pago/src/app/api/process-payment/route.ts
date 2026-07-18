import { NextRequest, NextResponse } from 'next/server';

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
  status: 'completed' | 'failed' | 'pending';
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

    // Here you could add additional verification:
    // - Verify the transaction on the blockchain
    // - Check if the payment amount is correct
    // - Validate the merchant and customer addresses
    // - Store the payment in a database

    const response: PaymentResponse = {
      success: true,
      transactionHash: paymentData.transactionHash,
      paymentData: {
        merchant_address: paymentData.merchantAddress,
        address_customer: paymentData.customerAddress,
        amount: paymentData.amount,
        invoice: paymentData.invoice,
        date: paymentData.date
      },
      processedAt: new Date().toISOString(),
      status: 'completed'
    };

    // Log successful payment
    console.log('Payment processed successfully:', {
      transactionHash: paymentData.transactionHash,
      amount: paymentData.amount,
      invoice: paymentData.invoice,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(response);

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

  try {
    // Here you could query the blockchain or your database
    // to get the payment status by transaction hash

    const response = {
      transactionHash,
      status: 'completed', // This would come from your verification logic
      verifiedAt: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting payment status:', error);
    return NextResponse.json(
      { error: 'Failed to get payment status' },
      { status: 500 }
    );
  }
}