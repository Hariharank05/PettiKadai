// ~/lib/stores/types.ts

import { SQLiteBindValue } from "expo-sqlite";

export interface Product {
    unit: string;
    imageUri: string;
    id: string;
    name: string;
    costPrice: number;
    sellingPrice: number;
    quantity: number;
    category?: string | null;
    minStockLevel?: number;
    barcode?: string | null;
    tax_percentage?: number;
    isActive?: boolean;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Category {
    userId: SQLiteBindValue;
    id: string;
    name: string;
    description?: string | null;
    imageUri?: string;
    createdAt: string;
  }
  
  export interface Supplier {
    id: string;
    name: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface StockAdjustment {
    id: string;
    productId: string;
    previousQuantity: number;
    newQuantity: number;
    adjustmentReason: string;
    timestamp: string;
  }
  
  export interface Sale {
    id: string;
    timestamp: string;
    totalAmount: number;
    totalProfit: number;
    subtotal: number;
    discount?: number;
    tax?: number;
    customerName?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
    paymentType: string;
    isPaid: boolean;
    notes?: string | null;
    salesStatus: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  }

     export interface Customer {
    id: string;
    userId: string;
    name: string;
    phone: string;
    email?: string | null; // Make optional fields explicitly nullable
    address?: string | null; // Make optional fields explicitly nullable
    totalPurchases: number;
    outstandingBalance: number;
    creditLimit: number;
    loyaltyPoints: number;
    lastPurchaseDate?: string | null; // Make optional fields explicitly nullable
    createdAt: string;
    updatedAt: string;
  }