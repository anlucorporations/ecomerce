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
  const { items, total } = useCart(provider, signer, chainId, address);

  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(500);
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
        const rpcProvider = provider || new ethers.JsonRpcProvider("http://localhost:8545");

        // 1. Verify if contract bytecode exists at ecommerceAddress on RPC node before staticCall
        const code = await rpcProvider.getCode(ecommerceAddress).catch(() => "0x");
        if (!code || code === "0x" || code === "0x0") {
          console.warn(`[web-customer] Contrato no desplegado en ${ecommerceAddress}. Cargando catálogo fallback.`);
          setProducts(FALLBACK_PRODUCTS);
          setCompanies({ "1": "Empresa Cacao Sol", "2": "Empresa Azul Caribe" });
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
          const compMap: Record<string, string> = {};
          Array.from(allComps).forEach((c: any) => {
            compMap[c.companyId.toString()] = c.name;
          });
          setCompanies(compMap);
        } catch (compErr) {
          console.warn("[web-customer] No se pudieron cargar empresas:", compErr);
          setCompanies({ "1": "Empresa Cacao Sol", "2": "Empresa Azul Caribe" });
        }

      } catch (error) {
        console.warn('[web-customer] Error al conectar con nodo Anvil, activando catálogo fallback:', error);
        setProducts(FALLBACK_PRODUCTS);
        setCompanies({ "1": "Empresa Cacao Sol", "2": "Empresa Azul Caribe" });
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
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        product.name.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower);
      const matchesCompany =
        selectedCompanyId === 'all' || product.companyId.toString() === selectedCompanyId;
      const priceFormatted = Number(product.price) / 1_000_000;
      const matchesPrice = priceFormatted <= maxPriceFilter;
      const matchesStock = !onlyInStock || product.stock > BigInt(0);

      return matchesSearch && matchesCompany && matchesPrice && matchesStock;
    });
  }, [products, searchQuery, selectedCompanyId, maxPriceFilter, onlyInStock]);

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
            <a href="http://localhost:3003" target="_blank" rel="noreferrer" className="inline-block text-xs font-bold text-[#FF8800] hover:underline pt-1 font-poppins">
              Recargar Saldo Ahora ↗
            </a>
          </div>
        </div>
      </section>

      {/* FILTER TOOLBAR */}
      <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        <div className="glass-panel rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#0077BB]/10 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0077BB] font-poppins">
              Catálogo de Productos Disponibles
            </h2>
            <span className="text-xs font-mono text-[#0077BB] font-bold">
              {filteredProducts.length} producto(s)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#333333] mb-1 font-poppins">Empresa Vendedora:</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3 py-2 text-xs text-[#333333] focus:outline-none focus:border-[#0077BB]"
              >
                <option value="all">Todas las Empresas</option>
                {Object.entries(companies).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name} (ID #{id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-[#333333] font-poppins">Precio Máximo:</label>
                <span className="text-xs font-mono text-[#2E8B57] font-bold">€{maxPriceFilter} EURT</span>
              </div>
              <input
                type="range"
                min="1"
                max="1000"
                step="5"
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                className="w-full accent-[#FF8800] cursor-pointer"
              />
            </div>

            <div className="flex items-center pt-4">
              <label className="inline-flex items-center cursor-pointer gap-2">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="w-4 h-4 text-[#FF8800] bg-white border-slate-300 rounded focus:ring-[#FF8800]"
                />
                <span className="text-xs text-[#333333] font-semibold">Solo Disponibles en Stock</span>
              </label>
            </div>
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
                setMaxPriceFilter(500);
                setOnlyInStock(false);
              }}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-[#0077BB] font-bold text-xs rounded-xl border border-[#0077BB]/20 transition font-poppins"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const compName = companies[product.companyId.toString()] || `Empresa ID #${product.companyId.toString()}`;
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
                          src={`https://ipfs.io/ipfs/${product.ipfsImageHash}`}
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

                      <span className="px-3 py-1.5 bg-[#FFF3E5] text-[#FF8800] font-bold text-xs rounded-xl border border-[#FF8800]/30 group-hover:bg-[#FF8800] group-hover:text-white transition font-poppins">
                        Ver Detalle ➔
                      </span>
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
