"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../hooks/useWallet";
import { useContract } from "../../hooks/useContract";
import Link from "next/link";

const ECOMMERCE_ABI = [
  "function getCompanyByAddress(address _address) view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate))",
  "function getCompanyInvoices(uint256 companyId) view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, string paymentTxHash, uint8 status, string trackingNumber, uint256 shippedTimestamp, uint256 deliveredTimestamp)[])",
  "function getCompanyProducts(uint256 companyId) view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, string ipfsImageHash, uint256 stock, bool isActive)[])",
  "function getProductsByCompany(uint256 companyId) view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, string ipfsImageHash, uint256 stock, bool isActive)[])",
  "function getActivityLogs() view returns (tuple(address userAddress, string actionTag, string details, uint256 timestamp)[])"
];

const EURO_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)"
];

const ORDER_STATUS_LABELS = ["Creado", "Pagado (Custodia)", "Enviado (En Tránsito)", "Entregado & Liberado", "Completado"];

export default function FinancePage() {
  const { provider, signer, chainId, address, isConnected } = useWallet();
  const ecommerce = useContract("ecommerce", provider, signer, chainId);

  const [loading, setLoading] = useState<boolean>(true);
  const [companyId, setCompanyId] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [eurtBalance, setEurtBalance] = useState<string>("0.0000");

  // Invoices & Products
  const [invoices, setInvoices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Financial Metrics
  const [totalInvoicedEur, setTotalInvoicedEur] = useState<number>(0);
  const [totalInTransitEur, setTotalInTransitEur] = useState<number>(0); // Total EURT en Tránsito
  const [inventoryNominalCapital, setInventoryNominalCapital] = useState<number>(0);
  const [inventoryMarketCapital, setInventoryMarketCapital] = useState<number>(0);
  const [estimatedMarginEur, setEstimatedMarginEur] = useState<number>(0);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  useEffect(() => {
    async function loadFinanceData() {
      if (!address) return;
      try {
        setLoading(true);
        const rpcProvider = provider || new ethers.JsonRpcProvider("http://localhost:8545");
        const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);
        const euroContract = new ethers.Contract(euroTokenAddress, EURO_TOKEN_ABI, rpcProvider);

        // Fetch EURT balance
        try {
          const bal = await euroContract.balanceOf(address);
          setEurtBalance((Number(bal) / 1000000).toFixed(4));
        } catch {
          setEurtBalance("0.0000");
        }

        // Fetch Company info
        let compId = BigInt(1);
        try {
          const comp = await contract.getCompanyByAddress(address);
          if (comp && comp.companyId > BigInt(0)) {
            compId = comp.companyId;
            setCompanyName(comp.name);
          }
        } catch {
          // fallback
        }
        setCompanyId(compId.toString());

        // Fetch Invoices
        const rawInvoices = await contract.getCompanyInvoices(compId);
        const invoiceArray = Array.from(rawInvoices);
        setInvoices(invoiceArray);

        // Compute Total Invoiced EURT & Total In Transit EURT
        let totalPaid = 0;
        let totalTransit = 0;

        invoiceArray.forEach((inv: any) => {
          const amt = Number(inv.totalAmount) / 1000000;
          const statusNum = Number(inv.status);

          if (inv.isPaid || statusNum >= 1) {
            totalPaid += amt;
          }
          // Status 2 = Enviado / Shipped (En Tránsito, retenido en custodia hasta recepción)
          if (statusNum === 2) {
            totalTransit += amt;
          }
        });

        setTotalInvoicedEur(totalPaid);
        setTotalInTransitEur(totalTransit);

        // Fetch Products & Compute Inventory Capital
        const rawProducts = await contract.getCompanyProducts(compId);
        setProducts(Array.from(rawProducts));

        let totalNominal = 0;
        let totalMarket = 0;

        Array.from(rawProducts).forEach((p: any) => {
          const stock = Number(p.stock);
          const price = Number(p.price) / 1000000;
          let nominalUnit = price * 0.7;

          try {
            if (p.description && p.description.startsWith("{")) {
              const meta = JSON.parse(p.description);
              if (meta.nominalValue) nominalUnit = Number(meta.nominalValue);
            }
          } catch {
            // fallback
          }

          totalNominal += stock * nominalUnit;
          totalMarket += stock * price;
        });

        setInventoryNominalCapital(totalNominal);
        setInventoryMarketCapital(totalMarket);
        setEstimatedMarginEur(totalMarket - totalNominal);

        // Fetch Activity Logs for EURT / Payments
        try {
          const logs = await contract.getActivityLogs();
          const filtered = Array.from(logs).filter(
            (l: any) =>
              l.userAddress.toLowerCase() === address.toLowerCase() ||
              l.actionTag.includes("PAYMENT") ||
              l.actionTag.includes("INVOICE")
          );
          setActivityLogs(filtered);
        } catch {
          setActivityLogs([]);
        }
      } catch (err) {
        console.error("Failed to load finance data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadFinanceData();
  }, [address, provider, ecommerceAddress, euroTokenAddress]);

  if (!isConnected || !address) {
    return (
      <div className="admin-card p-12 text-center max-w-xl mx-auto space-y-4 my-12 border-2 border-indigo-200 bg-indigo-50/50 shadow-xl">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto">
          💳
        </div>
        <h2 className="text-xl font-bold text-slate-900">Sección de Finanzas Protegida</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Por favor conecte la wallet de su Empresa Comercial para auditar el estado financiero, margen de ventas y saldos EURT.
        </p>
        <Link href="/" className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow">
          ← Volver al Inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold text-xs rounded-full mb-2 inline-block">
            📈 Consola de Gestión Financiera & Auditoría EURT
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Finanzas & Movimientos de Capital ({companyName || "Empresa Comercial"})
          </h1>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Consolidado financiero de ingresos por facturación, saldos en tránsito en custodia Escrow y flujo de EuroTokens en blockchain.
          </p>
        </div>
      </div>

      {/* KPI METRICS GRID - INCLUYENDO TOTAL EN TRÁNSITO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* 1. Total Facturado */}
        <div className="admin-card p-5 border-l-4 border-l-emerald-500 bg-white">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Facturado en EURT</span>
          <span className="text-2xl font-black text-emerald-600">€{totalInvoicedEur.toFixed(4)}</span>
          <p className="text-xs text-slate-500 mt-1">Cobros y facturación total</p>
        </div>

        {/* 2. Saldo EURT en Billetera */}
        <div className="admin-card p-5 border-l-4 border-l-indigo-600 bg-white">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Saldo EURT Billetera</span>
          <span className="text-2xl font-black text-indigo-700">€{eurtBalance}</span>
          <p className="text-xs text-slate-500 mt-1">Fondos disponibles en wallet</p>
        </div>

        {/* 3. NUEVA MÉTRICA: TOTAL EN TRÁNSITO (ENVIADOS PERO NO RECIBIDOS) */}
        <div className="admin-card p-5 border-l-4 border-l-amber-500 bg-amber-50/40">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">Total en Tránsito</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">🚚 Escrow</span>
          </div>
          <span className="text-2xl font-black text-amber-600">€{totalInTransitEur.toFixed(4)}</span>
          <p className="text-xs text-amber-800/80 mt-1 font-medium">Pedidos enviados en tránsito (Custodia)</p>
        </div>

        {/* 4. Capital Mercado Inventario */}
        <div className="admin-card p-5 border-l-4 border-l-purple-600 bg-white">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Capital Mercado Inventario</span>
          <span className="text-2xl font-black text-purple-700">€{inventoryMarketCapital.toFixed(4)}</span>
          <p className="text-xs text-slate-500 mt-1">Valor de venta en stock</p>
        </div>

        {/* 5. Margen Bruto Estimado */}
        <div className="admin-card p-5 border-l-4 border-l-cyan-600 bg-white">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Margen Comercial Estimado</span>
          <span className="text-2xl font-black text-cyan-600">€{estimatedMarginEur.toFixed(4)}</span>
          <p className="text-xs text-slate-500 mt-1">Ganancia prevista (PVP - Nominal)</p>
        </div>

      </div>

      {/* SECCIÓN 1: MOVIMIENTOS DE VENTAS Y FACTURACIÓN */}
      <div className="admin-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-sm text-slate-900">🧾 Movimientos de Ventas & Facturación Registrada</h3>
            <p className="text-xs text-slate-500">Historial completo de facturas emitidas y estado de cobro en EuroTokens</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-mono">
              En Tránsito: €{totalInTransitEur.toFixed(2)} EURT
            </span>
            <span className="text-xs font-bold text-indigo-600">Total Facturas: {invoices.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="px-6 py-3.5">ID Orden</th>
                <th className="px-6 py-3.5">Cliente Comprador</th>
                <th className="px-6 py-3.5">Monto EURT</th>
                <th className="px-6 py-3.5">Fecha</th>
                <th className="px-6 py-3.5">Estatus de Cobro & Envío</th>
                <th className="px-6 py-3.5 text-right">Tx Hash Blockchain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Cargando movimientos de ventas...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No se registran movimientos de ventas facturadas aún.
                  </td>
                </tr>
              ) : (
                invoices.map((inv: any) => {
                  const amtEur = (Number(inv.totalAmount) / 1000000).toFixed(4);
                  const dt = inv.timestamp > 0 ? new Date(Number(inv.timestamp) * 1000).toLocaleString() : "Reciente";
                  const st = Number(inv.status);

                  return (
                    <tr key={inv.invoiceId.toString()} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                        #{inv.invoiceId.toString()}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-800">
                        {inv.customerAddress.slice(0, 6)}...{inv.customerAddress.slice(-4)}
                      </td>
                      <td className="px-6 py-4 font-mono font-extrabold text-emerald-600">
                        €{amtEur} EURT
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {dt}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          st === 2 ? "bg-amber-100 text-amber-800 border border-amber-300" :
                          st === 3 ? "badge-success" :
                          inv.isPaid || st >= 1 ? "badge-info" : "badge-amber"
                        }`}>
                          {st === 2 ? "🚚 Enviado (En Tránsito)" :
                           st === 3 ? "✓ Entregado & Liberado" :
                           inv.isPaid || st >= 1 ? "Pagado (Custodia)" : ORDER_STATUS_LABELS[st] || "Pendiente"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-[11px] text-slate-400">
                        {inv.paymentTxHash ? `${inv.paymentTxHash.slice(0, 8)}...` : "Confirmado"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 2: ANÁLISIS FINANCIERO DEL INVENTARIO */}
      <div className="admin-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-sm text-slate-900">📦 Análisis Financiero de Mercancía e Inventario</h3>
            <p className="text-xs text-slate-500">Evaluación de capital invertido, valor nominal vs valor de mercado y ganancia estimada por ítem</p>
          </div>
          <Link href="/inventory" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
            Ir a Gestión de Inventario →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="px-6 py-3.5">Ref Producto</th>
                <th className="px-6 py-3.5">Mercancía</th>
                <th className="px-6 py-3.5">Existencias</th>
                <th className="px-6 py-3.5">Valor Nominal Unitario</th>
                <th className="px-6 py-3.5">Valor Mercado Unitario</th>
                <th className="px-6 py-3.5">Capital Mercado Total</th>
                <th className="px-6 py-3.5 text-right">Margen Estimado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Cargando análisis de inventario...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No se registran productos en inventario para esta empresa.
                  </td>
                </tr>
              ) : (
                products.map((p: any) => {
                  const stock = Number(p.stock);
                  const price = Number(p.price) / 1000000;
                  let nominalUnit = price * 0.7;

                  try {
                    if (p.description && p.description.startsWith("{")) {
                      const meta = JSON.parse(p.description);
                      if (meta.nominalValue) nominalUnit = Number(meta.nominalValue);
                    }
                  } catch {
                    // fallback
                  }

                  const totalMarketItem = stock * price;
                  const marginItem = stock * (price - nominalUnit);

                  return (
                    <tr key={p.productId.toString()} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                        #{p.productId.toString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {p.name}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          stock > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {stock} unid.
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500">
                        €{nominalUnit.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        €{price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-purple-700">
                        €{totalMarketItem.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono font-extrabold text-right text-emerald-600">
                        +€{marginItem.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
