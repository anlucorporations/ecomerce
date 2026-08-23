'use client';

import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';

interface CompanyRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string | null;
  onSuccess?: () => void;
}

const ECOMMERCE_ABI = [
  "function registerCompanySelf(string _name, string _description, uint8 _businessType) payable returns (uint256)"
];

export function CompanyRegistrationModal({
  isOpen,
  onClose,
  userAddress,
  onSuccess
}: CompanyRegistrationModalProps) {
  const router = useRouter();
  const { signer, provider } = useWallet();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    description: '',
    businessType: 0 // 0: Venta de Productos, 1: Prestacion de Servicios
  });
  const [submitting, setSubmitting] = useState(false);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  if (!isOpen || !userAddress) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.description.trim()) {
      alert("⚠️ El nombre comercial, correo electrónico de contacto y la descripción de la empresa son ESTRICTAMENTE OBLIGATORIOS.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Ensure active signer and network
      let activeSigner = signer;
      let activeProvider = provider;

      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        activeProvider = browserProvider;
        try {
          const network = await browserProvider.getNetwork();
          const currentChainId = Number(network.chainId);
          
          // Switch to Local Anvil if not on 31337
          if (currentChainId !== 31337) {
            try {
              await (window as any).ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x7a69' }] // 31337 in hex
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
        alert("Por favor instale o desbloquee su extensión MetaMask para proceder con la inscripción.");
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

      // Check duplicate entity on-chain
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
      const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
      const checkContract = new ethers.Contract(ecommerceAddress, [
        "function getEntityType(address account) view returns (uint8)",
        "function getAllCustomers() view returns (tuple(address customerAddress, string name, string contactEmail, string shippingAddress, uint256 totalPurchases, uint256 totalSpent, uint256 registrationDate, uint256 lastPurchaseDate, bool isActive)[])",
        "function getCompanyByAddress(address _address) view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate))"
      ], rpcProvider);

      let eTypeNum = 0;
      try {
        eTypeNum = Number(await checkContract.getEntityType(signerAddress));
      } catch (err) {
        console.warn("Could not check entity type on-chain:", err);
      }

      if (eTypeNum === 2) {
        alert("⚠️ Esta billetera ya se encuentra registrada como Cliente/Usuario en la plataforma. La inscripción de una Empresa requiere una billetera no inscrita.");
        setSubmitting(false);
        return;
      }

      if (eTypeNum === 1) {
        alert("ℹ️ Esta billetera ya se encuentra registrada como Empresa Comercial en la blockchain.");
        if (onSuccess) onSuccess();
        onClose();
        return;
      }

      // Check duplicate email
      try {
        const allCustomers = await checkContract.getAllCustomers();
        const inputEmailLower = formData.email.trim().toLowerCase();
        const existingCust = Array.from(allCustomers).find((c: any) => 
          c.contactEmail && 
          c.contactEmail.trim().toLowerCase() === inputEmailLower
        );

        if (existingCust) {
          alert(`⚠️ El correo electrónico "${formData.email}" ya se encuentra registrado en la plataforma por otro usuario. No se permiten correos duplicados.`);
          setSubmitting(false);
          return;
        }
      } catch (err) {
        console.warn("Could not check duplicate email on-chain:", err);
      }

      // Send on-chain registration transaction
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, activeSigner);
      
      const tx = await contract.registerCompanySelf(
        formData.name.trim(),
        formData.description.trim(),
        formData.businessType,
        { value: feeAmount }
      );

      console.log("Transacción de inscripción enviada a la blockchain:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transacción confirmada on-chain en bloque:", receipt.blockNumber);

      if (receipt.status !== 1) {
        throw new Error("La transacción on-chain fue revertida por la EVM.");
      }

      // Retrieve registered company on-chain data
      let registeredId = Date.now().toString();
      try {
        const regComp = await checkContract.getCompanyByAddress(signerAddress);
        if (regComp && regComp.companyId) {
          registeredId = regComp.companyId.toString();
        }
      } catch (e) {
        console.warn("Could not read back company data:", e);
      }

      // Local persistence for instant UI reflection
      const newCompany = {
        companyId: registeredId,
        address: signerAddress,
        name: formData.name.trim(),
        email: formData.email.trim(),
        description: formData.description.trim(),
        businessType: formData.businessType,
        registrationDate: Math.floor(Date.now() / 1000)
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(`company_reg_${signerAddress.toLowerCase()}`, JSON.stringify(newCompany));
      }

      alert(`✅ ¡Empresa "${formData.name}" inscrita exitosamente en la Blockchain!\n\nID Asignado: #${registeredId}\nTasa de 3.0 ETH transferida al Administrador.\nTx Hash: ${tx.hash}`);

      if (onSuccess) onSuccess();
      onClose();
      router.refresh();

    } catch (error: any) {
      console.error("Error en inscripción de empresa:", error);
      const errorMsg = error?.reason || error?.shortMessage || error?.message || "Transacción cancelada o fallida";
      alert("⚠️ Error en la inscripción on-chain: " + errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white max-w-lg w-full p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 relative border-l-4 border-l-indigo-600">
        
        {/* Header */}
        <div className="space-y-2 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold font-poppins">
            <span>🏢 BARLO-VENTAS &bull; Inscripción de Empresa Comercial</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Inscripción Obligatoria de Empresa
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Su billetera <span className="font-mono text-indigo-600 font-bold">{userAddress.slice(0, 6)}...{userAddress.slice(-4)}</span> está conectada, pero debe inscribir los datos comerciales de su Empresa en la Blockchain para acceder a la Consola de Administración.
          </p>
        </div>

        {/* Depósito Alert Badge */}
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <div>
              <span className="font-bold text-amber-800 block">Registro Comercial Web3</span>
              <span className="text-[11px] text-amber-700">Verificación de entidad vendedora:</span>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-500 text-white font-black text-xs rounded-xl font-mono shadow-xs">
            3.0 ETH
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Nombre Comercial / Razón Social *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej. TechMarket Iberia S.L."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Correo Electrónico Institucional / Contacto *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Ej. contacto@techmarket.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Descripción de la Empresa / Actividad Comercial *
            </label>
            <textarea
              required
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ej. Distribuidora especializada en dispositivos electrónicos y hardware corporativo"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Tipo de Negocio Comercial *
            </label>
            <select
              value={formData.businessType}
              onChange={(e) => setFormData({ ...formData, businessType: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none transition"
            >
              <option value={0}>🛒 Venta y Distribución de Productos</option>
              <option value={1}>🛠️ Prestación de Servicios Profesionales</option>
            </select>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 uppercase tracking-wider disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {submitting ? 'Inscribiendo Empresa en Blockchain...' : '✍️ Inscribir Empresa en Blockchain'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
