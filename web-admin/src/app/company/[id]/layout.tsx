'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useContract } from '@/hooks/useContract';
import { useWallet } from '@/hooks/useWallet';
import { useEffect, useState } from 'react';

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const { provider, signer, chainId } = useWallet();
  const ecommerce = useContract('ecommerce', provider, signer, chainId);
  const [companyName, setCompanyName] = useState<string>('');

  const companyId = params.id as string;

  useEffect(() => {
    const loadCompany = async () => {
      if (!ecommerce) return;

      try {
        const company = await ecommerce.getCompany(BigInt(companyId));
        setCompanyName(company.name);
      } catch (error) {
        console.error('Error loading company:', error);
      }
    };

    loadCompany();
  }, [ecommerce, companyId]);

  const tabs = [
    { name: 'Products', href: `/company/${companyId}` },
    { name: 'Invoices', href: `/company/${companyId}/invoices` },
    { name: 'Customers', href: `/company/${companyId}/customers` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/companies"
            className="text-indigo-600 hover:text-indigo-500 mb-2 inline-block"
          >
            ← Back to Companies
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {companyName || `Company #${companyId}`}
          </h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      isActive
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
