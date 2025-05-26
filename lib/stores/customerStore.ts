import { create } from 'zustand';
import { getAllCustomers, addCustomer, updateCustomer, deleteCustomer } from '../db/customerOperations';
import { Customer } from './types';
import { useAuthStore } from './authStore';

interface CustomerStoreState {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  selectedCustomer: Customer | null;
  selectedPaymentMethod: string;
  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'totalPurchases' | 'outstandingBalance' | 'loyaltyPoints' | 'lastPurchaseDate'>) => Promise<Customer>;
  updateCustomer: (customerId: string, updates: Partial<Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'totalPurchases' | 'outstandingBalance' | 'loyaltyPoints' | 'lastPurchaseDate'>>) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  clearError: () => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  setSelectedPaymentMethod: (method: string) => void;
}

export const useCustomerStore = create<CustomerStoreState>((set) => ({
  customers: [],
  isLoading: false,
  error: null,
  selectedCustomer: null,
  selectedPaymentMethod: 'CASH',
  fetchCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const authState = useAuthStore.getState();
      const userId = authState.userId;

      if (!userId) {
        const errorMessage = 'User not authenticated to fetch customers.';
        console.warn(errorMessage);
        set({ isLoading: false, customers: [], error: errorMessage });
        return;
      }

      const customers = await getAllCustomers(userId);
      set({ customers, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch customers:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch customers',
        isLoading: false,
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
      set((state) => ({
        customers: [...state.customers, newCustomer],
        isLoading: false,
      }));
      return newCustomer;
    } catch (error: any) {
      console.error('Failed to add customer:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to add customer.',
        isLoading: false,
      });
      throw error;
    }
  },
  updateCustomer: async (customerId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const authState = useAuthStore.getState();
      const userId = authState.userId;

      if (!userId) {
        const errorMessage = 'User not authenticated to update customer.';
        console.warn(errorMessage);
        set({ isLoading: false, error: errorMessage });
        throw new Error(errorMessage);
      }

      const updatedCustomer = await updateCustomer(userId, customerId, updates);
      set((state) => ({
        customers: state.customers.map((c) => (c.id === customerId ? updatedCustomer : c)),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Failed to update customer:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update customer.',
        isLoading: false,
      });
      throw error;
    }
  },
  deleteCustomer: async customerId => {
    set({ isLoading: true, error: null });
    try {
      const authState = useAuthStore.getState();
      const userId = authState.userId;

      if (!userId) {
        const errorMessage = 'User not authenticated to delete customer.';
        console.warn(errorMessage);
        set({ isLoading: false, error: errorMessage });
        throw new Error(errorMessage);
      }

      await deleteCustomer(userId, customerId);
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== customerId),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Failed to delete customer:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to delete customer.',
        isLoading: false,
      });
      throw error;
    }
  },
  clearError: () => set({ error: null }),
  setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
  setSelectedPaymentMethod: (method) => set({ selectedPaymentMethod: method }),
}));