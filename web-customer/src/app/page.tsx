import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="hero bg-gradient-to-r from-blue-500 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">Blockchain E-Commerce</h1>
          <p className="text-xl mb-8">Shop with cryptocurrency. Secure, transparent, decentralized.</p>
          <Link
            href="/products"
            className="inline-block px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100"
          >
            Start Shopping
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2 dark:text-white">Secure Payments</h3>
            <p className="text-gray-600 dark:text-gray-400">Pay with EURT tokens backed by real euros</p>
          </div>

          <div className="text-center p-6">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2 dark:text-white">Fast Transactions</h3>
            <p className="text-gray-600 dark:text-gray-400">Instant confirmation on the blockchain</p>
          </div>

          <div className="text-center p-6">
            <div className="text-4xl mb-4">🌐</div>
            <h3 className="text-xl font-semibold mb-2 dark:text-white">Decentralized</h3>
            <p className="text-gray-600 dark:text-gray-400">No intermediaries, direct transactions</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 dark:text-white">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/products"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="text-3xl mb-3">🛍️</div>
              <h3 className="text-xl font-semibold mb-2 dark:text-white">Products</h3>
              <p className="text-gray-600 dark:text-gray-400">Browse and shop products</p>
            </Link>

            <Link
              href="/cart"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="text-3xl mb-3">🛒</div>
              <h3 className="text-xl font-semibold mb-2 dark:text-white">Cart</h3>
              <p className="text-gray-600 dark:text-gray-400">View your shopping cart</p>
            </Link>

            <Link
              href="/orders"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="text-3xl mb-3">📦</div>
              <h3 className="text-xl font-semibold mb-2 dark:text-white">Orders</h3>
              <p className="text-gray-600 dark:text-gray-400">Track your orders</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
