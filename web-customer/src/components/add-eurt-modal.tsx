'use client';

import { useState } from 'react';

interface AddEurtModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddEurtModal({ isOpen, onClose }: AddEurtModalProps) {
  const [copied, setCopied] = useState(false);
  const [addingToken, setAddingToken] = useState(false);
  const [addStatus, setAddStatus] = useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' });
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');

  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(euroTokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWatchAsset = async () => {
    setAddingToken(true);
    setAddStatus({ type: 'idle', msg: '' });

    try {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('No se detectó la extensión MetaMask en su navegador.');
      }

      const ethereum = (window as any).ethereum;

      const wasAdded = await ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: euroTokenAddress,
            symbol: 'EURT',
            decimals: 6,
            image: 'https://cdn-icons-png.flaticon.com/512/7038/7038081.png',
          },
        },
      });

      if (wasAdded) {
        setAddStatus({
          type: 'success',
          msg: '¡Token EURT agregado exitosamente a su billetera MetaMask!',
        });
      } else {
        setAddStatus({
          type: 'error',
          msg: 'Solicitud cancelada en MetaMask.',
        });
      }
    } catch (err: any) {
      console.error('Error agregando EURT a MetaMask:', err);
      setAddStatus({
        type: 'error',
        msg: err?.message || 'No se pudo agregar el token automáticamente.',
      });
    } finally {
      setAddingToken(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-800">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl">
              🦊
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Manual de Importación Token EURT
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  EuroToken Web3
                </span>
              </h2>
              <p className="text-xs text-slate-300">Guía rápida para visualizar tus saldos de EURT en MetaMask</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {/* TAB SELECTOR */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setActiveTab('auto')}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'auto'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            ⚡ Modo Automático (1-Clic)
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'manual'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            📖 Modo Manual (Paso a Paso)
          </button>
        </div>

        {/* CONTENT BODY */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* TECHNICAL SUMMARY CARD */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-200 pb-2">
              <span className="font-semibold text-slate-700">Ficha Técnica del Token</span>
              <span className="font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">
                ERC-20 Standard
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="block text-slate-400 text-[10px] uppercase font-semibold">SÍMBOLO:</span>
                <span className="font-bold text-amber-600 text-sm">EURT</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase font-semibold">DECIMALES:</span>
                <span className="font-bold text-emerald-600 text-sm">6</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase font-semibold">RED ENTORNO:</span>
                <span className="font-mono text-slate-700">Anvil Local (31337)</span>
              </div>
            </div>

            {/* CONTRACT ADDRESS COPY BOX */}
            <div className="pt-1">
              <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
                Dirección del Contrato Inteligente:
              </span>
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-2 font-mono text-xs text-indigo-900 break-all shadow-sm">
                <span className="flex-1 select-all">{euroTokenAddress}</span>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-sans font-bold transition flex items-center gap-1 shrink-0"
                >
                  {copied ? '✓ ¡Copiado!' : '📋 Copiar'}
                </button>
              </div>
            </div>
          </div>

          {/* TAB 1: AUTOMATIC ADDITION */}
          {activeTab === 'auto' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                  🚀 Importación Directa en 1 Clic
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Si tiene la extensión de MetaMask instalada y desbloqueada, haga clic en el siguiente botón. MetaMask le solicitará automáticamente confirmar la adición del token <strong>EURT</strong> a su lista de activos en su billetera.
                </p>
              </div>

              <div className="text-center py-2">
                <button
                  onClick={handleWatchAsset}
                  disabled={addingToken}
                  className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 mx-auto text-sm"
                >
                  <span className="text-xl">🦊</span>
                  {addingToken ? 'Solicitando a MetaMask...' : 'Agregar EURT a MetaMask en 1 Clic'}
                </button>
              </div>

              {addStatus.msg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    addStatus.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  <span>{addStatus.type === 'success' ? '✅' : '⚠️'}</span>
                  <span>{addStatus.msg}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL STEP-BY-STEP */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                📖 Pasos para Importar Manualmente en MetaMask
              </h3>

              <div className="space-y-3 text-xs">
                {/* STEP 1 */}
                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Abre tu billetera MetaMask</h4>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Haz clic en el icono del zorro 🦊 en la barra de extensiones de tu navegador y verifica que estés conectado a la red correspondiente (<strong>Anvil Localhost 8545</strong>).
                    </p>
                  </div>
                </div>

                {/* STEP 2 */}
                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Ve a la pestaña de Activos (Tokens)</h4>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      En la pantalla principal de tu billetera, selecciona la pestaña <strong>&quot;Tokens&quot;</strong> o <strong>&quot;Activos&quot;</strong> y desplázate hasta la parte inferior.
                    </p>
                  </div>
                </div>

                {/* STEP 3 */}
                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Haz clic en &quot;+ Importar Tokens&quot;</h4>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Presiona el enlace azul <strong>Importar Tokens</strong> (Import Tokens) ubicado al final de la lista.
                    </p>
                  </div>
                </div>

                {/* STEP 4 */}
                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Pega los datos del contrato</h4>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Selecciona la pestaña <strong>Token Personalizado</strong> y completa los siguientes campos:
                    </p>
                    <ul className="mt-1.5 space-y-1 text-slate-700 font-mono text-[11px] pl-2 border-l-2 border-indigo-500">
                      <li>• <strong>Dirección del Contrato:</strong> {euroTokenAddress}</li>
                      <li>• <strong>Símbolo del Token:</strong> EURT</li>
                      <li>• <strong>Decimales de precisión:</strong> 6</li>
                    </ul>
                  </div>
                </div>

                {/* STEP 5 */}
                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    5
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Confirma la importación</h4>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Haz clic en <strong>Siguiente</strong> y luego en <strong>Importar Tokens</strong>. Tu saldo de <strong>EURT</strong> aparecerá reflejado inmediatamente en MetaMask.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-[11px] text-slate-400">
            🔒 Protocolo de Fichas Web3 BarloVentas
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
          >
            Entendido / Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
