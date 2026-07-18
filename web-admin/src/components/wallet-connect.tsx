'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

const EXPECTED_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '81234');

export function WalletConnect() {
  const { wallets, address, chainId, isConnected, isConnecting, connect, disconnect, switchNetwork, error } = useWallet();
  const [showWallets, setShowWallets] = useState(false);
  const [switching, setSwitching] = useState(false);

  const isWrongNetwork = isConnected && chainId !== EXPECTED_CHAIN_ID;

  // Auto-switch network when connected to wrong chain
  useEffect(() => {
    if (isWrongNetwork && !switching) {
      handleSwitchNetwork();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWrongNetwork]);

  const handleSwitchNetwork = async () => {
    try {
      setSwitching(true);
      await switchNetwork(EXPECTED_CHAIN_ID);
    } catch (err) {
      console.error('Failed to switch network:', err);
    } finally {
      setSwitching(false);
    }
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <div className="font-medium">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
          <div className={`text-xs ${isWrongNetwork ? 'text-red-500' : 'text-gray-500'}`}>
            {isWrongNetwork ? (
              <span className="flex items-center gap-1">
                ⚠️ Wrong Network (Chain {chainId})
              </span>
            ) : (
              `Chain ${chainId}`
            )}
          </div>
        </div>

        {isWrongNetwork && (
          <button
            onClick={handleSwitchNetwork}
            disabled={switching}
            className="px-3 py-1.5 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 disabled:opacity-50"
          >
            {switching ? 'Switching...' : 'Switch to Besu'}
          </button>
        )}

        <button
          onClick={disconnect}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowWallets(!showWallets)}
        disabled={isConnecting}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showWallets && wallets.length > 0 && (
        <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg p-4 z-10 min-w-[250px]">
          <h3 className="font-semibold mb-2">Select Wallet</h3>
          <div className="space-y-2">
            {wallets.map((wallet) => (
              <button
                key={wallet.uuid}
                onClick={() => {
                  connect(wallet);
                  setShowWallets(false);
                }}
                className="flex items-center gap-2 w-full p-2 hover:bg-gray-100 rounded"
              >
                {wallet.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={wallet.icon} alt={wallet.name} className="w-6 h-6" />
                )}
                <span>{wallet.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showWallets && wallets.length === 0 && (
        <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg p-4 z-10 min-w-[250px]">
          <p className="text-sm text-gray-600">
            No wallets detected. Please install MetaMask or another Web3 wallet.
          </p>
        </div>
      )}

      {error && (
        <div className="absolute right-0 mt-2 bg-red-50 border border-red-200 rounded-lg p-3 z-10 min-w-[250px]">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
