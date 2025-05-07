// ~/lib/stores/customerStore.ts
import { create } from 'zustand';
import { Customer } from '../db/types';
import * as customerOps from '../db/customerOperations'; // Adjust the path as needed

interface CustomerStoreState {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
}

interface CustomerStoreActions {
  fetchCustomers: () => Promise<void>;
  addCustomer: (
    customerData: Omit<Customer, 'id' | 'totalPurchases' | 'outstandingBalance' | 'loyaltyPoints' | 'createdAt' | 'updatedAt' | 'lastPurchaseDate'>
  ) => Promise<Customer>; // Return the new customer
  updateCustomer: (
    id: string,
    customerData: Partial<Omit<Customer, 'id' | 'totalPurchases' | 'outstandingBalance' | 'loyaltyPoints' | 'createdAt' | 'updatedAt' | 'lastPurchaseDate'>>
  ) => Promise<Customer>; // Return the updated customer
  deleteCustomer: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useCustomerStore = create<CustomerStoreState & CustomerStoreActions>((set, get) => ({
  customers: [],
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const fetchedCustomers = await customerOps.getAllCustomers();
      set({ customers: fetchedCustomers, isLoading: false });
    } catch (error: any) {
      console.error('Store: Error fetching customers:', error.message);
      set({ error: error.message || 'Failed to fetch customers.', isLoading: false });
    }
  },

  addCustomer: async (customerData) => {
    set({ isLoading: true, error: null });
    try {
      const newCustomer = await customerOps.addCustomer(customerData);
      // Instead of manually adding, re-fetch to ensure consistency, or add if preferred
      // For simplicity and to always get the latest from DB (including any defaults):
      await get().fetchCustomers(); // Re-fetches all customers
      // Or, if you want to optimistically update:
      // set((state) => ({
      //   customers: [...state.customers, newCustomer].sort((a, b) => a.name.localeCompare(b.name)),
      //   isLoading: false,
      // }));
      set({ isLoading: false });
      return newCustomer;
    } catch (error: any) {
      console.error('Store: Error adding customer:', error.message);
      set({ error: error.message || 'Failed to add customer.', isLoading: false });
      throw error; // Re-throw to be caught by the UI
    }
  },

  updateCustomer: async (id, customerData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedCustomer = await customerOps.updateCustomer(id, customerData);
      // Re-fetch for consistency or update optimistically
      await get().fetchCustomers();
      // Or, optimistic update:
      // set((state) => ({
      //   customers: state.customers.map((c) =>
      //     c.id === id ? { ...c, ...updatedCustomer } : c
      //   ).sort((a, b) => a.name.localeCompare(b.name)),
      //   isLoading: false,
      // }));
      set({isLoading: false});
      return updatedCustomer;
    } catch (error: any) {
      console.error('Store: Error updating customer:', error.message);
      set({ error: error.message || 'Failed to update customer.', isLoading: false });
      throw error; // Re-throw
    }
  },

  deleteCustomer: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await customerOps.deleteCustomer(id);
      // Re-fetch for consistency or update optimistically
      await get().fetchCustomers();
      // Or, optimistic update:
      // set((state) => ({
      //   customers: state.customers.filter((c) => c.id !== id),
      //   isLoading: false,
      // }));
      set({ isLoading: false });
    } catch (error: any) {
      console.error('Store: Error deleting customer:', error.message);
      set({ error: error.message || 'Failed to delete customer.', isLoading: false });
      throw error; // Re-throw
    }
  },
}));