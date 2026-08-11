"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../hooks/useWallet";

const ECOMMERCE_ABI = [
  "function getAllCompanies() view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate)[])",
  "function isKYCVerified(address account) view returns (bool)",
  "function getActivityLogs() view returns (tuple(address user, string action, string details, uint256 timestamp)[])"
];

const EUROTOKEN_ABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
];

const BUSINESS_TYPE_LABELS = ["Venta / Distribución de Productos", "Prestación de Servicios"];
const OWNER_ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

export default function SystemsPage() {
  const { address, isConnected, signer } = useWallet();
  const [activeTab, setActiveTab] = useState<"general" | "history">("general");
  const [loading, setLoading] = useState<boolean>(true);

  // General Systems State
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyBalances, setCompanyBalances] = useState<{ [key: string]: string }>({});
  const [contractBalances, setContractBalances] = useState({
    ecommerceEth: "0.0000",
    ownerEth: "0.0000",
    euroTokenTotalSupply: "0.0000",
    euroTokenContractEth: "0.0000",
  });

  // History Log State
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const isOwner = address?.toLowerCase() === OWNER_ADDRESS;

  useEffect(() => {
    async function loadSystemData() {
      if (!isOwner) return;
      try {
        setLoading(true);
        const provider = signer?.provider || new ethers.JsonRpcProvider("http://localhost:8545");

        const ecommerce = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, provider);
        const euroToken = new ethers.Contract(euroTokenAddress, EUROTOKEN_ABI, provider);

        // Fetch ETH Balances formatted to 4 decimals
        const ecommerceEthBal = await provider.getBalance(ecommerceAddress);
        const euroTokenEthBal = await provider.getBalance(euroTokenAddress);
        const ownerEthBal = await provider.getBalance(OWNER_ADDRESS);
        const totalSupply = await euroToken.totalSupply();

        setContractBalances({
          ecommerceEth: parseFloat(ethers.formatEther(ecommerceEthBal)).toFixed(4),
          euroTokenContractEth: parseFloat(ethers.formatEther(euroTokenEthBal)).toFixed(4),
          ownerEth: parseFloat(ethers.formatEther(ownerEthBal)).toFixed(4),
          euroTokenTotalSupply: (Number(totalSupply) / 1000000).toFixed(4),
        });

        // Fetch companies & their EURT balances formatted to 4 decimals
        const compList = await ecommerce.getAllCompanies();
        setCompanies(compList);

        const balancesMap: { [key: string]: string } = {};
        for (const comp of compList) {
          const bal = await euroToken.balanceOf(comp.companyAddress);
          balancesMap[comp.companyAddress] = (Number(bal) / 1000000).toFixed(4);
        }
        setCompanyBalances(balancesMap);

        // Fetch full audit activity logs
        const logs = await ecommerce.getActivityLogs();
        setActivityLogs(logs);
      } catch (err) {
        console.error("Failed to load systems admin data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSystemData();
  }, [address, isOwner, signer]);

  if (!isConnected) {
    return (
      <div className="admin-card p-12 text-center max-w-xl mx-auto space-y-4">
        <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto">
          ⚡
        </div>
        <h2 className="text-xl font-bold text-slate-900">Sección de SISTEMAS de Plataforma</h2>
        <p className="text-xs text-slate-500">
          Por favor conecte su billetera Web3 para verificar privilegios de Super Admin Owner.
        </p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="admin-card p-12 text-center max-w-xl mx-auto space-y-4 border-2 border-rose-200 bg-rose-50/50">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto">
          ⛔
        </div>
        <h2 className="text-xl font-bold text-rose-900">Acceso Restringido - Solo Owner</h2>
        <p className="text-xs text-rose-700 leading-relaxed">
          Esta sección de <strong>SISTEMAS</strong> está reservada únicamente para la wallet creadora/desplegadora de Anvil (Cuenta N°0: <code className="font-mono bg-rose-100 px-1 py-0.5 rounded">0xf39F...2266</code>).
        </p>
        <div className="pt-2 text-xs text-slate-500">
          Wallet Conectada Actual: <span className="font-mono font-bold text-slate-800">{address}</span>
        </div>
      </div>
    );
  }

  // Filtered History Logs
  const filteredLogs = activityLogs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());

    if (actionFilter === "ALL") return matchesSearch;
    return matchesSearch && log.action.toUpperCase().includes(actionFilter);
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Super Admin Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 sm:p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <span className="px-3 py-1 bg-purple-500/30 border border-purple-400/30 rounded-full text-xs font-bold text-purple-200 mb-2 inline-block">
              ⚡ Consola Super Admin Owner
            </span>
            <span className="text-xs font-mono bg-white/10 px-3 py-1 rounded-lg border border-white/10 text-emerald-300">
              Formato de Saldos: 4 Decimales (0.0000)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">SISTEMAS & Gestión Global de Plataforma</h1>
          <p className="text-xs text-purple-200 mt-1 max-w-2xl">
            Supervisión técnica de contratos inteligentes, control de capitales en mercado EURT y auditoría histórica completa de la plataforma.
          </p>
        </div>
      </div>

      {/* Sub Menu Navigation Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold transition flex justify-center items-center gap-2 ${
            activeTab === "general"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>📊 Vista General & Métricas Técnicas</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold transition flex justify-center items-center gap-2 ${
            activeTab === "history"
              ? "bg-purple-600 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>📜 Sub-Menú Histórico de Registros ({activityLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: VISTA GENERAL & METRICAS */}
      {activeTab === "general" && (
        <div className="space-y-8">
          {/* KPI Cards (4 Decimal Formatting) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="admin-card p-5 border-l-4 border-l-purple-600">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Empresas Inscritas</span>
              <span className="text-3xl font-black text-slate-900">{loading ? "..." : companies.length}</span>
              <p className="text-xs text-slate-500 mt-1">Comerciantes con KYC ligada</p>
            </div>

            <div className="admin-card p-5 border-l-4 border-l-emerald-600">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Masa Monetaria EURT</span>
              <span className="text-3xl font-black text-emerald-600">€{loading ? "..." : contractBalances.euroTokenTotalSupply} EURT</span>
              <p className="text-xs text-slate-500 mt-1">Suministro Total (4 decimales)</p>
            </div>

            <div className="admin-card p-5 border-l-4 border-l-indigo-600">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Registros de Auditoría</span>
              <span className="text-3xl font-black text-slate-900">{loading ? "..." : activityLogs.length}</span>
              <p className="text-xs text-slate-500 mt-1">Eventos en la cadena</p>
            </div>

            <div className="admin-card p-5 border-l-4 border-l-amber-500">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Fondo ETH Owner</span>
              <span className="text-3xl font-black text-amber-600">{loading ? "..." : contractBalances.ownerEth} ETH</span>
              <p className="text-xs text-slate-500 mt-1">Recaudado tarifa 3.0000 ETH</p>
            </div>
          </div>

          {/* Deployed Contracts Info (4 Decimal ETH Balances) */}
          <div className="admin-card p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📜 Contratos Inteligentes Desplegados (Detalle Técnico completo)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Ecommerce Main Contract */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">EcommerceMain (Coordinador)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold badge-success">Anvil 31337</span>
                </div>
                <p className="font-mono text-slate-600 break-all bg-white p-2 rounded-lg border border-slate-200">
                  {ecommerceAddress}
                </p>
                <div className="flex justify-between text-slate-500 pt-1">
                  <span>Saldo ETH en Contrato:</span>
                  <span className="font-bold text-slate-900">{contractBalances.ecommerceEth} ETH</span>
                </div>
              </div>

              {/* EuroToken Contract */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">EuroToken (EURT Stablecoin)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold badge-success">6 Dec Base</span>
                </div>
                <p className="font-mono text-slate-600 break-all bg-white p-2 rounded-lg border border-slate-200">
                  {euroTokenAddress}
                </p>
                <div className="flex justify-between text-slate-500 pt-1">
                  <span>Suministro Circulante Total:</span>
                  <span className="font-bold text-emerald-600">€{contractBalances.euroTokenTotalSupply} EURT</span>
                </div>
              </div>
            </div>
          </div>

          {/* Companies & Capital in Market (4 Decimal EURT Balances) */}
          <div className="admin-card overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Empresas Inscritas & Capital en Mercado (EURT)</h3>
                <p className="text-xs text-slate-500">Balances individuales expresados a 4 decimales de precisión</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    <th className="px-6 py-3.5">ID</th>
                    <th className="px-6 py-3.5">Nombre Comercial</th>
                    <th className="px-6 py-3.5">Tipo de Negocio</th>
                    <th className="px-6 py-3.5">Billetera Inscrita</th>
                    <th className="px-6 py-3.5">Certificación KYC</th>
                    <th className="px-6 py-3.5">Capital en Mercado (EURT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        Cargando empresas e información del mercado...
                      </td>
                    </tr>
                  ) : companies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        No hay empresas registradas aún.
                      </td>
                    </tr>
                  ) : (
                    companies.map((comp) => (
                      <tr key={comp.companyId.toString()} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 font-mono font-bold text-purple-700">
                          #{comp.companyId.toString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {comp.name}
                          <span className="block text-[11px] font-normal text-slate-400 truncate max-w-xs">{comp.description}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {BUSINESS_TYPE_LABELS[Number(comp.businessType)] || "Productos"}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600">
                          {comp.companyAddress.slice(0, 8)}...{comp.companyAddress.slice(-6)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold badge-success">
                            🛡️ Verificado
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-extrabold text-emerald-600">
                          €{companyBalances[comp.companyAddress] || "0.0000"} EURT
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUB-MENU HISTORICO DE REGISTROS CON FILTROS */}
      {activeTab === "history" && (
        <div className="admin-card overflow-hidden p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">📜 Histórico Completo de Registros de Plataforma</h2>
              <p className="text-xs text-slate-500">Filtre y examine todas las transacciones, inscripciones y actividades grabadas en blockchain</p>
            </div>
            <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold rounded-xl">
              Registros Encontrados: {filteredLogs.length}
            </span>
          </div>

          {/* Search & Category Filter Control Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            {/* Search Input */}
            <div className="sm:col-span-2">
              <label className="block text-slate-600 font-bold mb-1">Buscar por Billetera, Acción o Detalle:</label>
              <input
                type="text"
                placeholder="Ej. 0xf39F..., REGISTER, PAYMENT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-slate-600 font-bold mb-1">Filtrar por Categoría:</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">🌐 Todas las Categorías</option>
                <option value="REGISTER">🏢 Registro de Empresas</option>
                <option value="PRODUCT">🛒 Productos & Catálogo</option>
                <option value="SHIP">📦 Despacho de Envíos</option>
                <option value="PAYMENT">💳 Pagos en EURT</option>
              </select>
            </div>
          </div>

          {/* History Logs Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <th className="px-6 py-3.5">#</th>
                  <th className="px-6 py-3.5">Fecha y Hora</th>
                  <th className="px-6 py-3.5">Billetera de Origen</th>
                  <th className="px-6 py-3.5">Evento / Acción</th>
                  <th className="px-6 py-3.5">Detalles del Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      Cargando histórico de plataforma...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No se encontraron registros en el histórico con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  [...filteredLogs].reverse().map((log, idx) => {
                    const dateStr = new Date(Number(log.timestamp) * 1000).toLocaleString();
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 font-mono font-bold text-purple-600">
                          #{filteredLogs.length - idx}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500 whitespace-nowrap">
                          {dateStr}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-800">
                          {log.user}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600">
                          {log.details}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
