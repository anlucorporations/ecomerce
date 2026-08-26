'use client';

import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { detectWallets } from '../lib/wallet/provider';
import { ANVIL_GCP_NETWORK } from '../lib/demo/network';
import { DEMO_ACCOUNTS, isDemoModeEnabled } from '../lib/demo/accounts';

interface WalletAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletAssistant({ isOpen, onClose }: WalletAssistantProps) {
  const { address, isConnected, chainId, connect } = useWallet();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedAccountIndex, setSelectedAccountIndex] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedRpc, setCopiedRpc] = useState<boolean>(false);
  const [networkStatus, setNetworkStatus] = useState<string | null>(null);
  const [isAddingNetwork, setIsAddingNetwork] = useState<boolean>(false);

  if (!isOpen) return null;

  const demoMode = isDemoModeEnabled();
  const activeAccount = DEMO_ACCOUNTS[selectedAccountIndex] || DEMO_ACCOUNTS[0];

  // Conectar wallet detectada (web-admin exige walletInfo de mipd)
  const handleConnect = async () => {
    try {
      const detected = await detectWallets();
      if (detected.length === 0) {
        alert('No se detectó ninguna billetera Web3. Instale MetaMask o Rabby.');
        return;
      }
      await connect(detected[0]);
    } catch (e: any) {
      console.warn('Error conectando wallet:', e);
    }
  };

  const handleAddNetwork = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setNetworkStatus('⚠️ No se detectó billetera Web3 (MetaMask/Trust). Ábrelo desde el navegador in-app de tu wallet móvil o extensión.');
      return;
    }

    try {
      setIsAddingNetwork(true);
      setNetworkStatus(null);

      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: ANVIL_GCP_NETWORK.chainIdHex,
            chainName: ANVIL_GCP_NETWORK.chainName,
            rpcUrls: [ANVIL_GCP_NETWORK.rpcUrl],
            nativeCurrency: ANVIL_GCP_NETWORK.nativeCurrency,
          },
        ],
      });

      setNetworkStatus('✅ ¡Red BARLO-VENTAS GCP agregada y seleccionada correctamente!');
    } catch (err: unknown) {
      const error = err as { message?: string; code?: number };
      console.warn('Error adding network:', error);
      if (error?.code === 4001) {
        setNetworkStatus('❌ Solicitud cancelada por el usuario en la billetera.');
      } else {
        setNetworkStatus(`⚠️ ${error?.message || 'Error al agregar la red. Puedes configurarla manualmente.'}`);
      }
    } finally {
      setIsAddingNetwork(false);
    }
  };

  const copyToClipboard = (text: string, type: 'key' | 'rpc') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } else {
      setCopiedRpc(true);
      setTimeout(() => setCopiedRpc(false), 2500);
    }
  };

  const steps = [
    { number: 1, title: 'Obtener Wallet', icon: '📱' },
    { number: 2, title: 'Red GCP Anvil', icon: '🌐' },
    { number: 3, title: 'Cuenta Demo', icon: '🔑' },
    { number: 4, title: 'Conectar Admin', icon: '⚡' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#0077BB]/20 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0077BB] via-[#005F96] to-[#FF8800] p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              🤖
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black font-poppins tracking-tight">
                Asistente Virtual Web3 — Consola Admin
              </h2>
              <p className="text-xs text-white/90 font-medium">
                Guía de configuración para Empresas, Vendedores y Administradores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar asistente"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 flex items-center justify-center text-white font-bold transition text-lg"
          >
            ✕
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 shrink-0">
          <div className="grid grid-cols-4 gap-2">
            {steps.map((step) => {
              const isActive = currentStep === step.number;
              const isDone = currentStep > step.number;
              return (
                <button
                  key={step.number}
                  onClick={() => setCurrentStep(step.number)}
                  className={`flex flex-col items-center p-1.5 sm:p-2 rounded-xl transition text-center ${
                    isActive
                      ? 'bg-white shadow-sm border border-[#0077BB]/30 text-[#0077BB]'
                      : isDone
                      ? 'text-emerald-700 hover:bg-white/60'
                      : 'text-slate-400 hover:bg-white/40'
                  }`}
                >
                  <div className="flex items-center gap-1 text-xs font-bold font-poppins">
                    <span>{isDone ? '✓' : step.icon}</span>
                    <span className="hidden sm:inline">Paso {step.number}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold truncate w-full">
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body / Step Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* STEP 1: Obtener Billetera */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="bg-[#E6F4FA] border border-[#0077BB]/20 rounded-2xl p-4 text-xs text-[#005F96] space-y-1">
                <p className="font-bold text-sm text-[#0077BB]">1. Billeteras Web3 para Gestión Administrativa</p>
                <p>
                  Para gestionar inventarios, registrar despachos con número de guía o auditar contratos, necesitas conectar una billetera EVM autorizada.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded-2xl p-3.5 hover:border-amber-400 transition bg-white space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🦊</span>
                    <div>
                      <h4 className="font-black text-xs text-slate-800 font-poppins">MetaMask</h4>
                      <span className="text-[10px] text-slate-500">Extensión Chrome & App Móvil</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Recomendada para administradores y comercios.
                  </p>
                  <div className="flex gap-1.5 pt-1">
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition"
                    >
                      Descargar
                    </a>
                    <a
                      href="https://metamask.app.link/dapp/mcc-web-admin-1095249147821.europe-west1.run.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-lg transition"
                    >
                      Deep Link Admin
                    </a>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl p-3.5 hover:border-blue-400 transition bg-white space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🛡️</span>
                    <div>
                      <h4 className="font-black text-xs text-slate-800 font-poppins">Trust Wallet</h4>
                      <span className="text-[10px] text-slate-500">Móvil & Extensión</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Soporte para múltiples redes EVM y firmas instantáneas.
                  </p>
                  <div className="flex gap-1.5 pt-1">
                    <a
                      href="https://trustwallet.com/download"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg transition"
                    >
                      Descargar Trust Wallet
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Agregar Red Anvil GCP */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="bg-[#EAF5EF] border border-[#2E8B57]/30 rounded-2xl p-4 text-xs text-emerald-900 space-y-1">
                <p className="font-bold text-sm text-[#2E8B57]">2. Conexión al Nodo Blockchain de Google Cloud</p>
                <p>
                  Sincroniza tu billetera con el nodo Anvil GCP donde residen los contratos de empresas, inventario y finanzas.
                </p>
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Red</span>
                    <span className="font-bold text-slate-800 font-poppins">{ANVIL_GCP_NETWORK.chainName}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Chain ID</span>
                    <span className="font-mono font-bold text-slate-800">{ANVIL_GCP_NETWORK.chainId} ({ANVIL_GCP_NETWORK.chainIdHex})</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 sm:col-span-2 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">RPC URL</span>
                      <span className="font-mono text-[11px] text-slate-700 truncate block">{ANVIL_GCP_NETWORK.rpcUrl}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(ANVIL_GCP_NETWORK.rpcUrl, 'rpc')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition shrink-0"
                    >
                      {copiedRpc ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleAddNetwork}
                    disabled={isAddingNetwork}
                    className="w-full py-3 bg-gradient-to-r from-[#0077BB] to-[#005F96] hover:from-[#005F96] text-white font-black text-sm rounded-xl shadow-md transition font-poppins flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>⚡</span>
                    <span>{isAddingNetwork ? 'Enviando a Billetera...' : 'Configurar Red en mi Billetera'}</span>
                  </button>
                </div>

                {networkStatus && (
                  <div className="p-3 bg-white rounded-xl border text-xs font-semibold animate-in fade-in">
                    {networkStatus}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Cuentas Demo */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sm text-amber-800">
                  <span>⚠️</span>
                  <span>3. Cuentas Comerciales y de Administración de Prueba</span>
                </div>
                <p>
                  Importa una de las cuentas con roles autorizados (Vendedor registrado o Administrador del sistema).
                </p>
              </div>

              {demoMode ? (
                <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                  <label className="text-xs font-bold text-slate-700 block font-poppins">
                    Selecciona un Perfil Demo:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {DEMO_ACCOUNTS.map((acc, idx) => (
                      <button
                        key={acc.id}
                        onClick={() => setSelectedAccountIndex(idx)}
                        className={`p-3 rounded-xl border text-left transition ${
                          selectedAccountIndex === idx
                            ? 'border-[#FF8800] bg-orange-50/60 ring-2 ring-[#FF8800]/30'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-[#FF8800] uppercase block">{acc.role}</span>
                        <h5 className="font-bold text-xs text-slate-800 font-poppins truncate">{acc.name}</h5>
                      </button>
                    ))}
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <p className="text-xs text-slate-600">{activeAccount.description}</p>
                    
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Dirección On-Chain:</span>
                      <span className="font-mono text-xs text-slate-800 font-bold break-all select-all block bg-white p-2 rounded-lg border">
                        {activeAccount.address}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Clave Privada Demo:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="password"
                          readOnly
                          value={activeAccount.privateKey}
                          className="font-mono text-xs bg-white text-slate-700 border rounded-lg px-3 py-2 flex-1 outline-none"
                        />
                        <button
                          onClick={() => copyToClipboard(activeAccount.privateKey, 'key')}
                          className="px-3 py-2 bg-gradient-to-r from-[#FF8800] to-[#E07700] hover:from-[#E07700] text-white text-xs font-black rounded-lg transition font-poppins shrink-0 shadow-sm"
                        >
                          {copiedKey ? '✓ ¡Copiada!' : '🔑 Copiar Clave'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border rounded-2xl text-xs text-slate-600">
                  Modo productivo activo.
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Conectar */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-[#E6F4FA] border border-[#0077BB]/20 rounded-2xl p-4 text-xs text-[#005F96] space-y-1">
                <p className="font-bold text-sm text-[#0077BB]">4. Verificación de Acceso a Consola</p>
                <p>
                  Comprueba que tu billetera esté conectada y que el contrato reconozca los privilegios correspondientes.
                </p>
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{isConnected ? '🟢' : '⚪'}</span>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Estado</span>
                      <span className="font-bold text-xs font-poppins text-slate-800">
                        {isConnected ? 'Billetera Conectada' : 'No Conectada'}
                      </span>
                    </div>
                  </div>
                  {!isConnected ? (
                    <button
                      onClick={handleConnect}
                      className="px-4 py-2 bg-gradient-to-r from-[#0077BB] to-[#FF8800] text-white font-black text-xs rounded-xl shadow-md font-poppins transition hover:opacity-90"
                    >
                      Conectar Consola
                    </button>
                  ) : (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300">
                      ✓ Autorizado
                    </span>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-gradient-to-r from-[#2E8B57] to-[#1E6B40] text-white font-black text-sm rounded-xl shadow-md transition font-poppins"
                  >
                    🚀 Continuar al Panel de Administración
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition font-poppins"
          >
            ◀ Anterior
          </button>
          <span className="text-xs font-bold text-slate-400 font-mono">
            {currentStep} / {steps.length}
          </span>
          <button
            onClick={() => setCurrentStep((prev) => Math.min(steps.length, prev + 1))}
            disabled={currentStep === steps.length}
            className="px-4 py-2 rounded-xl bg-[#0077BB] hover:bg-[#005F96] text-white text-xs font-bold disabled:opacity-30 disabled:pointer-events-none transition font-poppins shadow-sm"
          >
            Siguiente ▶
          </button>
        </div>

      </div>
    </div>
  );
}
