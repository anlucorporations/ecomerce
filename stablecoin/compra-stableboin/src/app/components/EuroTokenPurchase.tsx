'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';
import MetaMaskConnect from './MetaMaskConnect';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function EuroTokenPurchase() {
  const [amount, setAmount] = useState<number>(100);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleWalletConnected = (address: string) => {
    setWalletAddress(address);
  };

  const handleCreatePaymentIntent = async () => {
    if (!amount || !walletAddress) {
      alert('Por favor, conecta tu billetera e ingresa un monto válido');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: 'eur',
          walletAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Error creating payment intent');
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear el intento de pago');
    } finally {
      setIsLoading(false);
    }
  };

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#2563eb',
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Información del producto */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Detalles de la Compra
          </h2>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              EuroToken (EURT)
            </h3>
            <p className="text-blue-700 text-sm">
              Stablecoin respaldada 1:1 con EUR. Perfecta para transacciones estables en el ecosistema DeFi.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-lg font-bold text-black mb-3">
                Cantidad a Comprar (EUR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-800 font-bold">€</span>
                <input
                  type="number"
                  id="amount"
                  min="10"
                  max="10000"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setAmount(0);
                    } else {
                      const numValue = parseFloat(value);
                      setAmount(isNaN(numValue) ? 0 : numValue);
                    }
                  }}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black font-semibold text-lg"
                  placeholder="100"
                />
              </div>
              <p className="text-sm font-medium text-gray-800 mt-1">
                Mínimo: €10, Máximo: €10,000
              </p>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-black font-medium">Tokens a recibir:</span>
                <span className="font-bold text-lg text-blue-700">
                  {amount > 0 ? `${amount} EURT` : '0 EURT'}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-black font-medium">Tasa de cambio:</span>
                <span className="text-sm font-medium text-gray-800">1 EUR = 1 EURT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario de pago */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Información de Pago
          </h2>

          {/* Conexión de MetaMask */}
          <div className="mb-6">
            <MetaMaskConnect onWalletConnected={handleWalletConnected} />
            {walletAddress && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>Billetera conectada:</strong>
                </p>
                <p className="text-xs text-green-600 font-mono break-all">
                  {walletAddress}
                </p>
              </div>
            )}
          </div>

          {/* Formulario de pago con Stripe */}
          {!clientSecret ? (
            <button
              onClick={handleCreatePaymentIntent}
              disabled={!walletAddress || !amount || amount < 10 || isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </span>
              ) : (
                `Comprar ${amount > 0 ? amount : 0} EURT por €${amount > 0 ? amount : 0}`
              )}
            </button>
          ) : (
            <Elements options={options} stripe={stripePromise}>
              <CheckoutForm amount={amount} walletAddress={walletAddress} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}