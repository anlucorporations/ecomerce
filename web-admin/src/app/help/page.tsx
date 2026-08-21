'use client';

import { useState } from 'react';
import Link from 'next/link';

import AddEurtModal from '@/components/add-eurt-modal';

interface FAQItem {
  id: string;
  category: 'company' | 'metamask' | 'orders' | 'finance' | 'audit';
  question: string;
  answer: string;
}

const MERCHANT_FAQ_LIST: FAQItem[] = [
  {
    id: 'mfaq-0',
    category: 'metamask',
    question: '💶 ¿Cómo agrego el Token EURT (EuroToken) a mi billetera MetaMask?',
    answer: 'Puede agregar el Token EURT en 1-Clic presionando el botón "🦊 Agregar EURT a MetaMask" presente en el encabezado y en esta guía. Alternativamente, en MetaMask seleccione "Importar Tokens", pestaña "Token Personalizado", y pegue la dirección del contrato inteligente: 0x5FbDB2315678afecb367f032d93F642f64180aa3 con 6 decimales.'
  },
  {
    id: 'mfaq-1',
    category: 'metamask',
    question: '🦊 ¿Por qué la empresa debe autorizar sus acciones con la billetera MetaMask?',
    answer: 'La firma criptográfica con MetaMask valida la identidad digital inalterable de la empresa en la blockchain. Al despachar un pedido o registrar la guía de transporte, la firma deja un registro público auditable que previene la suplantación y garantiza que únicamente los administradores autorizados gestionen la tienda.'
  },
  {
    id: 'mfaq-2',
    category: 'company',
    question: '🏛️ ¿Cómo es el proceso de inscripción de una empresa y qué costo tiene?',
    answer: 'La inscripción requiere conectar una billetera Web3 no registrada previamente. Ingrese la Razón Social, correo institucional y tipo de negocio (Productos o Servicios). La tasa de verificación on-chain es de 3 ETH en red real o gratuita en modo demostración local.'
  },
  {
    id: 'mfaq-3',
    category: 'orders',
    question: '📦 ¿Cómo se despacha un pedido y se ingresa el código de seguimiento (Tracking ID)?',
    answer: 'En "Gestión de Envíos", ubique la orden pagada en "Envíos Activos". Presione "Marcar como Enviado", seleccione el proveedor logístico (DHL, FedEx, MRW, Delivery Expreso) e introduzca el número de guía. Al confirmar con MetaMask, el cliente podrá consultar el rastreo en su Ficha Flotante.'
  },
  {
    id: 'mfaq-4',
    category: 'finance',
    question: '💰 ¿Cuándo se liberan los fondos de Custodia Escrow a la billetera de la empresa?',
    answer: 'Los fondos pagados en EuroToken (EURT) permanecen retenidos en la Bóveda Escrow del Smart Contract. Cuando el comprador recibe el paquete y firma la recepción en su portal, los fondos se transfieren automáticamente a la dirección Web3 de la empresa vendedora.'
  },
  {
    id: 'mfaq-5',
    category: 'audit',
    question: '📊 ¿Qué información proporciona la Ficha Financiera en el Pilar Usuarios?',
    answer: 'La Ficha Financiera (`/systems`) despliega el expediente contable de cualquier usuario: Saldo en EURT, Monto actual retenido en Custodia Escrow, Suma pagada históricamente y el desglose de facturas emitidas con su código QR fiscal.'
  }
];

export default function MerchantHelpLandingPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'user' | 'systems'>('company');
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string | null>('mfaq-0');
  const [isEurtModalOpen, setIsEurtModalOpen] = useState(false);

  const filteredFaqs = MERCHANT_FAQ_LIST.filter((faq) => {
    return faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
           faq.answer.toLowerCase().includes(faqSearch.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-24 selection:bg-indigo-600 selection:text-white">
      
      {/* 🚀 LANDING HERO BANNER EMPRESARIAL */}
      <section className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800 shadow-2xl overflow-hidden">
        
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <img
            src="/images/Gemini_Generated_Image_lgc972lgc972lgc9.jpg"
            alt="Fondo Panel de Administración"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 backdrop-blur-md text-indigo-300 text-xs font-extrabold uppercase tracking-wider border border-indigo-500/30 font-poppins">
              <span>💼 Centro de Ayuda & Guía Comercial Web3</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight font-poppins">
              Manual Maestro de <span className="text-indigo-400">Operaciones Comerciales</span>
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-2xl">
              Documentación técnica y operativa para administradores, empresas vendedoras y operadores de logística. Conozca cómo gestionar existencias, despachar compras y auditar fondos retenidos en Custodia Escrow.
            </p>

            <div className="pt-2 flex flex-wrap justify-center lg:justify-start gap-3">
              <button
                onClick={() => setIsEurtModalOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition flex items-center gap-2"
              >
                <span>🦊</span>
                <span>Agregar EURT a MetaMask</span>
              </button>

              <Link
                href="#guia-metamask"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-lg transition flex items-center gap-2"
              >
                <span>🔐</span>
                <span>Firma Criptográfica MetaMask</span>
              </Link>

              <Link
                href="#boveda-escrow"
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs rounded-2xl border border-slate-700 transition flex items-center gap-2"
              >
                <span>🛡️</span>
                <span>Flujo de Custodia Escrow</span>
              </Link>

              <Link
                href="#faqs"
                className="px-6 py-3 bg-slate-950 hover:bg-slate-900 text-slate-300 font-extrabold text-xs rounded-2xl border border-slate-800 transition flex items-center gap-2"
              >
                <span>💬</span>
                <span>Preguntas Frecuentes</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-3xl overflow-hidden border-2 border-indigo-500/30 shadow-2xl bg-slate-950 hover:scale-105 transition duration-300">
              <img
                src="/images/Gemini_Generated_Image_lgc972lgc972lgc9.jpg"
                alt="Gestión comercial de envíos y logística"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

        </div>
      </section>

      {/* 🦊 SECCIÓN LANDING 1: SEGURIDAD Y METAMASK EMPRESARIAL */}
      <section id="guia-metamask" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14">
        <div className="bg-slate-950 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="px-3.5 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded-full font-mono">
              ⭐ MANUAL RESALTADO PARA EMPRESAS
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-poppins">
              Identidad Criptográfica y Firma con MetaMask
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              La firma con MetaMask acredita legal y técnicamente las operaciones realizadas por la empresa en la blockchain de BARLO-VENTAS.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-mono text-indigo-400 font-bold text-xs">PASO 1</span>
                <h3 className="font-extrabold text-sm text-white">Conectar Billetera Institucional</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Utilice una dirección pública MetaMask dedicada a la administración comercial de la empresa.
                </p>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-mono text-amber-400 font-bold text-xs">PASO 2</span>
                <h3 className="font-extrabold text-sm text-white">Inscribir la Razón Social</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Active su comercio registrando el correo institucional y tipo de negocio (Venta de Productos o Servicios).
                </p>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-mono text-emerald-400 font-bold text-xs">PASO 3</span>
                <h3 className="font-extrabold text-sm text-white">Firmar Despachos y Guías de Envío</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Al marcar el pedido como enviado e ingresar el número de seguimiento, autorice la firma en MetaMask para notificar al comprador.
                </p>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900">
                <img
                  src="/images/metamask_connect_guide_es_1787157454195.jpg"
                  alt="Guía ilustrada de firma MetaMask en español"
                  className="w-full h-auto object-cover hover:scale-105 transition duration-300"
                />
              </div>
              <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-lg bg-slate-900">
                <img
                  src="/images/Gemini_Generated_Image_fnkmf2fnkmf2fnkm.jpg"
                  alt="Firma criptográfica no custodial"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 🛡️ SECCIÓN LANDING 2: CUSTODIA Y COBRO ESCROW */}
      <section id="boveda-escrow" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14">
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="px-3.5 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-full font-mono">
              🛡️ FLUJO FINANCIERO DE COBRO
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-poppins">
              Liberación de Fondos y Cobro en Billetera
            </h2>
            <p className="text-xs text-slate-400">
              Visualice el recorrido seguro de los EuroTokens desde la Bóveda Escrow hasta la acreditación final en la wallet de la empresa.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900">
                <img
                  src="/images/web3_security_escrow_es_1787157468573.jpg"
                  alt="Infografía de Custodia Escrow en español"
                  className="w-full h-auto object-cover hover:scale-105 transition duration-300"
                />
              </div>
              <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-lg bg-slate-900">
                <img
                  src="/images/Gemini_Generated_Image_wg9l8lwg9l8lwg9l.jpg"
                  alt="Liberación automática de fondos"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
                <h3 className="font-extrabold text-sm text-white font-poppins">💰 Depósito Inicial en Custodia</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Al comprar, los EURT del cliente se bloquean en el contrato inteligente <code className="text-indigo-400 font-mono">Ecommerce.sol</code>.
                </p>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
                <h3 className="font-extrabold text-sm text-white font-poppins">📦 Asignación de Guía de Transporte</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  El operador asigna el número de rastreo y actualiza el pedido a estado "Enviado".
                </p>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
                <h3 className="font-extrabold text-sm text-white font-poppins">✅ Transferencia Automática a la Billetera</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cuando el comprador confirma la recepción, el Smart Contract transfiere inmediatamente los EURT a la wallet de la empresa.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 💬 SECCIÓN LANDING 3: PREGUNTAS FRECUENTES DE EMPRESAS */}
      <section id="faqs" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 space-y-6">
        
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="px-3.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-full font-mono inline-block">
            💬 Respuestas a Dudas Comerciales
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-poppins">
            Preguntas Frecuentes de la Empresa
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Consulte rápidamente las soluciones a inquietudes sobre registro, inventario y despachos.
          </p>
        </div>

        <div className="bg-slate-950 p-6 sm:p-8 shadow-2xl rounded-3xl space-y-4 border border-slate-800">
          
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Escriba una duda (ej. despacho, inventario, facturas, registro)..."
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 pl-10 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            />
            <span className="absolute left-3.5 top-3.5 text-slate-500 text-sm">🔍</span>
          </div>

          <div className="space-y-3 pt-2">
            {filteredFaqs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No se encontraron preguntas que coincidan con la búsqueda.
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className={`border rounded-2xl transition duration-200 overflow-hidden ${
                      isOpen ? "border-indigo-500/50 bg-indigo-950/30" : "border-slate-800 hover:border-slate-700 bg-slate-900"
                    }`}
                  >
                    <button
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full p-4 text-left flex justify-between items-center gap-3 cursor-pointer"
                    >
                      <span className="font-extrabold text-xs sm:text-sm text-white font-poppins">
                        {faq.question}
                      </span>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs transition ${
                        isOpen ? "bg-indigo-600 text-white rotate-180" : "bg-slate-800 text-slate-400"
                      }`}>
                        ▼
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800 pt-3">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>

      </section>

      {/* 📖 SECCIÓN LANDING 4: MANUALES INTERACTIVOS DE MÓDULOS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] uppercase font-mono font-extrabold text-indigo-400 tracking-wider block">
              📖 MANUALES DE OPERACIÓN DEL SISTEMA
            </span>
            <h2 className="text-2xl font-black text-white font-poppins">
              Guías Módulo por Módulo
            </h2>
          </div>

          <div className="flex p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700 shrink-0">
            <button
              onClick={() => setActiveTab('company')}
              className={`py-2 px-4 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'company'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🏢 Guía para Empresas</span>
            </button>

            <button
              onClick={() => setActiveTab('user')}
              className={`py-2 px-4 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'user'
                  ? "bg-[#0077BB] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>👤 Guía de Clientes</span>
            </button>

            <button
              onClick={() => setActiveTab('systems')}
              className={`py-2 px-4 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'systems'
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>⚙️ Sistemas & Finanzas</span>
            </button>
          </div>
        </div>

        {activeTab === 'company' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-900/60 text-indigo-300 flex items-center justify-center font-bold text-lg">
                1️⃣
              </div>
              <h3 className="text-base font-bold text-white font-poppins">Inscripción Comercial</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Conecte la wallet institucional. Ingrese el correo de la empresa y la Razón Social.
              </p>
              <Link href="/companies" className="inline-block text-xs font-extrabold text-indigo-400 hover:underline pt-1">
                Gestionar Empresas →
              </Link>
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-900/60 text-amber-300 flex items-center justify-center font-bold text-lg">
                2️⃣
              </div>
              <h3 className="text-base font-bold text-white font-poppins">Publicar Productos & Servicios</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                En Inventario, agregue nuevos ítems, defina precios en EURT y gestione existencias.
              </p>
              <Link href="/inventory" className="inline-block text-xs font-extrabold text-amber-400 hover:underline pt-1">
                Ir al Inventario →
              </Link>
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-900/60 text-emerald-300 flex items-center justify-center font-bold text-lg">
                3️⃣
              </div>
              <h3 className="text-base font-bold text-white font-poppins">Despachar Pedidos & Tracking</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                En "Gestión de Envíos", asigne el proveedor logístico e introduzca el número de guía.
              </p>
              <Link href="/orders" className="inline-block text-xs font-extrabold text-emerald-400 hover:underline pt-1">
                Gestionar Envíos →
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'user' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-900/60 text-sky-300 flex items-center justify-center font-bold text-lg">
                🛒
              </div>
              <h3 className="text-base font-bold text-white font-poppins">Experiencia de Compra Cliente</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Los clientes recargan saldo EURT con Stripe, agregan productos y pagan con garantía Escrow.
              </p>
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-900/60 text-emerald-300 flex items-center justify-center font-bold text-lg">
                ✍️
              </div>
              <h3 className="text-base font-bold text-white font-poppins">Firma de Recepción</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                El comprador confirma la entrega en "Mis Pedidos", liberando de inmediato los EURT.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'systems' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-900/60 text-purple-300 flex items-center justify-center font-bold text-lg">
                📊
              </div>
              <h3 className="text-base font-bold text-white font-poppins">Ficha Financiera Pilar Usuarios</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inspeccione saldos en EURT, custodia activa y facturas emitidas por cada usuario.
              </p>
              <Link href="/systems" className="inline-block text-xs font-extrabold text-purple-400 hover:underline pt-1">
                Ir a Pilar Usuarios →
              </Link>
            </div>
          </div>
        )}

      </section>

      {/* 🦊 MODAL AGREGAR EURT A METAMASK */}
      <AddEurtModal isOpen={isEurtModalOpen} onClose={() => setIsEurtModalOpen(false)} />

    </div>
  );
}
