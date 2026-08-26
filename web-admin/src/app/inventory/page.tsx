"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../hooks/useWallet";
import { useContract } from "../../hooks/useContract";
import { useRouter } from "next/navigation";

const ECOMMERCE_ABI = [
  "function getCompanyByAddress(address _address) view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate))",
  "function getCompanyProducts(uint256 companyId) view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, string ipfsImageHash, uint256 stock, bool isActive)[])",
  "function getProductsByCompany(uint256 companyId) view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, string ipfsImageHash, uint256 stock, bool isActive)[])",
  "function addProduct(uint256 _companyId, string _name, string _description, uint256 _price, string _ipfsImageHash, uint256 _stock) returns (uint256)"
];

interface InventoryItem {
  productId: bigint;
  companyId: bigint;
  name: string;
  description: string; // Contains metadata JSON or text
  price: bigint;
  ipfsImageHash: string;
  stock: bigint;
  isActive: boolean;
  // Parsed extended fields
  presentation?: string;
  nominalValue?: number;
  marketValue?: number;
  shippingCondition?: string;
}

const SHIPPING_CONDITIONS = [
  "🚚 Envío Estándar",
  "📦 Frágil / Manejo Delicado",
  "❄️ Cadena de Frío / Refrigerado",
  "⚡ Descarga / Envío Digital"
];

const PRESENTATIONS = ["Unidad Individual", "Caja x12", "Paquete 500g", "Suscripción Mensual", "Licencia Digital"];

export default function InventoryPage() {
  const { provider, signer, chainId, address, isConnected } = useWallet();
  const ecommerce = useContract("ecommerce", provider, signer, chainId);

  const [companyId, setCompanyId] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form State with Extended Inventory Fields & Reference Image
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    presentation: "Unidad Individual",
    nominalValue: "10.00",
    marketValue: "15.00",
    shippingCondition: "🚚 Envío Estándar",
    stock: "50",
  });

  // Image Upload State with WebP conversion
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  // 1. Fetch Company Info for Connected Wallet
  useEffect(() => {
    async function fetchCompanyInfo() {
      if (!address) return;
      try {
        setLoading(true);
        const rpcProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");
        const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

        const comp = await contract.getCompanyByAddress(address);
        if (comp && comp.companyId > BigInt(0)) {
          const cId = comp.companyId.toString();
          setCompanyId(cId);
          setCompanyName(comp.name || `Empresa #${cId}`);

          // Fetch products for this company
          let rawProducts: any[] = [];
          try {
            rawProducts = await contract.getCompanyProducts(comp.companyId);
          } catch {
            rawProducts = await contract.getProductsByCompany(comp.companyId);
          }

          if (rawProducts) {
            const parsed = rawProducts.map((p: any) => {
              let parsedMeta: any = {};
              try {
                if (p.description.startsWith("{")) {
                  parsedMeta = JSON.parse(p.description);
                }
              } catch {}

              const priceInEur = Number(p.price) / 1000000;
              return {
                productId: p.productId,
                companyId: p.companyId,
                name: p.name,
                description: parsedMeta.rawDesc || p.description,
                price: p.price,
                ipfsImageHash: p.ipfsImageHash,
                stock: p.stock,
                isActive: p.isActive,
                presentation: parsedMeta.presentation || "Unidad Individual",
                nominalValue: parsedMeta.nominalValue ? Number(parsedMeta.nominalValue) : priceInEur * 0.7,
                marketValue: priceInEur,
                shippingCondition: parsedMeta.shippingCondition || "🚚 Envío Estándar",
              };
            });
            setProducts(parsed);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch inventory data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCompanyInfo();
  }, [address, ecommerceAddress]);

  // Client-side WebP Image Optimization Converter
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setOriginalSize(file.size);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                setCompressedSize(blob.size);
                setImagePreviewUrl(URL.createObjectURL(blob));
              }
            },
            "image/webp",
            0.85
          );
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !companyId) {
      alert("Debe tener su billetera de empresa conectada.");
      return;
    }

    try {
      setSubmitting(true);

      let savedImagePath = "/uploads/placeholder.webp";
      if (selectedFile) {
        const safeName = selectedFile.name.replace(/[^a-z0-9_.-]/gi, "_").toLowerCase();
        savedImagePath = `/uploads/company_${companyId}/${safeName.replace(/\.[^/.]+$/, "")}.webp`;
      }

      const metadataPayload = JSON.stringify({
        rawDesc: formData.description,
        presentation: formData.presentation,
        nominalValue: formData.nominalValue,
        marketValue: formData.marketValue,
        shippingCondition: formData.shippingCondition,
      });

      const priceInMicroEURT = BigInt(Math.round(parseFloat(formData.marketValue) * 1000000));
      const stockBigInt = BigInt(parseInt(formData.stock, 10));

      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, signer);
      const tx = await contract.addProduct(
        BigInt(companyId),
        formData.name,
        metadataPayload,
        priceInMicroEURT,
        savedImagePath,
        stockBigInt
      );
      await tx.wait();

      alert("¡Mercancía agregada exitosamente al inventario on-chain!");
      setShowForm(false);
      window.location.reload();
    } catch (err: any) {
      alert("Error agregando producto: " + (err?.reason || err?.message || String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  // Calculations for Capital Metrics
  const totalNominalCapital = products.reduce((acc, p) => acc + (p.nominalValue || 0) * Number(p.stock), 0);
  const totalMarketValue = products.reduce((acc, p) => acc + (p.marketValue || 0) * Number(p.stock), 0);
  const estimatedProfit = totalMarketValue - totalNominalCapital;
  const totalItemsCount = products.reduce((acc, p) => acc + Number(p.stock), 0);
  const lowStockAlarms = products.filter((p) => Number(p.stock) <= 5);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="badge-blue mb-1">Almacén &bull; {companyName || "Empresa"}</span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-poppins">Gestión de Inventario & Almacén</h1>
          <p className="text-xs text-slate-500 mt-0.5">Control de mercancía, análisis de capital invertido y alarmas de stock</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto px-5 py-2.5 bg-[#0077BB] hover:bg-[#005F96] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 min-h-[44px]"
        >
          <span>{showForm ? "✕ Cerrar Formulario" : "+ Alta de Nueva Mercancía"}</span>
        </button>
      </div>

      {/* Capital Investment Analysis Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="admin-card p-4 sm:p-5 border-l-4 border-l-[#0077BB] bg-white rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Capital Invertido (Costo Base)</span>
          <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">€{totalNominalCapital.toFixed(2)}</span>
          <p className="text-[11px] text-slate-500 mt-1">Valor nominal en inventario</p>
        </div>

        <div className="admin-card p-4 sm:p-5 border-l-4 border-l-emerald-600 bg-white rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Valor Total de Mercado</span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">€{totalMarketValue.toFixed(2)} EURT</span>
          <p className="text-[11px] text-slate-500 mt-1">Ingreso esperado en venta</p>
        </div>

        <div className="admin-card p-4 sm:p-5 border-l-4 border-l-[#FF8800] bg-white rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Margen Estimado</span>
          <span className="text-2xl sm:text-3xl font-black text-[#FF8800] font-mono">€{estimatedProfit.toFixed(2)} EURT</span>
          <p className="text-[11px] text-slate-500 mt-1">Unidades totales: {totalItemsCount}</p>
        </div>
      </div>

      {/* Low Stock Alarm Banner */}
      {lowStockAlarms.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs sm:text-sm font-poppins">
            <span className="text-base">⚠️</span>
            <span>ALARMAS DE FALTA DE MERCANCÍA ({lowStockAlarms.length} ítems críticos)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            {lowStockAlarms.map((item) => (
              <div key={item.productId.toString()} className="bg-white p-3 rounded-xl border border-amber-200 text-xs flex justify-between items-center">
                <div className="min-w-0 flex-1 mr-2">
                  <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Ref #{item.productId.toString()}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                  Number(item.stock) === 0 ? "bg-rose-100 text-rose-800 border border-rose-200 animate-pulse" : "bg-amber-100 text-amber-800"
                }`}>
                  {Number(item.stock) === 0 ? "❌ AGOTADO" : `⚠️ ${item.stock.toString()} un.`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Registration Form */}
      {showForm && (
        <form onSubmit={handleAddProduct} className="admin-card p-5 sm:p-7 bg-white rounded-2xl border border-[#0077BB]/20 shadow-xl space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 font-poppins">Alta de Mercancía o Servicio</h2>
            <p className="text-xs text-slate-500">Ingrese valores nominales, formato y condiciones de traslado</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Cacao Criollo 1kg"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0077BB]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Presentación:</label>
              <select
                value={formData.presentation}
                onChange={(e) => setFormData({ ...formData, presentation: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-[#0077BB]"
              >
                {PRESENTATIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Costo Base (€):</label>
              <input
                type="number"
                step="0.01"
                value={formData.nominalValue}
                onChange={(e) => setFormData({ ...formData, nominalValue: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0077BB]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">PVP (€ EURT):</label>
              <input
                type="number"
                step="0.01"
                value={formData.marketValue}
                onChange={(e) => setFormData({ ...formData, marketValue: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-[#0077BB]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Stock Disponible:</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0077BB]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Condición de Envío:</label>
            <select
              value={formData.shippingCondition}
              onChange={(e) => setFormData({ ...formData, shippingCondition: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-[#0077BB]"
            >
              {SHIPPING_CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Descripción:</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalles del producto o servicio..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0077BB]"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50 min-h-[44px]"
            >
              {submitting ? "Guardando..." : "Publicar Mercancía"}
            </button>
          </div>
        </form>
      )}

      {/* INVENTORY: RESPONSIVE CARDS (< md) + FULL TABLE (>= md) */}
      <div className="admin-card overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div>
            <h3 className="font-bold text-sm text-slate-900 font-poppins">Catálogo de Mercancía en Almacén</h3>
            <p className="text-xs text-slate-500">Supervisión técnica de precios, valores y stock</p>
          </div>
          <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#0077BB] font-mono">
            {products.length} Refs
          </span>
        </div>

        {/* 1. Mobile Cards View (< md) */}
        <div className="block md:hidden p-3 divide-y divide-slate-100">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs font-mono">Cargando inventario...</div>
          ) : products.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No hay mercancía registrada en inventario.</div>
          ) : (
            products.map((item) => {
              const stockNum = Number(item.stock);
              const imgUrl = item.ipfsImageHash?.startsWith("/") || item.ipfsImageHash?.startsWith("http")
                ? item.ipfsImageHash
                : `https://ipfs.io/ipfs/${item.ipfsImageHash}`;

              return (
                <div key={item.productId.toString()} className="py-3.5 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      {item.ipfsImageHash ? (
                        <img src={imgUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-slate-300 font-mono text-[9px]">Sin foto</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-[#0077BB] font-bold">#{item.productId.toString()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          stockNum === 0 ? "bg-rose-100 text-rose-800" : stockNum <= 5 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {stockNum === 0 ? "Agotado" : `${stockNum} un.`}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 truncate font-poppins">{item.name}</h4>
                      <span className="text-[10px] text-slate-500 block">{item.presentation}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded-xl">
                    <div>
                      <span className="text-[10px] text-slate-400 block">PVP (EURT):</span>
                      <span className="font-mono font-black text-emerald-700 text-sm">€{(item.marketValue || 0).toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Logística:</span>
                      <span className="text-[10px] font-bold text-slate-700">{item.shippingCondition}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 2. Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="px-6 py-3.5">Imagen</th>
                <th className="px-6 py-3.5">ID Ref</th>
                <th className="px-6 py-3.5">Mercancía / Formato</th>
                <th className="px-6 py-3.5">Valor Nominal</th>
                <th className="px-6 py-3.5">Valor Mercado (PVP)</th>
                <th className="px-6 py-3.5">Condición Logística</th>
                <th className="px-6 py-3.5">Stock Disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Cargando inventario de la empresa...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No hay productos o servicios registrados en inventario aún.
                  </td>
                </tr>
              ) : (
                products.map((item) => {
                  const stockNum = Number(item.stock);
                  const imgUrl = item.ipfsImageHash?.startsWith("/") || item.ipfsImageHash?.startsWith("http")
                    ? item.ipfsImageHash
                    : `https://ipfs.io/ipfs/${item.ipfsImageHash}`;

                  return (
                    <tr key={item.productId.toString()} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                          {item.ipfsImageHash ? (
                            <img src={imgUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-slate-300 font-mono text-[10px]">Sin imág</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-[#0077BB]">
                        #{item.productId.toString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {item.name}
                        <span className="block text-[11px] font-normal text-slate-400">{item.presentation}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500">
                        €{(item.nominalValue || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono font-extrabold text-emerald-600">
                        €{(item.marketValue || 0).toFixed(2)} EURT
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.shippingCondition}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          stockNum === 0 ? "bg-rose-100 text-rose-800 border border-rose-200" :
                          stockNum <= 5 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {stockNum === 0 ? "Agotado (0)" : `${stockNum} unidades`}
                        </span>
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
