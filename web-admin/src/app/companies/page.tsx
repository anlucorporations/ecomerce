'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useContract } from '../../hooks/useContract';
import Link from 'next/link';

interface Company {
  companyId: bigint;
  companyAddress: string;
  name: string;
  description: string;
  isActive: boolean;
  registrationDate: bigint;
}

export default function CompaniesPage() {
  const { provider, signer, chainId, isConnected } = useWallet();
  const ecommerce = useContract('ecommerce', provider, signer, chainId);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    address: '',
    name: '',
    description: '',
  });

  // Load companies
  useEffect(() => {
    if (!ecommerce) return;

    async function loadCompanies() {
      if (!ecommerce) return;
      try {
        setLoading(true);

        const result = await ecommerce.getAllCompanies();
        setCompanies(result);
      } catch (error) {
        console.error('Failed to load companies:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCompanies();
  }, [ecommerce]);

  // Register company
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ecommerce) return;
    console.log(provider, signer, chainId);
    try {
      setLoading(true);
      const tx = await ecommerce.registerCompany(
        formData.address,
        formData.name,
        formData.description
      );
      await tx.wait();

      // Reload companies
      const result = await ecommerce.getAllCompanies();
      setCompanies(result);

      setShowForm(false);
      setFormData({ address: '', name: '', description: '' });
    } catch (error: unknown) {
      console.error('Failed to register company:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to register company';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Please connect your wallet to manage companies</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Companies</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {showForm ? 'Cancel' : 'Register Company'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">Register New Company</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Company Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0x..."
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Company Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Address</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  No companies registered yet
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr key={company.companyId.toString()} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{company.companyId.toString()}</td>
                  <td className="px-6 py-4 font-medium">
                    <Link
                      href={`/company/${company.companyId.toString()}`}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                    >
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-gray-700 dark:text-gray-300">
                    {company.companyAddress.slice(0, 6)}...{company.companyAddress.slice(-4)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        company.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {company.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
