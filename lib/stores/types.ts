// ~/lib/db/types.ts
export interface Product {
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
    id: string;
    name: string;
    description?: string | null;
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