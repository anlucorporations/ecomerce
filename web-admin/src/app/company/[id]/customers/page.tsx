'use client';

import { useParams } from 'next/navigation';
import { useContract } from '@/hooks/useContract';
import { useWallet } from '@/hooks/useWallet';
import { useEffect, useState } from 'react';

interface Invoice {
  invoiceId: bigint;
  companyId: bigint;
  customerAddress: string;
  totalAmount: bigint;
  timestamp: bigint;
  isPaid: boolean;
  paymentTxHash: string;
}

interface CustomerSummary {
  address: string;
  totalSpent: bigint;
  invoiceCount: number;
  paidInvoices: number;
}

export default function CompanyCustomersPage() {
  const params = useParams();
  const { provider, signer, chainId } = useWallet();
  const ecommerce = useContract('ecommerce', provider, signer, chainId);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const companyId = params.id as string;

  useEffect(() => {
    const loadCustomers = async () => {
      if (!ecommerce) return;

      try {
        setLoading(true);

        // Get all invoices for this company
        const invoices: Invoice[] = await ecommerce.getCompanyInvoices(BigInt(companyId));

        // Group by customer
        const customerMap = new Map<string, CustomerSummary>();

        invoices.forEach((invoice) => {
          const addr = invoice.customerAddress;

          if (!customerMap.has(addr)) {
            customerMap.set(addr, {
              address: addr,
              totalSpent: BigInt(0),
              invoiceCount: 0,
              paidInvoices: 0,
            });
          }

          const customer = customerMap.get(addr)!;
          customer.invoiceCount++;

          if (invoice.isPaid) {
            customer.paidInvoices++;
            customer.totalSpent += invoice.totalAmount;
          }
        });

        // Convert to array and sort by total spent
        const customerList = Array.from(customerMap.values()).sort(
          (a, b) => Number(b.totalSpent - a.totalSpent)
        );

        setCustomers(customerList);
      } catch (error) {
        console.error('Error loading customers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, [ecommerce, companyId]);

  const formatPrice = (price: bigint) => {
    return (Number(price) / 1_000_000).toFixed(2);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return <div className="text-center py-8">Loading customers...</div>;
  }

  return (
    <div>
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h2 className="text-xl font-semibold text-gray-900">Customers</h2>
          <p className="mt-2 text-sm text-gray-700">
            Customers who have purchased from this company
          </p>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Spent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoices
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paid Invoices
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Rate
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-4 text-center text-gray-500"
                >
                  No customers yet
                </td>
              </tr>
            ) : (
              customers.map((customer) => {
                const paymentRate =
                  customer.invoiceCount > 0
                    ? (customer.paidInvoices / customer.invoiceCount) * 100
                    : 0;

                return (
                  <tr key={customer.address}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <span
                        className="font-mono"
                        title={customer.address}
                      >
                        {formatAddress(customer.address)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      €{formatPrice(customer.totalSpent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.invoiceCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.paidInvoices}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${paymentRate}%` }}
                          />
                        </div>
                        <span>{paymentRate.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {customers.length > 0 && (
        <div className="mt-6 bg-white shadow sm:rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Customers</p>
              <p className="text-2xl font-semibold text-gray-900">
                {customers.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold text-green-600">
                €
                {formatPrice(
                  customers.reduce((sum, c) => sum + c.totalSpent, BigInt(0))
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. per Customer</p>
              <p className="text-2xl font-semibold text-gray-900">
                €
                {formatPrice(
                  customers.reduce((sum, c) => sum + c.totalSpent, BigInt(0)) /
                    BigInt(customers.length || 1)
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
