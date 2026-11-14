"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem } from "@/types";
import { countLyItems } from "@/lib/utils";

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  totalItems: number;
  lyCount: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from LocalStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cafe_cart");
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to read cart from localStorage", e);
    }
    setIsInitialized(true);
  }, []);

  // Save cart to LocalStorage on change
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem("cafe_cart", JSON.stringify(items));
      } catch (e) {
        console.error("Failed to write cart to localStorage", e);
      }
    }
  }, [items, isInitialized]);

  const addToCart = (newItem: CartItem) => {
    setItems((prev) => {
      // Check if an item with identical product, variant, options and label exists
      const existingIdx = prev.findIndex(
        (i) =>
          i.product.id === newItem.product.id &&
          i.variant.id === newItem.variant.id &&
          i.recipientLabel === newItem.recipientLabel &&
          JSON.stringify(i.selectedOptions) === JSON.stringify(newItem.selectedOptions)
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        const nextQty = Math.min(50, updated[existingIdx].quantity + newItem.quantity);
        updated[existingIdx].quantity = nextQty;
        updated[existingIdx].totalPrice = updated[existingIdx].unitPrice * nextQty;
        return updated;
      }

      return [...prev, { ...newItem, quantity: Math.min(50, newItem.quantity), totalPrice: newItem.unitPrice * Math.min(50, newItem.quantity) }];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = Math.min(50, item.quantity + delta);
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              totalPrice: item.unitPrice * newQty,
            };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const lyCount = countLyItems(items);
  const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        totalItems,
        lyCount,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
