"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../hooks/useWallet";

const ECOMMERCE_ABI = [
  "function getCustomerInvoices(address customer) view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, string paymentTxHash, uint8 status, string trackingNumber, uint256 shippedTimestamp, uint256 deliveredTimestamp)[])",
  "function confirmDelivery(uint256 invoiceId)",
  "function rateCompany(uint256 companyId, uint8 rating, string comment)"
];

const ORDER_STATUS_LABELS = ["Creado", "Pagado (EURT)", "Enviado", "Entregado", "Completado"];

export default function CustomerOrdersPage() {
  const { address, signer } = useWallet();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Rating modal state
  const [ratingModalCompanyId, setRatingModalCompanyId] = useState<string | null>(null);
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [submittingRating, setSubmittingRating] = useState<boolean>(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const fetchCustomerOrders = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const provider = signer?.provider || new ethers.JsonRpcProvider("http://localhost:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, provider);

      const rawOrders = await contract.getCustomerInvoices(address);
      setOrders(rawOrders);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchCustomerOrders();
    }
  }, [address]);

  const handleConfirmDelivery = async (invoiceId: string) => {
    try {
      if (!signer) {
        alert("Por favor conecte su wallet para confirmar la entrega.");
        return;
      }

      setConfirmingId(invoiceId);
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, signer);
      const tx = await contract.confirmDelivery(invoiceId);
      await tx.wait();

      alert("¡Entrega confirmada con éxito!");
      fetchCustomerOrders();
    } catch (err: any) {
      alert("Error confirmando entrega: " + (err?.reason || err?.message));
    } finally {
      setConfirmingId(null);
    }
  };

  const handleSendRating = async () => {
    try {
      if (!ratingModalCompanyId || !signer) return;
      setSubmittingRating(true);

      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, signer);
      const tx = await contract.rateCompany(ratingModalCompanyId, selectedStars, reviewComment || "Excelente servicio");
      await tx.wait();

      alert("¡Gracias por enviar su valoración a la empresa!");
      setRatingModalCompanyId(null);
      setReviewComment("");
    } catch (err: any) {
      alert("Error enviando valoración: " + (err?.reason || err?.message));
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Mis Pedidos y Seguimiento</h1>
        <p className="text-gray-600 mt-1">Consulte el estado de sus órdenes, confirme entregas y valore a los comercios.</p>
      </div>

      {!address ? (
        <div className="p-8 text-center bg-blue-50 rounded-2xl border border-blue-200 text-blue-800">
          Por favor conecte su wallet Web3 en el encabezado para ver sus pedidos.
        </div>
      ) : loading ? (
        <div className="p-8 text-center text-gray-500">Cargando sus pedidos...</div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center bg-gray-50 rounded-2xl border border-gray-200 text-gray-500">
          No tiene pedidos registrados aún con la cuenta <span className="font-mono text-gray-700">{address}</span>.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord: any) => {
            const statusIdx = Number(ord.status);
            const amountEur = (Number(ord.totalAmount) / 1000000).toFixed(2);

            return (
              <div key={ord.invoiceId.toString()} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 text-lg">Orden #{ord.invoiceId.toString()}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      statusIdx === 1 ? "bg-amber-100 text-amber-800" :
                      statusIdx === 2 ? "bg-blue-100 text-blue-800" :
                      statusIdx === 3 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                    }`}>
                      {ORDER_STATUS_LABELS[statusIdx] || "En proceso"}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mt-1">
                    Empresa ID: <span className="font-semibold">#{ord.companyId.toString()}</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Monto total: <span className="font-extrabold text-emerald-600">€{amountEur} EURT</span>
                  </p>
                  {ord.trackingNumber && (
                    <p className="text-xs text-blue-600 font-mono mt-1">
                      📦 Código de Seguimiento: {ord.trackingNumber}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  {statusIdx === 2 && (
                    <button
                      onClick={() => handleConfirmDelivery(ord.invoiceId.toString())}
                      disabled={confirmingId === ord.invoiceId.toString()}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition"
                    >
                      {confirmingId === ord.invoiceId.toString() ? "Confirmando..." : "Confirmar Entrega Recibida"}
                    </button>
                  )}

                  {(statusIdx === 2 || statusIdx === 3) && (
                    <button
                      onClick={() => setRatingModalCompanyId(ord.companyId.toString())}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1 justify-center"
                    >
                      <span>⭐ Valorar Empresa</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rating Modal */}
      {ratingModalCompanyId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Valorar Empresa #{ratingModalCompanyId}</h3>
            <p className="text-xs text-gray-500 mb-4">Califique su experiencia con esta empresa en la blockchain.</p>

            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setSelectedStars(star)}
                  className={`text-3xl transition ${star <= selectedStars ? "text-amber-400 scale-110" : "text-gray-300"}`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Escriba un comentario sobre el producto y atención..."
              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs text-gray-900 focus:outline-none focus:border-blue-500 mb-4"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRatingModalCompanyId(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendRating}
                disabled={submittingRating}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow"
              >
                {submittingRating ? "Enviando..." : "Enviar Valoración"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
