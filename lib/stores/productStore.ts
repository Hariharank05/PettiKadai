import { create } from 'zustand';
import { Product, ProductInput, ProductModel } from '../models/product';

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  lowStockProducts: Product[];
 
  // Actions
  fetchProducts: () => Promise<void>;
  fetchLowStockProducts: () => Promise<void>;
  addProduct: (product: ProductInput) => Promise<Product>;
  updateProduct: (id: string, product: Partial<ProductInput>) => Promise<void>;
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
      const products = await ProductModel.getAll();
      set({ products, loading: false });
    } catch (error: any) {
      console.error('Error fetching products:', error);
      set({ error: 'Failed to fetch products', loading: false });
    }
  },

  fetchLowStockProducts: async () => {
    set({ loading: true, error: null });
    try {
      const lowStockProducts = await ProductModel.getLowStock();
      set({ lowStockProducts, loading: false });
    } catch (error: any) {
      console.error('Error fetching low stock products:', error);
      set({ error: 'Failed to fetch low stock products', loading: false });
    }
  },

  addProduct: async (product: ProductInput) => {
    set({ loading: true, error: null });
    try {
      const newProduct = await ProductModel.create(product);
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

  updateProduct: async (id: string, product: Partial<ProductInput>) => {
    set({ loading: true, error: null });
    try {
      const updatedProduct = await ProductModel.update(id, product);
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
      await ProductModel.delete(id);
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