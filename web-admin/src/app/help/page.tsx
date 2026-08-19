'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FAQItem {
  id: string;
  category: 'company' | 'metamask' | 'orders' | 'finance' | 'audit';
  question: string;
  answer: string;
}

const MERCHANT_FAQ_LIST: FAQItem[] = [
  {
    id: 'mfaq-1',
    category: 'metamask',
    question: '🦊 ¿Por qué la empresa debe autorizar sus acciones con la billetera MetaMask?',
    answer: 'La firma criptográfica con MetaMask valida la identidad digital inalterable de la empresa en la blockchain. Al despachar un pedido o registrar la guía de transporte, la firma con MetaMask deja un registro público auditable que previene la suplantación de identidad y garantiza que únicamente los administradores autorizados puedan gestionar los productos.'
  },
  {
    id: 'mfaq-2',
    category: 'company',
    question: '🏛️ ¿Cómo es el proceso de inscripción de una empresa y qué costo tiene?',
    answer: 'La inscripción requiere conectar una billetera Web3 que no esté registrada previamente como usuario o cliente. Debe ingresar la Razón Social, RUTA o ID fiscal, correo electrónico institucional y tipo de negocio (Venta de Productos o Prestación de Servicios). La tasa oficial de verificación on-chain es de 3 ETH en red real (o gratuita en modo demostración local).'
  },
  {
    id: 'mfaq-3',
    category: 'orders',
    question: '📦 ¿Cómo se despacha un pedido y se ingresa el código de seguimiento (Tracking ID)?',
    answer: 'En la sección "Gestión de Envíos", ubique la orden pagada en la pestaña "🚀 Envíos Activos". Presione "Marcar como Enviado", seleccione el proveedor logístico (DHL, FedEx, MRW, Delivery Expreso) e introduzca el número de guía. Al confirmar con MetaMask, el comprador podrá consultar el rastreo en su Ficha Flotante.'
  },
  {
    id: 'mfaq-4',
    category: 'finance',
    question: '💰 ¿Cuándo se liberan los fondos de Custodia Escrow a la billetera de la empresa?',
    answer: 'Los fondos pagados en EuroToken (EURT) permanecen bloqueados en la Bóveda Escrow del Smart Contract. Cuando el comprador recibe el paquete y firma la recepción en su portal, los fondos se transfieren automáticamente a la dirección Web3 de la empresa vendedora.'
  },
  {
    id: 'mfaq-5',
    category: 'audit',
    question: '📊 ¿Qué información proporciona la Ficha Financiera en el Pilar Usuarios?',
    answer: 'La Ficha Financiera (`/systems`) despliega el historial contable completo de cualquier usuario: Saldo disponible en EURT, Monto actual retenido en Custodia Escrow, Suma total pagada históricamente y el desglose detallado de facturas emitidas con su código QR de verificación fiscal.'
  }
];

export default function MerchantHelpPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'user' | 'systems'>('company');
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string | null>('mfaq-1');

  const filteredFaqs = MERCHANT_FAQ_LIST.filter((faq) => {
    return faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
           faq.answer.toLowerCase().includes(faqSearch.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-24 selection:bg-indigo-600 selection:text-white">
      
      {/* HERO BANNER - CENTRO DE AYUDA EMPRESARIAL */}
      <section className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-slate-800 shadow-2xl overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 backdrop-blur-md text-indigo-300 text-xs font-extrabold uppercase tracking-wider border border-indigo-500/30">
            <span>💼 Centro de Ayuda & Documentación Comercial</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Guía de Operación <span className="text-indigo-400">Comercial & Web3</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
            Manual maestro para empresas vendedoras, administradores del sistema y operadores logísticos. Aprenda a gestionar inventarios, despachar pedidos y auditar transacciones con firma criptográfica.
          </p>

          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="#metamask-guide"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <span>🦊</span>
              <span>Manual MetaMask & Seguridad</span>
            </Link>

            <Link
              href="#faqs"
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs rounded-xl border border-slate-700 transition flex items-center gap-2"
            >
              <span>💬</span>
              <span>Preguntas Frecuentes</span>
            </Link>
          </div>
        </div>
      </section>

      {/* SECCIÓN RESALTADA: MANUAL DE USO METAMASK Y SEGURIDAD CRIPTOGRÁFICA */}
      <section id="metamask-guide" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="bg-slate-950 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8 relative overflow-hidden">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded-full font-mono shadow-xs">
                ⭐ MANUAL RESALTADO PARA EMPRESAS
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                <span>🦊</span>
                <span>Firma Criptográfica y Seguridad con MetaMask</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-3xl">
                Conozca cómo la integración de MetaMask garantiza que las operaciones comerciales, cobros y actualizaciones de despacho gocen de la máxima validez legal y técnica en la Blockchain.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">
                Procedimiento de Conexión & Autorización
              </h3>

              <div className="space-y-3">
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-start gap-3.5">
                  <span className="w-8 h-8 rounded-xl bg-indigo-900/60 text-indigo-300 font-black text-sm flex items-center justify-center shrink-0 font-mono">1</span>
                  <div className="space-y-0.5 text-xs">
                    <span className="font-extrabold text-white block">Conectar Billetera Institucional</span>
                    <span className="text-slate-400 block leading-relaxed">
                      Utilice una cuenta de MetaMask exclusiva para la representación de su empresa. Presione "Conectar Wallet" en el menú superior.
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-start gap-3.5">
                  <span className="w-8 h-8 rounded-xl bg-amber-900/60 text-amber-300 font-black text-sm flex items-center justify-center shrink-0 font-mono">2</span>
                  <div className="space-y-0.5 text-xs">
                    <span className="font-extrabold text-white block">Inscribir la Razón Social</span>
                    <span className="text-slate-400 block leading-relaxed">
                      Si la billetera es nueva, se abrirá el modal de Registro de Empresa. Ingrese el correo comercial de la compañía y confirme la tasa de registro on-chain.
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-start gap-3.5">
                  <span className="w-8 h-8 rounded-xl bg-emerald-900/60 text-emerald-300 font-black text-sm flex items-center justify-center shrink-0 font-mono">3</span>
                  <div className="space-y-0.5 text-xs">
                    <span className="font-extrabold text-white block">Firmar Despachos y Guías de Envío</span>
                    <span className="text-slate-400 block leading-relaxed">
                      Al cambiar el estado de un pedido a "Enviado" e ingresar la guía de tracking, MetaMask solicitará su firma. Esta firma notifica al cliente y audita el proceso.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-3 text-center">
              <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900">
                <img
                  src="/images/metamask_connect_guide.jpg"
                  alt="Guía de conexión MetaMask para empresas en BARLO-VENTAS Admin"
                  className="w-full h-auto object-cover hover:scale-105 transition duration-300"
                />
              </div>
              <span className="text-[11px] text-slate-500 font-mono italic block">
                Figura 1: Diagrama de interacción MetaMask para operadores comerciales.
              </span>
            </div>

          </div>

          {/* INFOGRAFÍA DE BÓVEDA ESCROW */}
          <div className="pt-6 border-t border-slate-800 space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-1">
              <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider block">
                🛡️ Transparencia de Cobro & Custodia Smart Contract
              </span>
              <h3 className="text-xl font-black text-white">
                Flujo de Custodia Escrow y Cobro Automático
              </h3>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900 max-w-4xl mx-auto">
              <img
                src="/images/web3_security_escrow.jpg"
                alt="Infografía del proceso de Custodia Escrow para empresas"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

        </div>
      </section>

      {/* SECCIÓN PREGUNTAS FRECUENTES (FAQ INTERACTIVO) */}
      <section id="faqs" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-6">
        
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="px-3.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-full font-mono inline-block">
            💬 Respuestas a Dudas Operativas
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Preguntas Frecuentes de Empresas
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Respuestas inmediatas a las consultas técnicas y financieras más frecuentes del panel de administración.
          </p>
        </div>

        <div className="bg-slate-950 p-6 shadow-xl rounded-3xl space-y-4 border border-slate-800">
          
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Escriba su duda comercial (ej. despacho, inventario, facturas, registro)..."
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            />
            <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">🔍</span>
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
                      <span className="font-extrabold text-xs sm:text-sm text-white">
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

      {/* MANUALES INTERACTIVOS POR MÓDULO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] uppercase font-mono font-extrabold text-indigo-400 tracking-wider block">
              📖 MANUALES DE OPERACIÓN DEL SISTEMA
            </span>
            <h2 className="text-2xl font-black text-white">
              Guía Paso a Paso de Módulos
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

        {/* CONTENIDO TAB EMPRESAS */}
        {activeTab === 'company' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-900/60 text-indigo-300 flex items-center justify-center font-bold text-lg">
                1️⃣
              </div>
              <h3 className="text-base font-bold text-white">Inscripción Comercial</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Conecte la wallet institucional. Ingrese el correo de la empresa y la Razón Social para validar el registro on-chain.
              </p>
              <Link href="/companies" className="inline-block text-xs font-extrabold text-indigo-400 hover:underline pt-1">
                Gestionar Empresas →
              </Link>
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-900/60 text-amber-300 flex items-center justify-center font-bold text-lg">
                2️⃣
              </div>
              <h3 className="text-base font-bold text-white">Publicar Productos & Servicios</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                En la sección Inventario, agregue nuevos ítems, defina precios en EURT (6 decimales) y actualice existencias.
              </p>
              <Link href="/inventory" className="inline-block text-xs font-extrabold text-amber-400 hover:underline pt-1">
                Ir al Inventario →
              </Link>
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-900/60 text-emerald-300 flex items-center justify-center font-bold text-lg">
                3️⃣
              </div>
              <h3 className="text-base font-bold text-white">Despachar Pedidos & Tracking</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                En "Gestión de Envíos", marque la orden como enviada, seleccione la empresa de transporte e introduzca la guía de tracking.
              </p>
              <Link href="/orders" className="inline-block text-xs font-extrabold text-emerald-400 hover:underline pt-1">
                Gestionar Envíos →
              </Link>
            </div>
          </div>
        )}

        {/* CONTENIDO TAB CLIENTES */}
        {activeTab === 'user' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-900/60 text-sky-300 flex items-center justify-center font-bold text-lg">
                🛒
              </div>
              <h3 className="text-base font-bold text-white">Experiencia de Compra Cliente</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Los clientes recargan saldo EURT con Stripe, agregan productos a su carrito 1-Step y pagan con garantía Escrow.
              </p>
              <a
                href={process.env.NEXT_PUBLIC_WEB_CUSTOMER_URL || "https://mcc-web-customer-1095249147821.europe-west1.run.app"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs font-extrabold text-sky-400 hover:underline pt-1"
              >
                Abrir Tienda de Clientes →
              </a>
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-900/60 text-emerald-300 flex items-center justify-center font-bold text-lg">
                ✍️
              </div>
              <h3 className="text-base font-bold text-white">Firma de Recepción del Cliente</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Al llegar el envío, el comprador confirma la recepción en su panel "Mis Pedidos", liberando de inmediato los EURT hacia la empresa.
              </p>
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-900/60 text-purple-300 flex items-center justify-center font-bold text-lg">
                📄
              </div>
              <h3 className="text-base font-bold text-white">Emisión de Facturas PDF</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cada orden genera automáticamente una factura verificable en PDF con código QR y desglose de ítems.
              </p>
            </div>
          </div>
        )}

        {/* CONTENIDO TAB SISTEMAS & FINANZAS */}
        {activeTab === 'systems' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-900/60 text-purple-300 flex items-center justify-center font-bold text-lg">
                📊
              </div>
              <h3 className="text-base font-bold text-white">Ficha Financiera Pilar Usuarios</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inspeccione el expediente contable de cualquier usuario: Saldo EURT, Custodia Escrow Activa y Facturas Emitidas.
              </p>
              <Link href="/systems" className="inline-block text-xs font-extrabold text-purple-400 hover:underline pt-1">
                Ir a Pilar Usuarios →
              </Link>
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-900/60 text-indigo-300 flex items-center justify-center font-bold text-lg">
                📜
              </div>
              <h3 className="text-base font-bold text-white">Auditoría On-Chain</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Supervise todos los eventos Solidity emitidos por el contrato (CompanyRegistered, OrderCreated, FundsReleased).
              </p>
              <Link href="/audit" className="inline-block text-xs font-extrabold text-indigo-400 hover:underline pt-1">
                Ver Registro de Auditoría →
              </Link>
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-900/60 text-amber-300 flex items-center justify-center font-bold text-lg">
                🐘
              </div>
              <h3 className="text-base font-bold text-white">Consola pgAdmin 4</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Acceso al modelador web gráfico de la base de datos PostgreSQL 16 para auditoría de esquemas multi-proyecto.
              </p>
              <a
                href={process.env.NEXT_PUBLIC_PGADMIN_URL || "https://mcc-pgadmin-1095249147821.europe-west1.run.app"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs font-extrabold text-amber-400 hover:underline pt-1"
              >
                Abrir pgAdmin 4 →
              </a>
            </div>
          </div>
        )}

      </section>

    </div>
  );
}
