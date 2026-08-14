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

  // Form State with Extended Inventory Fields
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    presentation: "Unidad Individual",
    nominalValue: "10.00",
    marketValue: "15.00",
    shippingCondition: "🚚 Envío Estándar",
    stock: "50",
  });

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const loadCompanyInventory = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const jsonProvider = new ethers.JsonRpcProvider("http://localhost:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, jsonProvider);

      try {
        const comp = await contract.getCompanyByAddress(address);
        if (comp && comp.companyId > BigInt(0)) {
          setCompanyId(comp.companyId.toString());
          setCompanyName(comp.name);

          // Fetch products
          const rawProds = await contract.getCompanyProducts(comp.companyId);
          const parsed = rawProds.map((p: any) => {
            let metadata = { presentation: "Unidad", nominalValue: Number(p.price) / 1000000 * 0.7, shippingCondition: "Estándar" };
            try {
              if (p.description && p.description.startsWith("{")) {
                metadata = JSON.parse(p.description);
              }
            } catch {
              // fallback
            }

            const marketVal = Number(p.price) / 1000000;
            return {
              productId: p.productId,
              companyId: p.companyId,
              name: p.name,
              description: p.description,
              price: p.price,
              ipfsImageHash: p.ipfsImageHash,
              stock: p.stock,
              isActive: p.isActive,
              presentation: metadata.presentation || "Unidad Individual",
              nominalValue: metadata.nominalValue || marketVal * 0.7,
              marketValue: marketVal,
              shippingCondition: metadata.shippingCondition || "🚚 Envío Estándar",
            };
          });

          setProducts(parsed);
        }
      } catch (err) {
        console.warn("Wallet not registered as company:", err);
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyInventory();
  }, [address, provider]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !companyId) {
      alert("Su wallet debe estar inscrita como empresa para añadir productos.");
      return;
    }

    try {
      setSubmitting(true);
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, signer);

      const priceBaseUnits = ethers.parseUnits(formData.marketValue, 6);

      // Encode extended inventory data inside description JSON
      const fullDescription = JSON.stringify({
        text: formData.description,
        presentation: formData.presentation,
        nominalValue: parseFloat(formData.nominalValue),
        shippingCondition: formData.shippingCondition,
      });

      const tx = await contract.addProduct(
        companyId,
        formData.name,
        fullDescription,
        priceBaseUnits,
        "QmDefaultIpfsHash",
        formData.stock
      );
      await tx.wait();

      alert("¡Mercancía agregada exitosamente al inventario!");
      setShowForm(false);
      setFormData({
        name: "",
        description: "",
        presentation: "Unidad Individual",
        nominalValue: "10.00",
        marketValue: "15.00",
        shippingCondition: "🚚 Envío Estándar",
        stock: "50",
      });
      await loadCompanyInventory();
    } catch (err: any) {
      console.error("Failed to add inventory item:", err);
      alert("Error agregando producto: " + (err?.reason || err?.message || "Transacción fallida"));
    } finally {
      setSubmitting(false);
    }
  };

  // Capital Investment Analysis Math
  const totalItemsCount = products.reduce((acc, item) => acc + Number(item.stock), 0);
  const totalNominalCapital = products.reduce((acc, item) => acc + (item.nominalValue || 0) * Number(item.stock), 0);
  const totalMarketValue = products.reduce((acc, item) => acc + (item.marketValue || 0) * Number(item.stock), 0);
  const estimatedProfit = totalMarketValue - totalNominalCapital;

  // Low Stock & Out of Stock Alarms
  const lowStockAlarms = products.filter((item) => Number(item.stock) <= 5);

  if (!isConnected) {
    return (
      <div className="admin-card p-12 text-center max-w-xl mx-auto space-y-4">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto">
          📦
        </div>
        <h2 className="text-xl font-bold text-slate-900">Gestión de Inventario de Empresa</h2>
        <p className="text-xs text-slate-500">
          Por favor conecte la wallet comercial inscrita para acceder al panel de inventario.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold badge-info mb-1 inline-block">
            {companyName ? `Empresa: ${companyName} (ID #${companyId})` : "Gestión de Comercio"}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Inventario & Almacén</h1>
          <p className="text-xs text-slate-500 mt-0.5">Control de mercancía, análisis de capital invertido y alarmas de stock</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2"
        >
          <span>{showForm ? "✕ Cerrar Formulario" : "+ Alta de Nueva Mercancía"}</span>
        </button>
      </div>

      {/* Capital Investment Analysis Dashboard (3 Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="admin-card p-5 border-l-4 border-l-indigo-600">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Capital Invertido (Costo Base)</span>
          <span className="text-3xl font-black text-slate-900">€{totalNominalCapital.toFixed(4)} EURT</span>
          <p className="text-xs text-slate-500 mt-1">Valor nominal total en inventario</p>
        </div>

        <div className="admin-card p-5 border-l-4 border-l-emerald-600">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Valor Total de Mercado</span>
          <span className="text-3xl font-black text-emerald-600">€{totalMarketValue.toFixed(4)} EURT</span>
          <p className="text-xs text-slate-500 mt-1">Ingreso bruto esperado en venta</p>
        </div>

        <div className="admin-card p-5 border-l-4 border-l-purple-600">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Margen de Ganancia Estimado</span>
          <span className="text-3xl font-black text-purple-700">€{estimatedProfit.toFixed(4)} EURT</span>
          <p className="text-xs text-slate-500 mt-1">Unidades acumuladas: {totalItemsCount}</p>
        </div>
      </div>

      {/* Low Stock & Out of Stock Alarm Banner */}
      {lowStockAlarms.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
            <span className="text-lg">⚠️</span>
            <span>ALARMAS DE FALTA DE MERCANCÍA ({lowStockAlarms.length} ítems en umbral crítico)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {lowStockAlarms.map((item) => (
              <div key={item.productId.toString()} className="bg-white p-3 rounded-xl border border-amber-200 text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 block truncate max-w-[150px]">{item.name}</span>
                  <span className="text-[10px] text-slate-400">Ref ID #{item.productId.toString()}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                  Number(item.stock) === 0 ? "bg-rose-100 text-rose-800 border border-rose-200 animate-pulse" : "badge-amber"
                }`}>
                  {Number(item.stock) === 0 ? "❌ AGOTADO (0)" : `⚠️ QUEDAN ${item.stock.toString()}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extended Product Registration Form */}
      {showForm && (
        <form onSubmit={handleAddProduct} className="admin-card p-6 sm:p-8 bg-white border border-indigo-100 shadow-xl space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Alta de Nueva Mercancía o Servicio en Inventario</h2>
            <p className="text-xs text-slate-500">Ingrese las condiciones de embalaje, valores nominales/mercado y logística</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de Mercancía / Servicio:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Servidor Dedicado Cloud / Laptop Pro 16"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Presentación / Formato de Venta:</label>
              <select
                value={formData.presentation}
                onChange={(e) => setFormData({ ...formData, presentation: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
              >
                {PRESENTATIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valor Nominal (Costo Base €):</label>
              <input
                type="number"
                step="0.01"
                value={formData.nominalValue}
                onChange={(e) => setFormData({ ...formData, nominalValue: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valor de Mercado (PVP € EURT):</label>
              <input
                type="number"
                step="0.01"
                value={formData.marketValue}
                onChange={(e) => setFormData({ ...formData, marketValue: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cantidad / Stock Disponible:</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Condiciones de Traslado / Logística:</label>
            <select
              value={formData.shippingCondition}
              onChange={(e) => setFormData({ ...formData, shippingCondition: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
            >
              {SHIPPING_CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Descripción y Especificaciones Técnicas:</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalle técnico del producto o términos de servicio..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50"
            >
              {submitting ? "Guardando en Blockchain..." : "Publicar Mercancía"}
            </button>
          </div>
        </form>
      )}

      {/* Inventory Table Container */}
      <div className="admin-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Catálogo de Mercancía en Almacén</h3>
            <p className="text-xs text-slate-500">Supervisión técnica de precios nominales, valores de mercado y stock</p>
          </div>
          <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-indigo-600">
            Referencias: {products.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
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
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Cargando inventario de la empresa...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No hay productos o servicios registrados en inventario aún.
                  </td>
                </tr>
              ) : (
                products.map((item) => {
                  const stockNum = Number(item.stock);
                  return (
                    <tr key={item.productId.toString()} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                        #{item.productId.toString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {item.name}
                        <span className="block text-[11px] font-normal text-slate-400">{item.presentation}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500">
                        €{(item.nominalValue || 0).toFixed(4)}
                      </td>
                      <td className="px-6 py-4 font-mono font-extrabold text-emerald-600">
                        €{(item.marketValue || 0).toFixed(4)} EURT
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.shippingCondition}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          stockNum === 0 ? "bg-rose-100 text-rose-800 border border-rose-200" :
                          stockNum <= 5 ? "badge-amber" : "badge-success"
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
