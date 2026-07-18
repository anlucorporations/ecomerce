'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get('payment_intent');
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'succeeded' | 'failed'>('loading');

  useEffect(() => {
    if (paymentIntentId) {
      // Verificar el estado del payment intent
      fetch(`/api/verify-payment?payment_intent=${paymentIntentId}`)
        .then(response => response.json())
        .then(data => {
          setPaymentStatus(data.status === 'succeeded' ? 'succeeded' : 'failed');
        })
        .catch(() => {
          setPaymentStatus('failed');
        });
    }
  }, [paymentIntentId]);

  if (paymentStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Verificando el estado del pago...</p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <svg className="mx-auto h-16 w-16 text-red-500 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Error en el Pago
            </h1>
            <p className="text-gray-600 mb-8">
              Hubo un problema procesando tu pago. Por favor, intenta nuevamente.
            </p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Intentar Nuevamente
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <svg className="mx-auto h-16 w-16 text-green-500 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ¡Pago Exitoso!
          </h1>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <p className="text-green-700 mb-4">
              Tu pago ha sido procesado exitosamente. Los tokens EuroToken (EURT)
              serán enviados a tu billetera MetaMask en los próximos minutos.
            </p>

            <div className="text-sm text-green-600">
              <p><strong>ID de transacción:</strong> {paymentIntentId}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-blue-900 mb-2">Próximos Pasos:</h3>
            <ul className="text-blue-700 text-sm text-left space-y-1">
              <li>• Verifica tu billetera MetaMask para ver los tokens EURT</li>
              <li>• Si no aparecen, añade el contrato EURT manualmente</li>
              <li>• Guarda este ID de transacción para tus registros</li>
            </ul>
          </div>

          <div className="space-y-4">
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors mr-4"
            >
              Comprar Más Tokens
            </Link>

            <a
              href="https://etherscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Ver en Etherscan
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Success() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}