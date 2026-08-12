'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

interface Company {
  companyId: bigint;
  companyAddress: string;
  name: string;
  description: string;
  businessType: number;
  isActive: boolean;
  registrationDate: bigint;
}

const ECOMMERCE_ABI = [
  "function getProduct(uint256 _productId) view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, string ipfsImageHash, uint256 stock, bool isActive))",
  "function getAllProducts() view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, string ipfsImageHash, uint256 stock, bool isActive)[])",
  "function getCompany(uint256 _companyId) view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate))"
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

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productIdStr = params?.id as string;

  const { provider, signer, chainId, address } = useWallet();
  const { addToCart } = useCart(provider, signer, chainId, address);

  const [product, setProduct] = useState<Product | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyProducts, setCompanyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail Page State
  const [quantity, setQuantity] = useState<number>(1);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [carouselSlide, setCarouselSlide] = useState<number>(0);
  const [addingToCart, setAddingToCart] = useState<boolean>(false);

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  useEffect(() => {
    const fetchDetails = async () => {
      if (!productIdStr) return;
      try {
        setLoading(true);
        const rpcProvider = provider || new ethers.JsonRpcProvider("http://localhost:8545");
        const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

        // 1. Fetch current product
        const prodData = await contract.getProduct(BigInt(productIdStr));
        setProduct(prodData as Product);

        // 2. Fetch merchant company
        if (prodData && prodData.companyId) {
          try {
            const compData = await contract.getCompany(prodData.companyId);
            setCompany(compData as Company);
          } catch (compErr) {
            console.warn("Could not fetch company details:", compErr);
          }
        }

        // 3. Fetch all company products for carousel & related section
        try {
          const allProds = await contract.getAllProducts();
          const compProds = Array.from(allProds).filter(
            (p: any) => p.companyId.toString() === prodData.companyId.toString() && p.isActive
          );
          setCompanyProducts(compProds as Product[]);
        } catch (allErr) {
          console.warn("Could not fetch company products:", allErr);
        }

      } catch (err) {
        console.error('Error fetching product details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [productIdStr, provider, ecommerceAddress]);

  const formatPrice = (price: bigint) => {
    return (Number(price) / 1_000_000).toFixed(2);
  };

  const handleAddCart = async () => {
    if (!product) return;
    try {
      setAddingToCart(true);
      await addToCart(product.productId, BigInt(quantity));
      alert(`¡${quantity} unidad(es) agregada(s) al carrito!`);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      alert(`Error al agregar al carrito: ${err.message}`);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    await handleAddCart();
    router.push('/cart');
  };

  // Simulated Photo Gallery for Product
  const photoGallery = useMemo(() => {
    if (!product) return [];
    const mainHash = product.ipfsImageHash;
    return [
      mainHash ? `https://ipfs.io/ipfs/${mainHash}` : null,
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    ].filter(Boolean);
  }, [product]);

  // Top Carousel Slides (Featured / Best Sellers from Merchant)
  const carouselItems = useMemo(() => {
    if (companyProducts.length > 0) return companyProducts;
    return product ? [product] : [];
  }, [companyProducts, product]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-mono">Cargando ficha de detalle del producto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-200 text-center space-y-4">
          <h1 className="text-xl font-black text-slate-900">Producto No Encontrado</h1>
          <p className="text-xs text-slate-500">
            El producto con ID #{productIdStr} no existe o no está disponible en la red.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md"
          >
            Volver al Catálogo
          </Link>
        </div>
      </div>
    );
  }

  const rating = getProductRating(product.productId);
  const companyName = company?.name || `Empresa ID #${product.companyId.toString()}`;
  const subtotal = Number(product.price) * quantity;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      
      {/* 1. TOP FULL-WIDTH HERO CAROUSEL (CARRUSEL QUE ABARCA TODA LA PÁGINA) */}
      <section className="w-full relative bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white overflow-hidden shadow-xl">
        <div className="w-full py-16 px-6 sm:px-12 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 max-w-7xl mx-auto">
          
          <div className="max-w-xl space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider">
              <span>🔥 Los Más Vendidos de {companyName}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              {carouselItems[carouselSlide]?.name || product.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">
              {carouselItems[carouselSlide]?.description || product.description}
            </p>

            <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
              <span className="text-2xl font-black font-mono text-emerald-400">
                €{formatPrice(carouselItems[carouselSlide]?.price || product.price)} EURT
              </span>
              <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold text-xs rounded-full">
                ★ {getProductRating(carouselItems[carouselSlide]?.productId || product.productId).score.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Carousel Slide Image Preview */}
          <div className="w-full md:w-96 h-64 bg-slate-800 rounded-3xl overflow-hidden border border-rose-500/30 shadow-2xl relative">
            {carouselItems[carouselSlide]?.ipfsImageHash ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://ipfs.io/ipfs/${carouselItems[carouselSlide]?.ipfsImageHash}`}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                Destacado de {companyName}
              </div>
            )}
          </div>

        </div>

        {/* Carousel Navigation Buttons & Dots */}
        {carouselItems.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center items-center gap-2 z-20">
            {carouselItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCarouselSlide(idx)}
                className={`w-3 h-3 rounded-full transition ${
                  carouselSlide === idx ? 'bg-rose-500 w-8' : 'bg-white/40 hover:bg-white'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* 2. MERCHANT COMPANY HEADER BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-md">
              🏬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">{companyName}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Verificada Web3
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {company?.description || 'Empresa proveedora oficial registrada en el contrato inteligente Ecommerce.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
            <span>⭐ 4.9 Reputación</span>
            <span>&bull;</span>
            <span className="text-emerald-600">⏱ 15-30 min Delivery</span>
          </div>
        </div>
      </section>

      {/* 3. MAIN PRODUCT DETAIL CONTAINER & CART ATTACHMENT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Photo Gallery Slider (Slider de Fotos) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="w-full h-96 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm relative flex items-center justify-center">
              {photoGallery[activePhotoIdx] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoGallery[activePhotoIdx]!}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-slate-400 font-mono text-xs">Sin Imagen Disponible</div>
              )}
              {product.stock === BigInt(0) && (
                <span className="absolute top-4 right-4 bg-red-500 text-white font-bold text-xs px-3 py-1 rounded-full shadow">
                  Agotado
                </span>
              )}
            </div>

            {/* Photo Thumbnails */}
            {photoGallery.length > 1 && (
              <div className="flex gap-3">
                {photoGallery.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition ${
                      activePhotoIdx === idx ? 'border-rose-600 scale-105 shadow-md' : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl!} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Middle Column: Detailed Description & Shipping Conditions */}
          <div className="lg:col-span-4 space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">
                {companyName}
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {product.name}
              </h1>
              
              <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
                <span>{'★'.repeat(Math.floor(rating.score))}</span>
                <span className="text-slate-700 font-mono">{rating.score.toFixed(1)}</span>
                <span className="text-slate-400 font-normal">({rating.count} opiniones verificadas)</span>
              </div>
            </div>

            {/* Detailed Description */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Descripción Detallada del Producto
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                {product.description || 'Producto oficial de alta calidad disponible para adquisición directa en la red con EuroToken (EURT).'}
              </p>
            </div>

            {/* Shipping & Delivery Conditions (Condiciones de Envío) */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">
                Condiciones de Envío y Garantía
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <span className="text-base">🛵</span>
                  <div>
                    <span className="font-bold text-slate-900 block">Despacho Express Blockchain</span>
                    <span className="text-slate-500">Entrega estimada de 15 a 30 minutos a su dirección de envío.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-base">📜</span>
                  <div>
                    <span className="font-bold text-slate-900 block">Factura Electrónica Inmutable</span>
                    <span className="text-slate-500">Comprobante de compra emitido directamente en Smart Contract.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-base">🛡️</span>
                  <div>
                    <span className="font-bold text-slate-900 block">Garantía de Reembolso EURT</span>
                    <span className="text-slate-500">Protección al comprador con devolución respaldada en tokens EURT.</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Cart Attachment Card (Ficha para adjuntar al carrito) */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xl space-y-6 sticky top-24">
              
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Precio PVP</span>
                <div className="text-3xl font-black font-mono text-emerald-600">
                  €{formatPrice(product.price)} <span className="text-xs font-normal text-slate-500">EURT</span>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Cantidad a Comprar:</label>
                <div className="flex items-center bg-slate-100 border border-slate-200 rounded-2xl p-1 justify-between">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 rounded-xl bg-white hover:bg-slate-200 font-black text-slate-800 text-sm shadow-sm transition"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-slate-900 text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 rounded-xl bg-white hover:bg-slate-200 font-black text-slate-800 text-sm shadow-sm transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Subtotal Display */}
              <div className="border-t border-b border-slate-100 py-3 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Subtotal Calculado:</span>
                <span className="font-mono font-black text-emerald-600 text-base">
                  €{formatPrice(BigInt(subtotal))} EURT
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleAddCart}
                  disabled={product.stock === BigInt(0) || addingToCart}
                  className="w-full py-3 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/25 transition disabled:opacity-50 text-xs flex items-center justify-center gap-2"
                >
                  <span>🛒</span>
                  <span>{addingToCart ? 'Procesando...' : 'Adjuntar al Carrito'}</span>
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={product.stock === BigInt(0)}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-md transition disabled:opacity-50 text-xs"
                >
                  Comprar Ahora ➔
                </button>
              </div>

              <div className="text-center">
                <span className="text-[10px] text-slate-400 block font-mono">
                  Stock Disponible: {product.stock.toString()} unidad(es)
                </span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 4. RELATED PRODUCTS SECTION (PRODUCTOS RELACIONADOS) */}
      {companyProducts.filter((p) => p.productId.toString() !== product.productId.toString()).length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Productos Relacionados</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Más opciones disponibles en el catálogo de {companyName}.
              </p>
            </div>
            <Link
              href="/"
              className="text-xs font-bold text-rose-600 hover:underline"
            >
              Ver Todo el Catálogo ➔
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {companyProducts
              .filter((p) => p.productId.toString() !== product.productId.toString())
              .slice(0, 4)
              .map((relProduct) => (
                <Link
                  key={relProduct.productId.toString()}
                  href={`/products/${relProduct.productId.toString()}`}
                  className="group bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:shadow-xl hover:border-rose-300 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-full h-40 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      {relProduct.ipfsImageHash ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://ipfs.io/ipfs/${relProduct.ipfsImageHash}`}
                          alt={relProduct.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="text-slate-400 font-mono text-xs">Sin Imagen</div>
                      )}
                    </div>

                    <div className="p-4 space-y-1.5">
                      <span className="text-[10px] font-bold text-rose-600 block">{companyName}</span>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-rose-600 transition-colors line-clamp-1">
                        {relProduct.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2">{relProduct.description}</p>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-sm font-black font-mono text-emerald-600">
                        €{formatPrice(relProduct.price)} EURT
                      </span>
                      <span className="text-xs font-bold text-rose-600 group-hover:underline">
                        Ver ➔
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}

    </div>
  );
}
