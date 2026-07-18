'use client';

import { useEffect, useState } from 'react';
import { useContract } from '@/hooks/useContract';
import { useWallet } from '@/hooks/useWallet';
import { useCart } from '@/hooks/useCart';
import Link from 'next/link';

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

export default function ProductsPage() {
  const { provider, signer, chainId, address, isConnected } = useWallet();
  const ecommerce = useContract('ecommerce', provider, signer, chainId);
  const { addToCart } = useCart(provider, signer, chainId, address);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  console.log('ProductsPage - Wallet state:', { provider: !!provider, signer: !!signer, chainId, address, isConnected });

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        // Create read-only contract instance with default provider
        const { Contract, JsonRpcProvider } = await import('ethers');
        const { getContractAddress } = await import('@/lib/contracts/addresses');
        const { ABIS } = await import('@/lib/contracts/abis');

        // Use the connected provider or create a default one for Besu network
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://besu1.proyectos.codecrypto.academy';
        const readProvider = provider || new JsonRpcProvider(rpcUrl);
        const networkChainId = chainId || 81234;

        const contractAddress = getContractAddress(networkChainId, 'ecommerce');
        const abi = ABIS['ecommerce'];
        const readOnlyContract = new Contract(contractAddress, abi, readProvider);

        const allProducts = await readOnlyContract.getAllProducts();
        // Filter only active products
        const activeProducts = allProducts.filter((p: Product) => p.isActive);
        setProducts(activeProducts);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [provider, chainId]);

  const handleAddToCart = async (productId: bigint) => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!ecommerce) {
      alert('Contract not available');
      return;
    }

    try {
      setAddingToCart(productId.toString());
      await addToCart(productId, BigInt(1));
      alert('Product added to cart!');
    } catch (error: unknown) {
      console.error('Error adding to cart:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      alert(`Error adding product to cart: ${err.message || String(error)}`);
    } finally {
      setAddingToCart(null);
    }
  };

  const formatPrice = (price: bigint) => {
    return (Number(price) / 1_000_000).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Products</h1>
          <Link
            href="/cart"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            View Cart
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No products available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <div
                key={product.productId.toString()}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-w-1 aspect-h-1 w-full bg-gray-200 dark:bg-gray-700">
                  {product.ipfsImageHash ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://ipfs.io/ipfs/${product.ipfsImageHash}`}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      €{formatPrice(product.price)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Stock: {product.stock.toString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAddToCart(product.productId)}
                    disabled={product.stock === BigInt(0) || addingToCart === product.productId.toString()}
                    className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {addingToCart === product.productId.toString()
                      ? 'Adding...'
                      : product.stock === BigInt(0)
                      ? 'Out of Stock'
                      : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
