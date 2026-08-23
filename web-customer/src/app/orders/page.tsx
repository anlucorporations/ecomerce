"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../hooks/useWallet";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { InvoicePdfModal, InvoiceModalData } from "../../components/InvoicePdfModal";

const ECOMMERCE_ABI = [
  "function getCustomerInvoices(address customer) view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, string paymentTxHash, uint8 status, string trackingNumber, uint256 shippedTimestamp, uint256 deliveredTimestamp)[])",
  "function getAllCompanies() view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate)[])",
  "function getCompanyReviews(uint256 companyId) view returns (tuple(uint8 rating, string comment, address reviewer, uint256 timestamp)[])",
  "function confirmDelivery(uint256 invoiceId)",
  "function rateCompany(uint256 companyId, uint8 rating, string comment)"
];

const ORDER_STATUS_LABELS = ["Creado", "Pagado (Custodia EURT)", "Enviado", "Entregado & Liberado", "Completado"];

export default function CustomerOrdersPage() {
  const { address, signer } = useWallet();
  const [orders, setOrders] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [ratedInvoices, setRatedInvoices] = useState<Record<string, boolean>>({});
  const [invoicePdfData, setInvoicePdfData] = useState<InvoiceModalData | null>(null);

  // Rating modal state
  const [ratingModalCompanyId, setRatingModalCompanyId] = useState<string | null>(null);
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [submittingRating, setSubmittingRating] = useState<boolean>(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [ordersTab, setOrdersTab] = useState<"active" | "history">("active");

  // Selected Order Items
  const [selectedOrderItems, setSelectedOrderItems] = useState<any[]>([]);
  const [loadingSelectedItems, setLoadingSelectedItems] = useState<boolean>(false);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  useEffect(() => {
    async function fetchOrderItems() {
      if (!selectedOrder || !selectedOrder.invoiceId) return;
      try {
        setLoadingSelectedItems(true);
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");
        const contract = new ethers.Contract(ecommerceAddress, [
          "function getInvoiceItems(uint256 invoiceId) view returns (tuple(uint256 productId, string productName, uint256 quantity, uint256 unitPrice, uint256 totalPrice)[])"
        ], provider);

        const rawItems = await contract.getInvoiceItems(selectedOrder.invoiceId);
        if (rawItems && rawItems.length > 0) {
          const parsed = Array.from(rawItems).map((it: any) => ({
            productId: it.productId.toString(),
            productName: it.productName || `Producto #${it.productId}`,
            quantity: Number(it.quantity),
            unitPrice: (Number(it.unitPrice) / 1000000).toFixed(2),
            totalPrice: (Number(it.totalPrice) / 1000000).toFixed(2)
          }));
          setSelectedOrderItems(parsed);
        } else {
          setSelectedOrderItems([]);
        }
      } catch (err) {
        console.warn("Could not fetch order items:", err);
        setSelectedOrderItems([]);
      } finally {
        setLoadingSelectedItems(false);
      }
    }
    fetchOrderItems();
  }, [selectedOrder, ecommerceAddress]);

  const fetchCustomerOrders = useCallback(async () => {
    if (!address) return;
    try {
      setLoading(true);
      const provider = signer?.provider || new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, provider);

      const rawOrders = await contract.getCustomerInvoices(address);
      const orderList = Array.from(rawOrders);
      setOrders(orderList);

      const activeList = orderList.filter((o: any) => Number(o.status) < 3);
      const historyList = orderList.filter((o: any) => Number(o.status) >= 3);

      if (orderList.length > 0) {
        setSelectedOrder((prev: any) => {
          if (!prev) return null;
          const found = orderList.find((o: any) => o.invoiceId.toString() === prev.invoiceId.toString());
          return found || null;
        });
      }

      // Fetch company names & check existing ratings
      try {
        const comps = await contract.getAllCompanies();
        const compMap: Record<string, string> = {};
        Array.from(comps).forEach((c: any) => {
          compMap[c.companyId.toString()] = c.name;
        });
        setCompanies(compMap);

        const localRated: Record<string, boolean> = JSON.parse(localStorage.getItem(`rated_invoices_${address}`) || "{}");
        const newRatedMap: Record<string, boolean> = { ...localRated };

        for (const compId of Object.keys(compMap)) {
          try {
            const reviews = await contract.getCompanyReviews(compId);
            const hasUserReviewed = Array.from(reviews).some(
              (r: any) => r.reviewer && r.reviewer.toLowerCase() === address.toLowerCase()
            );
            if (hasUserReviewed) {
              orderList.forEach((o: any) => {
                if (o.companyId.toString() === compId) {
                  newRatedMap[o.invoiceId.toString()] = true;
                }
              });
            }
          } catch (e) {
            // ignore empty reviews error
          }
        }
        setRatedInvoices(newRatedMap);
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
      const interval = setInterval(fetchCustomerOrders, 5000);
      return () => clearInterval(interval);
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

      alert("¡Entrega confirmada con éxito! La orden se ha trasladado al Histórico de Órdenes Finalizadas y los fondos retenidos en Escrow han sido liberados de inmediato a la billetera del comerciante.");
      setOrdersTab("history");
      fetchCustomerOrders();
    } catch (err: any) {
      alert("Error confirmando entrega: " + (err?.reason || err?.message || String(err)));
    } finally {
      setConfirmingId(null);
    }
  };

  // Mark invoice as rated in state & local storage
  const markInvoiceAsRated = (invId?: string) => {
    const targetId = invId || (selectedOrder ? selectedOrder.invoiceId.toString() : null);
    if (!targetId || !address) return;
    setRatedInvoices((prev) => {
      const updated = { ...prev, [targetId]: true };
      try {
        localStorage.setItem(`rated_invoices_${address}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Submit voluntary rating
  const handleSendRating = async () => {
    try {
      if (!ratingModalCompanyId || !signer) return;
      setSubmittingRating(true);

      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, signer);
      const tx = await contract.rateCompany(ratingModalCompanyId, selectedStars, reviewComment || "Excelente servicio");
      await tx.wait();

      markInvoiceAsRated();
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

      markInvoiceAsRated();
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

  const activeOrders = orders.filter((o: any) => Number(o.status) < 3);
  const historicalOrders = orders.filter((o: any) => Number(o.status) >= 3);
  const displayedOrders = ordersTab === "active" ? activeOrders : historicalOrders;

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#333333] font-sans pb-24 selection:bg-[#FF8800] selection:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="glass-card p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 bg-[#E6F4FA] text-[#0077BB] border border-[#0077BB]/30 text-xs font-bold rounded-full inline-block mb-2 font-poppins">
              📦 Historial & Custodia Escrow
            </span>
            <h1 className="text-2xl font-black text-[#333333] tracking-tight font-poppins">Mis Pedidos</h1>
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
          <div className="space-y-6">
            {/* TAB SWITCHER: ÓRDENES ACTIVAS VS HISTÓRICO FINALIZADAS */}
            <div className="flex p-1.5 bg-slate-200/70 rounded-2xl font-poppins border border-[#0077BB]/10 max-w-md">
              <button
                onClick={() => setOrdersTab("active")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  ordersTab === "active"
                    ? "bg-white text-[#0077BB] shadow-sm border border-[#0077BB]/20"
                    : "text-[#A9A9A9] hover:text-[#333333]"
                }`}
              >
                <span>📦 En Curso</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  ordersTab === "active" ? "bg-[#E6F4FA] text-[#0077BB]" : "bg-slate-300/60 text-slate-600"
                }`}>
                  {activeOrders.length}
                </span>
              </button>

              <button
                onClick={() => setOrdersTab("history")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  ordersTab === "history"
                    ? "bg-white text-[#2E8B57] shadow-sm border border-[#2E8B57]/20"
                    : "text-[#A9A9A9] hover:text-[#333333]"
                }`}
              >
                <span>📜 Histórico</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  ordersTab === "history" ? "bg-[#EAF5EF] text-[#2E8B57]" : "bg-slate-300/60 text-slate-600"
                }`}>
                  {historicalOrders.length}
                </span>
              </button>
            </div>

            {/* LISTADO DE PEDIDOS EN TARJETAS DE Malla COMPACTA */}
            {displayedOrders.length === 0 ? (
              <div className="glass-card p-12 text-center text-xs text-[#A9A9A9] space-y-2">
                <p className="font-bold text-slate-700 font-poppins">
                  {ordersTab === "active"
                    ? "No tiene órdenes activas en curso actualmente."
                    : "No registra órdenes finalizadas en el histórico."}
                </p>
                <p className="text-[11px] leading-relaxed">
                  {ordersTab === "active"
                    ? "Las órdenes entregadas y liberadas se trasladan automáticamente al Histórico de Órdenes."
                    : "Una vez entregado y verificado el producto, las órdenes archivadas se despliegan aquí."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedOrders.map((ord: any) => {
                  const statusIdx = Number(ord.status);
                  const compName = companies[ord.companyId.toString()] || `Empresa #${ord.companyId.toString()}`;

                  return (
                    <div
                      key={ord.invoiceId.toString()}
                      onClick={() => setSelectedOrder(ord)}
                      className="glass-card p-6 cursor-pointer hover:shadow-xl hover:border-[#0077BB]/50 transition-all duration-200 border-2 border-slate-200/80 bg-white flex flex-col justify-between space-y-4 group rounded-3xl"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className="font-mono font-black text-[#FF8800] text-sm block">Factura #{ord.invoiceId.toString()}</span>
                            <span className="text-xs font-extrabold text-[#333333] font-poppins block truncate max-w-[180px]" title={compName}>
                              {compName}
                            </span>
                          </div>

                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-poppins shrink-0 ${
                            statusIdx === 1 ? "bg-[#FFF3E5] text-[#FF8800] border border-[#FF8800]/30" :
                            statusIdx === 2 ? "bg-[#E6F4FA] text-[#0077BB] border border-[#0077BB]/30" :
                            statusIdx === 3 ? "bg-[#EAF5EF] text-[#2E8B57] border border-[#2E8B57]/30" : "bg-slate-100 text-[#333333]"
                          }`}>
                            ● {ORDER_STATUS_LABELS[statusIdx] || "En proceso"}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Fecha de Emisión:</span>
                            <span className="font-mono text-slate-700">{new Date(Number(ord.timestamp) * 1000).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-500">{statusIdx >= 3 ? "Monto Liberado:" : "Monto Custodiado:"}</span>
                            <span className={`font-black text-sm ${statusIdx >= 3 ? "text-[#0077BB]" : "text-[#2E8B57]"}`}>
                              €{formatPrice(ord.totalAmount)} EURT
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-[11px] text-[#0077BB] font-bold font-poppins group-hover:underline flex items-center gap-1">
                          📋 Abrir Ficha Flotante
                        </span>
                        <span className="w-8 h-8 rounded-full bg-[#E6F4FA] text-[#0077BB] flex items-center justify-center font-bold text-xs group-hover:scale-110 transition shadow-xs">
                          ➔
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* FICHA FLOTANTE DE DETALLE DE PEDIDO (FLOATING MODAL OVERLAY) */}
            {selectedOrder && (
              <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative border-l-4 border-l-[#0077BB] my-8 max-h-[90vh] overflow-y-auto">
                  
                  {/* Encabezado Ficha Flotante */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 sticky top-0 bg-white z-10 -mt-2 pt-2">
                    <div>
                      <span className="text-[10px] text-[#0077BB] uppercase font-mono font-bold tracking-wider block">
                        📋 Ficha Flotante &bull; Detalle del Pedido
                      </span>
                      <h2 className="text-xl font-black text-[#333333] font-poppins">
                        Factura #{selectedOrder.invoiceId.toString()}
                      </h2>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold font-poppins ${
                        Number(selectedOrder.status) === 1 ? "bg-[#FFF3E5] text-[#FF8800] border border-[#FF8800]/30" :
                        Number(selectedOrder.status) === 2 ? "bg-[#E6F4FA] text-[#0077BB] border border-[#0077BB]/30" :
                        Number(selectedOrder.status) === 3 ? "bg-[#EAF5EF] text-[#2E8B57] border border-[#2E8B57]/30" : "bg-slate-100 text-[#333333]"
                      }`}>
                        ● {ORDER_STATUS_LABELS[Number(selectedOrder.status)] || "Registrado"}
                      </span>

                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold flex items-center justify-center transition cursor-pointer text-sm"
                        aria-label="Cerrar Ficha Flotante"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Datos de la Empresa Vendedora */}
                  <div className="bg-white/80 rounded-2xl p-4 border border-[#0077BB]/15 text-xs space-y-1">
                    <span className="text-[10px] text-[#0077BB] font-bold uppercase tracking-wider block font-poppins">Empresa Vendedora</span>
                    <span className="font-extrabold text-sm text-[#333333] block font-poppins">
                      {companies[selectedOrder.companyId.toString()] || `Empresa ID #${selectedOrder.companyId.toString()}`}
                    </span>
                    <span className="text-[#A9A9A9] font-mono text-[11px] block">
                      Identificador de Empresa: #{selectedOrder.companyId.toString()}
                    </span>
                  </div>

                  {/* DETALLE DE PRODUCTOS COMPRADOS EN LA FACTURA */}
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-800 font-poppins flex items-center gap-1.5">
                        <span>🛍️</span>
                        <span>Productos Comprados en esta Factura</span>
                      </span>
                      <span className="text-[10px] text-indigo-600 font-mono font-bold">
                        {selectedOrderItems.length} {selectedOrderItems.length === 1 ? "Producto" : "Productos"}
                      </span>
                    </div>

                    {loadingSelectedItems ? (
                      <p className="text-xs text-slate-500 font-sans animate-pulse py-1">⏳ Cargando productos comprados desde la Blockchain...</p>
                    ) : selectedOrderItems.length > 0 ? (
                      <div className="divide-y divide-slate-100 text-xs font-mono">
                        {selectedOrderItems.map((it, idx) => (
                          <div key={idx} className="py-2.5 flex justify-between items-center">
                            <div>
                              <span className="font-bold text-slate-900 block font-sans text-xs">{it.productName}</span>
                              <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                                Cantidad: <strong>{it.quantity}</strong> &bull; Ref ID: #{it.productId} &bull; Unit: €{it.unitPrice} EURT
                              </span>
                            </div>
                            <span className="font-black text-slate-900 text-sm">
                              €{it.totalPrice} EURT
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 font-mono py-1">
                        <span>Orden E-Commerce #{selectedOrder.invoiceId.toString()}</span>
                        <span className="block text-[11px] text-slate-500 font-sans">
                          Monto Total Facturado: <strong>€{formatPrice(selectedOrder.totalAmount)} EURT</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* BOTÓN VER / DESCARGAR FACTURA OFICIAL PDF CON QR */}
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-xs text-[#333333] font-poppins block">
                        📄 Factura Electrónica & QR Verification
                      </span>
                      <span className="text-[11px] text-[#A9A9A9] block">
                        Genere e imprima su comprobante fiscal oficial respaldado en Blockchain.
                      </span>
                    </div>

                    <button
                      onClick={() => setInvoicePdfData({
                        invoiceId: selectedOrder.invoiceId.toString(),
                        companyId: selectedOrder.companyId.toString(),
                        companyName: companies[selectedOrder.companyId.toString()] || `Empresa #${selectedOrder.companyId.toString()}`,
                        customerAddress: address,
                        totalAmount: formatPrice(selectedOrder.totalAmount),
                        timestamp: Date.now() / 1000,
                        paymentTxHash: selectedOrder.paymentTxHash || "0x5f8b91a27e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b",
                        statusLabel: ORDER_STATUS_LABELS[Number(selectedOrder.status)] || "Pagado",
                        trackingNumber: selectedOrder.trackingNumber || "BARLO-TRACK-98214"
                      })}
                      className="px-4 py-2 bg-[#FF8800] hover:bg-[#E07700] text-white font-extrabold text-xs rounded-xl shadow-xs transition font-poppins flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <span>📄</span>
                      <span>Ver / Descargar Factura PDF</span>
                    </button>
                  </div>

                  {/* DATOS IMPORTANTES DE ENVÍO Y LIBERACIÓN */}
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

                  {/* SECCIÓN DE VALORACIÓN */}
                  {(Number(selectedOrder.status) === 2 || Number(selectedOrder.status) === 3) && (
                    ratedInvoices[selectedOrder.invoiceId.toString()] ? (
                      <div className="bg-[#EAF5EF] border border-[#2E8B57]/30 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">⭐</span>
                          <div>
                            <span className="text-xs font-bold text-[#2E8B57] font-poppins block">Valoración Completada</span>
                            <span className="text-[11px] text-[#333333]">Ya ha sido registrada la calificación para esta compra. ¡Muchas gracias!</span>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-[#2E8B57] text-white text-[10px] font-bold rounded-full font-poppins shadow-xs">
                          ✓ Valorada
                        </span>
                      </div>
                    ) : (
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
                            className="px-4 py-2.5 bg-[#FF8800] hover:bg-[#E07700] text-white font-bold text-xs rounded-xl shadow-sm transition font-poppins flex-1 text-center cursor-pointer"
                          >
                            ⭐ Valorar Empresa Ahora
                          </button>

                          <button
                            onClick={() => handleAutoDefaultRating(selectedOrder.companyId.toString())}
                            disabled={submittingRating}
                            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#0077BB] border border-[#0077BB]/30 font-bold text-xs rounded-xl shadow-xs transition font-poppins flex-1 text-center disabled:opacity-50 cursor-pointer"
                          >
                            ⚡ Aplicar Valoración Automática (24h)
                          </button>
                        </div>
                      </div>
                    )
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
                        className="btn-cacao-pulse w-full text-xs font-poppins uppercase tracking-wider text-center flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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

                  {/* Botón Cerrar Ficha abajo */}
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition font-poppins cursor-pointer"
                    >
                      Cerrar Ficha
                    </button>
                  </div>

                </div>
              </div>
            )}
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

      {/* INVOICE PDF MODAL */}
      <InvoicePdfModal
        isOpen={!!invoicePdfData}
        onClose={() => setInvoicePdfData(null)}
        data={invoicePdfData}
      />
    </div>
  );
}

