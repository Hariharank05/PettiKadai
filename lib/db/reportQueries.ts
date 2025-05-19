// lib/db/reportQueries.ts
import { format, subDays } from 'date-fns';
import { ReportFilterState } from '../stores/reportStore';

// --- Types ---
export interface Category {
  id: string;
  name: string;
}

export interface SalesDataItem {
  id: string;
  date: string; // YYYY-MM-DD
  subtotal: number;
  paymentType: 'CASH' | 'CARD' | 'UPI';
  productId?: string; // Optional: if sales are product-specific
  productName?: string;
  categoryId?: string;
}

export interface InventoryDataItem {
  id: string; // product id
  name: string;
  quantity: number;
  categoryId: string;
  categoryName?: string;
}

export interface ProductPerformanceItem {
  id: string; // performance record id
  productId: string;
  productName: string;
  period: string; // e.g., "Last 30 Days" or "2023-10-01 to 2023-10-31"
  revenue: number;
  cost: number; // To calculate margin
  margin: number; // (revenue - cost) / revenue * 100
  unitsSold: number;
  categoryId?: string;
}

export interface MetricItem {
  id: string;
  metricName: string;
  metricValue: number;
  calculationDate: string; // ISO Date string
}

export interface ReportListItem {
  id: string;
  name: string;
  reportType: 'SALES' | 'INVENTORY' | 'PRODUCT_PERFORMANCE';
  createdAt: string; // ISO Date string
  filterSummary: string; // e.g., "Sales - Last 7 days - Cash only"
}

// --- Mock Data ---
const mockCategories: Category[] = [
  { id: 'cat1', name: 'Electronics' },
  { id: 'cat2', name: 'Clothing' },
  { id: 'cat3', name: 'Groceries' },
  { id: 'cat4', name: 'Books' },
];

const mockProducts = [
  { id: 'prod1', name: 'Laptop Pro', categoryId: 'cat1', price: 1200, cost: 800 },
  { id: 'prod2', name: 'Wireless Mouse', categoryId: 'cat1', price: 25, cost: 10 },
  { id: 'prod3', name: 'T-Shirt Cotton', categoryId: 'cat2', price: 20, cost: 8 },
  { id: 'prod4', name: 'Jeans Denim', categoryId: 'cat2', price: 50, cost: 20 },
  { id: 'prod5', name: 'Organic Apples', categoryId: 'cat3', price: 5, cost: 2 },
  { id: 'prod6', name: 'Milk 1L', categoryId: 'cat3', price: 2, cost: 0.8 },
  { id: 'prod7', name: 'Sci-Fi Novel X', categoryId: 'cat4', price: 15, cost: 5 },
];

const mockSales: SalesDataItem[] = Array.from({ length: 100 }).map((_, i) => {
  const date = subDays(new Date(), Math.floor(Math.random() * 90)); // Sales in last 90 days
  const product = mockProducts[Math.floor(Math.random() * mockProducts.length)];
  return {
    id: `sale${i}`,
    date: format(date, 'yyyy-MM-dd'),
    subtotal: Math.floor(Math.random() * 200) + 10,
    paymentType: (['CASH', 'CARD', 'UPI'] as const)[Math.floor(Math.random() * 3)],
    productId: product.id,
    productName: product.name,
    categoryId: product.categoryId,
  };
});

const mockInventory: InventoryDataItem[] = mockProducts.map(p => ({
  id: p.id,
  name: p.name,
  quantity: Math.floor(Math.random() * 100),
  categoryId: p.categoryId,
  categoryName: mockCategories.find(c => c.id === p.categoryId)?.name,
}));

const mockSavedReports: ReportListItem[] = [
    { id: 'rep1', name: 'Monthly Sales Summary', reportType: 'SALES', createdAt: subDays(new Date(), 5).toISOString(), filterSummary: 'Last 30 days, All Products' },
    { id: 'rep2', name: 'Electronics Stock Check', reportType: 'INVENTORY', createdAt: subDays(new Date(), 2).toISOString(), filterSummary: 'Category: Electronics' },
];


// --- Query Functions (Simulated) ---
export const getCategories = async (): Promise<Category[]> => {
  console.log('[DB] Fetching categories');
  return new Promise(resolve => setTimeout(() => resolve([...mockCategories]), 300));
};

export const getSalesData = async (
  fromDate: string,
  toDate: string,
  paymentType: string | null,
  productId: string | null,
  categoryId: string | null
): Promise<SalesDataItem[]> => {
  console.log(`[DB] Fetching sales: ${fromDate} to ${toDate}, Pay: ${paymentType}, Prod: ${productId}, Cat: ${categoryId}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
  return mockSales.filter(sale => {
    const saleDate = new Date(sale.date);
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999); // Ensure end of day

    return (
      saleDate >= start &&
      saleDate <= end &&
      (!paymentType || sale.paymentType === paymentType) &&
      (!productId || sale.productId === productId) &&
      (!categoryId || sale.categoryId === categoryId)
    );
  });
};

export const getInventoryData = async (
  productId: string | null,
  categoryId: string | null
): Promise<InventoryDataItem[]> => {
  console.log(`[DB] Fetching inventory: Prod: ${productId}, Cat: ${categoryId}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockInventory.filter(item =>
    (!productId || item.id === productId) &&
    (!categoryId || item.categoryId === categoryId)
  );
};

export const getProductPerformanceData = async (
  productId: string | null,
  categoryId: string | null,
  fromDate: string,
  toDate: string
): Promise<ProductPerformanceItem[]> => {
  console.log(`[DB] Fetching product performance: Prod: ${productId}, Cat: ${categoryId}, Date: ${fromDate}-${toDate}`);
  await new Promise(resolve => setTimeout(resolve, 500));

  const relevantSales = await getSalesData(fromDate, toDate, null, productId, categoryId);
  const performanceMap = new Map<string, ProductPerformanceItem>();

  relevantSales.forEach(sale => {
    if (!sale.productId) return;
    const productInfo = mockProducts.find(p => p.id === sale.productId);
    if (!productInfo) return;

    let perf = performanceMap.get(sale.productId);
    if (!perf) {
      perf = {
        id: `perf-${sale.productId}`,
        productId: sale.productId,
        productName: productInfo.name,
        period: `${format(new Date(fromDate), 'MMM d')} - ${format(new Date(toDate), 'MMM d, yyyy')}`,
        revenue: 0,
        cost: 0,
        margin: 0,
        unitsSold: 0,
        categoryId: productInfo.categoryId,
      };
    }
    perf.revenue += sale.subtotal;
    perf.unitsSold += 1; // Assuming one unit per sale for simplicity
    perf.cost += productInfo.cost; // Cost of one unit
    performanceMap.set(sale.productId, perf);
  });

  return Array.from(performanceMap.values()).map(p => {
    p.margin = p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0;
    return p;
  }).filter(p => (!categoryId || p.categoryId === categoryId) && (!productId || p.productId === productId));
};

export const getMetricsData = async (
  fromDate: string,
  paymentType: string | null,
  productId: string | null,
  categoryId: string | null
): Promise<MetricItem[]> => {
  console.log(`[DB] Fetching metrics: From: ${fromDate}, Pay: ${paymentType}, Prod: ${productId}, Cat: ${categoryId}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  const toDate = format(new Date(), 'yyyy-MM-dd');
  const sales = await getSalesData(fromDate, toDate, paymentType, productId, categoryId);
  const totalRevenue = sales.reduce((sum, s) => sum + s.subtotal, 0);
  const totalSales = sales.length;

  return [
    { id: 'metric1', metricName: 'Total Revenue', metricValue: totalRevenue, calculationDate: new Date().toISOString() },
    { id: 'metric2', metricName: 'Total Sales Count', metricValue: totalSales, calculationDate: new Date().toISOString() },
    { id: 'metric3', metricName: 'Average Order Value', metricValue: totalSales > 0 ? totalRevenue / totalSales : 0, calculationDate: new Date().toISOString() },
  ];
};

export const getGeneratedReports = async (): Promise<ReportListItem[]> => {
    console.log('[DB] Fetching generated reports list');
    return new Promise(resolve => setTimeout(() => resolve([...mockSavedReports]), 300));
};

// Helper to get product names for display (could be expanded)
export const getProductName = (filters: ReportFilterState, productId: string): string | undefined => {
    return mockProducts.find(p => p.id === productId)?.name;
}
export const getCategoryName = (categoryId: string): string | undefined => {
    return mockCategories.find(c => c.id === categoryId)?.name;
}