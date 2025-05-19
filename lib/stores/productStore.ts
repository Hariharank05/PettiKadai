import { create } from 'zustand';
import { Product, ProductInput, ProductModel } from '../models/product';
import { useAuthStore } from './authStore';

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  lowStockProducts: Product[];
 
  // Actions
  fetchProducts: () => Promise<void>;
  fetchLowStockProducts: () => Promise<void>;
  addProduct: (product: Omit<ProductInput, 'userId'>) => Promise<Product>;
  updateProduct: (id: string, product: Partial<Omit<ProductInput, 'userId'>>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,
  error: null,
  lowStockProducts: [],

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      // Get current user ID from auth store
      const userId = useAuthStore.getState().userId;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const products = await ProductModel.getAll(userId);
      set({ products, loading: false });
    } catch (error: any) {
      console.error('Error fetching products:', error);
      set({ error: 'Failed to fetch products', loading: false });
    }
  },

  fetchLowStockProducts: async () => {
    set({ loading: true, error: null });
    try {
      // Get current user ID from auth store
      const userId = useAuthStore.getState().userId;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const lowStockProducts = await ProductModel.getLowStock(userId);
      set({ lowStockProducts, loading: false });
    } catch (error: any) {
      console.error('Error fetching low stock products:', error);
      set({ error: 'Failed to fetch low stock products', loading: false });
    }
  },

  addProduct: async (productData: Omit<ProductInput, 'userId'>) => {
    set({ loading: true, error: null });
    try {
      // Get current user ID from auth store
      const userId = useAuthStore.getState().userId;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Add userId to the product input
      const productWithUserId: ProductInput = {
        ...productData,
        userId,
      };
      
      const newProduct = await ProductModel.create(productWithUserId);
      set((state) => ({
        products: [...state.products, newProduct],
        loading: false
      }));
     
      // If the new product has low stock, update lowStockProducts
      if (newProduct.quantity < 5) {
        get().fetchLowStockProducts();
      }
     
      return newProduct;
    } catch (error: any) {
      console.error('Error adding product:', error);
      set({ error: 'Failed to add product', loading: false });
      throw error;
    }
  },

  updateProduct: async (id: string, productData: Partial<Omit<ProductInput, 'userId'>>) => {
    set({ loading: true, error: null });
    try {
      // Get current user ID from auth store
      const userId = useAuthStore.getState().userId;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const updatedProduct = await ProductModel.update(id, productData, userId);
      set((state) => ({
        products: state.products.map(p => p.id === id ? updatedProduct : p),
        loading: false
      }));
     
      // Refresh low stock products as the update might have changed stock levels
      get().fetchLowStockProducts();
    } catch (error: any) {
      console.error('Error updating product:', error);
      set({ error: 'Failed to update product', loading: false });
      throw error;
    }
  },

  deleteProduct: async (id: string) => {
    set({ loading: true, error: null });
    try {
      // Get current user ID from auth store
      const userId = useAuthStore.getState().userId;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      await ProductModel.delete(id, userId);
      set((state) => ({
        products: state.products.filter(p => p.id !== id),
        lowStockProducts: state.lowStockProducts.filter(p => p.id !== id),
        loading: false
      }));
    } catch (error: any) {
      console.error('Error deleting product:', error);
      set({ error: 'Failed to delete product', loading: false });
      throw error;
    }
  }
}));