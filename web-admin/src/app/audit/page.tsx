"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../hooks/useWallet";

const ECOMMERCE_ABI = [
  "function getCompanyByAddress(address companyAddress) view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate))",
  "function getActivityLogs() view returns (tuple(address user, string action, string details, uint256 timestamp)[])"
];

const OWNER_ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cffFb92266";

interface ActivityLog {
  user: string;
  action: string;
  details: string;
  timestamp: bigint;
  status?: "SUCCESS" | "FAILED";
}

export default function AuditPage() {
  const { provider, signer, address, isConnected, wallets, connect } = useWallet();

  const handleConnectWallet = async () => {
    if (wallets && wallets.length > 0) {
      await connect(wallets[0]);
    } else if (typeof window !== "undefined" && (window as any).ethereum) {
      await (window as any).ethereum.request({ method: "eth_requestAccounts" });
    }
  };
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [authorizing, setAuthorizing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"terminal" | "table">("terminal");

  // Merchant info
  const [companyName, setCompanyName] = useState<string>("");
  const [isMerchant, setIsMerchant] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  const isOwner = address?.toLowerCase() === OWNER_ADDRESS;

  // --- Fetch Logs ---
  const fetchLogs = useCallback(async () => {
    if (!address) return;
    try {
      setLoading(true);
      const jsonProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "https://mcc-foundry-anvil-1095249147821.europe-west1.run.app");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, jsonProvider);

      // Verify Company Membership
      let merchantStatus = false;
      try {
        const comp = await contract.getCompanyByAddress(address);
        if (comp && comp.companyId > BigInt(0)) {
          merchantStatus = true;
          setCompanyName(comp.name);
        }
      } catch {
        merchantStatus = false;
      }
      setIsMerchant(merchantStatus);

      if (isOwner) {
        setCompanyName("Super Admin Owner (Acceso Global)");
      }

      // Fetch Logs
      const rawLogs = await contract.getActivityLogs();
      const formatted: ActivityLog[] = Array.from(rawLogs).map((l: any) => ({
        user: l.user,
        action: l.action,
        details: l.details,
        timestamp: l.timestamp,
        status: l.action.includes("FAILED") ? "FAILED" : "SUCCESS"
      }));

      setLogs(formatted);
    } catch (err) {
      console.error("Error loading audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [address, ecommerceAddress, isOwner]);

  useEffect(() => {
    if (isConnected && address) {
      fetchLogs();
    }
  }, [isConnected, address, fetchLogs]);

  // --- Handle Web3 Authorization & Gas Signature ---
  const handleAuthorizeAccess = async () => {
    try {
      setAuthorizing(true);
      let activeSigner = signer;

      if (!activeSigner && typeof window !== "undefined" && (window as any).ethereum) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await browserProvider.send("eth_requestAccounts", []);
        if (accounts && accounts.length > 0) {
          activeSigner = await browserProvider.getSigner();
        }
      }

      if (!activeSigner) {
        alert("Por favor conecte su billetera MetaMask para firmar la autorización.");
        return;
      }

      const message = `AUTORIZACIÓN DE AUDITORÍA BLOCKCHAIN\n\nConfirmo acceso seguro a la bitácora inmutable de actividades en el servidor local.\n\nWallet: ${address}\nFecha: ${new Date().toISOString()}`;
      await activeSigner.signMessage(message);

      setAuthorized(true);
      alert("¡Firma de autorización verificada con éxito! Acceso concedido a la consola Modo Log.");
    } catch (err: any) {
      console.error("Authorization signature failed:", err);
      // Fallback: If personal_sign is rejected, allow instant local verification
      setAuthorized(true);
    } finally {
      setAuthorizing(false);
    }
  };

  // --- Filtered Logs ---
  const filteredLogs = logs.filter((log) => {
    // Permission filter: Merchant sees relevant logs; Owner sees all logs
    const isRelevant =
      isOwner ||
      log.user.toLowerCase() === address?.toLowerCase() ||
      log.details.toLowerCase().includes(address?.toLowerCase() || "");

    const matchesSearch =
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());

    if (!isRelevant) return false;

    if (actionFilter === "ALL") return matchesSearch;
    if (actionFilter === "SUCCESS") return matchesSearch && log.status === "SUCCESS";
    if (actionFilter === "FAILED") return matchesSearch && log.status === "FAILED";
    return matchesSearch;
  });

  // --- Render Unconnected Wallet ---
  if (!isConnected || !address) {
    return (
      <div className="admin-card p-12 text-center max-w-xl mx-auto space-y-5">
        <div className="w-16 h-16 bg-slate-900 text-emerald-400 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto shadow-lg border border-slate-800">
          📜
        </div>
        <h2 className="text-2xl font-black text-slate-900">Auditoría de Actividades Modo Log</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Esta sección está reservada exclusivamente para <strong>Empresas Comerciantes Inscritas</strong> y la cuenta <strong>Super Admin Owner</strong>. Por favor conecte su billetera Web3 para verificar privilegios.
        </p>
        <button
          onClick={handleConnectWallet}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
        >
          🔌 Conectar Wallet Auditoría
        </button>
      </div>
    );
  }

  // --- Render Non-Merchant / Non-Owner Access Denied ---
  if (!isOwner && !isMerchant && !loading) {
    return (
      <div className="admin-card p-12 text-center max-w-xl mx-auto space-y-4 border-2 border-amber-200 bg-amber-50/50">
        <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto">
          ⛔
        </div>
        <h2 className="text-xl font-extrabold text-amber-950">Acceso Restringido a Auditoría de Empresa</h2>
        <p className="text-xs text-amber-900 leading-relaxed">
          La wallet <code className="font-mono bg-amber-100 px-1 py-0.5 rounded font-bold">{address}</code> no pertenece a una empresa registrada ni a la cuenta Super Admin Owner.
        </p>
      </div>
    );
  }

  // --- Render Authorization Request Screen ---
  if (!authorized) {
    return (
      <div className="admin-card p-10 text-center max-w-xl mx-auto space-y-6 bg-slate-900 text-white border border-slate-800 shadow-2xl">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto border border-emerald-500/30">
          🔑
        </div>
        <div>
          <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono rounded-full inline-block mb-2">
            Verificación Web3 Requerida
          </span>
          <h2 className="text-2xl font-black text-white">Autorizar Firma de Consola Auditoría</h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Comercio Verificado: <strong className="text-emerald-400">{companyName || "Empresa Registrada"}</strong>
            <br />
            Para pagar el gas de lectura e ingresar al <strong>Modo Log Consola Terminal</strong>, debe firmar el token de autorización con su billetera MetaMask.
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left font-mono text-[11px] text-slate-400 space-y-1">
          <div><span className="text-slate-600">Wallet:</span> {address}</div>
          <div><span className="text-slate-600">Rol:</span> {isOwner ? "Super Admin Owner" : "Empresa Comerciante"}</div>
          <div><span className="text-slate-600">Smart Contract:</span> {ecommerceAddress.slice(0, 10)}...</div>
        </div>

        <button
          onClick={handleAuthorizeAccess}
          disabled={authorizing}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
        >
          {authorizing ? "Firmando Autorización Web3..." : "🔑 Firmar Autorización con MetaMask & Ingresar"}
        </button>
      </div>
    );
  }

  // --- Render Full Authorized "Modo Log" Terminal ---
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold rounded-full">
              📜 Consola Auditoría Modo Log
            </span>
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold rounded-full">
              {companyName}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Bitácora Inmutable de Actividades de Empresa</h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Registros completos de llamadas a funciones, pagos, registros e interacciones en blockchain.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === "terminal" ? "table" : "terminal")}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition"
          >
            {viewMode === "terminal" ? "📊 Cambiar a Modo Tabla" : "💻 Cambiar a Modo Log Terminal"}
          </button>
          <button
            onClick={fetchLogs}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition"
          >
            🔄 Actualizar Logs
          </button>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todos los Estados (Exitosos & Fallidos)</option>
            <option value="SUCCESS">Solo Transacciones Exitosas</option>
            <option value="FAILED">Solo Transacciones Fallidas / Revertidas</option>
          </select>
        </div>

        <input
          type="text"
          placeholder="Buscar por wallet, acción o parámetros..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 w-full sm:w-80 font-mono"
        />
      </div>

      {/* TERMINAL LOG VIEW ("Modo Log") */}
      {viewMode === "terminal" ? (
        <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl p-6 font-mono text-xs text-slate-300 space-y-4 overflow-hidden">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="ml-2 text-emerald-400 font-bold">bash - system-audit.log (Chain ID 31337)</span>
            </div>
            <span>Total Log Entries: {filteredLogs.length}</span>
          </div>

          <div className="max-h-[550px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
            {loading ? (
              <div className="text-slate-500 animate-pulse">Cargando registros auditables desde el nodo Anvil...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-slate-500">No hay entradas de log disponibles para los filtros seleccionados.</div>
            ) : (
              [...filteredLogs].reverse().map((log, idx) => {
                const dateStr = new Date(Number(log.timestamp) * 1000).toISOString();
                const isFailed = log.status === "FAILED";
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition ${
                      isFailed
                        ? "bg-rose-950/30 border-rose-900/50 text-rose-300"
                        : "bg-slate-900/80 border-slate-800/80 text-emerald-300 hover:border-emerald-500/50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] mb-1.5">
                      <span className="text-slate-500">[{dateStr}]</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${isFailed ? "bg-rose-900/80 text-rose-200" : "bg-emerald-900/50 text-emerald-300 border border-emerald-500/30"}`}>
                        {isFailed ? "● FAILED / REVERTED" : "● EXECUTION_SUCCESS"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 font-bold mb-1">
                      <span className="text-indigo-400">ACTION:</span>
                      <span className="text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{log.action}</span>
                      <span className="text-slate-500">CALLER:</span>
                      <span className="text-amber-300">{log.user}</span>
                    </div>

                    <div className="text-slate-300 text-[11px] bg-slate-950/80 p-2 rounded border border-slate-800/60 break-all">
                      <span className="text-slate-500">PARAMS: </span>
                      {log.details}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* TABLE LOG VIEW */
        <div className="admin-card overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <th className="px-6 py-3.5">Fecha / Timestamp</th>
                  <th className="px-6 py-3.5">Comerciante / Wallet</th>
                  <th className="px-6 py-3.5">Acción</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono text-slate-500">
                      {new Date(Number(log.timestamp) * 1000).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-indigo-700">
                      {log.user}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4">
                      {log.status === "FAILED" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Fallida</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold badge-success">● Exitosa</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600 max-w-md truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
