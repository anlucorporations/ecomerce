"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../hooks/useWallet";
import { InvoicePdfModal, InvoiceModalData } from "../../components/InvoicePdfModal";

const ECOMMERCE_ABI = [
  "function getCompanyInvoices(uint256 companyId) view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, string paymentTxHash, uint8 status, string trackingNumber, uint256 shippedTimestamp, uint256 deliveredTimestamp)[])",
  "function getCompanyByAddress(address account) view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate))",
  "function shipOrder(uint256 invoiceId, string trackingNumber)"
];

const EUROTOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

const ORDER_STATUS_LABELS = ["Creado (Pendiente Pago)", "Pagado (EURT Escrow)", "Enviado 📦", "Entregado ✅", "Completado 🎉"];

const CARRIER_OPTIONS = [
  "DHL Express International",
  "FedEx Cargo & Logistics",
  "MRW Courier Nacional",
  "Servicio de Delivery Interno Expreso",
  "Correos de España / Postal",
  "Transporte Privado Directo"
];

interface ShippingFormData {
  invoiceId: string;
  customerAddress: string;
  totalAmountEur: string;
  isPaid: boolean;
  carrier: string;
  trackingNumber: string;
  notes: string;
  estimatedDeliveryDate: string;
}

export default function ShippingManagementPage() {
  const { address, signer } = useWallet();
  const [companyId, setCompanyId] = useState<string>("1");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [invoicePdfData, setInvoicePdfData] = useState<InvoiceModalData | null>(null);

  // Modal State for Shipping Form
  const [isShippingModalOpen, setIsShippingModalOpen] = useState<boolean>(false);
  const [shippingForm, setShippingForm] = useState<ShippingFormData>({
    invoiceId: "",
    customerAddress: "",
    totalAmountEur: "",
    isPaid: false,
    carrier: CARRIER_OPTIONS[0],
    trackingNumber: "",
    notes: "",
    estimatedDeliveryDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
  });

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  useEffect(() => {
    async function autoDetectCompany() {
      if (!address) return;
      try {
        const rpcProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");
        const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);
        const comp = await contract.getCompanyByAddress(address);
        if (comp && comp.companyId > BigInt(0)) {
          setCompanyId(comp.companyId.toString());
        }
      } catch (err) {
        console.warn("Notice auto-detecting company ID:", err);
      }
    }
    autoDetectCompany();
  }, [address, ecommerceAddress]);

  const fetchCompanyOrders = async () => {
    try {
      setLoading(true);
      const rpcProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

      const rawOrders = await contract.getCompanyInvoices(companyId);
      setOrders(rawOrders);
    } catch (err: any) {
      console.error("Error fetching company orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyOrders();
  }, [companyId]);

  const openShippingModal = (ord: any) => {
    const amountEur = (Number(ord.totalAmount) / 1000000).toFixed(2);
    setShippingForm({
      invoiceId: ord.invoiceId.toString(),
      customerAddress: ord.customerAddress,
      totalAmountEur: amountEur,
      isPaid: ord.isPaid,
      carrier: CARRIER_OPTIONS[0],
      trackingNumber: ord.trackingNumber || `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: "Despacho prioritario con confirmación en blockchain.",
      estimatedDeliveryDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    });
    setIsShippingModalOpen(true);
  };

  const handleSubmitShippingForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingForm.trackingNumber.trim()) {
      alert("⚠️ El número de seguimiento/guía de envío es obligatorio.");
      return;
    }
    if (!signer) {
      alert("⚠️ Conecte su billetera de administración en MetaMask para firmar el despacho.");
      return;
    }

    try {
      setProcessingId(shippingForm.invoiceId);
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, signer);

      // M7: el comerciante NO puede pagar en nombre del cliente.
      // processPayment solo permite msg.sender == customer || owner, por lo que
      // el auto-pago desde la consola del comerciante siempre revierte.
      if (!shippingForm.isPaid) {
        alert("⚠️ Esta factura aún no está pagada en blockchain. Solo el cliente titular (o el owner) puede pagarla en la pasarela. El despacho se habilitará cuando el pago esté confirmado.");
        setProcessingId(null);
        return;
      }

      // Execute shipOrder on-chain
      const fullTrackingInfo = `[${shippingForm.carrier}] Guía: ${shippingForm.trackingNumber} (Est: ${shippingForm.estimatedDeliveryDate})`;
      const tx = await contract.shipOrder(shippingForm.invoiceId, fullTrackingInfo);
      await tx.wait();

      alert(`¡Éxito! El pedido #${shippingForm.invoiceId} ha sido marcado como ENVIADO en blockchain con la guía: ${shippingForm.trackingNumber}`);
      setIsShippingModalOpen(false);
      fetchCompanyOrders();
    } catch (err: any) {
      console.error("Error shipping order:", err);
      alert("Error despachando el pedido: " + (err?.reason || err?.message || String(err)));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Envíos y Despachos Logísticos</h1>
          <p className="text-xs text-slate-500 mt-1">Monitoree pedidos pagados en EURT y emita guías de despacho en blockchain</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <label className="text-xs font-bold text-slate-600">ID Empresa:</label>
          <input
            type="number"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 text-center font-bold"
          />
          <button
            onClick={fetchCompanyOrders}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold rounded-lg text-white transition shadow-xs"
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Active vs History Tab Filter Bar */}
      {(() => {
        const activeOrders = orders.filter((ord: any) => Number(ord.status) < 3);
        const historyOrders = orders.filter((ord: any) => Number(ord.status) >= 3);
        const displayedOrders = activeTab === "active" ? activeOrders : historyOrders;

        return (
          <div className="space-y-4">
            {/* Tabs Selector Bar */}
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
              <button
                onClick={() => setActiveTab("active")}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 font-poppins ${
                  activeTab === "active"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>🚀 Envíos Activos</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === "active" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {activeOrders.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 font-poppins ${
                  activeTab === "history"
                    ? "bg-slate-800 text-white shadow-md shadow-slate-800/20"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>📜 Histórico de Envíos (Finalizados & Valorados)</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === "history" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {historyOrders.length}
                </span>
              </button>
            </div>

            {/* Orders List Container */}
            {loading ? (
              <div className="admin-card p-12 text-center text-xs text-slate-400">
                Cargando pedidos registrados para la empresa #{companyId}...
              </div>
            ) : orders.length === 0 ? (
              <div className="admin-card p-12 text-center text-slate-400 text-xs">
                No se encontraron órdenes registradas para la Empresa ID #{companyId}.
              </div>
            ) : displayedOrders.length === 0 ? (
              <div className="admin-card p-12 text-center text-slate-400 text-xs space-y-2">
                <p className="font-bold text-slate-600">
                  {activeTab === "active"
                    ? "✓ No hay envíos activos pendientes en la sección principal."
                    : "📜 No hay registros en el Histórico de Envíos aún."}
                </p>
                <p className="text-[11px] text-slate-400">
                  {activeTab === "active"
                    ? "Todos los envíos despachados que han sido entregados y valorados se encuentran archivados en el apartado Histórico de Envíos."
                    : "Una vez que las órdenes en curso sean entregadas y confirmadas en blockchain por el cliente, aparecerán archivadas aquí."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedOrders.map((ord: any) => {
                  const statusIdx = Number(ord.status);
                  const amountEur = (Number(ord.totalAmount) / 1000000).toFixed(2);
                  const isPaidOnChain = ord.isPaid || statusIdx >= 1;

                  return (
                    <div key={ord.invoiceId.toString()} className="admin-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 hover:border-slate-300 transition shadow-xs">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-indigo-600 font-extrabold text-base">Orden #{ord.invoiceId.toString()}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isPaidOnChain && statusIdx === 1 ? "bg-amber-100 text-amber-800 border border-amber-300" :
                            statusIdx === 2 ? "bg-indigo-100 text-indigo-800 border border-indigo-300" :
                            statusIdx === 3 ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-emerald-700 text-white border border-emerald-800"
                          }`}>
                            {statusIdx === 3 ? "✓ Entregado & Fondos Liberados" :
                             statusIdx === 4 ? "🎉 Completado & Valorado" :
                             isPaidOnChain ? (ORDER_STATUS_LABELS[statusIdx] || "Pagado (EURT)") : "⚠️ Pendiente de Pago en Pasarela"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
                          <p>
                            Cliente Comprador: <span className="font-mono text-slate-900 font-semibold">{ord.customerAddress}</span>
                          </p>
                          <p>
                            Monto Facturado: <span className="font-extrabold text-emerald-600 text-sm">€{amountEur} EURT</span>
                          </p>
                          <p>
                            Estado Transacción: <span className={`font-bold ${isPaidOnChain ? "text-emerald-700" : "text-amber-600"}`}>{isPaidOnChain ? (statusIdx >= 3 ? "✓ Liberado a Empresa" : "✓ Pagado en Escrow") : "⏳ Factura Creada (No Pagada)"}</span>
                          </p>
                          <p>
                            Fecha Facturación: <span className="font-mono text-slate-500">{new Date(Number(ord.timestamp) * 1000).toLocaleString()}</span>
                          </p>
                        </div>

                        {ord.trackingNumber && (
                          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-mono text-indigo-700">
                            <span>📦 Información de Guía:</span>
                            <span className="font-bold">{ord.trackingNumber}</span>
                          </div>
                        )}
                      </div>

                      {/* SHIPPING ACTION BUTTON - Open Form Modal */}
                      <div className="shrink-0 flex items-center gap-2">
                        {statusIdx === 0 && (
                          <span className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            ⏳ Pendiente de pago del cliente
                          </span>
                        )}

                        {statusIdx === 1 && (
                          <button
                            onClick={() => openShippingModal(ord)}
                            className="px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-600/20"
                          >
                            <span>📦</span> Marcar como Enviado
                          </button>
                        )}

                        {statusIdx === 2 && (
                          <button
                            onClick={() => openShippingModal(ord)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition flex items-center gap-1.5"
                          >
                            <span>✏️</span> Actualizar Guía
                          </button>
                        )}

                        {statusIdx >= 3 && (
                          <button
                            onClick={() => setInvoicePdfData({
                              invoiceId: ord.invoiceId.toString(),
                              companyId: companyId,
                              companyName: `Empresa ID #${companyId}`,
                              customerAddress: ord.customerAddress,
                              totalAmount: amountEur,
                              timestamp: Number(ord.timestamp),
                              paymentTxHash: ord.paymentTxHash || "",
                              statusLabel: ORDER_STATUS_LABELS[statusIdx] || "Entregado & Liberado",
                              trackingNumber: ord.trackingNumber || "N/A"
                            })}
                            className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold text-xs rounded-xl border border-amber-300 transition flex items-center gap-1.5 shadow-xs"
                          >
                            <span>📄</span> Ver Factura
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* FORMULARIO DE ENVÍO Y DESPACHO LOGÍSTICO (MODAL POPUP) */}
      {/* ========================================================================= */}
      {isShippingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">Formulario de Despacho Logístico</span>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>📦</span> Despachar Orden #{shippingForm.invoiceId}
                </h2>
              </div>
              <button
                onClick={() => setIsShippingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Shipping Form Body */}
            <form onSubmit={handleSubmitShippingForm} className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
                <p className="text-slate-500">
                  Cliente Destinatario: <span className="font-mono text-slate-900 font-bold">{shippingForm.customerAddress}</span>
                </p>
                <p className="text-slate-500">
                  Monto Facturado: <span className="font-extrabold text-emerald-600">€{shippingForm.totalAmountEur} EURT</span>
                </p>
                <p className="text-slate-500">
                  Estado On-Chain: <span className={`font-bold ${shippingForm.isPaid ? "text-emerald-700" : "text-amber-600"}`}>
                    {shippingForm.isPaid ? "✓ Pagado en Escrow" : "⏳ Factura Pendiente de Pago"}
                  </span>
                </p>
              </div>

              {/* Unpaid Invoice Notice */}
              {!shippingForm.isPaid && (
                <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-xs text-amber-900">
                  <strong className="block font-bold text-amber-950">Factura pendiente de pago</strong>
                  El despacho solo puede ejecutarse cuando el cliente haya pagado la factura en la pasarela (pago en Escrow confirmado on-chain).
                </div>
              )}

              {/* Company / Carrier Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Empresa o Transporte Logístico:</label>
                <select
                  value={shippingForm.carrier}
                  onChange={(e) => setShippingForm({ ...shippingForm, carrier: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {CARRIER_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Tracking Number Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Número de Guía / Código de Tracking:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: TRK-89210492"
                  value={shippingForm.trackingNumber}
                  onChange={(e) => setShippingForm({ ...shippingForm, trackingNumber: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
              </div>

              {/* Estimated Delivery Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Fecha Estimada de Entrega:</label>
                <input
                  type="date"
                  value={shippingForm.estimatedDeliveryDate}
                  onChange={(e) => setShippingForm({ ...shippingForm, estimatedDeliveryDate: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Observations / Shipping Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Observaciones y Detalles de Despacho:</label>
                <textarea
                  rows={2}
                  placeholder="Instrucciones para la entrega (ej: Entregar en recepción con documento de identidad...)"
                  value={shippingForm.notes}
                  onChange={(e) => setShippingForm({ ...shippingForm, notes: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Buttons Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsShippingModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingId === shippingForm.invoiceId}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {processingId === shippingForm.invoiceId ? "Procesando en Blockchain..." : "🚀 Confirmar Despacho en Blockchain"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* INVOICE PDF MODAL */}
      <InvoicePdfModal
        isOpen={!!invoicePdfData}
        onClose={() => setInvoicePdfData(null)}
        data={invoicePdfData}
      />
    </div>
  );
}
