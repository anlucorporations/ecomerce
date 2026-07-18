'use client';

import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

interface CheckoutFormProps {
  amount: number;
  walletAddress: string;
}

export default function CheckoutForm({ amount, walletAddress }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Ocurrió un error durante el pago');
        setPaymentStatus('error');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setPaymentStatus('success');

        // Mint tokens after successful payment
        try {
          const mintResponse = await fetch('/api/mint-tokens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              walletAddress,
              amount
            }),
          });

          if (mintResponse.ok) {
            const mintData = await mintResponse.json();
            console.log('Tokens minted successfully:', mintData);
          } else {
            const errorData = await mintResponse.json().catch(() => ({}));
            const errorMsg = errorData.error || 'Failed to mint tokens';
            const errorDetails = errorData.details || '';
            console.error('Failed to mint tokens:', errorMsg, errorDetails);
            setErrorMessage(`El pago fue exitoso, pero hubo un error al crear los tokens: ${errorMsg}. Por favor, contacta al soporte con los detalles del pago.`);
            setPaymentStatus('error');
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
          console.error('Error minting tokens:', error);
          setErrorMessage(`El pago fue exitoso, pero hubo un error al crear los tokens: ${errorMsg}. Por favor, contacta al soporte.`);
          setPaymentStatus('error');
        }
      }
    } catch {
      setErrorMessage('Error inesperado durante el pago');
      setPaymentStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (paymentStatus === 'success') {
    return (
      <div className="text-center py-8">
        <div className="mb-6">
          <svg className="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">
          ¡Pago Exitoso!
        </h3>
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <p className="text-green-700 mb-2">
            <strong>Transacción completada exitosamente</strong>
          </p>
          <p className="text-green-600 text-sm">
            Cantidad: {amount} EURT
          </p>
          <p className="text-green-600 text-sm">
            Dirección de destino: {walletAddress}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700 text-sm">
            <strong>Próximos pasos:</strong> Los tokens EURT serán enviados a tu billetera en los próximos minutos.
            Puedes verificar el estado de la transacción en tu billetera MetaMask.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-2">Resumen del Pedido</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Cantidad:</span>
            <span>{amount} EURT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Precio por token:</span>
            <span>€1.00</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between font-medium">
            <span>Total:</span>
            <span>€{amount}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          Información de Pago
        </h3>
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Procesando Pago...
          </span>
        ) : (
          `Pagar €${amount}`
        )}
      </button>

      {/* Información de tarjetas de prueba de Stripe */}
      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-yellow-900 mb-2">
          🧪 Tarjetas de Prueba (Stripe Test Mode)
        </h4>
        <div className="space-y-2 text-xs text-yellow-800">
          <div>
            <strong>Pago exitoso:</strong>
            <div className="ml-2 mt-1 font-mono bg-white p-2 rounded border border-yellow-300">
              <div>Número: <span className="font-bold">4242 4242 4242 4242</span></div>
              <div>CVV: cualquier 3 dígitos (ej: 123)</div>
              <div>Fecha: cualquier fecha futura (ej: 12/34)</div>
              <div>Código postal: cualquier código válido (ej: 12345)</div>
            </div>
          </div>
          <div className="mt-3">
            <strong>Pago con 3D Secure:</strong>
            <div className="ml-2 mt-1 font-mono bg-white p-2 rounded border border-yellow-300">
              <div>Número: <span className="font-bold">4000 0025 0000 3155</span></div>
              <div>CVV: cualquier 3 dígitos</div>
              <div>Fecha: cualquier fecha futura</div>
            </div>
          </div>
          <div className="mt-2 text-yellow-700">
            <p className="text-xs">
              <strong>Nota:</strong> Estas son tarjetas de prueba. No se realizarán cargos reales.
            </p>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center mt-4">
        <p>
          Tu pago está protegido por Stripe. Al completar esta transacción,
          aceptas recibir {amount} tokens EURT en tu billetera conectada.
        </p>
      </div>
    </form>
  );
}