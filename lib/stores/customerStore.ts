// ~/lib/stores/customerStore.ts
import { create } from 'zustand';
import { getAllCustomers, addCustomer, updateCustomer, deleteCustomer } from '../db/customerOperations';
import { Customer } from '../db/types';
import { useAuthStore } from './authStore';

interface CustomerStoreState {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'totalPurchases' | 'outstandingBalance' | 'loyaltyPoints' | 'lastPurchaseDate'>) => Promise<void>;
  updateCustomer: (customerId: string, updates: Partial<Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'totalPurchases' | 'outstandingBalance' | 'loyaltyPoints' | 'lastPurchaseDate'>>) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  clearError: () => void;
}

export const useCustomerStore = create<CustomerStoreState>((set) => ({
  customers: [],
  isLoading: false,
  error: null,

  fetchCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const userId = useAuthStore.getState().userId;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const customers = await getAllCustomers(userId);
      set({ customers, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch customers:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch customers', 
        isLoading: false 
      });
    }
  },

  addCustomer: async (customerData) => {
    set({ isLoading: true, error: null });
    try {
      const userId = useAuthStore.getState().userId;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const newCustomer = await addCustomer(userId, customerData);
      set(state => ({
        customers: [...state.customers, newCustomer],
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Failed to add customer:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add customer', 
        isLoading: false 
      });
    }
  },

  updateCustomer: async (customerId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const userId = useAuthStore.getState().userId;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const updatedCustomer = await updateCustomer(userId, customerId, updates);
      set(state => ({
        customers: state.customers.map(c => 
          c.id === customerId ? updatedCustomer : c
        ),
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Failed to update customer:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update customer', 
        isLoading: false 
      });
    }
  },

  deleteCustomer: async (customerId) => {
    set({ isLoading: true, error: null });
    try {
      const userId = useAuthStore.getState().userId;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      await deleteCustomer(userId, customerId);
      set(state => ({
        customers: state.customers.filter(c => c.id !== customerId),
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Failed to delete customer:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete customer', 
        isLoading: false 
      });
    }
  },

  clearError: () => set({ error: null })
}));