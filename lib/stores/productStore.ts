import { create } from 'zustand';
import { getDatabase } from '~/lib/db/database';
import { Product } from './types';
import { generateId } from '~/lib/utils/authUtils';

interface ProductStore {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = getDatabase();
      const products = await db.getAllAsync<Product>('SELECT * FROM products ORDER BY name');
      set({ products, isLoading: false });
    } catch (error) {
      console.error('Error fetching products:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch products', 
        isLoading: false 
      });
    }
  },

  addProduct: async (product) => {
    set({ isLoading: true, error: null });
    try {
      const db = getDatabase();
      const id = generateId();
      const now = new Date().toISOString();
      
      const newProduct: Product = {
        id,
        ...product,
        createdAt: now,
        updatedAt: now,
      };
      
      // Insert into database
      await db.runAsync(
        `INSERT INTO products (
          id, name, costPrice, sellingPrice, quantity, unit, 
          category, imageUri, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newProduct.id,
          newProduct.name,
          newProduct.costPrice,
          newProduct.sellingPrice,
          newProduct.quantity,
          newProduct.unit || 'piece',
          newProduct.category || null,
          newProduct.imageUri || null,
          newProduct.createdAt,
          newProduct.updatedAt,
        ]
      );
      
      // Update local state
      set(state => ({
        products: [...state.products, newProduct],
        isLoading: false
      }));
      
      return newProduct;
    } catch (error) {
      console.error('Error adding product:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add product', 
        isLoading: false 
      });
      throw error;
    }
  },

  updateProduct: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const db = getDatabase();
      const now = new Date().toISOString();
      
      // Get current product
      const currentProduct = get().products.find(p => p.id === id);
      if (!currentProduct) {
        throw new Error('Product not found');
      }
      
      // Update fields
      const updatedProduct = {
        ...currentProduct,
        ...updates,
        updatedAt: now
      };
      
      // Build dynamic update query based on which fields are provided
      const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const updateValues = [...Object.values(updates), now, id];
      
      // Update database
      await db.runAsync(
        `UPDATE products SET ${updateFields}, updatedAt = ? WHERE id = ?`,
        updateValues
      );
      
      // Update local state
      set(state => ({
        products: state.products.map(p => (p.id === id ? updatedProduct : p)),
        isLoading: false
      }));
      
      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update product', 
        isLoading: false 
      });
      throw error;
    }
  },

  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const db = getDatabase();
      
      // Delete from database
      await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
      
      // Update local state
      set(state => ({
        products: state.products.filter(p => p.id !== id),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error deleting product:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete product', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  clearError: () => set({ error: null }),
}));