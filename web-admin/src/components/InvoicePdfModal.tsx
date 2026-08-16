"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export interface InvoiceModalData {
  invoiceId: string;
  companyId: string;
  companyName: string;
  companyAddress?: string;
  customerAddress: string;
  totalAmount: string; // Formatted price e.g. "50.00"
  timestamp: string | number;
  paymentTxHash: string;
  statusLabel: string;
  trackingNumber?: string;
}

interface InvoicePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InvoiceModalData | null;
}

export function InvoicePdfModal({ isOpen, onClose, data }: InvoicePdfModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    if (data && data.paymentTxHash) {
      const adminUrl = process.env.NEXT_PUBLIC_WEB_ADMIN_URL || "https://mcc-web-admin-1095249147821.europe-west1.run.app";
      const verifyPayload = `${adminUrl}/systems?tx=${data.paymentTxHash}`;
      QRCode.toDataURL(verifyPayload, {
        width: 180,
        margin: 1,
        color: {
          dark: "#0077BB",
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error("Error generating QR:", err));
    }
  }, [data]);

  if (!isOpen || !data) return null;

  const dateFormatted = typeof data.timestamp === "number"
    ? new Date(data.timestamp * 1000).toLocaleString()
    : data.timestamp;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex justify-center items-center p-4 z-50 overflow-y-auto">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice-content, #printable-invoice-content * {
            visibility: visible;
          }
          #printable-invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8">
        
        {/* TOP BAR / CONTROL BUTTONS */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="text-xl">📄</span>
            <span className="text-white font-extrabold text-sm font-poppins">
              Factura Electrónica Web3 & Verification QR
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#0077BB] hover:bg-[#005F96] text-white font-extrabold text-xs rounded-xl shadow-md transition font-poppins flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>Descargar / Imprimir PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition font-poppins"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* PRINTABLE INVOICE BODY */}
        <div id="printable-invoice-content" className="p-8 space-y-6 text-slate-800 bg-white font-sans">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-9 h-9 bg-gradient-to-tr from-[#0077BB] to-[#FF8800] rounded-xl flex items-center justify-center text-white font-black text-lg">
                  B
                </div>
                <span className="text-xl font-black text-slate-900 font-poppins tracking-tight">
                  BARLO-VENTAS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Plataforma E-Commerce Descentralizada Escrow
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                Contrato Smart Escrow: 0x5FC8d326...F875707
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold rounded-full inline-block font-mono">
                FACTURA OFICIAL #FACT-2026-00{data.invoiceId}
              </span>
              <p className="text-xs text-slate-500 font-mono">
                Fecha de Emisión: <strong className="text-slate-800">{dateFormatted}</strong>
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Estado: <strong className="text-emerald-600">{data.statusLabel}</strong>
              </p>
            </div>
          </div>

          {/* Billing Info Grid */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0077BB] font-mono block">
                EMISOR / EMPRESA VENDEDORA
              </span>
              <p className="font-extrabold text-sm text-slate-900 font-poppins">{data.companyName}</p>
              <p className="text-slate-600 font-mono text-[11px]">ID Comercio: #{data.companyId}</p>
              {data.companyAddress && (
                <p className="text-slate-500 font-mono text-[10px] truncate" title={data.companyAddress}>
                  Wallet: {data.companyAddress}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0077BB] font-mono block">
                RECEPTOR / CLIENTE COMPRADOR
              </span>
              <p className="font-extrabold text-sm text-slate-900 font-poppins">Cliente Web3 Registrado</p>
              <p className="text-slate-600 font-mono text-[10px] break-all">
                Wallet: {data.customerAddress}
              </p>
              {data.trackingNumber && (
                <p className="text-slate-500 font-mono text-[11px]">Guía Despacho: {data.trackingNumber}</p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] font-mono">
                  <th className="py-3 px-4">Descripción del Concepto / Producto</th>
                  <th className="py-3 px-4 text-center">Método de Pago</th>
                  <th className="py-3 px-4 text-right">Monto Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-mono">
                <tr>
                  <td className="py-4 px-4 font-bold text-slate-800">
                    Compra de Producto / Orden E-Commerce #{data.invoiceId}
                    <span className="block text-[11px] font-normal text-slate-500 font-sans mt-0.5">
                      Procesado bajo custodia temporal Escrow Smart Contract con EuroToken (EURT).
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-slate-600">
                    EuroToken (EURT)
                  </td>
                  <td className="py-4 px-4 text-right font-black text-slate-900 text-sm">
                    €{data.totalAmount} EURT
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="flex justify-end">
            <div className="w-64 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Base:</span>
                <span>€{data.totalAmount} EURT</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Impuestos / IVA (0%):</span>
                <span>€0.00 EURT</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-2 font-black text-sm text-emerald-700">
                <span>TOTAL FACTURADO:</span>
                <span>€{data.totalAmount} EURT</span>
              </div>
            </div>
          </div>

          {/* BLOCKCHAIN VERIFICATION SECTION & QR CODE */}
          <div className="bg-[#E6F4FA] border-2 border-[#0077BB]/30 p-5 rounded-2xl flex items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-[#0077BB] font-bold font-poppins">
                <span>🛡️</span>
                <span>Verificación de Autenticidad Blockchain</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-sans max-w-sm">
                Escanee el código QR adyacente para verificar la inmutabilidad de esta transacción en la plataforma Web3 BARLO-VENTAS.
              </p>
              <div className="pt-1 font-mono text-[10px] text-slate-500">
                <span className="block font-bold text-slate-700">Tx Hash:</span>
                <span className="text-[#0077BB] font-bold break-all">{data.paymentTxHash || "0x..."}</span>
              </div>
            </div>

            {/* QR CODE BOX */}
            <div className="bg-white p-2.5 rounded-xl border border-[#0077BB]/20 text-center shrink-0 shadow-sm">
              {qrCodeUrl ? (
                /* eslint-disable-next-html-element-cap-location */
                <img src={qrCodeUrl} alt="QR Code Transacción" className="w-28 h-28 mx-auto" />
              ) : (
                <div className="w-28 h-28 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                  Cargando QR...
                </div>
              )}
              <span className="text-[9px] font-mono font-bold text-[#0077BB] block mt-1">
                VALIDAR ON-CHAIN
              </span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400 font-mono">
            Factura electrónica emitida automáticamente por el Smart Contract Ecommerce.sol &bull; BARLO-VENTAS Platform 2026
          </div>

        </div>
      </div>
    </div>
  );
}
