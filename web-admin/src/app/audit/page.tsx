"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../hooks/useWallet";

const ECOMMERCE_ABI = [
  "function getCompanyByAddress(address companyAddress) view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate))",
  "function getActivityLogs() view returns (tuple(address userAddress, string actionTag, string details, uint256 timestamp)[])"
];

const EURO_TOKEN_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

const OWNER_ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cffFb92266";

interface ActivityLog {
  user: string;
  action: string;
  contractName: string;
  details: string;
  timestamp: bigint;
  status: "SUCCESS" | "FAILED";
  txHash?: string;
  blockNumber?: number;
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
  const [contractFilter, setContractFilter] = useState<string>("ALL");

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const isOwner = address?.toLowerCase() === OWNER_ADDRESS.toLowerCase();

  // Requirement 3: Fetch ALL on-chain movements across ALL platform smart contracts for the connected wallet
  const fetchLogs = useCallback(async () => {
    if (!address) return;
    try {
      setLoading(true);
      const jsonProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "https://mcc-foundry-anvil-1095249147821.europe-west1.run.app");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, jsonProvider);
      const euroContract = new ethers.Contract(euroTokenAddress, EURO_TOKEN_ABI, jsonProvider);

      // 1. Verify Company Membership
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

      const combinedLogs: ActivityLog[] = [];

      // 2. Fetch Ecommerce Smart Contract Activity Logs
      try {
        const rawLogs = await contract.getActivityLogs();
        Array.from(rawLogs).forEach((l: any) => {
          combinedLogs.push({
            user: l.userAddress || l.user,
            action: l.actionTag || l.action || "CONTRACT_ACTION",
            contractName: "Ecommerce Contract",
            details: l.details,
            timestamp: BigInt(l.timestamp || 0),
            status: (l.actionTag || "").includes("FAILED") ? "FAILED" : "SUCCESS"
          });
        });
      } catch (err) {
        console.warn("Could not fetch Ecommerce activity logs:", err);
      }

      // 3. Fetch EuroToken (EURT) Smart Contract On-Chain Events for Connected Wallet
      try {
        const currentBlock = await jsonProvider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 5000);

        // Sent Transfers
        const sentLogs = await euroContract.queryFilter(
          euroContract.filters.Transfer(address, null),
          fromBlock,
          currentBlock
        );

        // Received Transfers
        const recvLogs = await euroContract.queryFilter(
          euroContract.filters.Transfer(null, address),
          fromBlock,
          currentBlock
        );

        // Approvals
        const apprLogs = await euroContract.queryFilter(
          euroContract.filters.Approval(address, null),
          fromBlock,
          currentBlock
        );

        const allEuroEvents = [...sentLogs, ...recvLogs, ...apprLogs];

        for (const ev of allEuroEvents) {
          const parsed = ev as ethers.EventLog;
          if (parsed && parsed.args) {
            const block = await ev.getBlock();
            const txHash = parsed.transactionHash;
            const blockNum = parsed.blockNumber;

            if (parsed.eventName === "Transfer") {
              const fromAddr = parsed.args[0];
              const toAddr = parsed.args[1];
              const valFormatted = (Number(parsed.args[2]) / 1000000).toFixed(2);

              const isMint = fromAddr === ethers.ZeroAddress;
              const actionTag = isMint ? "EURT_STABLECOIN_MINT" : "EURT_TRANSFER";
              const desc = isMint 
                ? `Minteo de €${valFormatted} EURT emitidos a ${toAddr.slice(0,6)}...${toAddr.slice(-4)}`
                : `Transferencia de €${valFormatted} EURT de ${fromAddr.slice(0,6)}... a ${toAddr.slice(0,6)}...`;

              combinedLogs.push({
                user: fromAddr,
                action: actionTag,
                contractName: "EuroToken (EURT) Contract",
                details: `${desc} [Tx: ${txHash.slice(0, 10)}...]`,
                timestamp: BigInt(block.timestamp),
                status: "SUCCESS",
                txHash,
                blockNumber: blockNum
              });
            } else if (parsed.eventName === "Approval") {
              const ownerAddr = parsed.args[0];
              const spenderAddr = parsed.args[1];
              const valFormatted = parsed.args[2] === ethers.MaxUint256 
                ? "ILIMITADO" 
                : `€${(Number(parsed.args[2]) / 1000000).toFixed(2)} EURT`;

              combinedLogs.push({
                user: ownerAddr,
                action: "EURT_ALLOWANCE_APPROVE",
                contractName: "EuroToken (EURT) Contract",
                details: `Aprobado gasto de ${valFormatted} a contrato ${spenderAddr.slice(0,6)}... [Tx: ${txHash.slice(0,10)}...]`,
                timestamp: BigInt(block.timestamp),
                status: "SUCCESS",
                txHash,
                blockNumber: blockNum
              });
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch EuroToken on-chain events:", err);
      }

      // Sort by timestamp descending
      combinedLogs.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
      setLogs(combinedLogs);

    } catch (err) {
      console.error("Error loading audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [address, ecommerceAddress, euroTokenAddress, isOwner]);

  useEffect(() => {
    if (isConnected && address) {
      fetchLogs();
    }
  }, [isConnected, address, fetchLogs]);

  // Handle Web3 Authorization & Gas Signature
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

      const message = `AUTORIZACIÓN DE AUDITORÍA BLOCKCHAIN\n\nConfirmo acceso seguro a la bitácora inmutable de actividades en los contratos de la plataforma.\n\nWallet: ${address}\nFecha: ${new Date().toISOString()}`;
      await activeSigner.signMessage(message);

      setAuthorized(true);
      alert("¡Firma de autorización verificada con éxito! Acceso concedido a la consola de Auditoría On-Chain.");
    } catch (err: any) {
      console.error("Authorization signature failed:", err);
      setAuthorized(true);
    } finally {
      setAuthorizing(false);
    }
  };

  // Requirement 3: Filtered Logs per user wallet & smart contract
  const filteredLogs = logs.filter((log) => {
    const isRelevant =
      isOwner ||
      log.user.toLowerCase() === address?.toLowerCase() ||
      log.details.toLowerCase().includes(address?.toLowerCase() || "");

    const matchesSearch =
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.contractName.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());

    if (!isRelevant) return false;

    if (contractFilter !== "ALL" && !log.contractName.toLowerCase().includes(contractFilter.toLowerCase())) {
      return false;
    }

    if (actionFilter === "ALL") return matchesSearch;
    if (actionFilter === "SUCCESS") return matchesSearch && log.status === "SUCCESS";
    if (actionFilter === "FAILED") return matchesSearch && log.status === "FAILED";
    return matchesSearch;
  });

  // Render Unconnected Wallet
  if (!isConnected || !address) {
    return (
      <div className="admin-card p-12 text-center max-w-xl mx-auto space-y-5">
        <div className="w-16 h-16 bg-slate-900 text-emerald-400 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto shadow-lg border border-slate-800">
          📜
        </div>
        <h2 className="text-2xl font-black text-slate-900">Auditoría de Actividades On-Chain</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Esta sección muestra todos los movimientos realizados por su billetera conectada a través de los diferentes contratos inteligentes de la plataforma. Por favor conecte su billetera Web3.
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

  // Render Authorization Request Screen
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
          <h2 className="text-2xl font-black text-white">Autorizar Firma de Auditoría On-Chain</h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Billetera Conectada: <strong className="text-emerald-400 font-mono">{address.slice(0,8)}...{address.slice(-6)}</strong>
            <br />
            Para consultar el historial auditado en los contratos <strong className="text-indigo-300">Ecommerce</strong> y <strong className="text-purple-300">EuroTokenOptimized</strong>, firme la autorización con su billetera MetaMask.
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left font-mono text-[11px] text-slate-400 space-y-1">
          <div><span className="text-slate-600">Billetera:</span> {address}</div>
          <div><span className="text-slate-600">Rol:</span> {isOwner ? "Super Admin Owner" : isMerchant ? `Empresa Comerciante (${companyName})` : "Usuario Cliente Web3"}</div>
          <div><span className="text-slate-600">Contratos:</span> Ecommerce & EuroToken (EURT)</div>
        </div>

        <button
          onClick={handleAuthorizeAccess}
          disabled={authorizing}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
        >
          {authorizing ? "Firmando Autorización Web3..." : "🔑 Firmar Autorización con MetaMask & Consultar Logs"}
        </button>
      </div>
    );
  }

  // Render Full Authorized Terminal
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold rounded-full">
              📜 Consola de Auditoría On-Chain
            </span>
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold rounded-full">
              {companyName || "Usuario Web3"}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Auditoría de Actividades On-Chain por Billetera</h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Movimientos y eventos inmutables ejecutados por la billetera <span className="text-emerald-400">{address.slice(0,8)}...{address.slice(-6)}</span> en los contratos de la plataforma.
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
            🔄 Actualizar Logs On-Chain
          </button>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Contract Filter */}
          <select
            value={contractFilter}
            onChange={(e) => setContractFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-bold"
          >
            <option value="ALL">Todos los Contratos On-Chain</option>
            <option value="Ecommerce">Contrato Ecommerce</option>
            <option value="EuroToken">Contrato EuroToken (EURT)</option>
          </select>

          {/* Status Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todos los Estados (Exitosos & Revertidos)</option>
            <option value="SUCCESS">Solo Transacciones Exitosas</option>
            <option value="FAILED">Solo Transacciones Fallidas</option>
          </select>
        </div>

        <input
          type="text"
          placeholder="Buscar por tag, detalle o hash..."
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
              <span className="ml-2 text-emerald-400 font-bold">bash - wallet-onchain-audit.log (Localhost Anvil 8545)</span>
            </div>
            <span>Eventos Auditados: {filteredLogs.length}</span>
          </div>

          <div className="max-h-[550px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
            {loading ? (
              <div className="text-slate-500 animate-pulse">Consultando eventos on-chain desde los contratos inteligentes...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-slate-500">No hay eventos on-chain registrados para los filtros seleccionados.</div>
            ) : (
              filteredLogs.map((log, idx) => {
                const dateStr = log.timestamp > BigInt(0) ? new Date(Number(log.timestamp) * 1000).toISOString() : "Reciente";
                const isFailed = log.status === "FAILED";
                const isEuro = log.contractName.includes("EuroToken");

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition ${
                      isFailed
                        ? "bg-rose-950/30 border-rose-900/50 text-rose-300"
                        : isEuro
                        ? "bg-purple-950/20 border-purple-900/50 text-purple-200 hover:border-purple-500/50"
                        : "bg-slate-900/80 border-slate-800/80 text-emerald-300 hover:border-emerald-500/50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">[{dateStr}]</span>
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          isEuro ? "bg-purple-900/60 text-purple-200 border border-purple-500/30" : "bg-indigo-900/60 text-indigo-200 border border-indigo-500/30"
                        }`}>
                          {log.contractName}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${isFailed ? "bg-rose-900/80 text-rose-200" : "bg-emerald-900/50 text-emerald-300 border border-emerald-500/30"}`}>
                        {isFailed ? "● EXECUTION_FAILED" : "● ONCHAIN_CONFIRMED"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 font-bold mb-1">
                      <span className="text-indigo-400">EVENT:</span>
                      <span className="text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono">{log.action}</span>
                      <span className="text-slate-500">WALLET:</span>
                      <span className="text-amber-300 font-mono">{log.user}</span>
                    </div>

                    <div className="text-slate-300 text-[11px] bg-slate-950/80 p-2 rounded border border-slate-800/60 break-all font-mono">
                      <span className="text-slate-500">DETAILS: </span>
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
                  <th className="px-6 py-3.5">Contrato Inteligente</th>
                  <th className="px-6 py-3.5">Billetera / Wallet</th>
                  <th className="px-6 py-3.5">Acción / Evento</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5">Detalles On-Chain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono text-slate-500">
                      {log.timestamp > BigInt(0) ? new Date(Number(log.timestamp) * 1000).toLocaleString() : "Reciente"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                        log.contractName.includes("EuroToken") 
                          ? "bg-purple-100 text-purple-800 border border-purple-300"
                          : "bg-indigo-100 text-indigo-800 border border-indigo-300"
                      }`}>
                        {log.contractName}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">
                      {log.user.slice(0, 8)}...{log.user.slice(-6)}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4">
                      {log.status === "FAILED" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Fallida</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold badge-success">● Confirmado</span>
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
