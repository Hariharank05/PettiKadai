import { getDatabase as getDb } from '../db/database';

// Simple ID generator for React Native
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface Product {
    rating: any;
    rating: any;
    discount: ReactNode;
    discount: number;
    discount: boolean;
    rating: number;
    rating: number;
    discount: number;
    [x: string]: number;
    [x: string]: boolean;
    discount: number;
    image: string;
    isActive: boolean;
    id: string;
    userId: string; // Added userId field to match DB schema
    name: string;
    costPrice: number;
    sellingPrice: number;
    quantity: number;
    unit: string;      // Add unit field (kg, liter, piece, etc.)
    category?: string;
    imageUri?: string; // Add image URI field
    createdAt: string;
    updatedAt: string;
  }

// Modified to include userId in the input
export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export const ProductModel = {
  // Get all products for a specific user
  getAll: async (userId: string): Promise<Product[]> => {
    const db = getDb();
    const result = await db.getAllAsync<Product>(
      `SELECT * FROM products WHERE userId = ? AND isActive = 1 ORDER BY name`, 
      [userId]
    );
    return result;
  },

  // Get product by ID (ensuring it belongs to the user)
  getById: async (id: string, userId: string): Promise<Product | null> => {
    const db = getDb();
    const result = await db.getFirstAsync<Product | null>(
      `SELECT * FROM products WHERE id = ? AND userId = ?`, 
      [id, userId]
    );
    return result;
  },

  // Create a new product with userId
  create: async (product: ProductInput): Promise<Product> => {
    const db = getDb();
    const now = new Date().toISOString();
    const newProduct: Product = {
      id: generateId(),
      ...product,
      unit: product.unit || 'piece', // Provide default value
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  
    await db.runAsync(
      `INSERT INTO products (id, userId, name, costPrice, sellingPrice, quantity, unit, category, imageUri, isActive, createdAt, updatedAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newProduct.id,
        newProduct.userId, // Include userId in insert
        newProduct.name,
        newProduct.costPrice,
        newProduct.sellingPrice,
        newProduct.quantity,
        newProduct.unit,
        newProduct.category || null,
        newProduct.imageUri || null,
        newProduct.isActive,
        newProduct.createdAt,
        newProduct.updatedAt,
      ]
    );
    
    return newProduct;
  },

  // Modified update method to include userId security check
  update: async (id: string, product: Partial<ProductInput>, userId: string): Promise<Product> => {
    const db = getDb();
    
    // First get the existing product, ensuring it belongs to the user
    const existingProduct = await db.getFirstAsync<Product>(
      `SELECT * FROM products WHERE id = ? AND userId = ?`, 
      [id, userId]
    );
    
    if (!existingProduct) {
      throw new Error('Product not found or not authorized');
    }

    const updatedProduct: Product = {
      ...existingProduct,
      ...product,
      updatedAt: new Date().toISOString(),
    };

    // Then update it
    await db.runAsync(
      `UPDATE products SET 
        name = ?,
        costPrice = ?,
        sellingPrice = ?,
        quantity = ?,
        unit = ?,
        category = ?,
        imageUri = ?,
        isActive = ?,
        updatedAt = ?
      WHERE id = ? AND userId = ?`,
      [
        updatedProduct.name,
        updatedProduct.costPrice,
        updatedProduct.sellingPrice,
        updatedProduct.quantity,
        updatedProduct.unit,
        updatedProduct.category || null,
        updatedProduct.imageUri || null,
        updatedProduct.isActive,
        updatedProduct.updatedAt,
        id,
        userId, // Add userId for security check
      ]
    );
    
    return updatedProduct;
  },

  // Delete a product (with userId security check)
  delete: async (id: string, userId: string): Promise<void> => {
    const db = getDb();
    await db.runAsync(
      `UPDATE products SET isActive = 0, updatedAt = ? WHERE id = ? AND userId = ?`,
      [new Date().toISOString(), id, userId]
    );
  },

  // Get low stock products for a specific user
  getLowStock: async (userId: string): Promise<Product[]> => {
    const db = getDb();
    const result = await db.getAllAsync<Product>(
      'SELECT * FROM products WHERE quantity < 5 AND userId = ? ORDER BY quantity',
      [userId]
    );
    return result;
  },
};