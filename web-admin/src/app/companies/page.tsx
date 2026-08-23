"use client";

import { useState, useEffect } from "react";
import { useWallet } from "../../hooks/useWallet";
import { useContract } from "../../hooks/useContract";
import { ethers } from "ethers";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Company {
  companyId: bigint;
  companyAddress: string;
  name: string;
  description: string;
  businessType: number; // 0: ProductSales, 1: ServiceProvision
  isActive: boolean;
  registrationDate: bigint;
}

const ECOMMERCE_ABI = [
  "function registerCompanySelf(string _name, string _description, uint8 _businessType) payable returns (uint256)",
  "function getAllCompanies() view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate)[])",
  "function getCompanyByAddress(address _address) view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate))"
];

const BUSINESS_TYPE_LABELS = ["Venta / Distribución de Productos", "Prestación de Servicios"];

export default function CompaniesPage() {
  const router = useRouter();
  const { provider, signer, chainId, isConnected, address } = useWallet();
  const ecommerce = useContract("ecommerce", provider, signer, chainId);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [userCompany, setUserCompany] = useState<Company | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const isOwner = address?.toLowerCase() === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    businessType: 0, // 0: ProductSales, 1: ServiceProvision
  });

  const loadCompaniesData = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const jsonProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, jsonProvider);

      // 1. Fetch companies
      try {
        const allComp = await contract.getAllCompanies();
        setCompanies(allComp ? Array.from(allComp) : []);
      } catch (compErr) {
        console.warn("[web-admin] No se pudieron decodificar las empresas del contrato:", compErr);
        setCompanies([]);
      }

      // 2. Check company registration status
      try {
        const comp = await contract.getCompanyByAddress(address);
        if (comp && comp.companyId > BigInt(0)) {
          setUserCompany(comp);
          setIsRegistered(true);
          return;
        }
      } catch {
        // Not registered on-chain
      }

      setUserCompany(null);
      setIsRegistered(false);

    } catch (error) {
      console.warn("Failed to load companies:", error);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompaniesData();
  }, [provider, address]);

  // Self Registration paying 3 ETH fee
  const handleSelfRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let activeSigner = signer;

      // Ensure active signer and network
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        try {
          const network = await browserProvider.getNetwork();
          const currentChainId = Number(network.chainId);
          
          if (currentChainId !== 31337) {
            try {
              await (window as any).ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x7a69' }]
              });
            } catch (switchErr: any) {
              if (switchErr.code === 4902) {
                await (window as any).ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: '0x7a69',
                    chainName: 'Anvil Localhost 8545',
                    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                    rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545']
                  }]
                });
              }
            }
          }
          activeSigner = await browserProvider.getSigner();
        } catch (netErr) {
          console.warn("Network check error:", netErr);
        }
      }

      if (!activeSigner) {
        alert("Por favor instale o desbloquee su extensión MetaMask para proceder.");
        setSubmitting(false);
        return;
      }

      const signerAddress = await activeSigner.getAddress();
      const currentBalance = await activeSigner.provider.getBalance(signerAddress);
      const feeAmount = ethers.parseEther("3.0");

      if (currentBalance < feeAmount) {
        const ethBalStr = ethers.formatEther(currentBalance);
        alert(`⚠️ Saldo ETH insuficiente: La inscripción de una nueva empresa requiere una tasa obligatoria de 3.0 ETH en la blockchain.\n\nTu saldo actual es: ${ethBalStr} ETH.\n\nPor favor recarga tu cuenta con al menos 3.0 ETH para completar el registro.`);
        setSubmitting(false);
        return;
      }

      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, activeSigner);

      const tx = await contract.registerCompanySelf(
        formData.name.trim(),
        formData.description.trim(),
        formData.businessType,
        { value: feeAmount }
      );

      console.log("Transacción de inscripción enviada:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transacción confirmada en bloque:", receipt.blockNumber);

      if (receipt.status !== 1) {
        throw new Error("La transacción on-chain fue revertida por la EVM.");
      }

      // Read back on-chain registered company
      const jsonProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");
      const readContract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, jsonProvider);
      let registeredComp: Company;

      try {
        const onChainComp = await readContract.getCompanyByAddress(signerAddress);
        registeredComp = {
          companyId: onChainComp.companyId,
          companyAddress: onChainComp.companyAddress,
          name: onChainComp.name,
          description: onChainComp.description,
          businessType: Number(onChainComp.businessType),
          isActive: onChainComp.isActive,
          registrationDate: onChainComp.registrationDate
        };
      } catch {
        registeredComp = {
          companyId: BigInt(Date.now()),
          companyAddress: signerAddress,
          name: formData.name.trim(),
          description: formData.description.trim(),
          businessType: formData.businessType,
          isActive: true,
          registrationDate: BigInt(Math.floor(Date.now() / 1000)),
        };
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(`company_reg_${signerAddress.toLowerCase()}`, JSON.stringify(registeredComp, (_, v) => typeof v === 'bigint' ? v.toString() : v));
      }

      setUserCompany(registeredComp);
      setIsRegistered(true);

      alert(`✅ ¡Inscripción exitosa!\n\nSu empresa "${formData.name}" ha sido registrada on-chain con ID #${registeredComp.companyId.toString()}.\nTasa de 3.0 ETH transferida al Administrador.\nRedirigiendo al Dashboard...`);
      await loadCompaniesData();
      router.push("/");
    } catch (error: any) {
      console.error("Failed to register company:", error);
      const errorMsg = error?.reason || error?.shortMessage || error?.message || "Transacción cancelada o fallida";
      alert("⚠️ Error en la inscripción on-chain: " + errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Not connected view
  if (!isConnected || !address) {
    return (
      <div className="admin-card p-12 text-center max-w-xl mx-auto space-y-4 my-8 bg-white border border-slate-200 shadow-xl rounded-3xl">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto border border-indigo-200">
          🏢
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 font-poppins">Inscripción y Gestión de Empresas</h2>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          Conecte su billetera Web3 para inscribir una nueva empresa comercial o gestionar su comercio registrado.
        </p>
      </div>
    );
  }

  // 2. UNREGISTERED WALLET: SHOW FULL DEDICATED REGISTRATION FORM
  if (!isRegistered && !isOwner) {
    return (
      <div className="max-w-3xl mx-auto my-6 space-y-6">
        <div className="admin-card p-8 bg-white border-2 border-indigo-200 shadow-2xl rounded-3xl space-y-6 relative overflow-hidden">
          {/* Top Decorative Banner */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800" />

          <div className="border-b border-slate-100 pb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-poppins mb-3">
              <span>⚠️ Billetera No Inscrita &bull; Proceso de Registro</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-poppins tracking-tight">
              Inscripción Oficial de Empresa Comercial
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Complete los datos de su empresa en el siguiente formulario. La inscripción registrará su comercio de forma inmutable en el Smart Contract y transferirá la tasa oficial obligatoria de <strong className="text-indigo-600 font-bold">3.0 ETH</strong> al Administrador.
            </p>
          </div>

          {/* Connected Wallet Info */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Billetera a Vincular:</span>
              <span className="font-mono font-black text-xs sm:text-sm text-indigo-700 break-all">{address}</span>
            </div>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 font-bold text-xs rounded-xl border border-indigo-200 whitespace-nowrap">
              Tasa: 3.0 ETH
            </span>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSelfRegister} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-extrabold text-slate-800 mb-1.5">
                  Razón Social / Nombre Comercial *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Distribuidora Barlovento S.L."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-800 mb-1.5">
                  Tipo de Actividad Comercial *
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: parseInt(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                >
                  <option value={0}>🛒 Venta / Distribución de Productos Físicos</option>
                  <option value={1}>🛠️ Prestación de Servicios</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-extrabold text-slate-800 mb-1.5">
                Descripción Detallada de la Empresa *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describa el giro comercial, tipos de productos que venderá y condiciones de atención..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                rows={3}
                required
              />
            </div>

            {/* Fee Confirmation Box */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-2xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                  <span>💳</span> Pago On-Chain de Tasa de Registro
                </span>
                <span className="font-mono font-black text-amber-900 text-sm">3.00 ETH</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Al hacer clic en el botón inferior, MetaMask le solicitará firmar y aprobar la transferencia de 3.0 ETH on-chain para dar de alta su comercio en la Blockchain.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:opacity-95 text-white font-black text-sm rounded-2xl shadow-xl transition disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer font-poppins"
            >
              {submitting ? (
                <>
                  <span className="animate-spin text-lg">⏳</span>
                  <span>Firmando y Confirmando Transacción On-Chain en MetaMask...</span>
                </>
              ) : (
                <span>💳 Confirmar Inscripción y Pagar Tasa (3.0 ETH) →</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. REGISTERED MERCHANT VIEW
  if (isRegistered && !isOwner) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                ✅ Empresa Comercial Registrada &bull; ID #{userCompany?.companyId.toString()}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                {BUSINESS_TYPE_LABELS[userCompany?.businessType || 0]}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-poppins">
              {userCompany?.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">{userCompany?.description}</p>
            <p className="text-[11px] text-slate-400 font-mono mt-2">Wallet: {address}</p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/inventory"
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 font-poppins"
            >
              📦 Gestionar Mi Catálogo
            </Link>
            <Link
              href="/"
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2 font-poppins"
            >
              📊 Ver Mi Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. SUPER OWNER VIEW (Directory of all companies)
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30 text-xs font-bold mb-2">
            <span>⚡ Super Admin Owner</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-poppins">
            Directorio General de Comercios
          </h1>
          <p className="text-xs text-purple-200 mt-1">
            Gestión global de todas las empresas y comercios registrados en el Smart Contract.
          </p>
        </div>
        <span className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl text-sm font-black border border-white/20">
          Total Empresas: {companies.length}
        </span>
      </div>

      {/* Table of Companies */}
      <div className="admin-card overflow-hidden bg-white border border-slate-200 shadow-xl rounded-3xl">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-sm text-slate-900 font-poppins">Listado de Empresas On-Chain</h3>
          <button
            onClick={loadCompaniesData}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            🔄 Actualizar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider font-poppins">
                <th className="px-6 py-3.5">ID</th>
                <th className="px-6 py-3.5">Nombre Comercial</th>
                <th className="px-6 py-3.5">Tipo</th>
                <th className="px-6 py-3.5">Billetera</th>
                <th className="px-6 py-3.5">Fecha Alta</th>
                <th className="px-6 py-3.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Cargando lista de empresas...
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No hay empresas inscritas aún.
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.companyId.toString()} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                      #{company.companyId.toString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 font-poppins">
                      {company.name}
                      <span className="block text-[11px] font-normal text-slate-400 truncate max-w-xs">{company.description}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {BUSINESS_TYPE_LABELS[Number(company.businessType)] || "Productos"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {company.companyAddress.slice(0, 8)}...{company.companyAddress.slice(-6)}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500 text-[11px]">
                      {new Date(Number(company.registrationDate) * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        company.isActive ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}>
                        {company.isActive ? "🟢 Activa" : "🟡 Inactiva"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
