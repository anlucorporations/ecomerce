'use client';

import { Fragment, useEffect, useState } from 'react';
import { useContract } from '@/hooks/useContract';
import { useWallet } from '@/hooks/useWallet';
import Link from 'next/link';

interface Invoice {
  invoiceId: bigint;
  companyId: bigint;
  customerAddress: string;
  totalAmount: bigint;
  timestamp: bigint;
  isPaid: boolean;
  paymentTxHash: string;
}

interface InvoiceItem {
  productId: bigint;
  productName: string;
  quantity: bigint;
  unitPrice: bigint;
  totalPrice: bigint;
}

export default function OrdersPage() {
  const { provider, signer, chainId, address, isConnecting } = useWallet();
  const ecommerce = useContract('ecommerce', provider, signer, chainId);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<bigint | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoices = async () => {
      if (!ecommerce || !address) {
        if (!isConnecting) {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const customerInvoices = await ecommerce.getCustomerInvoices(address);
        setInvoices(customerInvoices);
      } catch (error) {
        console.error('Error loading invoices:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [ecommerce, address, isConnecting]);

  const loadInvoiceDetails = async (invoiceId: bigint) => {
    if (!ecommerce) return;

    try {
      const items = await ecommerce.getInvoiceItems(invoiceId);
      setInvoiceItems(items);
      setSelectedInvoice(invoiceId);
    } catch (error) {
      console.error('Error loading invoice items:', error);
    }
  };

  const formatPrice = (price: bigint) => {
    return (Number(price) / 1_000_000).toFixed(2);
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading invoices...</div>
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
            You need to connect your wallet to view your invoices
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Invoices</h1>
          <Link
            href="/products"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Continue Shopping
          </Link>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">You haven&apos;t placed any invoices yet</p>
            <Link
              href="/products"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {invoices.map((invoice) => (
                  <Fragment key={invoice.invoiceId.toString()}>
                    <tr key={invoice.invoiceId.toString()} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        INV-{invoice.invoiceId.toString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(invoice.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        €{formatPrice(invoice.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            invoice.isPaid
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}
                        >
                          {invoice.isPaid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => loadInvoiceDetails(invoice.invoiceId)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          {selectedInvoice === invoice.invoiceId ? 'Hide Details' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                    {selectedInvoice === invoice.invoiceId && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Order Items:</h4>
                            {invoiceItems.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                              >
                                <div>
                                  <span className="font-medium text-gray-900 dark:text-white">{item.productName}</span>
                                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                                    x {item.quantity.toString()}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="text-gray-900 dark:text-white">€{formatPrice(item.totalPrice)}</div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    €{formatPrice(item.unitPrice)} each
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
