// ~/lib/db/reportQueries.ts

import * as SQLite from 'expo-sqlite';
import { getDatabase } from '~/lib/db/database'; // Adjust path as needed

// Type definitions (ensure these match your actual data structure from DB)
export interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  profit: number;
  date: string; // This will be s.timestamp from Sales table
}

export interface Product {
  id: string;
  name: string;
  quantity: number;
  costPrice: number; // Ensure these exist in your Products table schema
  sellingPrice: number; // Ensure these exist in your Products table schema
}

const db = getDatabase();

export const getSalesData = (startDate: string, paymentType: string, productId: string | null): SaleItem[] => {
  console.log('[getSalesData] Called with filters:', { startDate, paymentType, productId });
  try {
    // Ensure startDate is a valid date string 'YYYY-MM-DD' for `date()` function
    // If startDate could be invalid, add validation or default
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(startDate) ) {
        console.warn(`[getSalesData] Invalid startDate format: ${startDate}. Defaulting to a wide range or returning empty.`);
        // Optionally, default to a very old date to get all data, or handle error
        // For now, let it proceed, SQLite's date() might handle some variations or return null.
    }

    let query = `
      SELECT 
        si.id, 
        si.productId, 
        si.quantity, 
        si.unitPrice, 
        si.subtotal, 
        si.profit,
        s.timestamp AS date  -- Fetched from Sales table
      FROM SaleItems si
      JOIN Sales s ON si.saleId = s.id
      WHERE date(s.timestamp) >= date(?) -- Robust date comparison
    `;
    const params: any[] = [startDate]; // startDate should be 'YYYY-MM-DD'

    if (paymentType && paymentType !== 'ALL') {
      query += ' AND s.paymentType = ?';
      params.push(paymentType);
    }

    if (productId) {
      query += ' AND si.productId = ?';
      params.push(productId);
    }

    query += ' ORDER BY s.timestamp DESC;'; // Optional: order the results

    console.log('[getSalesData] Executing Query:', query);
    console.log('[getSalesData] Query Params:', JSON.stringify(params));

    const resultsFromDB = db.getAllSync<any>(query, params); // Use <any> if unsure about exact DB column names/types
    
    console.log(`[getSalesData] Found ${resultsFromDB.length} sales items.`);
    if (resultsFromDB.length > 0) {
        console.log('[getSalesData] Sample result item:', resultsFromDB[0]);
    }

    // Map to SaleItem interface, ensuring date is a string
    const formattedResults: SaleItem[] = resultsFromDB.map(item => ({
      id: String(item.id),
      productId: String(item.productId),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      subtotal: Number(item.subtotal || 0),
      profit: Number(item.profit || 0),
      date: String(item.date), // s.timestamp from DB
    }));

    return formattedResults;

  } catch (error) {
    console.error('[getSalesData] SQLite Error:', error);
    return []; // Return empty array on error
  }
};

export const getInventoryData = (productId: string | null): Product[] => {
  console.log('[getInventoryData] Called with productId:', productId);
  try {
    let query = `SELECT id, name, quantity, costPrice, sellingPrice FROM Products`; // Ensure these columns exist
    const params: any[] = [];

    if (productId) {
      query += ' WHERE id = ?';
      params.push(productId);
    }

    console.log('[getInventoryData] Executing Query:', query);
    console.log('[getInventoryData] Query Params:', JSON.stringify(params));
    
    const resultsFromDB = db.getAllSync<any>(query, params);
    
    console.log(`[getInventoryData] Found ${resultsFromDB.length} products.`);
    if (resultsFromDB.length > 0) {
        console.log('[getInventoryData] Sample product item:', resultsFromDB[0]);
    }

    const formattedResults: Product[] = resultsFromDB.map(item => ({
        id: String(item.id),
        name: String(item.name),
        quantity: Number(item.quantity || 0),
        costPrice: Number(item.costPrice || 0),
        sellingPrice: Number(item.sellingPrice || 0),
    }));
    
    return formattedResults;

  } catch (error) {
    console.error('[getInventoryData] SQLite Error:', error);
    return [];
  }
};