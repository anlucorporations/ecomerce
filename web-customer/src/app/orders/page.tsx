"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../hooks/useWallet";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ECOMMERCE_ABI = [
  "function getCustomerInvoices(address customer) view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, string paymentTxHash, uint8 status, string trackingNumber, uint256 shippedTimestamp, uint256 deliveredTimestamp)[])",
  "function getAllCompanies() view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate)[])",
  "function confirmDelivery(uint256 invoiceId)",
  "function rateCompany(uint256 companyId, uint8 rating, string comment)"
];

const ORDER_STATUS_LABELS = ["Creado", "Pagado (Custodia EURT)", "Enviado", "Entregado & Liberado", "Completado"];

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { address, signer, isConnected } = useWallet();

  useEffect(() => {
    if (!isConnected && !address && typeof window !== "undefined") {
      router.push("/");
    }
  }, [isConnected, address, router]);
  const [orders, setOrders] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Rating modal state
  const [ratingModalCompanyId, setRatingModalCompanyId] = useState<string | null>(null);
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [submittingRating, setSubmittingRating] = useState<boolean>(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const fetchCustomerOrders = useCallback(async () => {
    if (!address) return;
    try {
      setLoading(true);
      const provider = signer?.provider || new ethers.JsonRpcProvider("http://localhost:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, provider);

      const rawOrders = await contract.getCustomerInvoices(address);
      const orderList = Array.from(rawOrders);
      setOrders(orderList);

      if (orderList.length > 0) {
        setSelectedOrder((prev: any) => {
          if (!prev) return orderList[0];
          const found = orderList.find((o: any) => o.invoiceId.toString() === prev.invoiceId.toString());
          return found || orderList[0];
        });
      }

      // Fetch company names
      try {
        const comps = await contract.getAllCompanies();
        const compMap: Record<string, string> = {};
        Array.from(comps).forEach((c: any) => {
          compMap[c.companyId.toString()] = c.name;
        });
        setCompanies(compMap);
      } catch (e) {
        console.warn("Could not fetch company names:", e);
      }

    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [address, signer, ecommerceAddress]);

  useEffect(() => {
    if (address) {
      fetchCustomerOrders();
    }
  }, [address, fetchCustomerOrders]);

  // Confirm delivery & release funds immediately from Escrow
  const handleConfirmDelivery = async (invoiceId: string) => {
    try {
      if (!signer) {
        alert("Por favor conecte su wallet para confirmar la entrega y liberar fondos.");
        return;
      }

      setConfirmingId(invoiceId);
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, signer);
      const tx = await contract.confirmDelivery(invoiceId);
      await tx.wait();

      alert("¡Entrega confirmada con éxito! Se ha liberado la transferencia de fondos de custodia de inmediato a la billetera del comerciante.");
      fetchCustomerOrders();
    } catch (err: any) {
      alert("Error confirmando entrega: " + (err?.reason || err?.message || String(err)));
    } finally {
      setConfirmingId(null);
    }
  };

  // Submit voluntary rating
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
      fetchCustomerOrders();
    } catch (err: any) {
      alert("Error enviando valoración: " + (err?.reason || err?.message || String(err)));
    } finally {
      setSubmittingRating(false);
    }
  };

  // Auto-default rating trigger (4/5 Stars, "Valoracion por default del cliente")
  const handleAutoDefaultRating = async (companyIdStr: string) => {
    try {
      if (!signer) {
        alert("Por favor conecte su wallet para registrar la valoración por defecto.");
        return;
      }
      setSubmittingRating(true);

      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, signer);
      const tx = await contract.rateCompany(
        companyIdStr,
        4,
        "Valoracion por default del cliente"
      );
      await tx.wait();

      alert("¡Valoración automática por defecto (4.0 ★ - Valoracion por default del cliente) registrada exitosamente en la blockchain!");
      fetchCustomerOrders();
    } catch (err: any) {
      alert("Error registrando valoración por defecto: " + (err?.reason || err?.message || String(err)));
    } finally {
      setSubmittingRating(false);
    }
  };

  const formatPrice = (price: bigint | number) => {
    return (Number(price) / 1_000_000).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#333333] font-sans pb-24 selection:bg-[#FF8800] selection:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="glass-card p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 bg-[#E6F4FA] text-[#0077BB] border border-[#0077BB]/30 text-xs font-bold rounded-full inline-block mb-2 font-poppins">
              📦 Rastro e Historial de Pedidos (Custodia Escrow)
            </span>
            <h1 className="text-2xl font-black text-[#333333] tracking-tight font-poppins">Mis Pedidos y Despachos</h1>
            <p className="text-xs text-[#A9A9A9] mt-0.5">
              Consulte el estado de sus órdenes, verifique datos de guía y confirme recepción para liberar los fondos en custodia.
            </p>
          </div>

          <Link
            href="/"
            className="px-4 py-2 bg-white hover:bg-slate-100 text-[#0077BB] font-bold text-xs rounded-xl border border-[#0077BB]/20 transition font-poppins"
          >
            ← Volver al Catálogo
          </Link>
        </div>

        {!address ? (
          <div className="glass-card p-12 text-center text-[#0077BB] space-y-3">
            <p className="font-bold text-sm font-poppins">Billetera Web3 no detectada</p>
            <p className="text-xs text-[#A9A9A9]">Por favor conecte su wallet Web3 en el encabezado para ver sus pedidos.</p>
          </div>
        ) : loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#0077BB] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#A9A9A9] font-mono">Cargando sus pedidos en la blockchain...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="glass-card p-12 text-center text-[#A9A9A9] text-xs">
            No tiene pedidos registrados aún con la cuenta <span className="font-mono text-[#333333] font-bold">{address}</span>.
          </div>
        ) : (
          /* REQUERIMIENTO 5: DISEÑO EN 2 COLUMNAS (LISTA A LA IZQUIERDA, FICHA DERECHA DETALLADA) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* COLUMNA IZQUIERDA: LISTA DE PEDIDOS */}
            <div className="lg:col-span-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#0077BB] font-poppins">
                Lista de Órdenes ({orders.length})
              </h2>

              {orders.map((ord: any) => {
                const statusIdx = Number(ord.status);
                const isSelected = selectedOrder && selectedOrder.invoiceId.toString() === ord.invoiceId.toString();
                const compName = companies[ord.companyId.toString()] || `Empresa #${ord.companyId.toString()}`;

                return (
                  <div
                    key={ord.invoiceId.toString()}
                    onClick={() => setSelectedOrder(ord)}
                    className={`glass-card p-5 cursor-pointer transition-all duration-200 border-2 ${
                      isSelected
                        ? "border-[#0077BB] bg-white shadow-md scale-[1.02]"
                        : "border-transparent hover:border-[#0077BB]/30"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#FF8800] text-sm">#{ord.invoiceId.toString()}</span>
                        <span className="text-xs font-bold text-[#333333] font-poppins truncate max-w-[120px]" title={compName}>
                          {compName}
                        </span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-poppins ${
                        statusIdx === 1 ? "bg-[#FFF3E5] text-[#FF8800] border border-[#FF8800]/30" :
                        statusIdx === 2 ? "bg-[#E6F4FA] text-[#0077BB] border border-[#0077BB]/30" :
                        statusIdx === 3 ? "bg-[#EAF5EF] text-[#2E8B57] border border-[#2E8B57]/30" : "bg-slate-100 text-[#333333]"
                      }`}>
                        {ORDER_STATUS_LABELS[statusIdx] || "En proceso"}
                      </span>
                    </div>

                    <div className="flex justify-between items-end pt-2 border-t border-[#0077BB]/10 text-xs">
                      <div>
                        <span className="text-[10px] text-[#A9A9A9] uppercase font-mono block">Monto en Custodia</span>
                        <span className="font-mono font-black text-[#2E8B57] text-base">
                          €{formatPrice(ord.totalAmount)} EURT
                        </span>
                      </div>

                      <span className="text-[11px] text-[#0077BB] font-bold font-poppins flex items-center gap-1">
                        Ver Ficha ➔
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* COLUMNA DERECHA: FICHA DETALLADA DE LA ORDEN SELECCIONADA */}
            <div className="lg:col-span-7">
              {selectedOrder ? (
                <div className="glass-card p-6 sm:p-8 shadow-xl space-y-6 sticky top-24 border-2 border-[#0077BB]/20">
                  
                  {/* Encabezado Ficha */}
                  <div className="flex items-center justify-between border-b border-[#0077BB]/10 pb-4">
                    <div>
                      <span className="text-[10px] text-[#A9A9A9] uppercase font-mono block">Detalle de la Orden</span>
                      <h2 className="text-xl font-black text-[#333333] font-poppins">
                        Factura #{selectedOrder.invoiceId.toString()}
                      </h2>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold font-poppins ${
                      Number(selectedOrder.status) === 1 ? "bg-[#FFF3E5] text-[#FF8800] border border-[#FF8800]/30" :
                      Number(selectedOrder.status) === 2 ? "bg-[#E6F4FA] text-[#0077BB] border border-[#0077BB]/30" :
                      Number(selectedOrder.status) === 3 ? "bg-[#EAF5EF] text-[#2E8B57] border border-[#2E8B57]/30" : "bg-slate-100 text-[#333333]"
                    }`}>
                      ● {ORDER_STATUS_LABELS[Number(selectedOrder.status)] || "Registrado"}
                    </span>
                  </div>

                  {/* Datos de la Empresa */}
                  <div className="bg-white/80 rounded-2xl p-4 border border-[#0077BB]/15 text-xs space-y-1">
                    <span className="text-[10px] text-[#0077BB] font-bold uppercase tracking-wider block font-poppins">Empresa Vendedora</span>
                    <span className="font-extrabold text-sm text-[#333333] block font-poppins">
                      {companies[selectedOrder.companyId.toString()] || `Empresa ID #${selectedOrder.companyId.toString()}`}
                    </span>
                    <span className="text-[#A9A9A9] font-mono text-[11px] block">
                      Identificador de Empresa: #{selectedOrder.companyId.toString()}
                    </span>
                  </div>

                  {/* MOSTRAR DATOS IMPORTANTES DE ENVÍO Y LIBERACIÓN */}
                  {(Number(selectedOrder.status) === 2 || Number(selectedOrder.status) === 3 || selectedOrder.trackingNumber) && (
                    <div className="bg-[#E6F4FA] border border-[#0077BB]/30 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-2 text-[#0077BB] font-bold text-sm font-poppins">
                        <span>🚚</span>
                        <span>Información de Envío y Fondos de Custodia</span>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-[#0077BB]/20 text-xs space-y-2 font-mono">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-[#A9A9A9]">Estado de Custodia:</span>
                          <span className="font-bold text-[#2E8B57]">
                            {Number(selectedOrder.status) === 3 ? "✓ Fondos Liberados a Empresa" : "⏳ Retenido en Custodia Escrow"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#A9A9A9] block">Datos de Transporte y Guía:</span>
                          <span className="font-bold text-[#0077BB] text-sm block mt-0.5">
                            {selectedOrder.trackingNumber || "Despacho Express BARLO-VENTAS (Tracking #894726)"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECCIÓN DE VALORACIÓN (INMEDIATA O AUTO-DEFAULT DE 24H) */}
                  {(Number(selectedOrder.status) === 2 || Number(selectedOrder.status) === 3) && (
                    <div className="bg-[#FFF3E5] border border-[#FF8800]/40 rounded-2xl p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#FF8800] uppercase tracking-wider font-poppins">
                          ⭐ Reputación y Valoración del Cliente
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF8800] text-white font-mono">
                          Ventana 24 Horas
                        </span>
                      </div>

                      <p className="text-xs text-[#333333] leading-relaxed">
                        Puede emitir su calificación en estrellas inmediatamente. Si transcurren 24h sin valoración manual, el sistema calificará automáticamente con <strong className="text-[#FF8800]">4/5 estrellas</strong> y el comentario: <em className="font-mono text-[#0077BB]">&quot;Valoracion por default del cliente&quot;</em>.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <button
                          onClick={() => setRatingModalCompanyId(selectedOrder.companyId.toString())}
                          className="px-4 py-2.5 bg-[#FF8800] hover:bg-[#E07700] text-white font-bold text-xs rounded-xl shadow-sm transition font-poppins flex-1 text-center"
                        >
                          ⭐ Valorar Empresa Ahora
                        </button>

                        <button
                          onClick={() => handleAutoDefaultRating(selectedOrder.companyId.toString())}
                          disabled={submittingRating}
                          className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#0077BB] border border-[#0077BB]/30 font-bold text-xs rounded-xl shadow-xs transition font-poppins flex-1 text-center disabled:opacity-50"
                        >
                          ⚡ Aplicar Valoración Automática (24h)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Resumen Financiero y Blockchain */}
                  <div className="space-y-3 text-xs">
                    <h3 className="font-bold text-[#333333] font-poppins">Resumen Financiero Escrow</h3>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#0077BB]/15 space-y-2 font-mono">
                      <div className="flex justify-between">
                        <span className="text-[#A9A9A9]">Monto en Custodia:</span>
                        <span className="text-[#333333]">€{formatPrice(selectedOrder.totalAmount)} EURT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A9A9A9]">Comisión de Red:</span>
                        <span className="text-[#2E8B57]">0.00 EURT</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-sm text-[#2E8B57]">
                        <span>Total Custodiado:</span>
                        <span>€{formatPrice(selectedOrder.totalAmount)} EURT</span>
                      </div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#0077BB]/15 space-y-1 font-mono text-[11px]">
                      <span className="text-[#A9A9A9] block">Hash de Transacción On-Chain:</span>
                      <span className="text-[#0077BB] font-bold truncate block" title={selectedOrder.paymentTxHash}>
                        {selectedOrder.paymentTxHash || "0x..."}
                      </span>
                    </div>
                  </div>

                  {/* Botón de Firma de Entrega y Liberación Inmediata de Fondos */}
                  {Number(selectedOrder.status) === 2 && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleConfirmDelivery(selectedOrder.invoiceId.toString())}
                        disabled={confirmingId === selectedOrder.invoiceId.toString()}
                        className="btn-cacao-pulse w-full text-xs font-poppins uppercase tracking-wider text-center flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <span>✍️</span>
                        <span>
                          {confirmingId === selectedOrder.invoiceId.toString()
                            ? "Firmando y Liberando Fondos..."
                            : "Firmar Entrega Recibida (Liberar Fondos Inmediatamente)"}
                        </span>
                      </button>
                    </div>
                  )}

                </div>
              ) : (
                <div className="glass-card p-12 text-center text-[#A9A9A9] text-xs">
                  Seleccione una orden de la lista para inspeccionar sus detalles.
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* RATING MODAL */}
      {ratingModalCompanyId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4 z-50">
          <div className="glass-card p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-xl font-bold text-[#333333] font-poppins">Valorar Empresa #{ratingModalCompanyId}</h3>
            <p className="text-xs text-[#A9A9A9]">Califique su experiencia de compra en la red BARLO-VENTAS.</p>

            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setSelectedStars(star)}
                  className={`text-3xl transition ${star <= selectedStars ? "text-[#FF8800] scale-110" : "text-slate-300"}`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Escriba sus comentarios sobre la entrega y el producto..."
              className="w-full bg-white border border-[#0077BB]/20 rounded-xl p-3 text-xs text-[#333333] focus:outline-none focus:border-[#0077BB]"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRatingModalCompanyId(null)}
                className="px-4 py-2 text-xs font-bold text-[#333333] hover:bg-slate-100 rounded-xl font-poppins"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendRating}
                disabled={submittingRating}
                className="px-5 py-2 text-xs font-bold text-white bg-[#FF8800] hover:bg-[#E07700] rounded-xl shadow-md font-poppins"
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
