'use client';

import EuroTokenPurchase from './components/EuroTokenPurchase';

const EUROTOKEN_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS;

export default function Home() {
  const testPaymentUrl = `http://localhost:6002/?merchant_address=0x70997970C51812dc3A010C7d01b50e0d17dc79C8&amount=10&invoice=TEST-001&date=${new Date().toISOString().split('T')[0]}&redirect=http://localhost:6001`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Compra EuroToken
          </h1>
          <p className="text-lg text-gray-600">
            Compra EuroToken (EURT) utilizando tu tarjeta de crédito y recíbelos directamente en tu billetera MetaMask
          </p>
          <p className="text-xs text-gray-500 mt-2 font-mono">{EUROTOKEN_CONTRACT_ADDRESS}</p>

          <div className="mt-6">
            <a
              href={testPaymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              🧪 Probar Pasarela de Pago (10 EURT)
            </a>
          </div>
        </div>

        <EuroTokenPurchase />
      </div>
    </div>
  );
}
