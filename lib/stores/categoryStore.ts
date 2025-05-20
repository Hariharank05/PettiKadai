import { create } from 'zustand';
import { getAllCategories, addCategory, updateCategory, deleteCategory } from '../db/categoryOperations';

import { useAuthStore } from './authStore';
import { Category } from './types';

interface CategoryStoreState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateCategory: (categoryId: string, updates: Partial<Omit<Category, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  clearError: () => void;
}

export const useCategoryStore = create<CategoryStoreState>((set) => ({
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const authState = useAuthStore.getState();
      const userId = authState.userId;

      if (!userId) {
        const errorMessage = 'User not authenticated to fetch categories.';
        console.warn(errorMessage);
        set({ isLoading: false, categories: [], error: errorMessage });
        return;
      }

      const categories = await getAllCategories(userId);
      console.log('Fetched categories:', categories); // Debug log
      set({ categories, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
        isLoading: false,
      });
    }
  },

  addCategory: async (categoryData) => {
    set({ isLoading: true, error: null });
    try {
      const authState = useAuthStore.getState();
      const userId = authState.userId;

      if (!userId) {
        const errorMessage = 'User not authenticated to add category.';
        console.warn(errorMessage);
        set({ isLoading: false, error: errorMessage });
        throw new Error(errorMessage);
      }

      const newCategory = await addCategory(userId, categoryData);
      set((state) => {
        const updatedCategories = [...state.categories, newCategory];
        console.log('Added category, new state:', updatedCategories); // Debug log
        return {
          categories: updatedCategories,
          isLoading: false,
        };
      });
    } catch (error: any) {
      console.error('Failed to add category:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to add category.',
        isLoading: false,
      });
      throw error;
    }
  },

  updateCategory: async (categoryId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const authState = useAuthStore.getState();
      const userId = authState.userId;

      if (!userId) {
        const errorMessage = 'User not authenticated to update category.';
        console.warn(errorMessage);
        set({ isLoading: false, error: errorMessage });
        throw new Error(errorMessage);
      }

      const updatedCategory = await updateCategory(userId, categoryId, updates);
      set((state) => {
        const updatedCategories = state.categories.map((c) =>
          c.id === categoryId ? updatedCategory : c
        );
        console.log('Updated category, new state:', updatedCategories); // Debug log
        return {
          categories: updatedCategories,
          isLoading: false,
        };
      });
    } catch (error: any) {
      console.error('Failed to update category:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update category.',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteCategory: async (categoryId) => {
    set({ isLoading: true, error: null });
    try {
      const authState = useAuthStore.getState();
      const userId = authState.userId;

      if (!userId) {
        const errorMessage = 'User not authenticated to delete category.';
        console.warn(errorMessage);
        set({ isLoading: false, error: errorMessage });
        throw new Error(errorMessage);
      }

      await deleteCategory(userId, categoryId);
      set((state) => ({
        categories: state.categories.filter((c) => c.id !== categoryId),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to delete category.',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));