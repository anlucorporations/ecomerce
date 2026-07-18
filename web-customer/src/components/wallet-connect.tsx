'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

const EXPECTED_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '81234');

export function WalletConnect() {
  const { address, chainId, isConnected, isConnecting, connect, disconnect, switchNetwork, error } = useWallet();
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

  const handleConnect = async () => {
    try {
      await connect();
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <div className="font-medium text-gray-900 text-black">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
          <div className={`text-xs ${isWrongNetwork ? 'text-red-600' : 'text-gray-600'}`}>
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
        onClick={handleConnect}
        disabled={isConnecting}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {error && (
        <div className="absolute right-0 mt-2 bg-red-50 border border-red-200 rounded-lg p-3 z-10 min-w-[250px]">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
