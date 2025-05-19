// lib/stores/reportStore.ts
import { create } from 'zustand';
import {
  getSalesData as dbGetSalesData,
  getInventoryData as dbGetInventoryData,
  getProductPerformanceData as dbGetProductPerformanceData,
  getMetricsData as dbGetMetricsData,
  getGeneratedReports as dbGetGeneratedReports,
  type SalesDataItem,
  type InventoryDataItem,
  type ProductPerformanceItem,
  type MetricItem,
  type ReportListItem,
  type Category,
  getCategories as dbGetCategories,
} from '~/lib/db/reportQueries'; // Adjust the import path as necessary

export interface ReportFilterState {
  dateRange: string | null; // e.g., '7', '30', 'YYYY-MM-DD,YYYY-MM-DD'
  paymentType: string | null;
  productId: string | null;
  reportType: 'ALL' | 'SALES' | 'INVENTORY' | 'PRODUCT_PERFORMANCE';
  category: string | null; // New: e.g., 'electronics', 'clothing' or category ID
}

interface ReportStoreState {
  reports: ReportListItem[];
  metrics: MetricItem[];
  productPerformance: ProductPerformanceItem[];
  salesData: SalesDataItem[]; // Added to store for direct access
  inventoryData: InventoryDataItem[]; // Added to store for direct access
  categories: Category[]; // For filter dropdown
  filters: ReportFilterState;
  isLoading: boolean;
  fetchReports: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchProductPerformance: () => Promise<void>;
  fetchSalesData: () => Promise<void>;
  fetchInventoryData: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  setFilters: (newFilters: Partial<ReportFilterState>) => void;
  deleteReport: (reportId: string) => Promise<void>; // For ReportCard delete
}

const initialFilters: ReportFilterState = {
  dateRange: '30', // Default to last 30 days
  paymentType: null,
  productId: null,
  reportType: 'ALL',
  category: null,
};

export const useReportStore = create<ReportStoreState>((set, get) => ({
  reports: [],
  metrics: [],
  productPerformance: [],
  salesData: [],
  inventoryData: [],
  categories: [],
  filters: initialFilters,
  isLoading: false,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      // Reset data when filters change significantly (optional, but good for consistency)
      // salesData: [],
      // inventoryData: [],
      // productPerformance: [],
      // metrics: [],
    }));
    // Trigger fetches after setting filters
    // get().fetchSalesData();
    // get().fetchInventoryData();
    // get().fetchProductPerformance();
    // get().fetchMetrics();
    // get().fetchReports(); // If generated reports depend on filters
  },

  fetchCategories: async () => {
    set({ isLoading: true });
    try {
      const categories = await dbGetCategories();
      set({ categories, isLoading: false });
    } catch (error) {
      console.error("Error fetching categories:", error);
      set({ isLoading: false, categories: [] });
    }
  },

  fetchReports: async () => {
    set({ isLoading: true });
    try {
      // In a real app, filters might influence which "saved" reports are fetched
      const reports = await dbGetGeneratedReports();
      set({ reports, isLoading: false });
    } catch (error) {
      console.error("Error fetching reports:", error);
      set({ isLoading: false, reports: [] });
    }
  },

  fetchMetrics: async () => {
    set({ isLoading: true });
    const { dateRange, paymentType, productId, category } = get().filters;
    const fromDate = dateRange && /^\d+$/.test(dateRange) && !dateRange.includes(',')
      ? new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : dateRange && dateRange.includes(',')
      ? dateRange.split(',')[0]
      : dateRange || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default to last 30 days if invalid

    try {
      const metrics = await dbGetMetricsData(fromDate, paymentType, productId, category);
      set({ metrics, isLoading: false });
    } catch (error) {
      console.error("Error fetching metrics:", error);
      set({ isLoading: false, metrics: [] });
    }
  },

  fetchProductPerformance: async () => {
    set({ isLoading: true });
    const { productId, category, dateRange } = get().filters;
     const fromDate = dateRange && /^\d+$/.test(dateRange) && !dateRange.includes(',')
      ? new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : dateRange && dateRange.includes(',')
      ? dateRange.split(',')[0]
      : dateRange || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = dateRange && dateRange.includes(',') ? dateRange.split(',')[1] : new Date().toISOString().split('T')[0];


    try {
      const performanceData = await dbGetProductPerformanceData(productId, category, fromDate, toDate);
      set({ productPerformance: performanceData, isLoading: false });
    } catch (error) {
      console.error("Error fetching product performance:", error);
      set({ isLoading: false, productPerformance: [] });
    }
  },

  fetchSalesData: async () => {
    set({ isLoading: true });
    const { dateRange, paymentType, productId, category } = get().filters;
    const fromDate = dateRange && /^\d+$/.test(dateRange) && !dateRange.includes(',')
      ? new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : dateRange && dateRange.includes(',')
      ? dateRange.split(',')[0]
      : dateRange || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = dateRange && dateRange.includes(',') ? dateRange.split(',')[1] : new Date().toISOString().split('T')[0];


    try {
      const data = await dbGetSalesData(fromDate, toDate, paymentType, productId, category);
      set({ salesData: data, isLoading: false });
    } catch (error) {
      console.error("Error fetching sales data:", error);
      set({ isLoading: false, salesData: [] });
    }
  },

  fetchInventoryData: async () => {
    set({ isLoading: true });
    const { productId, category } = get().filters;
    try {
      const data = await dbGetInventoryData(productId, category);
      set({ inventoryData: data, isLoading: false });
    } catch (error) {
      console.error("Error fetching inventory data:", error);
      set({ isLoading: false, inventoryData: [] });
    }
  },
  deleteReport: async (reportId: string) => {
    set({ isLoading: true });
    try {
      // This would be an API call in a real app
      console.log(`[Store] Deleting report ${reportId}`);
      // Simulate deletion
      await new Promise(resolve => setTimeout(resolve, 500));
      set(state => ({
        reports: state.reports.filter(r => r.id !== reportId),
        isLoading: false,
      }));
    } catch (error) {
      console.error(`Error deleting report ${reportId}:`, error);
      set({ isLoading: false });
       // Optionally re-fetch reports if deletion failed or to ensure consistency
      get().fetchReports();
    }
  },
}));

export { ReportListItem };
  