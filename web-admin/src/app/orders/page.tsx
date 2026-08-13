"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../hooks/useWallet";
import { useRouter } from "next/navigation";

const ECOMMERCE_ABI = [
  "function getCompanyInvoices(uint256 companyId) view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, string paymentTxHash, uint8 status, string trackingNumber, uint256 shippedTimestamp, uint256 deliveredTimestamp)[])",
  "function shipOrder(uint256 invoiceId, string trackingNumber)"
];

const ORDER_STATUS_LABELS = ["Creado", "Pagado (EURT)", "Enviado", "Entregado", "Completado"];

export default function ShippingManagementPage() {
  const router = useRouter();
  const { address, signer, isConnected } = useWallet();

  useEffect(() => {
    if (!isConnected && !address && typeof window !== "undefined") {
      router.push("/");
    }
  }, [isConnected, address, router]);
  const [companyId, setCompanyId] = useState<string>("1");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [trackingInputs, setTrackingInputs] = useState<{ [key: string]: string }>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const fetchCompanyOrders = async () => {
    try {
      setLoading(true);
      const provider = signer?.provider || new ethers.JsonRpcProvider("http://localhost:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, provider);

      const rawOrders = await contract.getCompanyInvoices(companyId);
      setOrders(rawOrders);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyOrders();
  }, [companyId]);

  const handleShipOrder = async (invoiceId: string) => {
    try {
      const trackingNo = trackingInputs[invoiceId];
      if (!trackingNo) {
        alert("Por favor introduzca un número de seguimiento/guía.");
        return;
      }
      if (!signer) {
        alert("Conecte su wallet de administración para firmar.");
        return;
      }

      setProcessingId(invoiceId);
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, signer);
      const tx = await contract.shipOrder(invoiceId, trackingNo);
      await tx.wait();

      alert(`¡Pedido #${invoiceId} marcado como enviado!`);
      fetchCompanyOrders();
    } catch (err: any) {
      alert("Error enviando el pedido: " + (err?.reason || err?.message));
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
          <p className="text-xs text-slate-500 mt-1">Monitoree pedidos pagados en EURT y asigne códigos de guía de envío</p>
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
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-xs font-mono text-indigo-700">
                      <span>📦 Guía de Envío:</span>
                      <span className="font-bold">{ord.trackingNumber}</span>
                    </div>
                  )}
                </div>

                {statusIdx === 1 && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <input
                      type="text"
                      placeholder="Número de Guía / Tracking"
                      value={trackingInputs[ord.invoiceId.toString()] || ""}
                      onChange={(e) => setTrackingInputs({ ...trackingInputs, [ord.invoiceId.toString()]: e.target.value })}
                      className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => handleShipOrder(ord.invoiceId.toString())}
                      disabled={processingId === ord.invoiceId.toString()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 whitespace-nowrap"
                    >
                      {processingId === ord.invoiceId.toString() ? "Procesando..." : "Marcar Enviado"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
