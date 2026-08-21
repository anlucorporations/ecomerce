'use client';

import { useState } from 'react';
import Link from 'next/link';

import AddEurtModal from '@/components/add-eurt-modal';

interface FAQItem {
  id: string;
  category: 'general' | 'metamask' | 'purchases' | 'escrow' | 'invoices';
  question: string;
  answer: string;
}

const FAQ_LIST: FAQItem[] = [
  {
    id: 'faq-0',
    category: 'metamask',
    question: '💶 ¿Cómo agrego el Token EURT (EuroToken) a mi billetera MetaMask?',
    answer: 'Puede agregar el Token EURT en 1-Clic presionando el botón "🦊 Agregar EURT a MetaMask" en el encabezado o en esta guía. Si prefiere hacerlo manualmente, abra MetaMask, seleccione "Importar Tokens", pestaña "Token Personalizado", y pegue la dirección de contrato: 0x5FbDB2315678afecb367f032d93F642f64180aa3 con 6 decimales.'
  },
  {
    id: 'faq-1',
    category: 'metamask',
    question: '🦊 ¿Cómo conecto mi billetera MetaMask a la plataforma por primera vez?',
    answer: 'Para conectar su billetera, instale la extensión de MetaMask en su navegador (Chrome, Firefox, Brave) o la app en su dispositivo móvil. Haga clic en el botón "Conectar Wallet" en la barra superior y apruebe la solicitud en la ventana emergente. ¡Es totalmente gratuito y no requiere compartir contraseñas privadas!'
  },
  {
    id: 'faq-2',
    category: 'metamask',
    question: '🔐 ¿Por qué es fundamental autorizar cada transacción con mi billetera?',
    answer: 'La autorización con su billetera MetaMask proporciona una firma criptográfica inalterable. A diferencia del comercio tradicional donde un tercero gestiona su dinero, en Web3 usted tiene el control total. Autorizar con su wallet garantiza que ningún pago se procese sin su consentimiento explícito.'
  },
  {
    id: 'faq-3',
    category: 'escrow',
    question: '🛡️ ¿Cómo funciona la Custodia Escrow y cómo protege mi dinero?',
    answer: 'Sus EuroTokens (EURT) no se transfieren de inmediato al vendedor. El contrato inteligente ("Smart Contract") los retiene en un depósito de custodia temporal ("Escrow Vault"). Los fondos se liberan únicamente cuando usted recibe su producto y presiona el botón "Firmar Entrega Recibida".'
  },
  {
    id: 'faq-4',
    category: 'purchases',
    question: '💶 ¿Qué es el EuroToken (EURT) y cómo recargo saldo con tarjeta de crédito?',
    answer: 'El EuroToken (EURT) es una stablecoin vinculada 1:1 con el Euro (€1.00 EURT = €1.00 EUR). Puede adquirir EuroTokens de forma inmediata con su tarjeta bancaria a través de nuestro portal seguro de Stripe en "💶 Recargar EURT". Los fondos se acreditarán instantáneamente en su billetera Web3.'
  },
  {
    id: 'faq-5',
    category: 'invoices',
    question: '📄 ¿Cómo descargo mi Factura Electrónica con código QR de verificación?',
    answer: 'Cada compra genera automáticamente una Factura Electrónica respaldada en Blockchain. Acceda a sus facturas en cualquier momento desde "Mis Pedidos" presionando "Ver / Descargar Factura PDF". Cada comprobante incluye el desglose de productos, hash on-chain y código QR fiscal.'
  },
  {
    id: 'faq-6',
    category: 'general',
    question: '⭐ ¿Cómo funciona el sistema de valoración y reputación de empresas?',
    answer: 'Al recibir su pedido, puede calificar a la empresa otorgando de 1 a 5 estrellas durante las primeras 24 horas. Si no emite calificación manual en ese periodo, el sistema asignará una valoración por defecto de 4 estrellas para mantener la reputación de la comunidad.'
  }
];

// All 10 images from ./Docs/imagenes/
const GALLERY_IMAGES = [
  {
    src: '/images/metamask_connect_guide_es_1787157454195.jpg',
    title: '🦊 Guía Paso a Paso MetaMask (Español)',
    category: 'Infografía Conexión',
    desc: 'Infografía en español explicando la instalación, conexión y firma de transacciones en MetaMask.'
  },
  {
    src: '/images/web3_security_escrow_es_1787157468573.jpg',
    title: '🛡️ Bóveda de Custodia Escrow (Español)',
    category: 'Infografía Seguridad',
    desc: 'Diagrama del flujo financiero seguro desde el pago del comprador hasta la liberación on-chain.'
  },
  {
    src: '/images/Gemini_Generated_Image_2fvmay2fvmay2fvm.jpg',
    title: '🛍️ E-Commerce Web3 BarloVentas',
    category: 'Plataforma Principal',
    desc: 'Ilustración conceptual de la experiencia de compra global en Web3.'
  },
  {
    src: '/images/Gemini_Generated_Image_fnkmf2fnkmf2fnkm.jpg',
    title: '🔐 Firma Criptográfica & Llave Privada',
    category: 'Seguridad Web3',
    desc: 'Visualización de la protección criptográfica no custodial de la billetera.'
  },
  {
    src: '/images/Gemini_Generated_Image_fnkmf2fnkmf2fnkm (1).jpg',
    title: '🔑 Autenticación Decentralizada',
    category: 'Seguridad Web3',
    desc: 'Seguridad en transacciones sin intermediarios bancarios.'
  },
  {
    src: '/images/Gemini_Generated_Image_hnoae4hnoae4hnoa.jpg',
    title: '🏰 Bóveda Inteligente de Smart Contracts',
    category: 'Custodia Escrow',
    desc: 'Contrato inteligente reteniendo fondos en custodia automatizada.'
  },
  {
    src: '/images/Gemini_Generated_Image_lgc972lgc972lgc9.jpg',
    title: '🚚 Logística y Guía de Transporte',
    category: 'Envíos Comerciales',
    desc: 'Gestión comercial de inventario, paquetes y código de seguimiento.'
  },
  {
    src: '/images/Gemini_Generated_Image_wg9l8lwg9l8lwg9l.jpg',
    title: '✍️ Confirmación de Entrega & Cobro',
    category: 'Despacho & Pago',
    desc: 'Firma de recepción del cliente y transferencia instantánea de EuroTokens.'
  },
  {
    src: '/images/metamask_connect_guide_1787153454896.jpg',
    title: '🦊 Diagrama Técnico de Billeteras',
    category: 'Arquitectura Web3',
    desc: 'Diagrama de integración para conectores Web3.'
  },
  {
    src: '/images/web3_security_escrow_1787153466948.jpg',
    title: '🛡️ Esquema de Seguridad Trustless',
    category: 'Arquitectura Web3',
    desc: 'Diagrama de flujo de custodia inteligente en Blockchain.'
  }
];

export default function CustomerHelpLandingPage() {
  const [activeTab, setActiveTab] = useState<'user' | 'company'>('user');
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-0');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<typeof GALLERY_IMAGES[0] | null>(null);
  const [isEurtModalOpen, setIsEurtModalOpen] = useState(false);

  const filteredFaqs = FAQ_LIST.filter((faq) => {
    const matchesSearch = faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(faqSearch.toLowerCase());
    const matchesCat = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#333333] font-sans pb-24 selection:bg-[#FF8800] selection:text-white">
      
      {/* 🚀 LANDING HERO BANNER */}
      <section className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800 shadow-2xl overflow-hidden">
        
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0077BB]/20 backdrop-blur-md text-sky-300 text-xs font-extrabold uppercase tracking-wider border border-[#0077BB]/30 font-poppins">
              <span>💡 Centro de Asistencia Interactiva Web3</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight font-poppins">
              Aprenda a Comprar con <span className="text-[#FF8800]">Seguridad y Confianza</span>
            </h1>
            
            <p className="text-sm sm:text-base text-sky-100 font-medium leading-relaxed max-w-2xl">
              Bienvenido al portal interactivo de asistencia de BARLO-VENTAS. Una guía amigable diseñada paso a paso para que cualquier usuario, sin conocimientos previos en blockchain, pueda conectar su billetera MetaMask y operar con la garantía de la Custodia Escrow.
            </p>

            <div className="pt-3 flex flex-wrap justify-center lg:justify-start gap-3">
              <button
                onClick={() => setIsEurtModalOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-xs rounded-2xl shadow-xl transition font-poppins flex items-center gap-2 transform active:scale-95"
              >
                <span>🦊</span>
                <span>Agregar EURT a MetaMask</span>
              </button>

              <Link
                href="#guia-metamask"
                className="px-6 py-3 bg-[#FF8800] hover:bg-[#E07700] text-[#FFFFFF] font-extrabold text-xs rounded-2xl shadow-xl transition font-poppins flex items-center gap-2"
              >
                <span>🔐</span>
                <span>Guía MetaMask Paso a Paso</span>
              </Link>

              <Link
                href="#boveda-escrow"
                className="px-6 py-3 bg-white/15 hover:bg-white/25 text-[#FFFFFF] font-extrabold text-xs rounded-2xl border border-white/30 transition font-poppins flex items-center gap-2"
              >
                <span>🛡️</span>
                <span>Custodia Escrow</span>
              </Link>

              <Link
                href="#galeria"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-[#FFFFFF] font-extrabold text-xs rounded-2xl shadow-lg transition font-poppins flex items-center gap-2"
              >
                <span>🖼️</span>
                <span>Galería de Infografías</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl bg-white hover:scale-105 transition duration-300">
              <img
                src="/images/Gemini_Generated_Image_2fvmay2fvmay2fvm.jpg"
                alt="Plataforma E-Commerce Web3 BARLO-VENTAS"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

        </div>
      </section>

      {/* 🦊 SECCIÓN LANDING 1: GUÍA PASO A PASO METAMASK */}
      <section id="guia-metamask" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14">
        <div className="bg-white border-2 border-[#FF8800]/40 rounded-3xl p-6 sm:p-10 shadow-xl space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="px-3.5 py-1 bg-[#FFF3E5] text-[#FF8800] text-xs font-black uppercase tracking-wider rounded-full font-mono">
              ⭐ PASO A PASO RECOMENDADO
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#333333] font-poppins">
              ¿Cómo Conectar y Operar con MetaMask?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              MetaMask es su llave de identidad criptográfica. Descubra cómo conectarla a BARLO-VENTAS y por qué firmar con ella le otorga la propiedad completa de su dinero.
            </p>
          </div>

          {/* GRID LANDING CON IMÁGENES DE DOCS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-[#E6F4FA] text-[#0077BB] font-black flex items-center justify-center font-mono">1</span>
                  <h3 className="font-extrabold text-sm text-[#333333] font-poppins">Instalar la Extensión Oficial</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-11">
                  Descargue la extensión MetaMask para su navegador o smartphone desde <strong className="text-[#0077BB]">metamask.io</strong>. Su frase semilla es su código secreto privado.
                </p>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-[#FFF3E5] text-[#FF8800] font-black flex items-center justify-center font-mono">2</span>
                  <h3 className="font-extrabold text-sm text-[#333333] font-poppins">Presionar "Conectar Wallet"</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-11">
                  Haga clic en el botón azul de la barra superior. MetaMask mostrará una ventana solicitando su permiso para enlazar la dirección de su billetera.
                </p>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-[#EAF5EF] text-[#2E8B57] font-black flex items-center justify-center font-mono">3</span>
                  <h3 className="font-extrabold text-sm text-[#333333] font-poppins">Autorizar con Firma Criptográfica</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-11">
                  Al recargar EURT o realizar compras, confirme la operación en MetaMask. Su firma no custodial garantiza que nadie pueda debitar fondos sin su consentimiento.
                </p>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-900">
                <img
                  src="/images/metamask_connect_guide_es_1787157454195.jpg"
                  alt="Guía ilustrada de conexión MetaMask en español"
                  className="w-full h-auto object-cover hover:scale-105 transition duration-300 cursor-pointer"
                  onClick={() => setSelectedGalleryImage(GALLERY_IMAGES[0])}
                />
              </div>
              <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-slate-900">
                <img
                  src="/images/Gemini_Generated_Image_fnkmf2fnkmf2fnkm.jpg"
                  alt="Seguridad criptográfica de billetera MetaMask"
                  className="w-full h-auto object-cover cursor-pointer"
                  onClick={() => setSelectedGalleryImage(GALLERY_IMAGES[3])}
                />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 🛡️ SECCIÓN LANDING 2: CUSTODIA ESCROW Y SEGURIDAD SMART CONTRACT */}
      <section id="boveda-escrow" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14">
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-[#005F96] text-white rounded-3xl p-6 sm:p-10 shadow-2xl space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="px-3.5 py-1 bg-white/20 text-white text-xs font-black uppercase tracking-wider rounded-full font-mono backdrop-blur-md">
              🛡️ GARANTÍA DE PROTECCIÓN FINANCIERA
            </span>
            <h2 className="text-3xl sm:text-4xl font-black font-poppins">
              Custodia Escrow On-Chain Inmutable
            </h2>
            <p className="text-xs sm:text-sm text-sky-100 leading-relaxed">
              En BARLO-VENTAS sus fondos no se transfieren al vendedor al comprar. Se depositan en una bóveda inteligente de custodia temporal hasta que reciba el pedido.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-3xl overflow-hidden border border-white/20 shadow-xl bg-slate-900">
                <img
                  src="/images/web3_security_escrow_es_1787157468573.jpg"
                  alt="Infografía del proceso de Custodia Escrow en español"
                  className="w-full h-auto object-cover hover:scale-105 transition duration-300 cursor-pointer"
                  onClick={() => setSelectedGalleryImage(GALLERY_IMAGES[1])}
                />
              </div>
              <div className="rounded-3xl overflow-hidden border border-white/20 shadow-lg bg-slate-900">
                <img
                  src="/images/Gemini_Generated_Image_hnoae4hnoae4hnoa.jpg"
                  alt="Bóveda inteligente de custodia Escrow"
                  className="w-full h-auto object-cover cursor-pointer"
                  onClick={() => setSelectedGalleryImage(GALLERY_IMAGES[5])}
                />
              </div>
            </div>

            <div className="lg:col-span-6 space-y-5">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔐</span>
                  <h3 className="font-extrabold text-base font-poppins text-white">Retención Segura en Smart Contract</h3>
                </div>
                <p className="text-xs text-sky-100 leading-relaxed">
                  Sus EuroTokens quedan custodiados en el código auditado de <code className="bg-white/20 px-1.5 py-0.5 rounded font-mono text-white">Ecommerce.sol</code>. La empresa no puede retirar el dinero por adelantado.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚚</span>
                  <h3 className="font-extrabold text-base font-poppins text-white">Despacho y Código de Seguimiento</h3>
                </div>
                <p className="text-xs text-sky-100 leading-relaxed">
                  La empresa vendedora asigna el operador logístico (DHL, FedEx, MRW, Delivery Expreso) y registra el código de seguimiento (Tracking ID) en la blockchain.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✍️</span>
                  <h3 className="font-extrabold text-base font-poppins text-white">Firma de Recepción & Pago Automático</h3>
                </div>
                <p className="text-xs text-sky-100 leading-relaxed">
                  Al recibir el paquete en su hogar, presione "✍️ Firmar Entrega Recibida". En ese instante, el contrato inteligente transfiere los EURT a la billetera de la empresa.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 🖼️ SECCIÓN LANDING 3: GALERÍA DE TODAS LAS INFOGRAFÍAS E ILUSTRACIONES DE ./Docs/imagenes */}
      <section id="galeria" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 space-y-8">
        
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <span className="px-3.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black uppercase tracking-wider rounded-full font-mono">
            🖼️ RECURSOS VISUALES E ILUSTRACIONES DOCS
          </span>
          <h2 className="text-3xl font-black text-[#333333] font-poppins">
            Galería Completa de Infografías y Diagramas Web3
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Haga clic en cualquiera de las imágenes para ampliar la infografía en alta resolución y conocer los detalles técnicos del sistema.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GALLERY_IMAGES.map((img, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedGalleryImage(img)}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition duration-300 cursor-pointer group flex flex-col justify-between"
            >
              <div className="w-full h-48 bg-slate-900 relative overflow-hidden">
                <img
                  src={img.src}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                />
                <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full font-mono">
                  {img.category}
                </span>
              </div>
              <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-[#333333] font-poppins group-hover:text-[#0077BB] transition">
                    {img.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed pt-1">
                    {img.desc}
                  </p>
                </div>
                <div className="pt-3 text-[11px] font-bold text-[#0077BB] flex items-center justify-between border-t border-slate-100">
                  <span>🔍 Ampliar Infografía</span>
                  <span>↗</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* 💬 SECCIÓN LANDING 4: PREGUNTAS FRECUENTES (FAQ INTERACTIVO) */}
      <section id="faqs" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 space-y-6">
        
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="px-3.5 py-1 bg-[#E6F4FA] text-[#0077BB] border border-[#0077BB]/30 text-xs font-bold rounded-full font-mono inline-block">
            💬 Respuestas Claras a Dudas Frecuentes
          </span>
          <h2 className="text-3xl font-black text-[#333333] font-poppins">
            Preguntas Frecuentes de la Comunidad
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Escriba una duda o seleccione una categoría para obtener explicaciones sencillas.
          </p>
        </div>

        <div className="glass-card p-6 sm:p-8 shadow-xl rounded-3xl space-y-4 border border-slate-200 bg-white">
          
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="🔍 Escriba una duda (ej. recarga, factura, escrow, wallet, metamask)..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 pl-10 text-xs text-slate-800 focus:outline-none focus:border-[#0077BB] focus:bg-white font-medium"
              />
              <span className="absolute left-3.5 top-3.5 text-slate-400 text-sm">🔍</span>
            </div>

            <div className="flex flex-wrap gap-2 text-xs shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-2 rounded-xl font-bold font-poppins transition cursor-pointer ${
                  selectedCategory === 'all' ? "bg-[#0077BB] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setSelectedCategory('metamask')}
                className={`px-3.5 py-2 rounded-xl font-bold font-poppins transition cursor-pointer ${
                  selectedCategory === 'metamask' ? "bg-[#FF8800] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                🦊 MetaMask
              </button>
              <button
                onClick={() => setSelectedCategory('escrow')}
                className={`px-3.5 py-2 rounded-xl font-bold font-poppins transition cursor-pointer ${
                  selectedCategory === 'escrow' ? "bg-[#2E8B57] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                🛡️ Escrow
              </button>
              <button
                onClick={() => setSelectedCategory('purchases')}
                className={`px-3.5 py-2 rounded-xl font-bold font-poppins transition cursor-pointer ${
                  selectedCategory === 'purchases' ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                💶 EURT
              </button>
            </div>

          </div>

          <div className="space-y-3 pt-2">
            {filteredFaqs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No se encontraron preguntas que coincidan con su búsqueda. Intente con otros términos.
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

      {/* 📖 SECCIÓN LANDING 5: MANUALES DE USO INTERACTIVOS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-[10px] uppercase font-mono font-extrabold text-[#0077BB] tracking-wider block">
              📖 GUÍAS DE USO INTERACTIVAS DE PLATAFORMA
            </span>
            <h2 className="text-3xl font-black text-[#333333] font-poppins">
              Manuales de Uso por Perfil de Usuario
            </h2>
          </div>

          <div className="flex p-1.5 bg-slate-200/80 rounded-2xl font-poppins border border-[#0077BB]/10 shrink-0">
            <button
              onClick={() => setActiveTab('user')}
              className={`py-2.5 px-5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'user'
                  ? "bg-white text-[#0077BB] shadow-sm border border-[#0077BB]/20"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>👤 Guía para Usuarios</span>
            </button>

            <button
              onClick={() => setActiveTab('company')}
              className={`py-2.5 px-5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'company'
                  ? "bg-white text-[#FF8800] shadow-sm border border-[#FF8800]/20"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🏢 Guía para Empresas</span>
            </button>
          </div>
        </div>

        {activeTab === 'user' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-[#E6F4FA] text-[#0077BB] flex items-center justify-center font-bold text-lg">
                1️⃣
              </div>
              <h3 className="text-base font-extrabold text-[#333333] font-poppins">Explorar Catálogo sin Filtro de Precio</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Filtre todos los productos y servicios por empresa o tipo sin límites de precio rígidos.
              </p>
              <Link href="/" className="inline-block text-xs font-extrabold text-[#0077BB] hover:underline pt-1 font-poppins">
                Ir al Catálogo →
              </Link>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF3E5] text-[#FF8800] flex items-center justify-center font-bold text-lg">
                2️⃣
              </div>
              <h3 className="text-base font-extrabold text-[#333333] font-poppins">Recarga en EURT con Tarjeta</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Adquiera EuroTokens mediante la pasarela segura de Stripe en "💶 Recargar EURT".
              </p>
              <Link href="/topup" className="inline-block text-xs font-extrabold text-[#FF8800] hover:underline pt-1 font-poppins">
                Recargar Saldo →
              </Link>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-[#EAF5EF] text-[#2E8B57] flex items-center justify-center font-bold text-lg">
                3️⃣
              </div>
              <h3 className="text-base font-extrabold text-[#333333] font-poppins">Pago Unificado & Multi-Empresa</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Realice compras de múltiples empresas en 1 solo paso con depósito en Custodia Escrow.
              </p>
              <Link href="/cart" className="inline-block text-xs font-extrabold text-[#2E8B57] hover:underline pt-1 font-poppins">
                Ver Mi Carrito →
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF3E5] text-[#FF8800] flex items-center justify-center font-bold text-lg">
                🏢
              </div>
              <h3 className="text-base font-extrabold text-[#333333] font-poppins">Inscripción Comercial</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Inscriba su Razón Social y correo institucional en la Consola Web Admin.
              </p>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-[#E6F4FA] text-[#0077BB] flex items-center justify-center font-bold text-lg">
                📦
              </div>
              <h3 className="text-base font-bold text-[#333333] font-poppins">Gestión de Inventario</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Publique productos y servicios ajustando precios en EURT y existencias.
              </p>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-slate-200 space-y-3 bg-white hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-2xl bg-[#EAF5EF] text-[#2E8B57] flex items-center justify-center font-bold text-lg">
                🚚
              </div>
              <h3 className="text-base font-bold text-[#333333] font-poppins">Despacho & Guía de Tracking</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Asigne el transporte e introduzca el número de seguimiento para notificar al comprador.
              </p>
            </div>
          </div>
        )}

      </section>

      {/* 🔍 MODAL AMPLIZADOR DE INFOGRAFÍAS */}
      {selectedGalleryImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedGalleryImage(null)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-700 w-10 h-10 rounded-full font-bold flex items-center justify-center cursor-pointer transition"
            >
              ✕
            </button>
            <div className="space-y-1 pr-10">
              <span className="px-3 py-1 bg-sky-100 text-[#0077BB] text-[10px] font-bold rounded-full font-mono uppercase">
                {selectedGalleryImage.category}
              </span>
              <h3 className="text-xl font-black text-[#333333] font-poppins">
                {selectedGalleryImage.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {selectedGalleryImage.desc}
              </p>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
              <img
                src={selectedGalleryImage.src}
                alt={selectedGalleryImage.title}
                className="w-full h-auto object-contain max-h-[65vh]"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedGalleryImage(null)}
                className="px-6 py-2.5 bg-[#0077BB] hover:bg-[#005F96] text-white font-extrabold text-xs rounded-xl shadow cursor-pointer font-poppins"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER LANDING AYUDA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="bg-[#0077BB] text-white rounded-3xl p-10 text-center space-y-4 shadow-xl">
          <h3 className="text-3xl font-black font-poppins">¿Listo para comenzar a comprar en Web3?</h3>
          <p className="text-xs sm:text-sm text-sky-100 max-w-xl mx-auto">
            Explore el catálogo de productos y servicios con la mayor seguridad y transparencia del mercado.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="px-8 py-3.5 bg-[#FF8800] hover:bg-[#E07700] text-white font-extrabold text-xs rounded-2xl shadow-lg transition font-poppins inline-block"
            >
              Ir a la Tienda Principal
            </Link>
          </div>
        </div>
      </section>

      {/* 🦊 MODAL AGREGAR EURT A METAMASK */}
      <AddEurtModal isOpen={isEurtModalOpen} onClose={() => setIsEurtModalOpen(false)} />

    </div>
  );
}
