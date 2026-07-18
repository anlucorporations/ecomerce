'use client';

import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';

export default function Home() {
  const { address, isConnecting } = useWallet();

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8">E-Commerce Admin</h1>

      {isConnecting ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl">
          <p className="text-blue-700">Cargando...</p>
        </div>
      ) : !address ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Conecta tu billetera</h2>
          <p className="text-yellow-700">
            Por favor, conecta tu billetera MetaMask para acceder al panel de administración.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/companies"
            className="p-6 border rounded-lg hover:border-blue-500 hover:shadow-lg transition"
          >
            <h2 className="text-2xl font-semibold mb-2">Companies</h2>
            <p className="text-gray-600 dark:text-gray-400">Manage company registrations, products, invoices and customers</p>
          </Link>
        </div>
      )}
    </div>
  );
}
