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

export default function Home() {
  const { provider, signer, chainId, address } = useWallet();
  const { items, total, addToCart } = useCart(provider, signer, chainId, address);

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
        const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

        // Fetch products
        const allProds = await contract.getAllProducts();
        const activeProds = Array.from(allProds).filter((p: any) => p.isActive);
        setProducts(activeProds as Product[]);

        // Fetch companies
        try {
          const allComps = await contract.getAllCompanies();
          const compMap: Record<string, string> = {};
          Array.from(allComps).forEach((c: any) => {
            compMap[c.companyId.toString()] = c.name;
          });
          setCompanies(compMap);
        } catch (compErr) {
          console.warn("Could not fetch companies:", compErr);
        }

      } catch (error) {
        console.error('Error loading store data:', error);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 selection:bg-rose-500 selection:text-white">
      
      {/* HERO BANNER */}
      <section className="relative bg-gradient-to-br from-rose-500 via-rose-600 to-indigo-700 text-white py-14 px-4 sm:px-6 lg:px-8 shadow-xl overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/30">
            <span>🛵 BARLO-VENTAS Web3 &bull; Marketplace & Delivery Descentralizado</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Catálogo de Productos en <span className="text-amber-300">EuroToken (EURT)</span>
          </h1>
          <p className="text-xs sm:text-sm text-rose-100 max-w-xl mx-auto font-medium">
            Seleccione cualquier producto para ver el perfil detallado de la empresa vendedora, fotos y condiciones de envío.
          </p>
        </div>
      </section>

      {/* FILTER TOOLBAR */}
      <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Catálogo de Productos Disponibles
            </h2>
            <span className="text-xs font-mono text-rose-600 font-bold">
              {filteredProducts.length} producto(s)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Empresa Vendedora:</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white"
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
                <label className="text-[11px] font-bold text-slate-700">Precio Máximo:</label>
                <span className="text-xs font-mono text-emerald-600 font-bold">€{maxPriceFilter} EURT</span>
              </div>
              <input
                type="range"
                min="1"
                max="1000"
                step="5"
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center pt-4">
              <label className="inline-flex items-center cursor-pointer gap-2">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="w-4 h-4 text-rose-600 bg-slate-50 border-slate-300 rounded focus:ring-rose-500"
                />
                <span className="text-xs text-slate-700 font-semibold">Solo Disponibles en Stock</span>
              </label>
            </div>
          </div>
        </div>

      </section>

      {/* SUMMARY PRODUCTS GRID (FICHAS DE RESUMEN: IMAGEN, TÍTULO, EMPRESA) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono">Cargando catálogo en blockchain...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
            <p className="text-slate-800 font-bold text-base">No se encontraron productos con los filtros aplicados.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCompanyId('all');
                setMaxPriceFilter(500);
                setOnlyInStock(false);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-rose-600 font-bold text-xs rounded-xl border border-slate-200 transition"
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
                  className="group bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:shadow-xl hover:border-rose-400 transition-all duration-300 flex flex-col justify-between"
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
                        <div className="text-slate-400 font-mono text-xs">Sin Imagen IPFS</div>
                      )}

                      {/* Stock Badge */}
                      <div className="absolute top-3 right-3">
                        {product.stock > BigInt(0) ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm">
                            Stock: {product.stock.toString()}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white shadow-sm">
                            Agotado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Summary Info: Title & Company */}
                    <div className="p-5 space-y-2">
                      {/* Company Name */}
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-[11px] font-extrabold text-rose-600 truncate">
                          {compName}
                        </span>
                      </div>

                      {/* Product Title */}
                      <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug group-hover:text-rose-600 transition-colors">
                        {product.name}
                      </h3>

                      {/* Visual Rating */}
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 pt-1">
                        <span>★ {rating.score.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({rating.count} valoraciones)</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Footer: Price & Direct View Details CTA */}
                  <div className="p-5 pt-0">
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">PVP EURT</span>
                        <span className="text-xl font-black font-mono text-emerald-600">
                          €{formatPrice(product.price)}
                        </span>
                      </div>

                      <span className="px-3.5 py-1.5 bg-rose-50 group-hover:bg-rose-600 text-rose-600 group-hover:text-white font-bold text-xs rounded-xl border border-rose-200 group-hover:border-rose-600 transition">
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 max-w-xl w-[92%] bg-white/95 border border-rose-200 rounded-2xl p-4 shadow-2xl backdrop-blur-md z-40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white font-black flex items-center justify-center text-sm shadow-md">
              {items.reduce((acc, i) => acc + Number(i.quantity), 0)}
            </div>
            <div>
              <span className="text-xs text-slate-500 block font-mono">Tu Pedido Actual</span>
              <span className="text-base font-black font-mono text-emerald-600">
                €{formatPrice(total)} <span className="text-xs font-normal text-slate-500">EURT</span>
              </span>
            </div>
          </div>

          <Link
            href="/cart"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-extrabold text-xs shadow-lg shadow-rose-500/30 transition transform hover:scale-105"
          >
            Ver Carrito & Pagar ➔
          </Link>
        </div>
      )}

    </div>
  );
}
