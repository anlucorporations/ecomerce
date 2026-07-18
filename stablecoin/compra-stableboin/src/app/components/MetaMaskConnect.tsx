'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface MetaMaskConnectProps {
  onWalletConnected: (address: string) => void;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<string[]>;
    };
  }
}

const EUROTOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const EUROTOKEN_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS;

export default function MetaMaskConnect({ onWalletConnected }: MetaMaskConnectProps) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [, setWalletAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [balance, setBalance] = useState<string>('0');

  const updateBalance = async (address: string) => {
    if (typeof window === 'undefined' || !window.ethereum || !EUROTOKEN_CONTRACT_ADDRESS) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(EUROTOKEN_CONTRACT_ADDRESS, EUROTOKEN_ABI, provider);
      const balanceWei = await contract.balanceOf(address);
      const balanceFormatted = ethers.formatUnits(balanceWei, 6);
      setBalance(balanceFormatted);
    } catch (error) {
      console.error('Error updating balance:', error);
      setBalance('0');
    }
  };

  const checkConnection = useCallback(async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          onWalletConnected(accounts[0]);
          await updateBalance(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  }, [onWalletConnected]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('MetaMask no está instalado. Por favor, instala MetaMask para continuar.');
      return;
    }

    setIsLoading(true);

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setIsConnected(true);
        onWalletConnected(accounts[0]);
        await updateBalance(accounts[0]);
      }
    } catch (error: unknown) {
      console.error('Error connecting wallet:', error);
      const err = error as { code?: number };
      if (err.code === 4001) {
        alert('Conexión rechazada por el usuario');
      } else {
        alert('Error al conectar la billetera');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setIsConnected(false);
    setBalance('0');
    onWalletConnected('');
  };

  if (!isConnected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M30.1 8.4L18.6 0.6C16.8 -0.6 14.4 -0.2 13.1 1.6L0.9 18.2C-0.4 20 0 22.4 1.8 23.7L13.3 31.5C15.1 32.8 17.5 32.4 18.8 30.6L31 14C32.3 12.2 31.9 9.8 30.1 8.4Z" fill="#F6851B"/>
            <path d="M16 23C19.866 23 23 19.866 23 16C23 12.134 19.866 9 16 9C12.134 9 9 12.134 9 16C9 19.866 12.134 23 16 23Z" fill="#E2761B"/>
          </svg>
          <span className="text-lg font-medium text-gray-700">Conectar MetaMask</span>
        </div>

        <button
          onClick={connectWallet}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 bg-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Conectando...
            </span>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M30.1 8.4L18.6 0.6C16.8 -0.6 14.4 -0.2 13.1 1.6L0.9 18.2C-0.4 20 0 22.4 1.8 23.7L13.3 31.5C15.1 32.8 17.5 32.4 18.8 30.6L31 14C32.3 12.2 31.9 9.8 30.1 8.4Z" fill="currentColor"/>
              </svg>
              <span>Conectar Billetera</span>
            </>
          )}
        </button>

        <div className="text-sm text-gray-500">
          <p>Necesitas conectar tu billetera MetaMask para recibir los tokens EURT.</p>
          <p className="mt-1">
            ¿No tienes MetaMask?
            <a
              href="https://metamask.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 ml-1 underline"
            >
              Descárgalo aquí
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-green-700 font-medium">Billetera Conectada</span>
          </div>
          <button
            onClick={disconnectWallet}
            className="text-red-600 hover:text-red-800 text-sm underline"
          >
            Desconectar
          </button>
        </div>
        <div className="bg-white border border-green-200 rounded-lg p-3">
          <p className="text-sm text-gray-600 mb-1">Balance de EuroToken:</p>
          <p className="text-2xl font-bold text-green-600">{balance} EURT</p>
        </div>
      </div>
    </div>
  );
}