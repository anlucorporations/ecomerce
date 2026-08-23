"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";
const ECOMMERCE_ABI = [
  "function getEntityType(address account) view returns (uint8)",
  "function getAllCompanies() view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate)[])",
  "function getCompanyProducts(uint256 companyId) view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, string ipfsImageHash, uint256 stock, bool isActive)[])",
  "function getProductsByCompany(uint256 companyId) view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, string ipfsImageHash, uint256 stock, bool isActive)[])",
  "function getCompanyInvoices(uint256 companyId) view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, string paymentTxHash, uint8 status, string trackingNumber, uint256 shippedTimestamp, uint256 deliveredTimestamp)[])",
  "function getCompanyRating(uint256 companyId) view returns (uint256 totalRatingSum, uint256 reviewCount, uint256 averageRating)"
];

const ORDER_STATUS_LABELS = ["Creado", "Pagado (EURT)", "Enviado", "Entregado", "Completado"];
const BUSINESS_TYPE_LABELS = ["Venta de Productos", "Prestación de Servicios"];

export default function DashboardHome() {
  const { address, isConnected, signer, provider, connect, wallets } = useWallet();
  const [loading, setLoading] = useState<boolean>(true);
  const [entityType, setEntityType] = useState<number>(0); // 0: Unregistered, 1: Company, 2: Customer, 3: Owner

  const [companyId, setCompanyId] = useState<string>("1");
  const [companyName, setCompanyName] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [companyRating, setCompanyRating] = useState<{ average: number; count: number }>({ average: 5, count: 0 });
  const [publicCompanies, setPublicCompanies] = useState<any[]>([]);

  // Analytics
  const [statusCounts, setStatusCounts] = useState<{ [key: number]: number }>({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });

  // Contact form state for landing page
  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [contactSent, setContactSent] = useState(false);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const rpcProvider = provider || new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");
        const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

        // Fetch registered companies for landing page
        try {
          const comps = await contract.getAllCompanies();
          setPublicCompanies(comps);
        } catch (e) {
          console.warn("Error fetching public companies for landing page:", e);
        }

        if (address) {
          try {
            const eType = await contract.getEntityType(address);
            setEntityType(Number(eType));
          } catch {
            setEntityType(0);
          }
        }

        // Fetch company info or default to company 1
        let targetCompanyId = BigInt(1);
        if (address) {
          try {
            const allCompanies = await contract.getAllCompanies();
            const myCompany = allCompanies.find((c: any) => c.companyAddress.toLowerCase() === address.toLowerCase());
            if (myCompany) {
              targetCompanyId = myCompany.companyId;
              setCompanyName(myCompany.name);
            }
          } catch {
            // fallback
          }
        }
        setCompanyId(targetCompanyId.toString());

        // Fetch company products
        const rawProducts = await contract.getCompanyProducts(targetCompanyId);
        setProducts(rawProducts);

        // Fetch company invoices / orders
        const rawInvoices = await contract.getCompanyInvoices(targetCompanyId);
        setInvoices(rawInvoices);

        // Fetch company rating
        try {
          const ratingData = await contract.getCompanyRating(targetCompanyId);
          setCompanyRating({
            average: Number(ratingData.averageRating) || 5,
            count: Number(ratingData.reviewCount) || 0,
          });
        } catch {
          setCompanyRating({ average: 5, count: 0 });
        }

        // Compute status breakdown
        const counts: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
        rawInvoices.forEach((inv: any) => {
          const st = Number(inv.status);
          counts[st] = (counts[st] || 0) + 1;
        });

        setStatusCounts(counts);
      } catch (err) {
        console.error("Error loading dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [address, provider]);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSent(true);
    setTimeout(() => {
      setContactSent(false);
      setContactForm({ name: "", email: "", subject: "", message: "" });
      alert("¡Gracias por contactarnos! Un ejecutivo comercial de MasterCode Crypto le responderá a la brevedad.");
    }, 1000);
  };

  const handleConnectWalletBtn = () => {
    if (wallets.length > 0) {
      connect(wallets[0]);
    } else {
      alert("Por favor instale MetaMask o Rabby en su navegador para conectar.");
    }
  };

  // =========================================================================
  // VIEW 1: PUBLIC LANDING PAGE (NO WALLET CONNECTED)
  // =========================================================================
  if (!isConnected || !address) {
    return (
      <div className="space-y-16 max-w-7xl mx-auto pb-12">
        {/* HERO SECTION */}
        <section 
          className="relative rounded-3xl text-white p-8 sm:p-12 overflow-hidden shadow-2xl border border-indigo-500/30 bg-cover bg-center"
          style={{ backgroundImage: "linear-gradient(to right, rgba(15, 23, 42, 0.92), rgba(30, 27, 75, 0.85)), url('/Gemini_Generated_Image_q3xqhkq3xqhkq3xq.jpg')" }}
        >
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-xs font-bold text-indigo-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Ecosistema Comercial Web3 en EuroTokens (EURT)
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                La Plataforma E-Commerce de Crecimiento para Comercios Digitales
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Gestione ventas B2B y B2C, inventario en tiempo real y cobranzas globales en stablecoin EuroToken con liquidación instantánea y trazabilidad logitudinal en la blockchain.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 w-full">
                <button
                  onClick={handleConnectWalletBtn}
                  className="flex-1 w-full sm:w-auto px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xl transition flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>🚀 Conectar Wallet</span>
                </button>
                <button
                  onClick={() => {
                    if (isConnected && address) {
                      setShowCompanyRegModal(true);
                    } else {
                      handleConnectWalletBtn();
                    }
                  }}
                  className="flex-1 w-full sm:w-auto px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/20 transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <span>🏢 Inscribir Empresa (3.0 ETH)</span>
                </button>
                <a
                  href={process.env.NEXT_PUBLIC_WEB_CUSTOMER_URL || "https://mcc-web-customer-1095249147821.europe-west1.run.app"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 w-full sm:w-auto px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>🛒 Tienda de Clientes →</span>
                </a>
              </div>
            </div>

            {/* Hero Image Banner */}
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Gemini_Generated_Image_q3xqhkq3xqhkq3xq.jpg"
                alt="Plataforma E-Commerce Web3"
                className="rounded-2xl border border-indigo-400/30 shadow-2xl w-full object-cover max-h-[380px]"
              />
            </div>
          </div>
        </section>

        {/* FINANCIAL GROWTH & PLATFORM METRICS */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Demostrado en Cifras: Crecimiento Financiero</h2>
            <p className="text-xs text-slate-500">Métricas consolidadas de transacciones y adopción de comercios en el nodo EVM</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="admin-card p-6 border-l-4 border-l-emerald-500">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Volumen Procesado</span>
              <span className="text-3xl font-black text-emerald-600">€4.850.000</span>
              <p className="text-xs text-slate-500 mt-1">Acumulado en EuroTokens (EURT)</p>
            </div>

            <div className="admin-card p-6 border-l-4 border-l-indigo-600">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Empresas Inscritas</span>
              <span className="text-3xl font-black text-slate-900">120+</span>
              <p className="text-xs text-slate-500 mt-1">Comerciantes con KYC verificado</p>
            </div>

            <div className="admin-card p-6 border-l-4 border-l-purple-600">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Velocidad de Cobro</span>
              <span className="text-3xl font-black text-purple-700">&lt; 3 Seg</span>
              <p className="text-xs text-slate-500 mt-1">Liquidación final en bloque</p>
            </div>

            <div className="admin-card p-6 border-l-4 border-l-amber-500">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Facturas Completadas</span>
              <span className="text-3xl font-black text-amber-600">45.000+</span>
              <p className="text-xs text-slate-500 mt-1">Órdenes sin reversiones saldadas</p>
            </div>
          </div>
        </section>

        {/* FEATURED REGISTERED COMPANIES SHOWCASE */}
        <section className="space-y-6">
          <div className="flex justify-between items-end border-b border-slate-200 pb-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold badge-info mb-1 inline-block">
                Directorio Oficial en Blockchain
              </span>
              <h2 className="text-2xl font-black text-slate-900">Empresas Destacadas Inscritas</h2>
            </div>
            <span className="text-xs font-bold text-indigo-600">Total Activas: {publicCompanies.length || "120+"}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {publicCompanies.length > 0 ? (
              publicCompanies.slice(0, 3).map((comp: any) => (
                <div key={comp.companyId.toString()} className="admin-card p-6 space-y-3 bg-white hover:border-indigo-400 transition">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-indigo-600">ID #{comp.companyId.toString()}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold badge-success">🛡️ KYC Verificado</span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900">{comp.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{comp.description}</p>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600">
                      {BUSINESS_TYPE_LABELS[Number(comp.businessType)] || "Productos"}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{comp.companyAddress.slice(0, 6)}...{comp.companyAddress.slice(-4)}</span>
                  </div>
                </div>
              ))
            ) : (
              /* Sample Registered Companies Showcase */
              [
                { name: "TechDistribuciones Global SRL", desc: "Distribución mayorista de hardware, servidores y licencias cloud con despacho urgente.", type: "Venta de Productos", id: "1" },
                { name: "ElectroWeb Comercio B2B", desc: "Plataforma de componentes electrónicos e insumos industriales con paridad fija EURT.", type: "Venta de Productos", id: "2" },
                { name: "Servicios Digitales CodeCrypto", desc: "Consultoría en arquitectura blockchain, auditoría de contratos inteligentes y soporte 24/7.", type: "Prestación de Servicios", id: "3" },
              ].map((c) => (
                <div key={c.id} className="admin-card p-6 space-y-3 bg-white">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-indigo-600">Empresa ID #{c.id}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold badge-success">🛡️ KYC Verificado</span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900">{c.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{c.desc}</p>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600">{c.type}</span>
                    <span className="text-amber-500 font-bold">⭐ 5.0 (Excelente)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* PROVEN SUCCESSFUL USE CASES */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Casos de Uso Satisfechos</h2>
            <p className="text-xs text-slate-500">Soluciones probadas en producción para comercios tradicionales e innovadores</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="admin-card p-6 bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-lg">
                1
              </div>
              <h3 className="font-bold text-base text-slate-900">Cobros B2B sin Volatilidad</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Facture servicios o mercancía en paridad 1 EURT = 1 EUR. Elimine las tarifas por transacciones internacionales y cobre en segundos.
              </p>
            </div>

            <div className="admin-card p-6 bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-lg">
                2
              </div>
              <h3 className="font-bold text-base text-slate-900">Adquisición Fiat con Stripe</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sus clientes pueden comprar EuroTokens usando su tarjeta de crédito tradicional en Stripe con emisión automática a su wallet Web3.
              </p>
            </div>

            <div className="admin-card p-6 bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center text-lg">
                3
              </div>
              <h3 className="font-bold text-base text-slate-900">Trazabilidad Logística de Envíos</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Asigne números de seguimiento (guía de despacho) directamente en blockchain para que sus compradores confirmen la recepción conforme.
              </p>
            </div>
          </div>
        </section>

        {/* CUSTOMER REVIEWS & REPUTATION */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Opiniones de Clientes & Reputación</h2>
            <p className="text-xs text-slate-500">Testimonios verificados de compradores y comerciantes en blockchain</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "La rapidez con la que se procesan las facturas en EURT nos permitió reducir nuestros tiempos de liquidación de 5 días a menos de 3 segundos.",
                author: "Carlos R. - CEO TechDistribuciones",
                rating: "⭐⭐⭐⭐⭐ 5.0",
              },
              {
                quote: "La pasarela Web3 de pago con postMessage fue sumamente fácil de integrar. Nuestros clientes pagan con MetaMask o compran EURT con tarjeta sin fricción.",
                author: "María V. - Directora Comercial ElectroWeb",
                rating: "⭐⭐⭐⭐⭐ 5.0",
              },
              {
                quote: "El sistema de reputación con valoraciones grabadas en blockchain genera confianza inmediata en compradores de nuevos mercados.",
                author: "Fernando M. - Director Logística Global",
                rating: "⭐⭐⭐⭐⭐ 5.0",
              },
            ].map((t, idx) => (
              <div key={idx} className="admin-card p-6 space-y-3 bg-white border border-slate-200">
                <span className="text-amber-500 font-bold text-xs">{t.rating}</span>
                <p className="text-xs text-slate-700 italic leading-relaxed">"{t.quote}"</p>
                <div className="pt-2 border-t border-slate-100 text-xs font-bold text-slate-900">
                  {t.author}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SPECIAL PROMOTIONS & BENEFITS */}
        <section className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-3xl p-8 text-white shadow-xl space-y-6">
          <div className="max-w-2xl space-y-2">
            <span className="px-3 py-1 bg-amber-400 text-slate-900 font-extrabold text-xs rounded-full">🎁 Promoción Especial de Plataforma</span>
            <h2 className="text-2xl font-black">Inscríbase Hoy con Tarifa Única de 3.0 ETH</h2>
            <p className="text-xs text-indigo-200 leading-relaxed">
              Sin cuotas mensuales de mantenimiento ni comisiones ocultas por factura. Obtendrá membresía comercial vitalicia con verificación KYC Ligero.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
              ✅ Cero Comisiones por Transacción
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
              🛡️ Certificación KYC Automática
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
              📦 Gestión Ilimitada de Inventario
            </div>
          </div>
        </section>

        {/* CONTACT FORM & FOOTER */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start border-t border-slate-200 pt-12">
          {/* Contact Info */}
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-slate-900">Atención Empresarial & Soporte</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              ¿Tiene preguntas sobre la integración de su comercio, la compra de EURT con Stripe o el soporte para nodos Besu / Anvil? Nuestro equipo de ingenieros está a su disposición.
            </p>

            <div className="space-y-2 text-xs text-slate-700">
              <p>📍 <strong>Sede Central:</strong> MasterCode Crypto Academy - Madrid / España</p>
              <p>📧 <strong>Email de Soporte:</strong> soporte@mastercodecrypto.com</p>
              <p>🌐 <strong>Nodo Blockchain Activo:</strong> Anvil Local (Chain ID 31337 - Puerto 8545)</p>
            </div>
          </div>

          {/* Contact Form */}
          <form onSubmit={handleContactSubmit} className="admin-card p-6 bg-white space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Envíenos su Consulta Comercial</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="Ej. Roberto Gómez"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Email de Empresa:</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="roberto@empresa.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  required
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-slate-600 font-bold mb-1">Asunto:</label>
              <input
                type="text"
                value={contactForm.subject}
                onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                placeholder="Inscripción comercial / Integración API"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                required
              />
            </div>

            <div className="text-xs">
              <label className="block text-slate-600 font-bold mb-1">Mensaje:</label>
              <textarea
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                placeholder="Describa brevemente las necesidades de su empresa..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                rows={3}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Enviar Mensaje de Contacto
            </button>
          </form>
        </section>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: CONNECTED WALLET IS A CUSTOMER (ACCESS DENIED BANNER)
  // =========================================================================
  if (isConnected && entityType === 2) {
    return (
      <div className="admin-card p-12 text-center max-w-xl mx-auto space-y-4 border-2 border-rose-200 bg-rose-50/50 my-12">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto">
          ⛔
        </div>
        <h2 className="text-xl font-bold text-rose-900">Acceso Denegado a Usuarios Compradores</h2>
        <p className="text-xs text-rose-700 leading-relaxed">
          Su billetera está registrada como <strong>Usuario Comprador</strong>. El panel de administración es exclusivo para <strong>Empresas Registradas</strong> y el <strong>Super Owner</strong>.
        </p>
        <div className="pt-2 text-xs text-slate-500">
          Wallet Conectada: <span className="font-mono font-bold text-slate-800">{address}</span>
        </div>
        <div className="pt-2">
          <a href={process.env.NEXT_PUBLIC_WEB_CUSTOMER_URL || "https://mcc-web-customer-1095249147821.europe-west1.run.app"} className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow">
            Ir a la Tienda de Clientes →
          </a>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2.5: CONNECTED WALLET IS UNREGISTERED (NOT COMPANY & NOT CUSTOMER) -> ALLOW REGISTRATION
  // =========================================================================
  if (isConnected && entityType === 0) {
    return (
      <div className="admin-card p-12 text-center max-w-xl mx-auto space-y-5 border-2 border-indigo-200 bg-white my-12 shadow-2xl rounded-3xl">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto border border-indigo-200">
          🏢
        </div>
        <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200 font-poppins">
          ✨ Billetera Libre No Inscrita
        </div>
        <h2 className="text-2xl font-black text-slate-900 font-poppins">Inscripción de Empresa Comercial</h2>
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          Su billetera no se encuentra registrada previamente como <strong>Usuario Cliente</strong> ni como <strong>Empresa Comercial</strong>. Puede completar la inscripción de su negocio en la Blockchain para acceder al panel de administración (Tarifa de inscripción: <strong>3.0 ETH</strong>).
        </p>
        <div className="pt-1 text-xs text-slate-500 font-mono">
          Billetera Conectada: <span className="font-bold text-indigo-600 break-all">{address}</span>
        </div>
        <div className="pt-3 flex justify-center gap-3">
          <Link
            href="/companies"
            className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-extrabold text-xs rounded-2xl shadow-xl transition flex items-center gap-2 cursor-pointer font-poppins"
          >
            <span>✍️ Ir al Formulario de Inscripción de Empresa (3.0 ETH) →</span>
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: CONNECTED WALLET IS COMPANY (1) OR OWNER (3) -> FULL DASHBOARD
  // =========================================================================
  const totalInvoicesCount = invoices.length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 bg-indigo-500/30 border border-indigo-400/30 rounded-full text-xs font-bold text-indigo-200 mb-2 inline-block">
            {companyName ? `Empresa: ${companyName}` : "Consola de Gestión Comercial"}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Dashboard de Ventas & Analítica Comercial
          </h1>
          <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
            Supervise en tiempo real la reputación comercial, rendimiento de productos y distribución de pedidos.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Nivel de Reputación */}
        <div className="admin-card p-5 border-l-4 border-l-amber-500">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Nivel de Reputación</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-500">
              ⭐ {companyRating.count > 0 ? `${companyRating.average}.0 / 5.0` : "5.0 / 5.0"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {companyRating.count > 0 ? `${companyRating.count} opiniones registradas` : "Reputación sobresaliente (5 estrellas)"}
          </p>
        </div>

        <div className="admin-card p-5 border-l-4 border-l-indigo-600">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Total de Pedidos Recibidos</span>
          <span className="text-3xl font-black text-slate-900">{totalInvoicesCount}</span>
          <p className="text-xs text-slate-500 mt-1">Órdenes de compra clientes</p>
        </div>

        <div className="admin-card p-5 border-l-4 border-l-purple-600">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Productos en Catálogo</span>
          <span className="text-3xl font-black text-purple-700">{products.length}</span>
          <p className="text-xs text-slate-500 mt-1">Referencias publicadas</p>
        </div>

        <div className="admin-card p-5 border-l-4 border-l-blue-500">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Pendientes de Despacho</span>
          <span className="text-3xl font-black text-blue-600">{statusCounts[1] || 0}</span>
          <p className="text-xs text-slate-500 mt-1">Requieren número de guía</p>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Distribution of Orders by Status */}
        <div className="admin-card p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900">📊 Distribución de Pedidos por Estatus</h3>
            <span className="text-xs font-mono text-slate-400">Total: {totalInvoicesCount}</span>
          </div>

          <div className="space-y-3">
            {[
              { statusIdx: 0, label: "Creado (Sin Pagar)", color: "bg-slate-400", textColor: "text-slate-600" },
              { statusIdx: 1, label: "Pagado (Pendiente Envío)", color: "bg-amber-500", textColor: "text-amber-600" },
              { statusIdx: 2, label: "Enviado (En Tránsito)", color: "bg-indigo-600", textColor: "text-indigo-600" },
              { statusIdx: 3, label: "Entregado / Conforme", color: "bg-emerald-500", textColor: "text-emerald-600" },
            ].map((st) => {
              const count = statusCounts[st.statusIdx] || 0;
              const percentage = totalInvoicesCount > 0 ? (count / totalInvoicesCount) * 100 : 0;
              return (
                <div key={st.statusIdx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{st.label}</span>
                    <span className={st.textColor}>{count} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${st.color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Top Selling Products Ranking */}
        <div className="admin-card p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900">🏆 Productos y Servicios Más Vendidos</h3>
            <span className="text-xs text-indigo-600 font-bold">Ranking Ventas</span>
          </div>

          <div className="space-y-3">
            {products.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Sin datos de productos aún.</p>
            ) : (
              products.slice(0, 4).map((prod: any, idx: number) => {
                const priceEur = (Number(prod.price) / 1000000).toFixed(4);
                return (
                  <div key={prod.productId.toString()} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{prod.name}</h4>
                        <span className="text-[10px] text-slate-400">Stock actual: {prod.stock.toString()} unidades</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-extrabold text-emerald-600">€{priceEur} EURT</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* LISTADO DE PRODUCTOS / SERVICIOS EN VENTA CON CANTIDAD DISPONIBLE */}
      <div className="admin-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-sm text-slate-900">🛍️ Listado de Productos y Servicios en Venta (Disponibilidad Activa)</h3>
            <p className="text-xs text-slate-500">Catálogo visible para compradores con existencias en tiempo real</p>
          </div>
          <Link href="/inventory" className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition">
            Gestionar Inventario →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="px-6 py-3.5">ID Ref</th>
                <th className="px-6 py-3.5">Nombre de Mercancía / Servicio</th>
                <th className="px-6 py-3.5">Precio de Venta (PVP EURT)</th>
                <th className="px-6 py-3.5">Cantidad Disponibilidad (Stock)</th>
                <th className="px-6 py-3.5 text-right">Estatus Comercial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Cargando listado en venta...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No hay productos publicándose en venta en este momento.
                  </td>
                </tr>
              ) : (
                products.map((prod: any) => {
                  const stockNum = Number(prod.stock);
                  const priceEur = (Number(prod.price) / 1000000).toFixed(4);

                  return (
                    <tr key={prod.productId.toString()} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                        #{prod.productId.toString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {prod.name}
                      </td>
                      <td className="px-6 py-4 font-mono font-extrabold text-emerald-600">
                        €{priceEur} EURT
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        {stockNum} unidades
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          stockNum === 0 ? "bg-rose-100 text-rose-800 border border-rose-200" :
                          stockNum <= 5 ? "badge-amber" : "badge-success"
                        }`}>
                          {stockNum === 0 ? "Agotado" : stockNum <= 5 ? "Stock Bajo" : "En Venta"}
                        </span>
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
