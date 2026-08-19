'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FAQItem {
  id: string;
  category: 'general' | 'metamask' | 'purchases' | 'escrow' | 'invoices';
  question: string;
  answer: string;
}

const FAQ_LIST: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'metamask',
    question: '🦊 ¿Cómo conecto mi billetera MetaMask a la plataforma por primera vez?',
    answer: 'Para conectar su billetera, asegúrese de tener instalada la extensión oficial de MetaMask en su navegador (Chrome, Firefox, Brave) o la app en su dispositivo móvil. Haga clic en el botón "Conectar Wallet" ubicado en la barra superior derecha de la pantalla y apruebe la solicitud de conexión en la ventana emergente de MetaMask. ¡Es 100% gratuito y no requiere compartir contraseñas!'
  },
  {
    id: 'faq-2',
    category: 'metamask',
    question: '🔐 ¿Por qué es fundamental autorizar cada transacción con mi billetera?',
    answer: 'La autorización con su billetera MetaMask proporciona una firma criptográfica única e inalterable. A diferencia de las plataformas tradicionales donde un tercero maneja su dinero, en Web3 usted tiene el control total de sus activos. Autorizar con su wallet garantiza que ningún pago se procese sin su consentimiento explícito y protege sus fondos contra fraudes.'
  },
  {
    id: 'faq-3',
    category: 'escrow',
    question: '🛡️ ¿Cómo funciona la Custodia Escrow y cómo me protege como comprador?',
    answer: 'Cuando realiza una compra, sus EuroTokens (EURT) no van directamente a la cuenta del vendedor. El contrato inteligente ("Smart Contract") retiene los fondos en un depósito de custodia temporal ("Escrow Vault"). Los fondos se liberan únicamente cuando usted recibe el producto en su domicilio y presiona el botón "Firmar Entrega Recibida". Si el vendedor no entrega el pedido, su dinero permanece protegido.'
  },
  {
    id: 'faq-4',
    category: 'purchases',
    question: '💶 ¿Qué es el EuroToken (EURT) y cómo puedo recargar saldo con tarjeta de crédito?',
    answer: 'El EuroToken (EURT) es una stablecoin digital vinculada 1:1 con el Euro (€1.00 EURT = €1.00 EUR). Puede adquirir EuroTokens de forma inmediata utilizando su tarjeta de débito o crédito a través de nuestro portal seguro respaldado por Stripe en la sección "💶 Recargar EURT". Los fondos se acreditarán directamente en su billetera Web3.'
  },
  {
    id: 'faq-5',
    category: 'invoices',
    question: '📄 ¿Cómo descargo mi Factura Electrónica con código QR de verificación?',
    answer: 'Todas las compras generan automáticamente una Factura Electrónica respaldada en Blockchain. Puede acceder a sus facturas en cualquier momento desde la sección "Mis Pedidos" o presionando el botón "Ver / Descargar Factura PDF". Cada factura incluye el resumen de ítems, totales en EURT, hash de transacción on-chain y un código QR de validación fiscal.'
  },
  {
    id: 'faq-6',
    category: 'general',
    question: '⭐ ¿Cómo funciona el sistema de valoración y reputación de empresas?',
    answer: 'Al recibir su pedido, puede evaluar a la empresa vendedora otorgando entre 1 y 5 estrellas. Dispone de una ventana de 24 horas para emitir su calificación manual. Si no califica manualmente en ese periodo, el sistema asignará automáticamente una valoración por defecto de 4/5 estrellas para mantener la reputación activa de la comunidad.'
  }
];

export default function CustomerHelpPage() {
  const [activeTab, setActiveTab] = useState<'user' | 'company'>('user');
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredFaqs = FAQ_LIST.filter((faq) => {
    const matchesSearch = faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(faqSearch.toLowerCase());
    const matchesCat = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#333333] font-sans pb-24 selection:bg-[#FF8800] selection:text-white">
      
      {/* HERO BANNER - CENTRO DE AYUDA Y BIENVENIDA AMIGABLE */}
      <section className="relative bg-gradient-to-br from-[#0077BB] via-[#005F96] to-slate-900 text-white py-14 px-4 sm:px-6 lg:px-8 shadow-xl overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/30 font-poppins">
            <span>❓ Centro de Ayuda & Guía Segura Web3</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight font-poppins">
            ¿En qué podemos <span className="text-[#FF8800]">ayudarle hoy?</span>
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 max-w-2xl mx-auto font-medium leading-relaxed">
            Bienvenido a nuestro portal de asistencia. Diseñado especialmente para guiarle paso a paso en el uso de la plataforma descentralizada BARLO-VENTAS, garantizando una experiencia de compra transparente, segura y amigable.
          </p>

          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="#metamask-guide"
              className="px-5 py-2.5 bg-[#FF8800] hover:bg-[#E07700] text-white font-extrabold text-xs rounded-xl shadow-lg transition font-poppins flex items-center gap-2"
            >
              <span>🦊</span>
              <span>Guía MetaMask & Seguridad</span>
            </Link>

            <Link
              href="#faqs"
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs rounded-xl border border-white/30 transition font-poppins flex items-center gap-2"
            >
              <span>💬</span>
              <span>Preguntas Frecuentes</span>
            </Link>
          </div>
        </div>
      </section>

      {/* SECCIÓN RESALTADA: MANUAL DE USO CON LA BILLETERA METAMASK Y SEGURIDAD WEB3 */}
      <section id="metamask-guide" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-sky-500/10 border-2 border-[#FF8800]/40 rounded-3xl p-6 sm:p-8 shadow-xl space-y-8 relative overflow-hidden bg-white">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#FF8800]/20 pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF8800] text-white text-[10px] font-black uppercase tracking-wider rounded-full font-mono shadow-xs">
                ⭐ MANUAL RESALTADO DE SEGURIDAD
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#333333] font-poppins flex items-center gap-2">
                <span>🦊</span>
                <span>Guía Paso a Paso: Operar con Billetera MetaMask en Web3</span>
              </h2>
              <p className="text-xs text-slate-600 max-w-3xl">
                Descubra por qué conectar su billetera y firmar transacciones con MetaMask le proporciona el nivel de protección financiera más alto del comercio electrónico moderno.
              </p>
            </div>
          </div>

          {/* DIAGRAMA DE PASOS E ILUSTRACIÓN DE CONEXIÓN */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-base font-bold text-[#0077BB] font-poppins uppercase tracking-wider text-xs">
                Pasos Sencillos para Conectar y Comprar
              </h3>

              <div className="space-y-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3.5">
                  <span className="w-8 h-8 rounded-xl bg-[#E6F4FA] text-[#0077BB] font-black text-sm flex items-center justify-center shrink-0 font-mono">1</span>
                  <div className="space-y-0.5 text-xs">
                    <span className="font-extrabold text-[#333333] block font-poppins">Instalar la Extensión o App MetaMask</span>
                    <span className="text-slate-600 block leading-relaxed">
                      Descargue MetaMask desde el sitio oficial (metamask.io). Cree su billetera y resguarde su frase de recuperación en un lugar privado y seguro.
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3.5">
                  <span className="w-8 h-8 rounded-xl bg-[#FFF3E5] text-[#FF8800] font-black text-sm flex items-center justify-center shrink-0 font-mono">2</span>
                  <div className="space-y-0.5 text-xs">
                    <span className="font-extrabold text-[#333333] block font-poppins">Presionar "Conectar Wallet" en BARLO-VENTAS</span>
                    <span className="text-slate-600 block leading-relaxed">
                      En el encabezado superior derecha, haga clic en el botón azul "Conectar Wallet". MetaMask desplegará una ventana pidiendo su confirmación para enlazar la billetera.
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3.5">
                  <span className="w-8 h-8 rounded-xl bg-[#EAF5EF] text-[#2E8B57] font-black text-sm flex items-center justify-center shrink-0 font-mono">3</span>
                  <div className="space-y-0.5 text-xs">
                    <span className="font-extrabold text-[#333333] block font-poppins">Autorizar Transacciones con Firma Criptográfica</span>
                    <span className="text-slate-600 block leading-relaxed">
                      Al realizar una compra o recargar EURT, MetaMask le mostrará el resumen exacto de la operación. Presione "Confirmar" o "Firmar" para procesar el pago directamente en el Smart Contract.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-3 text-center">
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-slate-900">
                <img
                  src="/images/metamask_connect_guide.jpg"
                  alt="Guía paso a paso para conectar MetaMask en BARLO-VENTAS DApp"
                  className="w-full h-auto object-cover hover:scale-105 transition duration-300"
                />
              </div>
              <span className="text-[11px] text-slate-500 font-mono italic block">
                Ilustración 1: Proceso seguro de instalación, conexión y firma con MetaMask.
              </span>
            </div>

          </div>

          {/* POR QUÉ LA WEB3 Y LA FIRMA CON METAMASK APORTAN MÁXIMA SEGURIDAD */}
          <div className="pt-6 border-t border-[#FF8800]/20 space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-1">
              <span className="text-[10px] text-[#0077BB] font-mono font-bold uppercase tracking-wider block">
                🛡️ Transparencia & Custodia Descentralizada
              </span>
              <h3 className="text-xl font-black text-[#333333] font-poppins">
                ¿Por qué la firma en MetaMask garantiza su Seguridad?
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                <span className="text-2xl">🔐</span>
                <h4 className="text-sm font-extrabold text-[#333333] font-poppins">Firma No Custodial</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sus claves privadas permanecen 100% bajo su control personal en MetaMask. BARLO-VENTAS nunca almacena ni puede acceder a sus contraseñas bancarias o fondos.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                <span className="text-2xl">🏛️</span>
                <h4 className="text-sm font-extrabold text-[#333333] font-poppins">Bóveda Escrow Inmutable</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Los EuroTokens no se transfieren al vendedor de inmediato. Quedan bloqueados en un contrato inteligente auditado hasta que usted confirme que ha recibido el pedido.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                <span className="text-2xl">📜</span>
                <h4 className="text-sm font-extrabold text-[#333333] font-poppins">Auditoría Blockchain Pública</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cada compra, número de envío y factura queda registrado de forma inalterable en la red Blockchain, accesible públicamente mediante hashes de comprobación.
                </p>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-900 max-w-4xl mx-auto">
              <img
                src="/images/web3_security_escrow.jpg"
                alt="Infografía del proceso de Custodia Escrow y Liberación de Fondos"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

        </div>
      </section>

      {/* SECCIÓN 3: PREGUNTAS FRECUENTES (FAQ INTERACTIVO) */}
      <section id="faqs" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-6">
        
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="px-3.5 py-1 bg-[#E6F4FA] text-[#0077BB] border border-[#0077BB]/30 text-xs font-bold rounded-full font-mono inline-block">
            💬 Respuestas Claras y Directas
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#333333] font-poppins">
            Preguntas y Respuestas Más Comunes
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Consulte rápidamente las soluciones a las dudas más habituales sobre compras, recargas y uso de la plataforma.
          </p>
        </div>

        {/* BARRA DE BÚSQUEDA DE FAQS Y FILTROS POR CATEGORÍA */}
        <div className="glass-card p-6 shadow-md rounded-3xl space-y-4 border border-slate-200 bg-white">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="🔍 Escriba una duda o palabra clave (ej. recarga, factura, escrow, wallet)..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 pl-10 text-xs text-slate-800 focus:outline-none focus:border-[#0077BB] focus:bg-white font-medium"
              />
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
            </div>

            <div className="flex flex-wrap gap-2 text-xs shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl font-bold font-poppins transition cursor-pointer ${
                  selectedCategory === 'all' ? "bg-[#0077BB] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setSelectedCategory('metamask')}
                className={`px-3 py-1.5 rounded-xl font-bold font-poppins transition cursor-pointer ${
                  selectedCategory === 'metamask' ? "bg-[#FF8800] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                🦊 MetaMask
              </button>
              <button
                onClick={() => setSelectedCategory('escrow')}
                className={`px-3 py-1.5 rounded-xl font-bold font-poppins transition cursor-pointer ${
                  selectedCategory === 'escrow' ? "bg-[#2E8B57] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                🛡️ Escrow
              </button>
              <button
                onClick={() => setSelectedCategory('purchases')}
                className={`px-3 py-1.5 rounded-xl font-bold font-poppins transition cursor-pointer ${
                  selectedCategory === 'purchases' ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                💶 EURT
              </button>
            </div>

          </div>

          {/* LISTA ACORDEÓN DE PREGUNTAS Y RESPUESTAS */}
          <div className="space-y-3 pt-2">
            {filteredFaqs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No se encontraron preguntas que coincidan con su búsqueda. Intente con otras palabras clave.
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className={`border rounded-2xl transition duration-200 overflow-hidden ${
                      isOpen ? "border-[#0077BB]/40 bg-[#E6F4FA]/30 shadow-xs" : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <button
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full p-4 text-left flex justify-between items-center gap-3 cursor-pointer"
                    >
                      <span className="font-extrabold text-xs sm:text-sm text-[#333333] font-poppins">
                        {faq.question}
                      </span>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs transition ${
                        isOpen ? "bg-[#0077BB] text-white rotate-180" : "bg-slate-100 text-slate-600"
                      }`}>
                        ▼
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-slate-700 leading-relaxed border-t border-[#0077BB]/10 pt-3">
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

      {/* SECCIÓN 1: MANUALES DE USO ESTILO LANDING PAGE (USUARIOS VS EMPRESAS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-[10px] uppercase font-mono font-extrabold text-[#0077BB] tracking-wider block">
              📖 MANUALES INTERACTIVOS DE PLATAFORMA
            </span>
            <h2 className="text-2xl font-black text-[#333333] font-poppins">
              Guía Operativa Detallada por Perfil
            </h2>
          </div>

          {/* TAB SWITCHER: USUARIO VS EMPRESA */}
          <div className="flex p-1.5 bg-slate-200/80 rounded-2xl font-poppins border border-[#0077BB]/10 shrink-0">
            <button
              onClick={() => setActiveTab('user')}
              className={`py-2 px-4 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'user'
                  ? "bg-white text-[#0077BB] shadow-sm border border-[#0077BB]/20"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>👤 Ayuda para el Usuario</span>
            </button>

            <button
              onClick={() => setActiveTab('company')}
              className={`py-2 px-4 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'company'
                  ? "bg-white text-[#FF8800] shadow-sm border border-[#FF8800]/20"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🏢 Ayuda para la Empresa</span>
            </button>
          </div>
        </div>

        {/* CONTENIDO TAB 1: GUÍA INTERACTIVA PARA EL USUARIO / COMPRADOR */}
        {activeTab === 'user' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            
            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-[#E6F4FA] text-[#0077BB] flex items-center justify-center font-bold text-lg">
                1️⃣
              </div>
              <h3 className="text-base font-extrabold text-[#333333] font-poppins">Explorar Catálogo & Filtros</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Navegue libremente por el catálogo completo. Utilice la barra de búsqueda general y los filtros por Empresa o Tipo de Producto (Bienes o Servicios) sin restricciones de tope de precio.
              </p>
              <Link href="/" className="inline-block text-xs font-extrabold text-[#0077BB] hover:underline pt-1 font-poppins">
                Ir al Catálogo →
              </Link>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF3E5] text-[#FF8800] flex items-center justify-center font-bold text-lg">
                2️⃣
              </div>
              <h3 className="text-base font-extrabold text-[#333333] font-poppins">Recargar Saldo en EURT</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Adquiera EuroTokens en el portal Stripe instantáneo. Elija montos estándar (€50, €100, €500) o monto personalizado y los fondos se acreditarán en su billetera Web3.
              </p>
              <Link href="/topup" className="inline-block text-xs font-extrabold text-[#FF8800] hover:underline pt-1 font-poppins">
                Recargar EURT Ahora →
              </Link>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-[#EAF5EF] text-[#2E8B57] flex items-center justify-center font-bold text-lg">
                3️⃣
              </div>
              <h3 className="text-base font-extrabold text-[#333333] font-poppins">Carrito Unificado & Escrow</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Finalice sus compras en 1 solo paso. Al presionar "Pagar con EURT", sus tokens quedan retenidos de forma inmutable en el Smart Contract de Custodia Escrow.
              </p>
              <Link href="/cart" className="inline-block text-xs font-extrabold text-[#2E8B57] hover:underline pt-1 font-poppins">
                Ver Mi Carrito →
              </Link>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-[#E6F4FA] text-[#0077BB] flex items-center justify-center font-bold text-lg">
                4️⃣
              </div>
              <h3 className="text-base font-extrabold text-[#333333] font-poppins">Seguimiento de Envíos & Ficha</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                En "Mis Pedidos", haga clic en cualquier orden para abrir la Ficha Flotante. Verifique el estado del despacho y el número de guía asignado por la empresa.
              </p>
              <Link href="/orders" className="inline-block text-xs font-extrabold text-[#0077BB] hover:underline pt-1 font-poppins">
                Ir a Mis Pedidos →
              </Link>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF3E5] text-[#FF8800] flex items-center justify-center font-bold text-lg">
                5️⃣
              </div>
              <h3 className="text-base font-extrabold text-[#333333] font-poppins">Firma de Recepción & Fondos</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Al recibir el paquete, presione "✍️ Firmar Entrega Recibida". Esto autoriza con su MetaMask la liberación de los fondos en custodia hacia la empresa vendedora.
              </p>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                6️⃣
              </div>
              <h3 className="text-base font-extrabold text-[#333333] font-poppins">Factura PDF & Valoración</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Descargue su comprobante oficial en PDF con código QR y califique a la empresa de 1 a 5 estrellas inmediatamente o mediante la ventana automática de 24h.
              </p>
            </div>

          </div>
        ) : (
          /* CONTENIDO TAB 2: GUÍA INTERACTIVA PARA LA EMPRESA / VENDEDOR */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            
            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF3E5] text-[#FF8800] flex items-center justify-center font-bold text-lg">
                🏛️
              </div>
              <h3 className="text-base font-extrabold text-[#333333] font-poppins">Inscripción Comercial Web3</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Inscriba su Razón Social, correo de contacto y tipo de negocio (Productos o Servicios) en la Consola Web Admin con la tasa de verificación on-chain.
              </p>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-[#E6F4FA] text-[#0077BB] flex items-center justify-center font-bold text-lg">
                📦
              </div>
              <h3 className="text-base font-bold text-[#333333] font-poppins">Gestión de Catálogo & Stock</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Publique nuevos artículos o servicios, establezca precios en EURT (6 decimales) y gestione existencias en tiempo real desde el módulo de Inventario.
              </p>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-[#EAF5EF] text-[#2E8B57] flex items-center justify-center font-bold text-lg">
                🚚
              </div>
              <h3 className="text-base font-bold text-[#333333] font-poppins">Despacho Logístico & Guía</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Al recibir una orden, asigne el operador de transporte (DHL, FedEx, MRW, Delivery Express) e introduzca el número de guía para notificar al cliente.
              </p>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                💰
              </div>
              <h3 className="text-base font-bold text-[#333333] font-poppins">Recepción de Pagos Liberados</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Una vez que el cliente firma la recepción, los fondos retenidos en Escrow se transfieren de forma automática e inalterable a su billetera Web3.
              </p>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg">
                📊
              </div>
              <h3 className="text-base font-bold text-[#333333] font-poppins">Auditoría Financiera & Envíos</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Monitoree saldos en custodia, facturas emitidas y métricas de desempeño desde la Consola Financiera y el historial de Auditoría on-chain.
              </p>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                ⭐
              </div>
              <h3 className="text-base font-bold text-[#333333] font-poppins">Reputación y Estrellas</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mantenga altos estándares de entrega para consolidar la puntuación en estrellas otorgada por sus clientes en el ecosistema BARLO-VENTAS.
              </p>
            </div>

          </div>
        )}

      </section>

      {/* FOOTER DE ASISTENCIA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="bg-[#0077BB] text-white rounded-3xl p-8 text-center space-y-3 shadow-xl">
          <h3 className="text-2xl font-black font-poppins">¿Necesita asistencia personalizada adicional?</h3>
          <p className="text-xs text-sky-100 max-w-xl mx-auto">
            Nuestro equipo de soporte técnico y comunidad Web3 están siempre disponibles para atender sus inquietudes con la mayor cortesía y eficiencia.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="px-6 py-3 bg-[#FF8800] hover:bg-[#E07700] text-white font-extrabold text-xs rounded-xl shadow-md transition font-poppins inline-block"
            >
              Volver al Catálogo Principal
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
