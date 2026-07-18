'use client';

import { useState } from 'react';
import { useContract } from '@/hooks/useContract';
import { useWallet } from '@/hooks/useWallet';
import { useCart } from '@/hooks/useCart';
import Link from 'next/link';

export default function CartPage() {
  const { provider, signer, chainId, address } = useWallet();
  const ecommerce = useContract('ecommerce', provider, signer, chainId);
  const { items, total, loading, removeFromCart, updateQuantity, clearCart } = useCart(
    provider,
    signer,
    chainId,
    address
  );
  const [processing, setProcessing] = useState(false);

  const formatPrice = (price: bigint) => {
    return (Number(price) / 1_000_000).toFixed(2);
  };

  const handleCheckout = async () => {
    if (!ecommerce || !address || items.length === 0) {
      alert('Please ensure you are connected and have items in your cart');
      return;
    }

    try {
      setProcessing(true);
      console.log('Starting checkout process...');
      console.log('Cart items:', items);

      // Group items by company
      const itemsByCompany = items.reduce((acc, item) => {
        const companyId = item.companyId.toString();
        if (!acc[companyId]) {
          acc[companyId] = [];
        }
        acc[companyId].push(item);
        return acc;
      }, {} as Record<string, typeof items>);

      console.log('Items by company:', itemsByCompany);

      // For now, we'll handle the first company (you can extend this for multiple companies)
      const companyIds = Object.keys(itemsByCompany);
      if (companyIds.length === 0) {
        throw new Error('No items in cart');
      }

      const firstCompanyId = companyIds[0];
      console.log('Creating invoice for company:', firstCompanyId);

      // Create invoice
      const tx = await ecommerce.createInvoice(address, BigInt(firstCompanyId));
      console.log('Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Get the invoice ID from the event
      const invoiceCreatedEvent = receipt.logs
        .map((log: unknown) => {
          try {
            return ecommerce.interface.parseLog(log as { topics: string[]; data: string });
          } catch {
            return null;
          }
        })
        .find((event: unknown) => {
          const parsed = event as { name?: string } | null;
          return parsed?.name === 'InvoiceCreated';
        });

      console.log('Invoice created event:', invoiceCreatedEvent);

      const invoiceId = invoiceCreatedEvent?.args?.invoiceId;

      if (!invoiceId) {
        throw new Error('Failed to get invoice ID from transaction');
      }

      console.log('Invoice ID:', invoiceId.toString());

      // Clear the cart after invoice creation
      console.log('Clearing cart...');
      await clearCart();
      console.log('Cart cleared successfully');

      // Get invoice details
      const invoice = await ecommerce.getInvoice(invoiceId);
      console.log('Invoice details:', invoice);

      const company = await ecommerce.getCompany(BigInt(firstCompanyId));
      console.log('Company details:', company);

      // Build payment gateway URL
      const paymentUrl = new URL('http://localhost:6002/');
      paymentUrl.searchParams.set('merchant_address', company.companyAddress);
      paymentUrl.searchParams.set('address_customer', address);
      paymentUrl.searchParams.set('amount', formatPrice(invoice.totalAmount));
      paymentUrl.searchParams.set('invoice', `INV-${invoiceId.toString()}`);
      paymentUrl.searchParams.set('date', new Date().toISOString().split('T')[0]);
      paymentUrl.searchParams.set('redirect', `${window.location.origin}/orders`);

      console.log('Redirecting to payment gateway:', paymentUrl.toString());

      // Redirect to payment gateway
      window.location.href = paymentUrl.toString();
    } catch (error: unknown) {
      console.error('Error processing checkout:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      alert(`Error processing checkout: ${err.message || String(error)}`);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading cart...</div>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please connect your wallet
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You need to connect your wallet to view your cart
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shopping Cart</h1>
          <Link
            href="/products"
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            ← Continue Shopping
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">Your cart is empty</p>
            <Link
              href="/products"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item) => (
                  <li key={item.productId.toString()} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {item.productName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          €{formatPrice(item.unitPrice)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newQty = item.quantity - BigInt(1);
                              if (newQty > BigInt(0)) {
                                updateQuantity(item.productId, newQty);
                              }
                            }}
                            className="w-8 h-8 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            -
                          </button>
                          <span className="w-12 text-center text-gray-900 dark:text-white">
                            {item.quantity.toString()}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + BigInt(1))}
                            className="w-8 h-8 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white w-24 text-right">
                          €{formatPrice(item.unitPrice * item.quantity)}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cart Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-semibold text-gray-900 dark:text-white">Total</span>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  €{formatPrice(total)}
                </span>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleCheckout}
                  disabled={processing}
                  className="w-full bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
                >
                  {processing ? 'Processing...' : 'Proceed to Payment'}
                </button>
                <button
                  onClick={clearCart}
                  className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
