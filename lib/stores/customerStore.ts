// ~/lib/stores/customerStore.ts
import { create } from 'zustand';
import { getAllCustomers, addCustomer, updateCustomer, deleteCustomer } from '../db/customerOperations';
import { Customer } from './types';
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
      const authState = useAuthStore.getState();
      const userId = authState.userId; 

      if (!userId) {
        const errorMessage = 'User not authenticated to fetch customers.';
        console.warn(errorMessage); // Use warn for expected flow
        set({ isLoading: false, customers: [], error: errorMessage }); // Clear data and set error
        return; // Stop the function execution
        // If fetching is critical and should fail loudly, uncomment:
        // throw new Error(errorMessage);
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
      const authState = useAuthStore.getState();
      const userId = authState.userId; 

      if (!userId) {
        const errorMessage = 'User not authenticated to add customer.';
        console.warn(errorMessage);
        set({ isLoading: false, error: errorMessage });
        throw new Error(errorMessage); 
        }
      
      const newCustomer = await addCustomer(userId, customerData);
      set(state => ({
        customers: [...state.customers, newCustomer],
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Failed to add customer:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to add customer.',
        isLoading: false
      });
      throw error; // Re-throw if throwing is the desired behavior
    }
  },

  updateCustomer: async (customerId, updates) => {
    set({ isLoading: true, error: null });
    try {
      // Get state inside the async function scope
      const authState = useAuthStore.getState();
      const userId = authState.userId; // Type: string | undefined

      if (!userId) {
        const errorMessage = 'User not authenticated to update customer.';
        console.warn(errorMessage);
        set({ isLoading: false, error: errorMessage });
        throw new Error(errorMessage);
      }

      // userId is now guaranteed to be a string
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
        error: error instanceof Error ? error.message : 'Failed to update customer.',
        isLoading: false
      });
      throw error;
    }
  },

  deleteCustomer: async (customerId) => {
    set({ isLoading: true, error: null });
    try {
      // Get state inside the async function scope
      const authState = useAuthStore.getState();
      const userId = authState.userId; // Type: string | undefined

      if (!userId) {
        const errorMessage = 'User not authenticated to delete customer.';
        console.warn(errorMessage);
        set({ isLoading: false, error: errorMessage });
        throw new Error(errorMessage);
      }

      // userId is now guaranteed to be a string
      await deleteCustomer(userId, customerId);
      set(state => ({
        customers: state.customers.filter(c => c.id !== customerId),
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Failed to delete customer:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to delete customer.',
        isLoading: false
      });
      throw error;
    }
  },

  clearError: () => set({ error: null })
}));