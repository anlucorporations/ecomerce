'use client';

import { useEffect, useState, useMemo } from 'react';
import { useContract } from '@/hooks/useContract';
import { useWallet } from '@/hooks/useWallet';
import { useCart } from '@/hooks/useCart';
import Link from 'next/link';
import { ethers } from 'ethers';

interface Product {
  productId: bigint;
  companyId: bigint;
  name: string;
  description: string;
  price: bigint;
  ipfsImageHash: string;
  stock: bigint;
  isActive: boolean;
}

const ECOMMERCE_ABI = [
  "function getAllProducts() view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, string ipfsImageHash, uint256 stock, bool isActive)[])",
  "function getAllCompanies() view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate)[])"
];

function getProductRating(productId: bigint) {
  const seed = Number(productId);
  const ratings = [4.7, 4.9, 4.8, 5.0, 4.6, 4.9];
  const reviews = [42, 128, 89, 210, 64, 175];
  const idx = (seed - 1) % ratings.length;
  return {
    score: ratings[idx] || 4.8,
    count: reviews[idx] || 95
  };
}

interface CompanyDetails {
  id: string;
  name: string;
  businessType: number; // 0: Venta de Productos, 1: Prestacion de Servicios
}

const FALLBACK_PRODUCTS: Product[] = [
  {
    productId: BigInt(1),
    companyId: BigInt(1),
    name: "Café Gourmet Cacao Sol",
    description: "Granos de café orgánico de alta montaña con notas de cacao y caribe.",
    price: BigInt(18500000),
    ipfsImageHash: "QmVerticalCoffeeCacaoSol",
    stock: BigInt(50),
    isActive: true,
  },
  {
    productId: BigInt(2),
    companyId: BigInt(1),
    name: "Cacao Puro Verde Manglar",
    description: "Cacao 100% orgánico prensado en frío para repostería y bebidas.",
    price: BigInt(24000000),
    ipfsImageHash: "QmCacaoPuroVerdeManglar",
    stock: BigInt(30),
    isActive: true,
  },
  {
    productId: BigInt(3),
    companyId: BigInt(2),
    name: "Chocolate Artesanal Azul Caribe",
    description: "Barra de chocolate fino de aroma con 75% cacao de barlovento.",
    price: BigInt(12000000),
    ipfsImageHash: "QmChocolateAzulCaribe",
    stock: BigInt(100),
    isActive: true,
  }
];

export default function Home() {
  const { provider, signer, chainId, address } = useWallet();
  const { items, total, addToCart } = useCart(provider, signer, chainId, address);

  const [products, setProducts] = useState<Product[]>([]);
  const [companyMap, setCompanyMap] = useState<Record<string, CompanyDetails>>({});
  const [loading, setLoading] = useState(true);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedProductType, setSelectedProductType] = useState<string>('all'); // 'all', 'product', 'service'
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const queryParam = urlParams.get('search');
      if (queryParam) setSearchQuery(queryParam);
    }
  }, []);

  useEffect(() => {
    const loadStoreData = async () => {
      try {
        setLoading(true);
        const rpcProvider = provider || new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "https://mcc-foundry-anvil-1095249147821.europe-west1.run.app");

        // 1. Verify if contract bytecode exists at ecommerceAddress on RPC node
        const code = await rpcProvider.getCode(ecommerceAddress).catch(() => "0x");
        if (!code || code === "0x" || code === "0x0") {
          console.warn(`[web-customer] Contrato no desplegado en ${ecommerceAddress}. Cargando catálogo fallback.`);
          setProducts(FALLBACK_PRODUCTS);
          setCompanyMap({
            "1": { id: "1", name: "TechMarket Iberia S.L.", businessType: 0 },
            "2": { id: "2", name: "ServiCloud Consultores S.A.", businessType: 1 }
          });
          return;
        }

        const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

        // 2. Fetch products with graceful fallback
        try {
          const allProds = await contract.getAllProducts();
          const activeProds = Array.from(allProds).filter((p: any) => p.isActive);
          if (activeProds.length > 0) {
            setProducts(activeProds as Product[]);
          } else {
            setProducts(FALLBACK_PRODUCTS);
          }
        } catch (prodErr) {
          console.warn("[web-customer] No se pudieron decodificar productos del contrato, usando catálogo fallback:", prodErr);
          setProducts(FALLBACK_PRODUCTS);
        }

        // 3. Fetch companies with graceful fallback
        try {
          const allComps = await contract.getAllCompanies();
          const compDict: Record<string, CompanyDetails> = {};
          Array.from(allComps).forEach((c: any) => {
            compDict[c.companyId.toString()] = {
              id: c.companyId.toString(),
              name: c.name,
              businessType: Number(c.businessType)
            };
          });
          setCompanyMap(compDict);
        } catch (compErr) {
          console.warn("[web-customer] No se pudieron cargar empresas:", compErr);
          setCompanyMap({
            "1": { id: "1", name: "TechMarket Iberia S.L.", businessType: 0 },
            "2": { id: "2", name: "ServiCloud Consultores S.A.", businessType: 1 }
          });
        }

      } catch (error) {
        console.warn('[web-customer] Error al conectar con nodo Anvil, activando catálogo fallback:', error);
        setProducts(FALLBACK_PRODUCTS);
        setCompanyMap({
          "1": { id: "1", name: "TechMarket Iberia S.L.", businessType: 0 },
          "2": { id: "2", name: "ServiCloud Consultores S.A.", businessType: 1 }
        });
      } finally {
        setLoading(false);
      }
    };

    loadStoreData();
  }, [provider, ecommerceAddress]);

  const formatPrice = (price: bigint) => {
    return (Number(price) / 1_000_000).toFixed(2);
  };

  const filteredProducts = useMemo(() => {
    return [...products].filter((product) => {
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = !searchLower ||
        product.name.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower);

      const matchesCompany =
        selectedCompanyId === 'all' || product.companyId.toString() === selectedCompanyId;

      const compInfo = companyMap[product.companyId.toString()];
      const compType = compInfo ? compInfo.businessType : 0;

      let matchesType = true;
      if (selectedProductType === 'product') {
        matchesType = compType === 0 || 
                      product.name.toLowerCase().includes("producto") || 
                      product.name.toLowerCase().includes("café") || 
                      product.name.toLowerCase().includes("cacao") || 
                      product.name.toLowerCase().includes("chocolate") ||
                      product.name.toLowerCase().includes("hardware") ||
                      product.name.toLowerCase().includes("laptop");
      } else if (selectedProductType === 'service') {
        matchesType = compType === 1 || 
                      product.name.toLowerCase().includes("servicio") || 
                      product.name.toLowerCase().includes("consultoría") || 
                      product.name.toLowerCase().includes("cloud") || 
                      product.name.toLowerCase().includes("soporte") ||
                      product.description.toLowerCase().includes("servicio");
      }

      const matchesStock = !onlyInStock || product.stock > BigInt(0);

      // NO PRICE LIMIT: All products regardless of price are included!
      return matchesSearch && matchesCompany && matchesType && matchesStock;
    });
  }, [products, companyMap, searchQuery, selectedCompanyId, selectedProductType, onlyInStock]);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#333333] font-sans pb-24 selection:bg-[#FF8800] selection:text-white">
      
      {/* HERO BANNER - AZUL CARIBE & NARANJA CACAO SOL */}
      <section className="relative bg-gradient-to-br from-[#0077BB] via-[#005F96] to-slate-900 text-white py-14 px-4 sm:px-6 lg:px-8 shadow-xl overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/30 font-poppins">
            <span>🛵 BARLO-VENTAS Web3 &bull; El Ritmo de tus Compras</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight font-poppins">
            Catálogo de Productos en <span className="text-[#FF8800]">EuroToken (EURT)</span>
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 max-w-xl mx-auto font-medium">
            Seleccione cualquier producto para explorar la empresa vendedora, galería de fotos y condiciones de despacho.
          </p>
        </div>
      </section>

      {/* PROMOTIONAL CARDS - ROJO SAN JUAN & VERDE MANGLAR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5 space-y-2 border-l-4 border-l-[#CC2233]">
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#CC2233] text-white uppercase font-poppins">PROMO SAN JUAN</span>
              <span className="text-[11px] font-mono text-[#2E8B57] font-bold">15% Cashback EURT</span>
            </div>
            <h3 className="text-base font-bold text-[#333333] font-poppins">Reembolso en Compras</h3>
            <p className="text-xs text-[#A9A9A9] leading-relaxed">
              Recibe 15% de reembolso directo en EuroTokens al completar tus órdenes en la plataforma.
            </p>
          </div>

          <div className="glass-card p-5 space-y-2 border-l-4 border-l-[#0077BB]">
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#0077BB] text-white uppercase font-poppins">DELIVERY EXPRESS</span>
              <span className="text-[11px] font-mono text-[#0077BB] font-bold">0.00 EURT</span>
            </div>
            <h3 className="text-base font-bold text-[#333333] font-poppins">Envío Blockchain Bonificado</h3>
            <p className="text-xs text-[#A9A9A9] leading-relaxed">
              Facturación inmutable registrada directamente en el contrato inteligente Ecommerce.
            </p>
          </div>

          <div className="glass-card p-5 space-y-2 border-l-4 border-l-[#FF8800]">
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#FF8800] text-white uppercase font-poppins">RECARGA STRIPE</span>
              <span className="text-[11px] font-mono text-[#FF8800] font-bold">Instantáneo</span>
            </div>
            <h3 className="text-base font-bold text-[#333333] font-poppins">Recarga tu Billetera EURT</h3>
            <p className="text-xs text-[#A9A9A9] leading-relaxed">
              Adquiere EuroTokens en segundos usando tarjeta de crédito a través de nuestro portal Stripe.
            </p>
            <a href={`${process.env.NEXT_PUBLIC_COMPRA_STABLECOIN_URL || "https://mcc-compra-stablecoin-1095249147821.europe-west1.run.app"}${address ? `?address=${encodeURIComponent(address)}` : ''}`} target="_blank" rel="noreferrer" className="inline-block text-xs font-bold text-[#FF8800] hover:underline pt-1 font-poppins">
              Recargar Saldo Ahora ↗
            </a>
          </div>
        </div>
      </section>

      {/* FILTER TOOLBAR - SIN LÍMITE DE PRECIO / FILTRADO POR EMPRESA Y TIPO DE PRODUCTO */}
      <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        <div className="glass-panel rounded-3xl p-6 shadow-sm space-y-5 bg-white/90 border border-slate-200">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200/80 pb-4">
            <div>
              <span className="text-[10px] uppercase font-mono font-extrabold text-[#0077BB] tracking-wider block">
                🎯 Filtros de Búsqueda de Catálogo
              </span>
              <h2 className="text-xl font-black text-slate-900 font-poppins">
                Explorar Catálogo Completo
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1 bg-[#E6F4FA] text-[#0077BB] border border-[#0077BB]/30 text-xs font-extrabold rounded-full font-mono">
                {filteredProducts.length} {filteredProducts.length === 1 ? "Producto Mostrado" : "Productos Mostrados"}
              </span>

              {(searchQuery || selectedCompanyId !== 'all' || selectedProductType !== 'all' || onlyInStock) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCompanyId('all');
                    setSelectedProductType('all');
                    setOnlyInStock(false);
                  }}
                  className="px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs font-bold rounded-full transition font-poppins cursor-pointer"
                >
                  ✕ Limpiar Filtros
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            
            {/* 1. Buscador por Nombre / Descripción */}
            <div className="space-y-1 md:col-span-1">
              <label className="block text-[11px] font-extrabold text-slate-700 font-poppins">
                🔍 Buscar Término:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej: Café, Servidor, Laptop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0077BB] focus:bg-white font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 2. Filtro por Empresa Vendedora */}
            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold text-slate-700 font-poppins">
                🏢 Filtrar por Empresa:
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0077BB] focus:bg-white font-medium cursor-pointer"
              >
                <option value="all">🏢 Todas las Empresas</option>
                {Object.values(companyMap).map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} (ID #{comp.id})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Filtro por Tipo de Producto / Oferta */}
            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold text-slate-700 font-poppins">
                📦 Filtrar por Tipo de Producto:
              </label>
              <select
                value={selectedProductType}
                onChange={(e) => setSelectedProductType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0077BB] focus:bg-white font-medium cursor-pointer"
              >
                <option value="all">🛍️ Todos los Tipos de Oferta</option>
                <option value="product">📦 Venta de Productos (Bienes Físicos)</option>
                <option value="service">🛠️ Prestación de Servicios (Digitales / Nube)</option>
              </select>
            </div>

            {/* 4. Checkbox Disponibilidad Stock */}
            <div className="flex items-center h-9 px-2">
              <label className="inline-flex items-center cursor-pointer gap-2 select-none">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="w-4 h-4 text-[#FF8800] bg-slate-100 border-slate-300 rounded focus:ring-[#FF8800] cursor-pointer"
                />
                <span className="text-xs text-slate-800 font-bold font-poppins">
                  Solo Disponibles en Stock
                </span>
              </label>
            </div>

          </div>

          {/* Quick Filter Badge Pills for Companies */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-400 font-poppins">Empresas:</span>
            <button
              onClick={() => setSelectedCompanyId('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition font-poppins cursor-pointer ${
                selectedCompanyId === 'all'
                  ? "bg-[#0077BB] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todas
            </button>
            {Object.values(companyMap).map((comp) => (
              <button
                key={comp.id}
                onClick={() => setSelectedCompanyId(comp.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition font-poppins cursor-pointer ${
                  selectedCompanyId === comp.id
                    ? "bg-[#0077BB] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                🏢 {comp.name}
              </button>
            ))}
          </div>

        </div>

      </section>

      {/* SUMMARY PRODUCTS GRID (FICHAS DE RESUMEN: IMAGEN, TÍTULO, EMPRESA) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#0077BB] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#A9A9A9] font-mono">Cargando catálogo BARLO-VENTAS en blockchain...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="glass-card p-12 text-center space-y-3 shadow-xs">
            <p className="text-[#333333] font-bold text-base">No se encontraron productos con los filtros aplicados.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCompanyId('all');
                setSelectedProductType('all');
                setOnlyInStock(false);
              }}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-[#0077BB] font-bold text-xs rounded-xl border border-[#0077BB]/20 transition font-poppins cursor-pointer"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const compInfo = companyMap[product.companyId.toString()];
              const compName = compInfo ? compInfo.name : `Empresa ID #${product.companyId.toString()}`;
              const rating = getProductRating(product.productId);

              return (
                <Link
                  key={product.productId.toString()}
                  href={`/products/${product.productId.toString()}`}
                  className="group glass-card overflow-hidden hover:border-[#0077BB] transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Summary Image */}
                    <div className="w-full h-48 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      {product.ipfsImageHash ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            product.ipfsImageHash.startsWith("/") || product.ipfsImageHash.startsWith("http")
                              ? product.ipfsImageHash
                              : `https://ipfs.io/ipfs/${product.ipfsImageHash}`
                          }
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="text-[#A9A9A9] font-mono text-xs">Sin Imagen IPFS</div>
                      )}

                      {/* Stock Badge */}
                      <div className="absolute top-3 right-3">
                        {product.stock > BigInt(0) ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2E8B57] text-white shadow-sm font-poppins">
                            Stock: {product.stock.toString()}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#CC2233] text-white shadow-sm font-poppins">
                            Agotado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Summary Info */}
                    <div className="p-5 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#0077BB]" />
                        <span className="text-[11px] font-extrabold text-[#0077BB] truncate font-poppins">
                          {compName}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#333333] tracking-tight leading-snug group-hover:text-[#0077BB] transition-colors font-poppins">
                        {product.name}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-amber-500 pt-1">
                        <span>★ {rating.score.toFixed(1)}</span>
                        <span className="text-[10px] text-[#A9A9A9] font-mono">({rating.count} opiniones)</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Footer */}
                  <div className="p-5 pt-0">
                    <div className="flex items-center justify-between border-t border-[#0077BB]/10 pt-3">
                      <div>
                        <span className="text-[10px] text-[#A9A9A9] uppercase font-mono block">PVP EURT</span>
                        <span className="text-xl font-black font-mono text-[#2E8B57]">
                          €{formatPrice(product.price)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              await addToCart(product.productId, BigInt(1));
                              alert(`¡${product.name} agregado y firmado con éxito!`);
                            } catch (err: any) {
                              alert(err?.message || "Operación cancelada o fallida");
                            }
                          }}
                          className="px-3 py-1.5 bg-[#2E8B57] hover:bg-[#236B43] text-white font-bold text-xs rounded-xl shadow-xs transition font-poppins flex items-center gap-1"
                        >
                          ✍️ + Carrito
                        </button>
                        <span className="px-2.5 py-1.5 bg-[#FFF3E5] text-[#FF8800] font-bold text-xs rounded-xl border border-[#FF8800]/30 group-hover:bg-[#FF8800] group-hover:text-white transition font-poppins">
                          Ver ➔
                        </span>
                      </div>
                    </div>
                  </div>

                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* STICKY FLOATING CART BAR */}
      {items.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 max-w-xl w-[92%] glass-panel border border-[#FF8800]/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md z-40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF8800] text-white font-black flex items-center justify-center text-sm shadow-md font-poppins">
              {items.reduce((acc, i) => acc + Number(i.quantity), 0)}
            </div>
            <div>
              <span className="text-xs text-[#A9A9A9] block font-mono">Tu Pedido Actual</span>
              <span className="text-base font-black font-mono text-[#2E8B57]">
                €{formatPrice(total)} <span className="text-xs font-normal text-[#333333]">EURT</span>
              </span>
            </div>
          </div>

          <Link
            href="/cart"
            className="btn-cacao-pulse text-xs font-poppins uppercase tracking-wider"
          >
            Ver Carrito & Pagar ➔
          </Link>
        </div>
      )}

    </div>
  );
}
