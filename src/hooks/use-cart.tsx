'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

// Define the shape of a single cart item
export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  imageId?: string;
  imageUrl?: string;
  unit?: string;
  userId?: string; // Farmer's ID for marketplace items
  isSample?: boolean;
}

// Define the shape of the cart context
interface CartContextType {
  cartItems: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity: number) => void;
  removeItem: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
}

// Create the context with a default undefined value
const CartContext = createContext<CartContextType | undefined>(undefined);

// Define props for the provider component
interface CartProviderProps {
  children: ReactNode;
}

// Create the provider component
export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity: number) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(i => i.id === item.id);
      if (existingItem) {
        // If item exists, update its quantity
        return prevItems.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      } else {
        // If item doesn't exist, add it to the cart
        return [...prevItems, { ...item, quantity }];
      }
    });
  };

  const removeItem = (itemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = useMemo(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }, [cartItems]);

  const value = useMemo(() => ({
    cartItems,
    addItem,
    removeItem,
    updateItemQuantity,
    clearCart,
    cartCount,
  }), [cartItems, cartCount]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// Create a custom hook for using the cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
