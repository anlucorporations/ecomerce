"use client";

import { useEffect, useState, useCallback } from "react";
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
  "function balanceOf(address owner) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const ORDER_STATUS_LABELS = ["Creado", "Pagado (Escrow)", "Enviado", "Entregado", "Completado (Liberado)"];

export default function FinancePage() {
  const { provider, signer, chainId, address, isConnected } = useWallet();
  const ecommerce = useContract("ecommerce", provider, signer, chainId);

  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"PRODUCTS" | "TOPUPS">("PRODUCTS");

  const [companyId, setCompanyId] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [eurtBalance, setEurtBalance] = useState<string>("0.0000");

  // Invoices & Products
  const [invoices, setInvoices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [topupLogs, setTopupLogs] = useState<any[]>([]);

  // Financial Metrics
  const [totalInvoicedEur, setTotalInvoicedEur] = useState<number>(0); // Solo órdenes liberadas (status === 4)
  const [custodyBalanceEur, setCustodyBalanceEur] = useState<number>(0); // Saldo retenido en custodia (status < 4)
  const [inventoryNominalCapital, setInventoryNominalCapital] = useState<number>(0);
  const [inventoryMarketCapital, setInventoryMarketCapital] = useState<number>(0);
  const [estimatedMarginEur, setEstimatedMarginEur] = useState<number>(0);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const loadFinanceData = useCallback(async () => {
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

        // Requirement 2: Compute Liberated Invoiced EURT vs Custody Balance EURT
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

      // Fetch Activity Logs for Ecommerce
      let allLogs: any[] = [];
      try {
        allLogs = await contract.getActivityLogs();
        const filtered = allLogs.filter(
          (l: any) => l.userAddress.toLowerCase() === address.toLowerCase()
        );
        setActivityLogs(filtered);
      } catch {
        setActivityLogs([]);
      }

      // Separate EURT Top-up Movements (Stripe Recargas & Minting from activity logs + on-chain Transfer events)
      const topupsFromLogs = allLogs.filter((l: any) => {
        const tag = (l.actionTag || "").toUpperCase();
        const det = (l.details || "").toUpperCase();
        return tag.includes("MINT") || tag.includes("RECARGA") || tag.includes("STRIPE") || det.includes("RECARGA") || det.includes("MINT") || det.includes("STRIPE");
      });

      // Query on-chain Transfer(0x0, to) Mint events from EuroToken contract
      try {
        const currentBlock = await rpcProvider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 5000);
        const mintLogs = await euroContract.queryFilter(
          euroContract.filters.Transfer(ethers.ZeroAddress, null),
          fromBlock,
          currentBlock
        );

        const onChainTopups: any[] = [];
        for (const ev of mintLogs) {
          const parsed = ev as ethers.EventLog;
          if (parsed && parsed.args) {
            const block = await ev.getBlock();
            const toAddr = parsed.args[1];
            const valEur = (Number(parsed.args[2]) / 1000000).toFixed(2);
            
            if (isOwner || toAddr.toLowerCase() === address.toLowerCase()) {
              onChainTopups.push({
                userAddress: toAddr,
                actionTag: "RECARGA_EURT_STRIPE",
                details: `Emisión de €${valEur} EURT acreditados por recarga Stripe (Mint Tx: ${parsed.transactionHash.slice(0, 10)}...)`,
                timestamp: BigInt(block.timestamp)
              });
            }
          }
        }

        const combinedTopups = [...topupsFromLogs, ...onChainTopups];
        combinedTopups.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        setTopupLogs(combinedTopups);
      } catch (err) {
        console.warn("Could not query EuroToken on-chain mint logs:", err);
        setTopupLogs(topupsFromLogs);
      }

    } catch (err) {
      console.error("Failed to load finance data:", err);
    } finally {
      setLoading(false);
    }
  }, [address, ecommerceAddress, euroTokenAddress]);

  useEffect(() => {
    loadFinanceData();
  }, [address, loadFinanceData]);

  // Requirement 2: Unreleased invoices currently held in Escrow (Paid but status < 4)
  const unreleasedInvoices = invoices.filter((inv: any) => {
    const st = Number(inv.status);
    const isPaidInEscrow = inv.isPaid || st >= 1;
    return isPaidInEscrow && st < 4;
  });

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
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold text-xs rounded-full mb-2 inline-block">
            📈 Consola de Gestión Financiera & Custodia EURT
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Finanzas & Movimientos de Capital ({companyName || "Empresa Comercial"})
          </h1>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Consolidado financiero de compras de productos, retenciones en custodia escrow y recargas de EURT.
          </p>
        </div>

        <button
          onClick={() => loadFinanceData()}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition shrink-0"
        >
          🔄 Actualizar Finanzas
        </button>
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

        {/* 2. Saldo en Custodia (Órdenes No Liberadas) */}
        <div className="admin-card p-5 border-l-4 border-l-amber-500 bg-amber-50/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
              Retenido en Custodia Escrow
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              🔒 {unreleasedInvoices.length} Orden(es)
            </span>
          </div>
          <span className="text-2xl font-black text-amber-600 block">
            €{custodyBalanceEur.toFixed(4)}
          </span>
          <p className="text-[11px] text-amber-700/80 mt-1 font-medium">
            Fondos retenidos hasta entrega
          </p>
        </div>

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

      {/* Requirement 1: SEPARATOR TABS FOR CATEGORIZATION */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab("PRODUCTS")}
          className={`px-5 py-3 font-bold text-xs rounded-t-2xl transition border-t border-x flex items-center gap-2 ${
            activeTab === "PRODUCTS"
              ? "bg-white border-slate-200 text-indigo-600 border-b-2 border-b-indigo-600 shadow-xs"
              : "bg-slate-100 border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <span>🛍️ Movimientos por Compra de Productos ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("TOPUPS")}
          className={`px-5 py-3 font-bold text-xs rounded-t-2xl transition border-t border-x flex items-center gap-2 ${
            activeTab === "TOPUPS"
              ? "bg-white border-slate-200 text-emerald-600 border-b-2 border-b-emerald-600 shadow-xs"
              : "bg-slate-100 border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <span>💳 Movimientos por Recarga de EURT ({topupLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: MOVIMIENTOS POR COMPRA DE PRODUCTOS */}
      {activeTab === "PRODUCTS" && (
        <div className="space-y-8">
          
          {/* Requirement 2: PANEL DE RESUMEN DE EURT EN CUSTODIA (ÓRDENES PAGADAS NO LIBERADAS) */}
          <div className="admin-card overflow-hidden border-2 border-amber-300 shadow-lg bg-gradient-to-r from-amber-50/60 via-white to-amber-50/40">
            <div className="p-5 border-b border-amber-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-amber-100/50">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-amber-500 text-white font-black text-lg flex items-center justify-center shadow-xs">
                  🔒
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-amber-950 font-poppins">
                    Resumen de EURT en Custodia Escrow (Órdenes Pagadas No Liberadas)
                  </h3>
                  <p className="text-xs text-amber-800">
                    Fondos retenidos en el contrato inteligente hasta la confirmación de recepción y entrega del pedido.
                  </p>
                </div>
              </div>

              <div className="text-right bg-white px-4 py-2 rounded-xl border border-amber-300 shadow-xs shrink-0">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">Total en Custodia:</span>
                <span className="text-lg font-black font-mono text-amber-600">
                  €{custodyBalanceEur.toFixed(4)} EURT
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-amber-100/30 border-b border-amber-200 text-[11px] font-bold uppercase text-amber-900 tracking-wider">
                    <th className="px-6 py-3.5">Número de Orden</th>
                    <th className="px-6 py-3.5">Cliente Comprador</th>
                    <th className="px-6 py-3.5">Monto Retenido en Custodia</th>
                    <th className="px-6 py-3.5">Fecha de Pago</th>
                    <th className="px-6 py-3.5">Estado del Pedido</th>
                    <th className="px-6 py-3.5 text-right">Acción Requerida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 text-xs text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-amber-700">
                        Cargando resumen de custodia escrow...
                      </td>
                    </tr>
                  ) : unreleasedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-emerald-700 font-bold bg-white/80">
                        🎉 ¡Sin fondos retenidos! No hay órdenes pendientes de liberación en Custodia Escrow.
                      </td>
                    </tr>
                  ) : (
                    unreleasedInvoices.map((inv: any) => {
                      const amtEur = (Number(inv.totalAmount) / 1000000).toFixed(4);
                      const dt = inv.timestamp > 0 ? new Date(Number(inv.timestamp) * 1000).toLocaleString() : "Reciente";
                      const st = Number(inv.status);

                      return (
                        <tr key={inv.invoiceId.toString()} className="hover:bg-amber-50/80 transition bg-white/90">
                          <td className="px-6 py-4 font-mono font-black text-amber-700 text-sm">
                            Orden #{inv.invoiceId.toString()}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-800 font-bold">
                            {inv.customerAddress.slice(0, 8)}...{inv.customerAddress.slice(-6)}
                          </td>
                          <td className="px-6 py-4 font-mono font-black text-amber-600 text-sm">
                            €{amtEur} EURT
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-medium">
                            {dt}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold rounded-full text-xs border border-amber-300">
                              {ORDER_STATUS_LABELS[st] || "Pendiente"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href="/orders"
                              className="inline-block px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition shadow-xs"
                            >
                              Gestión de Envío ➔
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* HISTORIAL COMPLETO DE VENTAS DE PRODUCTOS */}
          <div className="admin-card overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-sm text-slate-900">🧾 Historial General de Compras de Producto</h3>
                <p className="text-xs text-slate-500">Listado de todas las órdenes y facturas registradas en la empresa</p>
              </div>
              <span className="text-xs font-bold text-slate-500">Total Facturas: {invoices.length}</span>
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
                        Cargando compras de productos...
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        No se registran facturas de productos emitidas aún.
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

        </div>
      )}

      {/* TAB 2: MOVIMIENTOS POR RECARGA DE EURT */}
      {activeTab === "TOPUPS" && (
        <div className="admin-card overflow-hidden border-2 border-emerald-200">
          <div className="p-5 border-b border-emerald-100 flex justify-between items-center bg-emerald-50/50">
            <div>
              <h3 className="font-bold text-sm text-emerald-950 font-poppins">💳 Movimientos por Recarga de EURT (Stripe & Minting)</h3>
              <p className="text-xs text-emerald-700">Historial exclusivo de emisiones y recargas de saldo EuroTokens en la plataforma</p>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
              Registros: {topupLogs.length}
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <p className="p-6 text-center text-slate-400">Cargando recargas de EURT...</p>
            ) : topupLogs.length === 0 ? (
              <div className="p-10 text-center text-slate-400 space-y-2">
                <p className="font-bold text-sm text-slate-600">No se registran movimientos por recarga de EURT aún para esta billetera.</p>
                <p className="text-xs">Las recargas realizadas con tarjeta Stripe PCI-DSS aparecerán listadas aquí.</p>
              </div>
            ) : (
              topupLogs.map((log: any, idx: number) => (
                <div key={idx} className="p-4 flex justify-between items-center hover:bg-emerald-50/30 transition">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center border border-emerald-300">
                      EURT
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{log.actionTag || "RECARGA_EURT"}</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded border border-emerald-300">Stripe PCI-DSS</span>
                      </h4>
                      <p className="text-xs text-slate-600 font-mono mt-0.5">{log.details}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-slate-400 block text-[10px]">
                      {log.timestamp > 0 ? new Date(Number(log.timestamp) * 1000).toLocaleString() : "Reciente"}
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-700">{log.userAddress.slice(0, 8)}...{log.userAddress.slice(-6)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
