'use client';

import { useState, useEffect } from 'react';

interface PaymentData {
  merchant_address: string;
  address_customer: string;
  amount: string;
  invoice: string;
  date: string;
  redirect?: string;
}

export default function PaymentGatewayDirect() {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Parse URL parameters manually
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);

      const merchant_address = urlParams.get('merchant_address');
      const address_customer = urlParams.get('address_customer');
      const amount = urlParams.get('amount');
      const invoice = urlParams.get('invoice');
      const date = urlParams.get('date');

      console.log('Direct URL Parameters:', {
        merchant_address,
        address_customer,
        amount,
        invoice,
        date
      });

      if (merchant_address && address_customer && amount && invoice && date) {
        const data = {
          merchant_address,
          address_customer,
          amount,
          invoice,
          date
        };
        console.log('Direct Setting payment data:', data);
        setPaymentData(data);
      }

      setIsLoaded(true);
    }
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Parámetros Faltantes</h1>
            <p className="text-gray-600 mb-6">
              Esta pasarela de pago requiere los siguientes parámetros URL:
            </p>
            <ul className="text-left text-sm text-gray-700 space-y-1">
              <li>• <code>merchant_address</code> - Dirección del comerciante</li>
              <li>• <code>address_customer</code> - Dirección del cliente</li>
              <li>• <code>amount</code> - Cantidad a pagar</li>
              <li>• <code>invoice</code> - Número de factura</li>
              <li>• <code>date</code> - Fecha de la transacción</li>
            </ul>

            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <p className="text-xs text-gray-600">URL actual:</p>
              <p className="text-xs font-mono break-all">{window.location.href}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pasarela de Pago EuroToken</h1>
          <p className="text-gray-600">Confirme los detalles del pago y firme con MetaMask</p>
        </div>

        {/* Payment Details */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-200">
          <h3 className="text-xl font-bold text-blue-900 mb-6">Detalles del Pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-base">
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-blue-700 font-medium mb-2">Comerciante:</p>
              <p className="font-mono text-sm text-gray-900 break-all bg-gray-100 p-3 rounded">{paymentData.merchant_address}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-blue-700 font-medium mb-2">Cliente:</p>
              <p className="font-mono text-sm text-gray-900 break-all bg-gray-100 p-3 rounded">{paymentData.address_customer}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-blue-700 font-medium mb-2">Cantidad:</p>
              <p className="text-3xl font-bold text-green-600">{paymentData.amount} EURT</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-blue-700 font-medium mb-2">Factura:</p>
              <p className="font-bold text-gray-900 text-xl">{paymentData.invoice}</p>
            </div>
            <div className="md:col-span-2 bg-white p-4 rounded-lg border">
              <p className="text-blue-700 font-medium mb-2">Fecha:</p>
              <p className="text-gray-900 font-semibold text-lg">{paymentData.date}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            Esta es una versión de prueba que muestra los parámetros recibidos.
            Para procesar el pago real, use la versión completa de la pasarela.
          </p>
        </div>
      </div>
    </div>
  );
}