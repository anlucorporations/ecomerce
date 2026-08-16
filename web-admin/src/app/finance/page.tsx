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
  "function getActivityLogs() view returns (tuple(address userAddress, string actionTag, string details, uint256 timestamp)[])"
];

const EURO_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)"
];

const ORDER_STATUS_LABELS = ["Creado", "Pagado (EURT)", "Enviado", "Entregado", "Completado (Liberado)"];

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
  const [totalInvoicedEur, setTotalInvoicedEur] = useState<number>(0); // Solo órdenes liberadas (status === 4)
  const [custodyBalanceEur, setCustodyBalanceEur] = useState<number>(0); // Saldo retenido en custodia (status < 4)
  const [inventoryNominalCapital, setInventoryNominalCapital] = useState<number>(0);
  const [inventoryMarketCapital, setInventoryMarketCapital] = useState<number>(0);
  const [estimatedMarginEur, setEstimatedMarginEur] = useState<number>(0);

  // View state for Analysis block
  const [showCustodyOrders, setShowCustodyOrders] = useState<boolean>(false);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  useEffect(() => {
    async function loadFinanceData() {
      if (!address) return;
      try {
        setLoading(true);
        const rpcProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "https://mcc-foundry-anvil-1095249147821.europe-west1.run.app");
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
        let compId: bigint | null = null;
        try {
          const comp = await contract.getCompanyByAddress(address);
          if (comp && comp.companyId > BigInt(0)) {
            compId = comp.companyId;
            setCompanyName(comp.name);
          }
        } catch {
          // fallback
        }

        const isOwner = address.toLowerCase() === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

        if (isOwner && !compId) {
          compId = BigInt(1);
          setCompanyName("Super Admin Owner");
        } else if (!compId) {
          setCompanyId("");
          setCompanyName("Wallet no inscrita como Empresa");
        }

        if (compId) {
          setCompanyId(compId.toString());

          // Fetch Invoices for this merchant
          const rawInvoices = await contract.getCompanyInvoices(compId);
          setInvoices(rawInvoices);

          // Compute Liberated Invoiced EURT vs Custody Balance EURT
          let totalLiberated = 0;
          let totalCustody = 0;

          rawInvoices.forEach((inv: any) => {
            const st = Number(inv.status);
            const amt = Number(inv.totalAmount) / 1000000;
            const isPaidInEscrow = inv.isPaid || st >= 1;

            if (st === 4) {
              // Ordenes Liberadas (Completadas y entregadas a la empresa)
              totalLiberated += amt;
            } else if (isPaidInEscrow && st < 4) {
              // Ordenes en Custodia Escrow (Pagadas por cliente pero aún no liberadas)
              totalCustody += amt;
            }
          });

          setTotalInvoicedEur(totalLiberated);
          setCustodyBalanceEur(totalCustody);

          // Fetch Products & Compute Inventory Capital
          const rawProducts = await contract.getCompanyProducts(compId);
          setProducts(rawProducts);

          let totalNominal = 0;
          let totalMarket = 0;

          rawProducts.forEach((p: any) => {
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
        } else {
          setInvoices([]);
          setProducts([]);
          setTotalInvoicedEur(0);
          setCustodyBalanceEur(0);
          setInventoryNominalCapital(0);
          setInventoryMarketCapital(0);
          setEstimatedMarginEur(0);
        }

        // Fetch Activity Logs
        try {
          const logs = await contract.getActivityLogs();
          const filtered = logs.filter(
            (l: any) => l.userAddress.toLowerCase() === address.toLowerCase()
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
  }, [address, provider]);

  const unreleasedInvoices = invoices.filter((inv: any) => {
    const st = Number(inv.status);
    const isPaidInEscrow = inv.isPaid || st >= 1;
    return isPaidInEscrow && st < 4;
  });

  const handleCustodyClick = () => {
    setShowCustodyOrders(true);
    const element = document.getElementById("analysis-block");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

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
            📈 Consola de Gestión Financiera & Custodia EURT
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Finanzas & Movimientos de Capital ({companyName || "Empresa Comercial"})
          </h1>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Consolidado financiero de órdenes liberadas, saldo retenido en custodia escrow y capital en inventario almacenado.
          </p>
        </div>
      </div>

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Facturado (Solo Liberadas) */}
        <div className="admin-card p-5 border-l-4 border-l-emerald-500">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Facturado (Liberado)
          </span>
          <span className="text-2xl font-black text-emerald-600">
            €{totalInvoicedEur.toFixed(4)}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Órdenes completadas y cobradas</p>
        </div>

        {/* 2. Saldo en Custodia (Órdenes No Liberadas - CLICKABLE!) */}
        <button
          onClick={handleCustodyClick}
          className="admin-card p-5 border-l-4 border-l-amber-500 text-left hover:bg-amber-50/50 hover:border-amber-600 transition cursor-pointer group shadow-sm hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
              Saldo en Custodia
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 group-hover:scale-105 transition">
              🔍 Ver No Liberadas
            </span>
          </div>
          <span className="text-2xl font-black text-amber-600 block">
            €{custodyBalanceEur.toFixed(4)}
          </span>
          <p className="text-[11px] text-amber-700/80 mt-1 font-medium">
            {unreleasedInvoices.length} orden(es) pendiente(s) de liberación
          </p>
        </button>

        {/* 3. Saldo EURT en Billetera */}
        <div className="admin-card p-5 border-l-4 border-l-indigo-600">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Saldo EURT Billetera
          </span>
          <span className="text-2xl font-black text-indigo-700">
            €{eurtBalance}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Fondos disponibles en wallet</p>
        </div>

        {/* 4. Capital Mercado Inventario */}
        <div className="admin-card p-5 border-l-4 border-l-purple-600">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Capital Mercado Stock
          </span>
          <span className="text-2xl font-black text-purple-700">
            €{inventoryMarketCapital.toFixed(4)}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Valor PVP en inventario</p>
        </div>

        {/* 5. Margen Comercial Estimado */}
        <div className="admin-card p-5 border-l-4 border-l-teal-600">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Margen Estimado
          </span>
          <span className="text-2xl font-black text-teal-600">
            €{estimatedMarginEur.toFixed(4)}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Ganancia prevista (PVP - Costo)</p>
        </div>
      </div>

      {/* SECCIÓN 1: MOVIMIENTOS DE VENTAS Y FACTURACIÓN REGISTRADA */}
      <div className="admin-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-sm text-slate-900">🧾 Movimientos de Ventas & Facturación Registrada</h3>
            <p className="text-xs text-slate-500">Historial completo de facturas emitidas y estado de cobro en EuroTokens</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-emerald-600">Liberadas: {invoices.filter((i: any) => Number(i.status) === 4).length}</span>
            <span className="text-amber-600">En Custodia: {unreleasedInvoices.length}</span>
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
                <th className="px-6 py-3.5">Estatus de Liberación</th>
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
                  const isLiberated = st === 4;

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
                          isLiberated ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}>
                          {isLiberated ? "🟢 Liberado de Custodia" : `🔒 En Custodia (${ORDER_STATUS_LABELS[st] || "Pendiente"})`}
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

      {/* SECCIÓN 2: BLOQUE DINÁMICO (ANÁLISIS FINANCIERO / ÓRDENEN NO LIBERADAS EN CUSTODIA) */}
      <div id="analysis-block" className="admin-card overflow-hidden scroll-mt-24 border-2 border-indigo-100 shadow-md">
        {/* Header Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCustodyOrders(false)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                !showCustodyOrders
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>📦 Análisis Financiero de Mercancía e Inventario</span>
            </button>

            <button
              onClick={() => setShowCustodyOrders(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                showCustodyOrders
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>🔒 Órdenes No Liberadas en Custodia ({unreleasedInvoices.length})</span>
            </button>
          </div>

          <div className="text-right">
            {!showCustodyOrders ? (
              <Link href="/inventory" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                Ir a Gestión de Inventario →
              </Link>
            ) : (
              <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                Total Custodiado: €{custodyBalanceEur.toFixed(4)} EURT
              </span>
            )}
          </div>
        </div>

        {/* TAB 1: ANÁLISIS FINANCIERO DEL INVENTARIO */}
        {!showCustodyOrders ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <th className="px-6 py-3.5">Ref Producto</th>
                  <th className="px-6 py-3.5">Mercancía</th>
                  <th className="px-6 py-3.5">Existencias</th>
                  <th className="px-6 py-3.5">Valor Nominal Unitario</th>
                  <th className="px-6 py-3.5">Valor Mercado Unitario</th>
                  <th className="px-6 py-3.5">Capital Invertido Total</th>
                  <th className="px-6 py-3.5 text-right">Margen Comercial Proyectado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      Cargando análisis financiero de inventario...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No se registran productos en inventario.
                    </td>
                  </tr>
                ) : (
                  products.map((p: any) => {
                    const stock = Number(p.stock);
                    const priceMarket = Number(p.price) / 1000000;
                    let nominalUnit = priceMarket * 0.7;

                    try {
                      if (p.description && p.description.startsWith("{")) {
                        const meta = JSON.parse(p.description);
                        if (meta.nominalValue) nominalUnit = Number(meta.nominalValue);
                      }
                    } catch {
                      // fallback
                    }

                    const capitalTotal = stock * nominalUnit;
                    const revenueTotal = stock * priceMarket;
                    const marginTotal = revenueTotal - capitalTotal;

                    return (
                      <tr key={p.productId.toString()} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                          #{p.productId.toString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {p.name}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-800">
                          {stock} unidades
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600">
                          €{nominalUnit.toFixed(4)}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-indigo-700">
                          €{priceMarket.toFixed(4)}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                          €{capitalTotal.toFixed(4)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-extrabold text-emerald-600">
                          +€{marginTotal.toFixed(4)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* TAB 2: TABLA DE ÓRDENES NO LIBERADAS EN CUSTODIA */
          <div className="overflow-x-auto bg-amber-50/20">
            <div className="p-4 bg-amber-50 border-b border-amber-200/60 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔒</span>
                <div>
                  <span className="font-extrabold">Órdenes y Fondos Retenidos en Custodia Escrow</span>
                  <p className="text-[11px] text-amber-700">
                    Fondos depositados por clientes que permanecen resguardados hasta la confirmación de la entrega.
                  </p>
                </div>
              </div>
              <Link
                href="/orders"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs transition"
              >
                Gestionar Envíos en Órdenes →
              </Link>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-amber-100/50 border-b border-amber-200 text-[11px] font-bold uppercase text-amber-800 tracking-wider">
                  <th className="px-6 py-3.5">ID Orden</th>
                  <th className="px-6 py-3.5">Cliente Comprador</th>
                  <th className="px-6 py-3.5">Monto Custodiado (EURT)</th>
                  <th className="px-6 py-3.5">Fecha de Compra</th>
                  <th className="px-6 py-3.5">Estado de la Orden</th>
                  <th className="px-6 py-3.5 text-right">Estado de Custodia Escrow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      Cargando órdenes en custodia...
                    </td>
                  </tr>
                ) : unreleasedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-emerald-600 font-bold bg-white">
                      🎉 ¡Excelente! No existen órdenes retenidas en custodia actualmente. Todos los fondos han sido liberados.
                    </td>
                  </tr>
                ) : (
                  unreleasedInvoices.map((inv: any) => {
                    const amtEur = (Number(inv.totalAmount) / 1000000).toFixed(4);
                    const dt = inv.timestamp > 0 ? new Date(Number(inv.timestamp) * 1000).toLocaleString() : "Reciente";
                    const st = Number(inv.status);

                    return (
                      <tr key={inv.invoiceId.toString()} className="hover:bg-amber-50/60 transition bg-white">
                        <td className="px-6 py-4 font-mono font-bold text-amber-700">
                          #{inv.invoiceId.toString()}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-800">
                          {inv.customerAddress.slice(0, 6)}...{inv.customerAddress.slice(-4)}
                        </td>
                        <td className="px-6 py-4 font-mono font-black text-amber-600">
                          €{amtEur} EURT
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {dt}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-xs border border-amber-300">
                            {ORDER_STATUS_LABELS[st] || "Pendiente"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-3 py-1 bg-amber-500/20 text-amber-800 font-extrabold text-[11px] rounded-full border border-amber-400">
                            🔒 Retenido en Escrow
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECCIÓN 3: MOVIMIENTOS DE EURT Y REGISTRO DE AUDITORÍA */}
      <div className="admin-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-sm text-slate-900">💱 Movimientos de EURT & Registro de Transacciones</h3>
            <p className="text-xs text-slate-500">Auditoría en blockchain de transferencias, pagos de facturas y recargas de la empresa</p>
          </div>
          <Link href="/audit" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
            Ver Registro Completo →
          </Link>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {activityLogs.length === 0 ? (
            <p className="p-6 text-center text-slate-400">Sin eventos de movimientos de EURT recientes.</p>
          ) : (
            activityLogs.slice(0, 5).map((log: any, idx: number) => (
              <div key={idx} className="p-4 flex justify-between items-center hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center border border-indigo-200">
                    EURT
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900">{log.actionTag}</h4>
                    <p className="text-[11px] text-slate-500">{log.details}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-slate-400 block text-[10px]">
                    {log.timestamp > 0 ? new Date(Number(log.timestamp) * 1000).toLocaleString() : "Reciente"}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-700">{log.userAddress.slice(0, 6)}...{log.userAddress.slice(-4)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
