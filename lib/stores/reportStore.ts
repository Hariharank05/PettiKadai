import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import { getDatabase } from '~/lib/db/database';

// Generate a unique ID without uuid
const generateId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${timestamp}-${random}`;
};

// Type definitions
interface Report {
  id: string;
  reportType: 'SALES' | 'INVENTORY' | 'PRODUCT_PERFORMANCE';
  name: string;
  parameters: string;
  createdAt: string;
  lastRun?: string;
  runCount: number;
}

interface ReportMetric {
  id: string;
  metricName: string;
  metricValue: number;
  calculationDate: string;
  metricType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  updatedAt: string;
}

interface ProductPerformance {
  id: string;
  productId: string;
  period: string;
  quantitySold: number;
  revenue: number;
  profit: number;
  averageSellingPrice: number;
  margin: number;
  stockTurnoverRate: number;
}

interface ReportFilters {
  reportType: 'SALES' | 'INVENTORY' | 'PRODUCT_PERFORMANCE' | 'ALL';
  dateRange: '7' | '30' | '90' | '365';
  paymentType: 'ALL' | 'CASH' | 'UPI' | 'CREDIT';
  productId: string | null;
}

interface ReportState {
  reports: Report[];
  metrics: ReportMetric[];
  productPerformance: ProductPerformance[];
  filters: ReportFilters;
  isLoading: boolean;
  setFilters: (filters: Partial<ReportFilters>) => void;
  fetchReports: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchProductPerformance: () => Promise<void>;
  saveReport: (report: Omit<Report, 'id' | 'createdAt'>) => Promise<void>;
}

// Initialize database
const db = getDatabase();

export const useReportStore = create<ReportState>((set, get) => ({
  reports: [],
  metrics: [],
  productPerformance: [],
  filters: {
    reportType: 'ALL',
    dateRange: '30',
    paymentType: 'ALL',
    productId: null,
  },
  isLoading: false,

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  fetchReports: async () => {
    set({ isLoading: true });
    try {
      const { reportType } = get().filters;
      const reports = db.getAllSync<Report>(
        `SELECT * FROM Reports WHERE ? = 'ALL' OR reportType = ?`,
        [reportType, reportType]
      );
      set({ reports });
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMetrics: async () => {
    set({ isLoading: true });
    try {
      const { dateRange } = get().filters;
      const metrics = db.getAllSync<ReportMetric>(
        `SELECT * FROM ReportMetrics WHERE metricType = 'DAILY' AND calculationDate >= ?`,
        [new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]
      );
      set({ metrics });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProductPerformance: async () => {
    set({ isLoading: true });
    try {
      const { dateRange } = get().filters;
      const performance = db.getAllSync<ProductPerformance>(
        `SELECT * FROM ProductPerformance WHERE period >= ?`,
        [new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().slice(0, 7)]
      );
      set({ productPerformance: performance });
    } catch (error) {
      console.error('Error fetching product performance:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  saveReport: async (report) => {
    try {
      const id = generateId();
      const createdAt = new Date().toISOString();
      db.runSync(
        `INSERT INTO Reports (id, reportType, name, parameters, createdAt, runCount)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, report.reportType, report.name, report.parameters, createdAt, 0]
      );
      await get().fetchReports();
    } catch (error) {
      console.error('Error saving report:', error);
    }
  },
}));