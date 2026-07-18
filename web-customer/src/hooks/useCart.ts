'use client';

import { useState, useEffect, useCallback } from 'react';
import { useContract } from './useContract';
import { BrowserProvider, JsonRpcSigner } from 'ethers';

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

  // Load cart
  const loadCart = useCallback(async () => {
    if (!ecommerce || !address) return;

    try {
      setLoading(true);
      const cartItems = await ecommerce.getCart(address);

      // Enrich cart items with product details
      const enrichedItems = await Promise.all(
        (cartItems as RawCartItem[]).map(async (item) => {
          const product = await ecommerce.getProduct(item.productId);
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
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setLoading(false);
    }
  }, [ecommerce, address]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Add to cart
  const addToCart = useCallback(
    async (productId: bigint, quantity: bigint) => {
      if (!ecommerce) throw new Error('Cart not available');

      const tx = await ecommerce.addToCart(productId, quantity);
      await tx.wait();
      await loadCart();
    },
    [ecommerce, loadCart]
  );

  // Remove from cart
  const removeFromCart = useCallback(
    async (productId: bigint) => {
      if (!ecommerce) throw new Error('Cart not available');

      const tx = await ecommerce.removeFromCart(productId);
      await tx.wait();
      await loadCart();
    },
    [ecommerce, loadCart]
  );

  // Update quantity
  const updateQuantity = useCallback(
    async (productId: bigint, quantity: bigint) => {
      if (!ecommerce) throw new Error('Cart not available');

      const tx = await ecommerce.updateQuantity(productId, quantity);
      await tx.wait();
      await loadCart();
    },
    [ecommerce, loadCart]
  );

  // Clear cart
  const clearCart = useCallback(async () => {
    if (!ecommerce || !address) throw new Error('Cart not available');

    const tx = await ecommerce.clearCart(address);
    await tx.wait();
    await loadCart();
  }, [ecommerce, address, loadCart]);

  return {
    items,
    total,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    refresh: loadCart,
  };
}
