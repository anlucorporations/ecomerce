"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../hooks/useWallet";

const ECOMMERCE_ABI = [
  "function getCompanyInvoices(uint256 companyId) view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, string paymentTxHash, uint8 status, string trackingNumber, uint256 shippedTimestamp, uint256 deliveredTimestamp)[])",
  "function shipOrder(uint256 invoiceId, string trackingNumber)"
];

const ORDER_STATUS_LABELS = ["Creado", "Pagado (EURT)", "Enviado", "Entregado", "Completado"];

interface ShippingModalData {
  invoiceId: string;
  courier: string;
  trackingNumber: string;
  shipDate: string;
  notes: string;
}

export default function ShippingManagementPage() {
  const { address, signer } = useWallet();
  const [companyId, setCompanyId] = useState<string>("1");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modal / Dropdown Form State for Shipping Details
  const [shippingModal, setShippingModal] = useState<ShippingModalData | null>(null);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const fetchCompanyOrders = async () => {
    try {
      setLoading(true);
      const provider = signer?.provider || new ethers.JsonRpcProvider("http://localhost:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, provider);

      const rawOrders = await contract.getCompanyInvoices(companyId);
      setOrders(Array.from(rawOrders));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyOrders();
  }, [companyId]);

  const openShippingModal = (invoiceId: string) => {
    const nowStr = new Date().toISOString().slice(0, 16);
    setShippingModal({
      invoiceId,
      courier: "DHL Express",
      trackingNumber: `TRACK-${Math.floor(10000000 + Math.random() * 90000000)}`,
      shipDate: nowStr,
      notes: "Despachado en bolsa de alta seguridad con precinto",
    });
  };

  const handleConfirmShipOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingModal) return;

    const { invoiceId, courier, trackingNumber, shipDate, notes } = shippingModal;

    if (!trackingNumber.trim()) {
      alert("Por favor introduzca un número de guía de rastreo.");
      return;
    }
    if (!signer) {
      alert("Conecte su wallet de administración para firmar la orden.");
      return;
    }

    try {
      setProcessingId(invoiceId);

      // Formatted tracking string incorporating Courier Company, Tracking Number, Ship Date & Notes
      const trackingPayload = `[${courier}] Guía: ${trackingNumber} | Fecha: ${shipDate.replace('T', ' ')}${notes ? ' | Note: ' + notes : ''}`;

      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, signer);
      const tx = await contract.shipOrder(invoiceId, trackingPayload);
      await tx.wait();

      alert(`¡Pedido #${invoiceId} marcado como ENVIADO exitosamente!`);
      setShippingModal(null);
      fetchCompanyOrders();
    } catch (err: any) {
      console.error("Error al enviar pedido:", err);
      alert("Error enviando el pedido: " + (err?.reason || err?.message || String(err)));
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
          <p className="text-xs text-slate-500 mt-1">Monitoree pedidos pagados en EURT y asigne datos completos de envío</p>
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

      {/* Orders List Container */}
      {loading ? (
        <div className="admin-card p-12 text-center text-xs text-slate-400">
          Cargando pedidos registrados para la empresa #{companyId}...
        </div>
      ) : orders.length === 0 ? (
        <div className="admin-card p-12 text-center text-slate-400 text-xs">
          No se encontraron órdenes registradas para la Empresa ID #{companyId}.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord: any) => {
            const statusIdx = Number(ord.status);
            const amountEur = (Number(ord.totalAmount) / 1000000).toFixed(2);

            return (
              <div key={ord.invoiceId.toString()} className="admin-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-indigo-600 font-extrabold text-base">Orden #{ord.invoiceId.toString()}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      statusIdx === 1 ? "badge-amber" :
                      statusIdx === 2 ? "badge-info" :
                      statusIdx === 3 ? "badge-success" : "bg-slate-100 text-slate-600"
                    }`}>
                      {ORDER_STATUS_LABELS[statusIdx] || "Desconocido"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    Cliente Comprador: <span className="font-mono text-slate-800 font-semibold">{ord.customerAddress}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Monto Cobrado: <span className="font-extrabold text-emerald-600 text-sm">€{amountEur} EURT</span>
                  </p>

                  {ord.trackingNumber && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-mono text-indigo-800">
                      <span>🚚 Datos de Envío:</span>
                      <span className="font-bold">{ord.trackingNumber}</span>
                    </div>
                  )}
                </div>

                {statusIdx === 1 && (
                  <button
                    onClick={() => openShippingModal(ord.invoiceId.toString())}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
                  >
                    <span>🚚 Marcar como Enviado</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FORMULARIO DESPLEGABLE / MODAL DE DATOS DE ENVÍO */}
      {shippingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Formulario de Envío y Despacho</h3>
                <p className="text-xs text-slate-500">Orden #{shippingModal.invoiceId}</p>
              </div>
              <button
                type="button"
                onClick={() => setShippingModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 font-black text-sm flex items-center justify-center transition"
                title="Cerrar formulario"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmShipOrder} className="space-y-4 text-xs">
              
              {/* Courier Company Dropdown / Input */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Compañía de Correo / Transportista:</label>
                <select
                  value={shippingModal.courier}
                  onChange={(e) => setShippingModal({ ...shippingModal, courier: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                >
                  <option value="DHL Express">DHL Express</option>
                  <option value="FedEx Express">FedEx Express</option>
                  <option value="MRW Courier">MRW Courier</option>
                  <option value="Zoom Envíos">Zoom Envíos</option>
                  <option value="Despacho Propio BARLO-VENTAS">Despacho Propio BARLO-VENTAS</option>
                </select>
              </div>

              {/* Tracking Number Input */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Número de Guía / Rastreo:</label>
                <input
                  type="text"
                  value={shippingModal.trackingNumber}
                  onChange={(e) => setShippingModal({ ...shippingModal, trackingNumber: e.target.value })}
                  placeholder="ej. TRACK-98472610-ES"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>

              {/* Shipping Date & Time */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha y Hora de Envío:</label>
                <input
                  type="datetime-local"
                  value={shippingModal.shipDate}
                  onChange={(e) => setShippingModal({ ...shippingModal, shipDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas / Instrucciones Adicionales:</label>
                <textarea
                  value={shippingModal.notes}
                  onChange={(e) => setShippingModal({ ...shippingModal, notes: e.target.value })}
                  placeholder="Instrucciones para el cliente o repartidor..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShippingModal(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingId === shippingModal.invoiceId}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50"
                >
                  {processingId === shippingModal.invoiceId ? "Confirmando en Blockchain..." : "Confirmar Envío"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
