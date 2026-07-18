'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ethers } from 'ethers';

interface PaymentData {
  merchant_address: string;
  amount: string;
  invoice: string;
  date: string;
  redirect?: string;
}

interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  paymentData: PaymentData;
}

const EUROTOKEN_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const ECOMMERCE_ABI = [
  "function processPayment(address _customer, uint256 _amount, uint256 _invoiceId) returns (bool)"
];

const EUROTOKEN_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS;
const ECOMMERCE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS;
export default function PaymentGateway() {
  const searchParams = useSearchParams();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);

  useEffect(() => {
    const merchant_address = searchParams.get('merchant_address');
    const amount = searchParams.get('amount');
    const invoice = searchParams.get('invoice');
    const date = searchParams.get('date');
    const redirect = searchParams.get('redirect');

    console.log('URL Parameters:', {
      merchant_address,
      amount,
      invoice,
      date,
      redirect
    });

    if (merchant_address && amount && invoice && date) {
      const data = {
        merchant_address,
        amount,
        invoice,
        date,
        redirect: redirect || undefined
      };
      console.log('Setting payment data:', data);
      setPaymentData(data);
    } else {
      console.log('Missing required parameters - not setting payment data');
    }
  }, [searchParams]);

  useEffect(() => {
    const initConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
          if (accounts.length > 0) {
            setCurrentAddress(accounts[0]);
            setIsConnected(true);
            await updateBalance(accounts[0]);
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      }
    };
    initConnection();

    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      const ethereum = window.ethereum;
      if (ethereum && typeof ethereum.on === 'function') {
        const handleAccountsChanged = (...args: unknown[]) => {
          const accounts = args[0] as string[];
          if (accounts && accounts.length > 0) {
            const newAddress = accounts[0];
            setCurrentAddress(newAddress);
            setIsConnected(true);
            updateBalance(newAddress);
          } else {
            setIsConnected(false);
            setCurrentAddress('');
            setBalance('0');
          }
        };

        ethereum.on('accountsChanged', handleAccountsChanged);

        // Cleanup
        return () => {
          if (ethereum && typeof ethereum.removeListener === 'function') {
            ethereum.removeListener('accountsChanged', handleAccountsChanged);
          }
        };
      }
    }
  }, []);


  const connectToBesuNetwork = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('MetaMask no está instalado. Por favor, instala MetaMask para continuar.');
      return;
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://besu1.proyectos.codecrypto.academy';
    const chainId = '0x13d52'; // 81234 in hex (Besu network)

    try {
      // Try to switch to Besu network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    } catch (switchError: unknown) {
      // If the network doesn't exist, add it
      const error = switchError as { code?: number };
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId,
              chainName: 'Besu Network',
              nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: [rpcUrl],
            }],
          });
        } catch (addError) {
          console.error('Error adding network:', addError);
          alert('Error al agregar la red Besu. Por favor, agrégala manualmente en MetaMask.');
        }
      } else {
        console.error('Error switching network:', switchError);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('MetaMask no está instalado. Por favor, instala MetaMask para continuar.');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (accounts.length > 0) {
        const connectedAddress = accounts[0];
        setCurrentAddress(connectedAddress);
        setIsConnected(true);
        await updateBalance(connectedAddress);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const updateBalance = async (address: string) => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(EUROTOKEN_CONTRACT_ADDRESS || '', EUROTOKEN_ABI, provider);
      const balanceWei = await contract.balanceOf(address);
      const balanceFormatted = ethers.formatUnits(balanceWei, 6);
      setBalance(balanceFormatted);
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  };

  const processPayment = async () => {
    if (!paymentData || !isConnected || !currentAddress || typeof window === 'undefined' || !window.ethereum) return;
    if (!EUROTOKEN_CONTRACT_ADDRESS) {
      setPaymentResult({
        success: false,
        error: 'EUROTOKEN_CONTRACT_ADDRESS no está configurado',
        paymentData
      });
      setIsProcessing(false);
      return;
    }

    if (!ECOMMERCE_CONTRACT_ADDRESS) {
      setPaymentResult({
        success: false,
        error: 'ECOMMERCE_CONTRACT_ADDRESS no está configurado',
        paymentData
      });
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const euroTokenContract = new ethers.Contract(EUROTOKEN_CONTRACT_ADDRESS, EUROTOKEN_ABI, signer);

      // Convert amount to wei (6 decimals for EURT)
      const amountWei = ethers.parseUnits(paymentData.amount, 6);

      // Check balance
      const currentBalance = await euroTokenContract.balanceOf(currentAddress);
      if (currentBalance < amountWei) {
        const result: PaymentResult = {
          success: false,
          error: `Saldo insuficiente. Necesita ${paymentData.amount} EURT pero solo tiene ${ethers.formatUnits(currentBalance, 6)} EURT`,
          paymentData: paymentData
        };
        setPaymentResult(result);
        setIsProcessing(false);
        return;
      }

      // Convert invoice string to uint256
      // The contract expects a numeric invoiceId that must exist in the contract
      // Try to extract numeric ID if format is "INV-123", "TEST-001", etc.
      let invoiceId: bigint;
      
      // Try to extract any numeric value from the invoice string
      const numericMatch = paymentData.invoice.match(/\d+/);
      
      if (numericMatch) {
        // If there's a numeric part anywhere, use it (e.g., "TEST-001" -> 1, "INV-123" -> 123)
        invoiceId = BigInt(numericMatch[0]);
      } else {
        // If no numeric part, create a numeric hash from the invoice string
        // Use keccak256 to hash the invoice string, then take a portion as uint256
        const invoiceHash = ethers.keccak256(ethers.toUtf8Bytes(paymentData.invoice));
        // Take last 16 hex characters (8 bytes) to ensure it fits in uint256
        // This gives us a consistent numeric ID from the string
        invoiceId = BigInt('0x' + invoiceHash.slice(-16));
      }

      console.log('Invoice string:', paymentData.invoice);
      console.log('Invoice ID (uint256):', invoiceId.toString());

      // Approve Ecommerce contract to spend tokens
      console.log('Approving Ecommerce contract to spend tokens...');
      if (!ECOMMERCE_CONTRACT_ADDRESS) {
        throw new Error('ECOMMERCE_CONTRACT_ADDRESS no está configurado');
      }
      const approveTx = await euroTokenContract.approve(ECOMMERCE_CONTRACT_ADDRESS, amountWei);
      await approveTx.wait();
      console.log('Approval confirmed');

      // Call processPayment on Ecommerce contract
      const ecommerceContract = new ethers.Contract(ECOMMERCE_CONTRACT_ADDRESS, ECOMMERCE_ABI, signer);
      console.log('Processing payment through Ecommerce contract...');
      const tx = await ecommerceContract.processPayment(currentAddress, amountWei, invoiceId);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Payment processed successfully');

      const result: PaymentResult = {
        success: true,
        transactionHash: receipt.hash,
        paymentData: paymentData
      };

      setPaymentResult(result);
      await updateBalance(currentAddress);

      // Send result to parent window or callback URL
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'PAYMENT_COMPLETED',
          result: result
        }, '*');
      }

    } catch (error: unknown) {
      const err = error as Error;
      const result: PaymentResult = {
        success: false,
        error: err.message || 'Error procesando el pago',
        paymentData: paymentData
      };

      setPaymentResult(result);
    } finally {
      setIsProcessing(false);
    }
  };

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
              <li>• <code>amount</code> - Cantidad a pagar</li>
              <li>• <code>invoice</code> - Número de factura</li>
              <li>• <code>date</code> - Fecha de la transacción</li>
              <li>• <code>redirect</code> - URL de retorno (opcional)</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (paymentResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full">
          {paymentResult.success ? (
            <div className="text-center">
              <div className="text-green-500 text-4xl mb-4">✅</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">¡Pago Completado!</h1>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-green-900 mb-6 text-xl">Detalles de la Transacción</h3>
                <div className="space-y-4 text-base text-left">
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-green-700 font-semibold mb-2">Hash de Transacción:</p>
                    <p className="font-mono text-sm text-gray-900 break-all bg-gray-100 p-3 rounded">{paymentResult.transactionHash}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-green-700 font-semibold mb-2">Cantidad:</p>
                      <p className="text-2xl font-bold text-blue-600">{paymentResult.paymentData.amount} EURT</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-green-700 font-semibold mb-2">Factura:</p>
                      <p className="text-xl font-bold text-gray-900">{paymentResult.paymentData.invoice}</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-green-700 font-semibold mb-2">Destinatario (Comerciante):</p>
                    <p className="font-mono text-sm text-gray-900 break-all bg-gray-100 p-3 rounded">{paymentResult.paymentData.merchant_address}</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-green-700 font-semibold mb-2">Fecha:</p>
                    <p className="text-lg font-semibold text-gray-900">{paymentResult.paymentData.date}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  La transacción ha sido enviada a la blockchain.
                </p>

                {paymentResult.paymentData.redirect ? (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <a
                      href={paymentResult.paymentData.redirect}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block text-center"
                    >
                      Regresar a la Aplicación
                    </a>
                    <button
                      onClick={() => window.close()}
                      className="bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                    >
                      Cerrar Ventana
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => window.close()}
                    className="bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                  >
                    Cerrar Ventana
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">❌</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Error en el Pago</h1>

              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-red-900 mb-4 text-lg">Error:</h3>
                <div className="bg-white p-4 rounded-lg border border-red-300">
                  <p className="text-red-800 font-medium text-base">{paymentResult.error}</p>
                </div>
              </div>

              <div className="space-y-3">
                {paymentResult.error?.includes('Saldo insuficiente') && (
                  <a
                    href="http://localhost:6001/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    💰 Comprar Stablecoins
                  </a>
                )}
                <button
                  onClick={() => setPaymentResult(null)}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Intentar Nuevamente
                </button>
              </div>
            </div>
          )}
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
          <p className="text-xs text-gray-500 mt-2 font-mono">{EUROTOKEN_CONTRACT_ADDRESS}</p>
        </div>

        {/* Payment Details */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles del Pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="md:col-span-2">
              <p className="text-gray-600">Comerciante:</p>
              <p className="font-mono text-sm text-gray-900 break-all bg-white p-2 rounded border">{paymentData.merchant_address}</p>
            </div>
            <div>
              <p className="text-gray-600">Cantidad:</p>
              <p className="text-2xl font-bold text-blue-600">{paymentData.amount} EURT</p>
            </div>
            <div>
              <p className="text-gray-600">Factura:</p>
              <p className="font-semibold text-gray-900 text-lg">{paymentData.invoice}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-600">Fecha:</p>
              <p className="text-gray-900 font-medium">{paymentData.date}</p>
            </div>
          </div>
        </div>

        {/* Network Connection */}
        <div className="mb-4">
          <button
            onClick={connectToBesuNetwork}
            className="w-full bg-purple-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
          >
            <span>🌐</span>
            <span>Conectar a Red Besu</span>
          </button>
        </div>

        {/* Wallet Connection */}
        <div className="mb-6">
          {!isConnected ? (
            <button
              onClick={connectWallet}
              className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              Conectar MetaMask
            </button>
          ) : (
            <div className="space-y-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-green-700 font-medium">Billetera Conectada</p>
                    <p className="text-green-600 font-mono text-xs break-all">{currentAddress}</p>
                    <p className="text-green-600 text-sm">Balance: {balance} EURT</p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0 ml-2"></div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsConnected(false);
                  setCurrentAddress('');
                  setBalance('0');
                }}
                className="w-full bg-gray-400 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-500 transition-colors text-sm"
              >
                Cambiar de Cuenta
              </button>
            </div>
          )}
        </div>

        {/* Payment Button */}
        <button
          onClick={processPayment}
          disabled={!isConnected || isProcessing}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Procesando Pago...
            </span>
          ) : (
            `Pagar ${paymentData.amount} EURT`
          )}
        </button>

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Al hacer clic en &quot;Pagar&quot;, se le pedirá que firme la transacción con MetaMask.</p>
        </div>
      </div>
    </div>
  );
}