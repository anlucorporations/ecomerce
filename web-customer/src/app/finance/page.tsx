'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useContract } from '@/hooks/useContract';
import { ethers } from 'ethers';
import Link from 'next/link';

interface Invoice {
  invoiceId: bigint;
  companyId: bigint;
  customerAddress: string;
  totalAmount: bigint;
  timestamp: bigint;
  isPaid: boolean;
  paymentTxHash: string;
  status: number;
}

const ECOMMERCE_ABI = [
  "function getCompanyInvoices(uint256 companyId) view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, string paymentTxHash, uint8 status, string trackingNumber, uint256 shippedTimestamp, uint256 deliveredTimestamp)[])",
  "function getAllCompanies() view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate)[])"
];

export default function UserFinancePage() {
  const { provider, signer, chainId, address, isConnected, connect } = useWallet();
  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const [eurtBalance, setEurtBalance] = useState<string>('0.00');
  const [ethBalance, setEthBalance] = useState<string>('0.0000');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const formatPrice = (price: bigint) => {
    return (Number(price) / 1_000_000).toFixed(2);
  };

  useEffect(() => {
    const fetchFinancesData = async () => {
      if (!address) return;
      try {
        setLoading(true);
        const rpcProvider = provider || new ethers.JsonRpcProvider('http://localhost:8545');

        // 1. Fetch Balances
        const rawEth = await rpcProvider.getBalance(address);
        setEthBalance((Number(rawEth) / 1e18).toFixed(4));

        const tokenContract = new ethers.Contract(
          euroTokenAddress,
          ['function balanceOf(address account) view returns (uint256)'],
          rpcProvider
        );
        const rawEurt = await tokenContract.balanceOf(address);
        setEurtBalance((Number(rawEurt) / 1e6).toFixed(2));

        // 2. Fetch User Invoices across companies
        const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

        // Fetch company names
        try {
          const comps = await contract.getAllCompanies();
          const compMap: Record<string, string> = {};
          Array.from(comps).forEach((c: any) => {
            compMap[c.companyId.toString()] = c.name;
          });
          setCompanyNames(compMap);

          // Fetch invoices for company #1 (or all)
          const allInv = await contract.getCompanyInvoices(BigInt(1));
          const userInvs = Array.from(allInv).filter(
            (inv: any) => inv.customerAddress.toLowerCase() === address.toLowerCase()
          );
          setInvoices(userInvs as Invoice[]);
        } catch (e) {
          console.warn("Could not fetch invoices/companies:", e);
        }

      } catch (e) {
        console.error('Error fetching finance data:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancesData();
  }, [address, provider, ecommerceAddress, euroTokenAddress]);

  const totalSpentEURT = invoices
    .filter((i) => i.isPaid)
    .reduce((acc, i) => acc + Number(i.totalAmount), 0) / 1_000_000;

  const paidInvoicesCount = invoices.filter((i) => i.isPaid).length;
  const pendingInvoicesCount = invoices.filter((i) => !i.isPaid).length;

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-3xl">
            📊
          </div>
          <h1 className="text-xl font-black text-slate-900">Acceso a Finanzas Restringido</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Debe conectar su billetera Web3 desde el menú superior para verificar su panel financiero y movimientos.
          </p>
          <button
            onClick={() => connect()}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-600/30 transition"
          >
            Conectar Wallet Web3
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full inline-block mb-2">
              📊 Panel Financiero Personal
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Finanzas y Movimientos EURT</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditoría transparente de saldos, facturación electrónica y transacciones en blockchain.
            </p>
          </div>

          <a
            href="http://localhost:3003"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition text-center"
          >
            💳 Recargar EURT con Stripe ↗
          </a>
        </div>

        {/* FINANCIAL SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saldo EuroToken (EURT)</span>
            <div className="text-3xl font-black font-mono text-emerald-600">
              €{eurtBalance}
            </div>
            <span className="text-[11px] text-slate-500 font-medium block">Token Estable Respaldado</span>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saldo Ethereum (ETH)</span>
            <div className="text-3xl font-black font-mono text-slate-900">
              {ethBalance} <span className="text-xs font-normal text-slate-400">ETH</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium block">Gas de Red Local</span>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Gastado en Plataforma</span>
            <div className="text-3xl font-black font-mono text-rose-600">
              €{totalSpentEURT.toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-500 font-medium block">Acumulado Facturado</span>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Facturas Procesadas</span>
            <div className="text-3xl font-black font-mono text-indigo-600">
              {paidInvoicesCount} <span className="text-xs font-normal text-slate-400">Pagadas</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium block">
              {pendingInvoicesCount} pendientes de pago
            </span>
          </div>

        </div>

        {/* INVOICES & TRANSACTIONS TABLE */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Histórico de Facturación y Compras</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Registro inmutable de órdenes pagadas con EuroToken en la cadena de bloques.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-xl">
              {invoices.length} registro(s)
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">
              Cargando movimientos financieros...
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Aún no registras compras ni movimientos de facturación en la plataforma.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">ID Factura</th>
                    <th className="py-3 px-4">Empresa Vendedora</th>
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4 text-right">Monto (EURT)</th>
                    <th className="py-3 px-4 text-center">Estado Pago</th>
                    <th className="py-3 px-4">Hash Transacción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {invoices.map((inv) => {
                    const compName = companyNames[inv.companyId.toString()] || `Empresa #${inv.companyId.toString()}`;
                    const dateStr = new Date(Number(inv.timestamp) * 1000).toLocaleString();

                    return (
                      <tr key={inv.invoiceId.toString()} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-4 font-mono font-bold text-rose-600">
                          #{inv.invoiceId.toString()}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900">
                          {compName}
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-500">
                          {dateStr}
                        </td>
                        <td className="py-4 px-4 font-mono font-black text-right text-emerald-600">
                          €{formatPrice(inv.totalAmount)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {inv.isPaid ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✓ Pagado
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              ⏳ Pendiente
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-mono text-[10px] text-slate-400">
                          {inv.paymentTxHash ? (
                            <span className="text-slate-600 truncate block max-w-[120px]" title={inv.paymentTxHash}>
                              {inv.paymentTxHash.slice(0, 10)}...
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
