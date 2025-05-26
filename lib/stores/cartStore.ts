import { create } from 'zustand';
import { Product } from '~/lib/models/product';

interface CartItem extends Product {
  quantityInCart: number;
}

interface CartState {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  removeCartItem: (productId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  selectedQuantities: Record<string, number>;
}

export const useCartStore = create<CartState>((set, get) => ({
  cartItems: [],
  isCartOpen: false,
  selectedQuantities: {},
  addToCart: (product, quantity) => {
    let quantityToSet = quantity;
    if (quantityToSet <= 0) {
      set((state) => ({
        cartItems: state.cartItems.filter((item) => item.id !== product.id),
        selectedQuantities: { ...state.selectedQuantities, [product.id]: 0 },
      }));
      return;
    }
    if (quantityToSet > product.quantity) {
      quantityToSet = product.quantity;
    }
    set((state) => {
      const existingItem = state.cartItems.find((item) => item.id === product.id);
      let newCartItems;
      if (existingItem) {
        newCartItems = state.cartItems.map((item) =>
          item.id === product.id ? { ...item, quantityInCart: quantityToSet } : item
        );
      } else {
        newCartItems = [...state.cartItems, { ...product, quantityInCart: quantityToSet }];
      }
      return {
        cartItems: newCartItems,
        selectedQuantities: { ...state.selectedQuantities, [product.id]: quantityToSet },
      };
    });
  },
  increaseQuantity: (productId) => {
    set((state) => {
      const item = state.cartItems.find((i) => i.id === productId);
      if (!item) return state;
      const maxStock = item.quantity;
      if (item.quantityInCart >= maxStock) return state;
      const newQty = item.quantityInCart + 1;
      return {
        cartItems: state.cartItems.map((i) =>
          i.id === productId ? { ...i, quantityInCart: newQty } : i
        ),
        selectedQuantities: { ...state.selectedQuantities, [productId]: newQty },
      };
    });
  },
  decreaseQuantity: (productId) => {
    set((state) => {
      const item = state.cartItems.find((i) => i.id === productId);
      if (!item) return state;
      const newQty = item.quantityInCart - 1;
      if (newQty <= 0) {
        return {
          cartItems: state.cartItems.filter((i) => i.id !== productId),
          selectedQuantities: { ...state.selectedQuantities, [productId]: 0 },
          isCartOpen: state.cartItems.length === 1 ? false : state.isCartOpen,
        };
      }
      return {
        cartItems: state.cartItems.map((i) =>
          i.id === productId ? { ...i, quantityInCart: newQty } : i
        ),
        selectedQuantities: { ...state.selectedQuantities, [productId]: newQty },
      };
    });
  },
  removeCartItem: (productId) => {
    set((state) => ({
      cartItems: state.cartItems.filter((item) => item.id !== productId),
      selectedQuantities: { ...state.selectedQuantities, [productId]: 0 },
      isCartOpen: state.cartItems.length === 1 ? false : state.isCartOpen,
    }));
  },
  clearCart: () => {
    set({ cartItems: [], selectedQuantities: {}, isCartOpen: false });
  },
  setIsCartOpen: (open) => set({ isCartOpen: open }),
}));