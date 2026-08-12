'use client';

import { useState, useEffect, useCallback } from 'react';
import { useContract } from './useContract';
import { BrowserProvider, JsonRpcSigner, ethers } from 'ethers';

interface CartItem {
  productId: bigint;
  productName: string;
  companyId: bigint;
  quantity: bigint;
  unitPrice: bigint;
}

interface RawCartItem {
  productId: bigint;
  quantity: bigint;
  unitPrice: bigint;
}

const ECOMMERCE_ABI = [
  "function getCart(address _customerAddress) view returns (tuple(uint256 productId, uint256 quantity, uint256 unitPrice)[])",
  "function getProduct(uint256 _productId) view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, string ipfsImageHash, uint256 stock, bool isActive))",
  "function calculateTotal(address _customerAddress) view returns (uint256)"
];

export function useCart(
  provider: BrowserProvider | null,
  signer: JsonRpcSigner | null,
  chainId: number | null,
  address: string | null
) {
  const ecommerce = useContract('ecommerce', provider, signer, chainId);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<bigint>(BigInt(0));
  const [eurtBalance, setEurtBalance] = useState<bigint>(BigInt(0));

  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const euroTokenAddress = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // Load EURT Balance
  const loadEurtBalance = useCallback(async () => {
    if (!address) {
      setEurtBalance(BigInt(0));
      return;
    }
    try {
      const rpcProvider = provider || new ethers.JsonRpcProvider("http://localhost:8545");
      const tokenContract = new ethers.Contract(
        euroTokenAddress,
        ["function balanceOf(address account) view returns (uint256)"],
        rpcProvider
      );
      const bal = await tokenContract.balanceOf(address);
      setEurtBalance(BigInt(bal.toString()));
    } catch (e) {
      console.warn("Error loading EURT balance:", e);
    }
  }, [address, provider, euroTokenAddress]);

  useEffect(() => {
    loadEurtBalance();
  }, [loadEurtBalance]);

  // Load cart from contract or localStorage fallback
  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      const rpcProvider = provider || new ethers.JsonRpcProvider("http://localhost:8545");
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

      if (address && ecommerce) {
        try {
          const cartItems = await ecommerce.getCart(address);
          const enrichedItems = await Promise.all(
            (cartItems as RawCartItem[]).map(async (item) => {
              const product = await contract.getProduct(item.productId);
              return {
                productId: item.productId,
                productName: product.name,
                companyId: product.companyId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              };
            })
          );
          setItems(enrichedItems);
          const cartTotal = await ecommerce.calculateTotal(address);
          setTotal(cartTotal);
          return;
        } catch (e) {
          console.warn("Contract cart fetch error:", e);
        }
      }

      // LocalStorage fallback for un-connected users
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('guest_cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          let sum = BigInt(0);
          const enriched = parsed.map((item: any) => {
            const qty = BigInt(item.quantity);
            const price = BigInt(item.unitPrice);
            sum += qty * price;
            return {
              productId: BigInt(item.productId),
              productName: item.productName,
              companyId: BigInt(item.companyId),
              quantity: qty,
              unitPrice: price,
            };
          });
          setItems(enriched);
          setTotal(sum);
        } else {
          setItems([]);
          setTotal(BigInt(0));
        }
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setLoading(false);
    }
  }, [ecommerce, address, provider, ecommerceAddress]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Sync guest cart from localStorage to smart contract
  const syncGuestCartToContract = useCallback(
    async (activeSigner: JsonRpcSigner) => {
      if (typeof window === 'undefined') return;
      const saved = localStorage.getItem('guest_cart');
      if (!saved) return;
      let guestItems: any[] = [];
      try {
        guestItems = JSON.parse(saved);
      } catch {
        return;
      }
      if (!Array.isArray(guestItems) || guestItems.length === 0) return;

      const contract = new ethers.Contract(
        ecommerceAddress,
        ["function addToCart(uint256 _productId, uint256 _quantity)"],
        activeSigner
      );

      for (const item of guestItems) {
        try {
          const tx = await contract.addToCart(BigInt(item.productId), BigInt(item.quantity));
          await tx.wait();
        } catch (e) {
          console.warn("Error syncing item to contract:", item.productId, e);
        }
      }

      localStorage.removeItem('guest_cart');
      await loadCart();
    },
    [ecommerceAddress, loadCart]
  );

  // Add to cart
  const addToCart = useCallback(
    async (productId: bigint, quantity: bigint) => {
      if (ecommerce && address) {
        try {
          const tx = await ecommerce.addToCart(productId, quantity);
          await tx.wait();
          await loadCart();
          return;
        } catch (e) {
          console.warn("Contract addToCart fallback to local:", e);
        }
      }

      // LocalStorage add fallback
      if (typeof window !== 'undefined') {
        const rpcProvider = provider || new ethers.JsonRpcProvider("http://localhost:8545");
        const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);
        const prod = await contract.getProduct(productId);

        const saved = localStorage.getItem('guest_cart');
        let currentCart = saved ? JSON.parse(saved) : [];

        const existingIdx = currentCart.findIndex((i: any) => i.productId === productId.toString());
        if (existingIdx >= 0) {
          currentCart[existingIdx].quantity = (BigInt(currentCart[existingIdx].quantity) + quantity).toString();
        } else {
          currentCart.push({
            productId: productId.toString(),
            productName: prod.name,
            companyId: prod.companyId.toString(),
            quantity: quantity.toString(),
            unitPrice: prod.price.toString(),
          });
        }

        localStorage.setItem('guest_cart', JSON.stringify(currentCart));
        await loadCart();
      }
    },
    [ecommerce, address, provider, ecommerceAddress, loadCart]
  );

  // Remove from cart
  const removeFromCart = useCallback(
    async (productId: bigint) => {
      if (ecommerce && address) {
        try {
          const tx = await ecommerce.removeFromCart(productId);
          await tx.wait();
          await loadCart();
          return;
        } catch (e) {
          console.warn("Contract removeFromCart fallback:", e);
        }
      }

      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('guest_cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          const filtered = parsed.filter((i: any) => i.productId !== productId.toString());
          localStorage.setItem('guest_cart', JSON.stringify(filtered));
          await loadCart();
        }
      }
    },
    [ecommerce, address, loadCart]
  );

  // Update quantity
  const updateQuantity = useCallback(
    async (productId: bigint, quantity: bigint) => {
      if (ecommerce && address) {
        try {
          const tx = await ecommerce.updateQuantity(productId, quantity);
          await tx.wait();
          await loadCart();
          return;
        } catch (e) {
          console.warn("Contract updateQuantity fallback:", e);
        }
      }

      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('guest_cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          const idx = parsed.findIndex((i: any) => i.productId === productId.toString());
          if (idx >= 0) {
            parsed[idx].quantity = quantity.toString();
            localStorage.setItem('guest_cart', JSON.stringify(parsed));
            await loadCart();
          }
        }
      }
    },
    [ecommerce, address, loadCart]
  );

  // Clear cart
  const clearCart = useCallback(async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('guest_cart');
    }
    if (ecommerce && address) {
      try {
        const tx = await ecommerce.clearCart(address);
        await tx.wait();
      } catch (e) {
        console.warn("Clear cart contract error:", e);
      }
    }
    await loadCart();
  }, [ecommerce, address, loadCart]);

  return {
    items,
    total,
    loading,
    eurtBalance,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    syncGuestCartToContract,
    refresh: loadCart,
    refreshBalance: loadEurtBalance,
  };
}
