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
import { useAuthStore } from './authStore'; // Import authStore
import { format, subDays } from 'date-fns'; // Import for date formatting

export interface ReportFilterState {
  fromDate: Date | null;    // Changed from dateRange
  toDate: Date | null;      // Changed from dateRange
  paymentType: string | null;
  productId: string | null;
  reportType: 'ALL' | 'SALES' | 'INVENTORY' | 'PRODUCT_PERFORMANCE';
  category: string | null;
}

interface ReportStoreState {
  reports: ReportListItem[];
  metrics: MetricItem[];
  productPerformance: ProductPerformanceItem[];
  salesData: SalesDataItem[];
  inventoryData: InventoryDataItem[];
  categories: Category[];
  filters: ReportFilterState;
  isLoading: boolean;
  error: string | null;
  fetchReports: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchProductPerformance: () => Promise<void>;
  fetchSalesData: () => Promise<void>;
  fetchInventoryData: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  setFilters: (newFilters: Partial<ReportFilterState>) => void;
  deleteReport: (reportId: string) => Promise<void>;
}

const initialFilters: ReportFilterState = {
  fromDate: subDays(new Date(), 29), // Default: 30 days ago (inclusive of today makes it 30 days)
  toDate: new Date(),                // Default: Today
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
  error: null,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    const userId = useAuthStore.getState().userId;
    if (!userId) {
      set({ isLoading: false, error: "User not authenticated.", categories: [] }); return;
    }
    try {
      const categories = await dbGetCategories(userId);
      set({ categories, isLoading: false });
    } catch (error) {
      console.error("Error fetching categories:", error);
      set({ isLoading: false, categories: [], error: error instanceof Error ? error.message : "Failed to fetch categories" });
    }
  },

  fetchReports: async () => {
    set({ isLoading: true, error: null });
    const userId = useAuthStore.getState().userId;
    if (!userId) {
      set({ isLoading: false, error: "User not authenticated.", reports: [] }); return;
    }
    try {
      const reports = await dbGetGeneratedReports(userId);
      set({ reports, isLoading: false });
    } catch (error) {
      console.error("Error fetching reports:", error);
      set({ isLoading: false, reports: [], error: error instanceof Error ? error.message : "Failed to fetch reports" });
    }
  },

  fetchMetrics: async () => {
    set({ isLoading: true, error: null });
    const { fromDate: filterFromDate, toDate: filterToDate, paymentType, productId, category } = get().filters;
    const userId = useAuthStore.getState().userId;
    if (!userId) {
      set({ isLoading: false, error: "User not authenticated.", metrics: [] }); return;
    }

    const finalFromDate = filterFromDate ? format(filterFromDate, 'yyyy-MM-dd') : format(subDays(new Date(), 29), 'yyyy-MM-dd');
    const finalToDate = filterToDate ? format(filterToDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

    try {
      const metrics = await dbGetMetricsData(userId, finalFromDate, finalToDate, paymentType, productId, category);
      set({ metrics, isLoading: false });
    } catch (error) {
      console.error("Error fetching metrics:", error);
      set({ isLoading: false, metrics: [], error: error instanceof Error ? error.message : "Failed to fetch metrics" });
    }
  },

  fetchProductPerformance: async () => {
    set({ isLoading: true, error: null });
    const { productId, category, fromDate: filterFromDate, toDate: filterToDate } = get().filters;
    const userId = useAuthStore.getState().userId;
    if (!userId) {
      set({ isLoading: false, error: "User not authenticated.", productPerformance: [] }); return;
    }

    const finalFromDate = filterFromDate ? format(filterFromDate, 'yyyy-MM-dd') : format(subDays(new Date(), 29), 'yyyy-MM-dd');
    const finalToDate = filterToDate ? format(filterToDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

    try {
      const performanceData = await dbGetProductPerformanceData(userId, productId, category, finalFromDate, finalToDate);
      set({ productPerformance: performanceData, isLoading: false });
    } catch (error) {
      console.error("Error fetching product performance:", error);
      set({ isLoading: false, productPerformance: [], error: error instanceof Error ? error.message : "Failed to fetch product performance" });
    }
  },

  fetchSalesData: async () => {
    set({ isLoading: true, error: null });
    const { fromDate: filterFromDate, toDate: filterToDate, paymentType, productId, category } = get().filters;
    const userId = useAuthStore.getState().userId;
    if (!userId) {
      set({ isLoading: false, error: "User not authenticated.", salesData: [] }); return;
    }

    const finalFromDate = filterFromDate ? format(filterFromDate, 'yyyy-MM-dd') : format(subDays(new Date(), 29), 'yyyy-MM-dd');
    const finalToDate = filterToDate ? format(filterToDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

    try {
      const data = await dbGetSalesData(userId, finalFromDate, finalToDate, paymentType, productId, category);
      set({ salesData: data, isLoading: false });
    } catch (error) {
      console.error("Error fetching sales data:", error);
      set({ isLoading: false, salesData: [], error: error instanceof Error ? error.message : "Failed to fetch sales data" });
    }
  },

  fetchInventoryData: async () => {
    set({ isLoading: true, error: null });
    const { productId, category } = get().filters;
    const userId = useAuthStore.getState().userId;
    if (!userId) {
      set({ isLoading: false, error: "User not authenticated.", inventoryData: [] }); return;
    }
    try {
      const data = await dbGetInventoryData(userId, productId, category);
      set({ inventoryData: data, isLoading: false });
    } catch (error) {
      console.error("Error fetching inventory data:", error);
      set({ isLoading: false, inventoryData: [], error: error instanceof Error ? error.message : "Failed to fetch inventory data" });
    }
  },
  deleteReport: async (reportId: string) => {
    set({ isLoading: true, error: null });
    try {
      console.log(`[Store] Deleting report ${reportId}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      set(state => ({
        reports: state.reports.filter(r => r.id !== reportId),
        isLoading: false,
      }));
    } catch (error) {
      console.error(`Error deleting report ${reportId}:`, error);
      set({ isLoading: false, error: error instanceof Error ? error.message : "Failed to delete report" });
      get().fetchReports();
    }
  },
}));

export { ReportListItem };