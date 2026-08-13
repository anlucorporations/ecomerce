"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../hooks/useWallet";

const ECOMMERCE_ABI = [
  "function getActivityLogs() view returns (tuple(address user, string action, string details, uint256 timestamp)[])"
];

interface ActivityLog {
  user: string;
  action: string;
  details: string;
  timestamp: bigint;
}

export default function AuditPage() {
  const { provider, signer } = useWallet();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const jsonProvider = new ethers.JsonRpcProvider("http://localhost:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, jsonProvider);

      const auditLogs = await contract.getActivityLogs();
      setLogs(auditLogs);
    } catch (err) {
      console.error("Failed to load activity audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [signer]);

  const filteredLogs = logs.filter(
    (log) =>
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registro General de Actividad & Auditoría</h1>
          <p className="text-xs text-slate-500 mt-1">Bitácora inmutable de eventos e interacciones de comerciantes grabados en blockchain</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por wallet o acción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 w-64"
          />
          <button
            onClick={fetchLogs}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="admin-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
          <span className="font-bold text-slate-700">Historial Inmutable de Auditoría</span>
          <span className="text-slate-500 font-mono">Total Registros: {filteredLogs.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="px-6 py-3.5">Fecha y Hora</th>
                <th className="px-6 py-3.5">Comerciante / Usuario</th>
                <th className="px-6 py-3.5">Acción Ejecutada</th>
                <th className="px-6 py-3.5">Detalles / Parámetros</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    Cargando bitácora de auditoría...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    No hay registros de auditoría almacenados aún.
                  </td>
                </tr>
              ) : (
                [...filteredLogs].reverse().map((log, idx) => {
                  const dateStr = new Date(Number(log.timestamp) * 1000).toLocaleString();
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono text-slate-500 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        {log.user.slice(0, 8)}...{log.user.slice(-6)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
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
    </div>
  );
}
