'use client';

import { useParams } from 'next/navigation';
import { useContract } from '@/hooks/useContract';
import { useWallet } from '@/hooks/useWallet';
import { useEffect, useState, useCallback } from 'react';

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

export default function CompanyProductsPage() {
  const params = useParams();
  const { provider, signer, chainId, address } = useWallet();
  const ecommerce = useContract('ecommerce', provider, signer, chainId);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [companyAddress, setCompanyAddress] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    ipfsImageHash: '',
    stock: '',
  });

  const companyId = params.id as string;

  const loadProducts = useCallback(async () => {
    if (!ecommerce) {
      console.log('loadProducts: No ecommerce contract available');
      return;
    }

    try {
      setLoading(true);
      console.log('loadProducts: Loading products for company', companyId);
      console.log('loadProducts: Contract address:', ecommerce.target);
      
      // Load company info to check ownership first
      const company = await ecommerce.getCompany(BigInt(companyId));
      console.log('loadProducts: Company loaded:', company);
      setCompanyAddress(company.companyAddress);
      
      // Try to get products by company
      const productList = await ecommerce.getProductsByCompany(BigInt(companyId));
      console.log('loadProducts: Products loaded:', productList);
      console.log('loadProducts: Number of products:', productList?.length || 0);
      
      // Convert array to ensure it's in the right format
      const formattedProducts = Array.isArray(productList) ? productList : [];
      console.log('loadProducts: Formatted products:', formattedProducts);
      setProducts(formattedProducts);
      
      // Also try getAllProducts for debugging
      try {
        const allProducts = await ecommerce.getAllProducts();
        console.log('loadProducts: All products in contract:', allProducts);
        console.log('loadProducts: Total products count:', allProducts?.length || 0);
      } catch (err) {
        console.warn('Could not load all products:', err);
      }
    } catch (error: unknown) {
      console.error('Error loading products:', error);
      const err = error as { message?: string; reason?: string; code?: string; data?: unknown };
      console.error('Error details:', {
        message: err.message,
        reason: err.reason,
        code: err.code,
        data: err.data
      });
      alert(`Error al cargar productos: ${err.message || String(error)}. Revisa la consola para más detalles.`);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [ecommerce, companyId]);

  useEffect(() => {
    if (ecommerce && companyId) {
      loadProducts();
    }
  }, [ecommerce, companyId, address, loadProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ecommerce || !signer) {
      alert('Por favor, conecta tu wallet para agregar productos');
      return;
    }

    if (!isOwner) {
      alert('Solo el propietario de la compañía puede agregar productos');
      return;
    }

    setSubmitting(true);

    try {
      const priceInCents = Math.floor(parseFloat(formData.price) * 1_000_000); // Convert to 6 decimals

      if (priceInCents <= 0 || isNaN(priceInCents)) {
        alert('El precio debe ser mayor a 0');
        setSubmitting(false);
        return;
      }

      if (parseInt(formData.stock) <= 0 || isNaN(parseInt(formData.stock))) {
        alert('El stock debe ser mayor a 0');
        setSubmitting(false);
        return;
      }

      console.log('Adding product with data:', {
        companyId,
        name: formData.name,
        description: formData.description,
        price: priceInCents,
        ipfsImageHash: formData.ipfsImageHash,
        stock: formData.stock,
        address,
        companyAddress,
        isOwner,
      });

      const tx = await ecommerce.addProduct(
        BigInt(companyId),
        formData.name,
        formData.description,
        BigInt(priceInCents),
        formData.ipfsImageHash || '', // Allow empty IPFS hash
        BigInt(formData.stock)
      );

      console.log('Transaction sent:', tx.hash);
      alert(`Transacción enviada: ${tx.hash}. Esperando confirmación...`);

      console.log('Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      if (receipt.status === 1) {
        alert('Producto agregado exitosamente! Recargando lista...');
        
        setShowAddForm(false);
        setFormData({
          name: '',
          description: '',
          price: '',
          ipfsImageHash: '',
          stock: '',
        });
        
        // Wait a bit for the blockchain state to update
        await new Promise(resolve => setTimeout(resolve, 2000));
        await loadProducts();
      } else {
        alert('La transacción falló. Por favor, intenta de nuevo.');
      }
    } catch (error: unknown) {
      console.error('Error adding product:', error);
      
      const err = error as { message?: string; reason?: string; code?: string };
      let errorMessage = 'Error al agregar producto';
      
      if (err.message) {
        errorMessage += `: ${err.message}`;
      }
      
      if (err.reason) {
        errorMessage += ` (${err.reason})`;
      }
      
      if (err.code === 'ACTION_REJECTED') {
        errorMessage = 'La transacción fue rechazada por el usuario';
      } else if (err.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Fondos insuficientes para pagar la gas';
      } else if (err.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage = 'Error al estimar el gas. Verifica que seas el propietario de la compañía y que todos los datos sean correctos';
      }
      
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleProductStatus = async (productId: bigint, isActive: boolean) => {
    if (!ecommerce || !signer) return;

    try {
      const tx = isActive
        ? await ecommerce.deactivateProduct(productId)
        : await ecommerce.activateProduct(productId);

      await tx.wait();
      await loadProducts();
    } catch (error) {
      console.error('Error toggling product status:', error);
      alert('Error updating product status');
    }
  };

  const formatPrice = (price: bigint) => {
    return (Number(price) / 1_000_000).toFixed(2);
  };

  if (loading && products.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando productos...</p>
      </div>
    );
  }

  const isOwner = address && companyAddress && address.toLowerCase() === companyAddress.toLowerCase();

  return (
    <div>
      {/* Warning if not owner */}
      {address && companyAddress && !isOwner && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                You are not the owner of this company
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>Connected: <span className="font-mono">{address.slice(0, 10)}...{address.slice(-8)}</span></p>
                <p>Owner: <span className="font-mono">{companyAddress.slice(0, 10)}...{companyAddress.slice(-8)}</span></p>
                <p className="mt-1">Please connect with the company owner account to manage products.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Products</h2>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage products for this company
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex gap-2">
          <button
            type="button"
            onClick={loadProducts}
            disabled={loading || !ecommerce}
            className="block rounded-md bg-gray-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Recargar productos"
          >
            {loading ? 'Cargando...' : '🔄 Recargar'}
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            disabled={!isOwner}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isOwner ? 'Only the company owner can add products' : ''}
          >
            Add Product
          </button>
        </div>
      </div>

      {/* Add Product Form */}
      {showAddForm && (
        <div className="mb-6 bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4 dark:text-white">Add New Product</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="mt-1 block w-full px-4 py-3 text-base rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Description
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="mt-1 block w-full px-4 py-3 text-base rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Price (EURO)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Stock
                </label>
                <input
                  type="number"
                  required
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                IPFS Image Hash
              </label>
              <input
                type="text"
                value={formData.ipfsImageHash}
                onChange={(e) =>
                  setFormData({ ...formData, ipfsImageHash: e.target.value })
                }
                className="mt-1 block w-full px-4 py-3 text-base rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Agregando...' : 'Add Product'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products List */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {loading ? 'Cargando productos...' : `Total productos: ${products.length}`}
          </p>
        </div>
        <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
          {products.length === 0 && !loading ? (
            <li className="px-6 py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-2">No hay productos registrados para esta compañía</p>
              {isOwner ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Haz clic en &quot;Add Product&quot; para agregar tu primer producto
                </p>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Solo el propietario de la compañía puede agregar productos
                </p>
              )}
            </li>
          ) : products.length > 0 ? (
            products.map((product) => (
              <li key={product.productId.toString()} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {product.name}
                      </h3>
                      <span
                        className={`ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          product.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {product.description}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium">
                        Price: €{formatPrice(product.price)}
                      </span>
                      <span>Stock: {product.stock.toString()}</span>
                      {product.ipfsImageHash && (
                        <span>IPFS: {product.ipfsImageHash}</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() =>
                        toggleProductStatus(product.productId, product.isActive)
                      }
                      disabled={!isOwner}
                      className={`rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                        product.isActive
                          ? 'bg-red-600 hover:bg-red-500 disabled:hover:bg-red-600'
                          : 'bg-green-600 hover:bg-green-500 disabled:hover:bg-green-600'
                      }`}
                      title={!isOwner ? 'Only the company owner can modify products' : ''}
                    >
                      {product.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </li>
            ))
          ) : null}
        </ul>
      </div>
    </div>
  );
}
