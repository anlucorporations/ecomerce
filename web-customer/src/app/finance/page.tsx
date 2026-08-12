'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { ethers } from 'ethers';

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
  const { provider, address, isConnected, connect } = useWallet();
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

        const rawEth = await rpcProvider.getBalance(address);
        setEthBalance((Number(rawEth) / 1e18).toFixed(4));

        const tokenContract = new ethers.Contract(
          euroTokenAddress,
          ['function balanceOf(address account) view returns (uint256)'],
          rpcProvider
        );
        const rawEurt = await tokenContract.balanceOf(address);
        setEurtBalance((Number(rawEurt) / 1e6).toFixed(2));

        const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

        try {
          const comps = await contract.getAllCompanies();
          const compMap: Record<string, string> = {};
          Array.from(comps).forEach((c: any) => {
            compMap[c.companyId.toString()] = c.name;
          });
          setCompanyNames(compMap);

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
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-[#EAF5EF] text-[#2E8B57] rounded-2xl flex items-center justify-center mx-auto text-3xl">
            📊
          </div>
          <h1 className="text-xl font-black text-[#333333] font-poppins">Acceso a Finanzas Restringido</h1>
          <p className="text-xs text-[#A9A9A9] leading-relaxed">
            Debe conectar su billetera Web3 para auditar sus saldos y facturas en BARLO-VENTAS.
          </p>
          <button
            onClick={() => connect()}
            className="btn-cacao-pulse w-full text-xs font-poppins"
          >
            Conectar Wallet Web3
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="glass-card p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 bg-[#EAF5EF] text-[#2E8B57] border border-[#2E8B57]/30 text-xs font-bold rounded-full inline-block mb-2 font-poppins">
              📊 Panel Financiero Personal
            </span>
            <h1 className="text-2xl font-black text-[#333333] tracking-tight font-poppins">Finanzas y Movimientos EURT</h1>
            <p className="text-xs text-[#A9A9A9] mt-0.5">
              Auditoría transparente de saldos, facturación electrónica y transacciones en blockchain.
            </p>
          </div>

          <a
            href="http://localhost:3003"
            target="_blank"
            rel="noreferrer"
            className="btn-cacao-pulse text-xs font-poppins uppercase tracking-wider text-center"
          >
            💳 Recargar EURT con Stripe ↗
          </a>
        </div>

        {/* FINANCIAL SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="glass-card p-6 border-l-4 border-l-[#2E8B57] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0077BB] font-poppins">Saldo EuroToken (EURT)</span>
            <div className="text-3xl font-black font-mono text-[#2E8B57]">
              €{eurtBalance}
            </div>
            <span className="text-[11px] text-[#A9A9A9] font-medium block">Token Estable Respaldado</span>
          </div>

          <div className="glass-card p-6 border-l-4 border-l-[#0077BB] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0077BB] font-poppins">Saldo Ethereum (ETH)</span>
            <div className="text-3xl font-black font-mono text-[#0077BB]">
              {ethBalance} <span className="text-xs font-normal text-[#A9A9A9]">ETH</span>
            </div>
            <span className="text-[11px] text-[#A9A9A9] font-medium block">Gas de Red Local</span>
          </div>

          <div className="glass-card p-6 border-l-4 border-l-[#CC2233] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0077BB] font-poppins">Total Gastado en Plataforma</span>
            <div className="text-3xl font-black font-mono text-[#CC2233]">
              €{totalSpentEURT.toFixed(2)}
            </div>
            <span className="text-[11px] text-[#A9A9A9] font-medium block">Acumulado Facturado</span>
          </div>

          <div className="glass-card p-6 border-l-4 border-l-[#FF8800] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0077BB] font-poppins">Facturas Procesadas</span>
            <div className="text-3xl font-black font-mono text-[#FF8800]">
              {paidInvoicesCount} <span className="text-xs font-normal text-[#A9A9A9]">Pagadas</span>
            </div>
            <span className="text-[11px] text-[#A9A9A9] font-medium block">
              {pendingInvoicesCount} pendientes de pago
            </span>
          </div>

        </div>

        {/* INVOICES & TRANSACTIONS TABLE */}
        <div className="glass-card p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#0077BB]/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#333333] font-poppins">Histórico de Facturación BARLO-VENTAS</h2>
              <p className="text-xs text-[#A9A9A9] mt-0.5">
                Registro inmutable de órdenes pagadas con EuroToken en la cadena de bloques.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#0077BB] bg-[#E6F4FA] px-3 py-1 rounded-xl">
              {invoices.length} registro(s)
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-[#A9A9A9] font-mono">
              Cargando movimientos financieros...
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#A9A9A9]">
              Aún no registras compras ni movimientos de facturación en la plataforma.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#0077BB]/10 text-[#A9A9A9] font-bold uppercase tracking-wider text-[10px] font-poppins">
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
                      <tr key={inv.invoiceId.toString()} className="hover:bg-white/60 transition">
                        <td className="py-4 px-4 font-mono font-bold text-[#FF8800]">
                          #{inv.invoiceId.toString()}
                        </td>
                        <td className="py-4 px-4 font-bold text-[#333333] font-poppins">
                          {compName}
                        </td>
                        <td className="py-4 px-4 font-mono text-[#A9A9A9]">
                          {dateStr}
                        </td>
                        <td className="py-4 px-4 font-mono font-black text-right text-[#2E8B57]">
                          €{formatPrice(inv.totalAmount)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {inv.isPaid ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EAF5EF] text-[#2E8B57] border border-[#2E8B57]/30 font-poppins">
                              ✓ Pagado
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FFF3E5] text-[#FF8800] border border-[#FF8800]/30 font-poppins">
                              ⏳ Pendiente
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-mono text-[10px] text-[#A9A9A9]">
                          {inv.paymentTxHash ? (
                            <span className="text-[#333333] truncate block max-w-[120px]" title={inv.paymentTxHash}>
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
