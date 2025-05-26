// lib/db/reportQueries.ts
import { format, subDays } from 'date-fns';
import { ReportFilterState } from '../stores/reportStore';
import { ProductModel } from '~/lib/models/product'; // For fetching real products
import { getAllCategories as dbGetAllCategories } from '~/lib/db/categoryOperations'; // For fetching real categories
import { getDatabase } from './database'; // For direct DB access if needed
import { Category as AppCategory } from '~/lib/stores/types'; // Full category type from your app

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
  categoryId?: string; // Ensure this matches product.category which is categoryId
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

// --- NO MOCK DATA HERE ANYMORE ---

// --- Query Functions (Simulated) ---
export const getCategories = async (userId: string): Promise<Category[]> => {
  console.log('[DB_ReportQueries] Fetching REAL categories for user', userId);
  try {
    const categoriesFromDb: AppCategory[] = await dbGetAllCategories(userId);
    return categoriesFromDb.map(cat => ({ id: cat.id, name: cat.name }));
  } catch (error) {
    console.error("[DB_ReportQueries] Error fetching real categories:", error);
    return [];
  }
};

export const getSalesData = async (
  userId: string,
  fromDate: string,
  toDate: string,
  paymentType: string | null,
  productId: string | null,
  categoryId: string | null
): Promise<SalesDataItem[]> => {
  console.log(`[DB_ReportQueries] Fetching REAL sales for user ${userId}: ${fromDate} to ${toDate}, Pay: ${paymentType}, Prod: ${productId}, Cat: ${categoryId}`);
  const db = getDatabase();
  try {
    let query = `
      SELECT
        s.id,
        strftime('%Y-%m-%d', s.timestamp) as date,
        si.subtotal, /* This should be sum of sale items for a sale, or individual items if needed */
        s.paymentType,
        p.id as productId,
        p.name as productName,
        p.category as categoryId /* Product.category is categoryId */
      FROM Sales s
      JOIN SaleItems si ON s.id = si.saleId /* Assumes one sale item per row for simplicity, adjust if needed */
      JOIN products p ON si.productId = p.id
      WHERE s.userId = ? AND date(s.timestamp) BETWEEN date(?) AND date(?)
    `;
    const params: any[] = [userId, fromDate, toDate];

    if (paymentType) {
      query += ` AND s.paymentType = ?`;
      params.push(paymentType);
    }
    if (productId) {
      query += ` AND p.id = ?`;
      params.push(productId);
    }
    if (categoryId) {
      query += ` AND p.category = ?`;
      params.push(categoryId);
    }
    query += ` ORDER BY s.timestamp DESC`;

    const salesFromDb = await db.getAllAsync<any>(query, params);
    return salesFromDb.map(row => ({
      id: row.id, // This would be sale ID, if you need unique per sale item, might need si.id
      date: row.date,
      subtotal: Number(row.subtotal) || 0,
      paymentType: row.paymentType as SalesDataItem['paymentType'],
      productId: row.productId,
      productName: row.productName,
      categoryId: row.categoryId,
    }));
  } catch (error) {
    console.error("[DB_ReportQueries] Error fetching real sales data:", error);
    return [];
  }
};

export const getInventoryData = async (
  userId: string,
  productId: string | null,
  categoryId: string | null
): Promise<InventoryDataItem[]> => {
  console.log(`[DB_ReportQueries] Fetching REAL inventory for user ${userId}: Prod: ${productId}, Cat: ${categoryId}`);
  try {
    const allProducts = await ProductModel.getAll(userId);
    const allCategories = await getCategories(userId); // Fetch user-specific categories

    const categoryMap = new Map(allCategories.map(cat => [cat.id, cat.name]));

    const filteredProducts = allProducts.filter(product =>
      (!productId || product.id === productId) &&
      (!categoryId || product.category === categoryId)
    );

    return filteredProducts.map(product => ({
      id: product.id,
      name: product.name,
      quantity: product.quantity,
      categoryId: product.category || '',
      categoryName: product.category ? categoryMap.get(product.category) || product.category : '',
    }));
  } catch (error) {
    console.error("[DB_ReportQueries] Error fetching real inventory data:", error);
    return [];
  }
};

export const getProductPerformanceData = async (
  userId: string,
  productId: string | null,
  categoryId: string | null,
  fromDate: string,
  toDate: string
): Promise<ProductPerformanceItem[]> => {
  console.log(`[DB_ReportQueries] Fetching REAL product performance for user ${userId}: Prod: ${productId}, Cat: ${categoryId}, Date: ${fromDate}-${toDate}`);
  const db = getDatabase();
  try {
    let query = `
      SELECT
        p.id as productId,
        p.name as productName,
        p.category as categoryId, /* Product.category is categoryId */
        SUM(si.quantity) as unitsSold,
        SUM(si.subtotal) as revenue, /* si.subtotal is already item_price * quantity - discount + tax */
        SUM(si.quantity * p.costPrice) as totalCost /* Calculate total cost for sold items */
      FROM SaleItems si
      JOIN Sales s ON si.saleId = s.id
      JOIN products p ON si.productId = p.id
      WHERE s.userId = ? AND date(s.timestamp) BETWEEN date(?) AND date(?)
    `;
    const params: any[] = [userId, fromDate, toDate];

    if (productId) {
      query += ` AND p.id = ?`;
      params.push(productId);
    }
    if (categoryId) {
      query += ` AND p.category = ?`;
      params.push(categoryId);
    }
    query += ` GROUP BY p.id, p.name, p.category ORDER BY revenue DESC`;

    const results = await db.getAllAsync<any>(query, params);

    return results.map(row => {
      const revenue = Number(row.revenue) || 0;
      const totalCost = Number(row.totalCost) || 0;
      const margin = revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0;
      return {
        id: `perf-${row.productId}`,
        productId: row.productId,
        productName: row.productName,
        period: `${format(new Date(fromDate), 'MMM d')} - ${format(new Date(toDate), 'MMM d, yyyy')}`,
        revenue: revenue,
        cost: totalCost,
        margin: parseFloat(margin.toFixed(2)),
        unitsSold: Number(row.unitsSold) || 0,
        categoryId: row.categoryId,
      };
    });
  } catch (error) {
    console.error("[DB_ReportQueries] Error fetching real product performance data:", error);
    return [];
  }
};

export const getMetricsData = async (
userId: string, fromDate: string, paymentType: string | null, productId: string | null, categoryId: string | null, category: string | null): Promise<MetricItem[]> => {
  console.log(`[DB_ReportQueries] Fetching REAL metrics for user ${userId}: From: ${fromDate}, Pay: ${paymentType}, Prod: ${productId}, Cat: ${categoryId}`);
  const toDate = format(new Date(), 'yyyy-MM-dd');
  try {
    const sales = await getSalesData(userId, fromDate, toDate, paymentType, productId, categoryId);
    const totalRevenue = sales.reduce((sum, s) => sum + s.subtotal, 0);
    const totalSalesCount = sales.length; // This might be number of sale *items*, not unique sales.
                                       // If you need unique sales, query `Sales` table directly.
    return [
      { id: 'metric1', metricName: 'Total Revenue', metricValue: totalRevenue, calculationDate: new Date().toISOString() },
      { id: 'metric2', metricName: 'Total Sales Count', metricValue: totalSalesCount, calculationDate: new Date().toISOString() },
      { id: 'metric3', metricName: 'Average Order Value', metricValue: totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0, calculationDate: new Date().toISOString() },
    ];
  } catch (error) {
    console.error("[DB_ReportQueries] Error fetching real metrics data:", error);
    return [];
  }
};

export const getGeneratedReports = async (userId: string): Promise<ReportListItem[]> => {
    console.log('[DB_ReportQueries] Fetching REAL generated reports list for user', userId);
    // Placeholder: Actual implementation would query 'SavedReports' table,
    // potentially joining with a 'Reports' table if it contains userId or user-specific configurations.
    // For now, returning empty array as schema/data for this is not fully defined for multi-user.
    return [];
};

// Helper to get product names for display (could be expanded)
// These are now better handled directly in ReportsScreen.tsx using data from productStore and categoryStore.
// If still needed here, they would require userId and DB lookups.
// export const getProductName = ...
// export const getCategoryName = ...