import { getDb } from '../db';

// Simple ID generator for React Native
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface Product {
    isActive: boolean;
    id: string;
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

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export const ProductModel = {
  // Get all products
  getAll: async (): Promise<Product[]> => {
    const db = getDb();
    const result = await db.getAllAsync<Product>(`SELECT * FROM products ORDER BY name`);
    return result;
  },

  // Get product by ID
  getById: async (id: string): Promise<Product | null> => {
    const db = getDb();
    const result = await db.getFirstAsync<Product | null>(
      `SELECT * FROM products WHERE id = ?`, 
      [id]
    );
    return result;
  },

  // Create a new product
 // In ProductModel.create
create: async (product: ProductInput): Promise<Product> => {
    const db = getDb();
    const now = new Date().toISOString();
    const newProduct: Product = {
      id: generateId(),
      ...product,
      unit: product.unit || 'piece', // Provide default value
      createdAt: now,
      updatedAt: now,
    };
  
    await db.runAsync(
      `INSERT INTO products (id, name, costPrice, sellingPrice, quantity, unit, category, imageUri, createdAt, updatedAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newProduct.id, 
        newProduct.name,
        newProduct.costPrice,
        newProduct.sellingPrice,
        newProduct.quantity,
        newProduct.unit,
        newProduct.category || null,
        newProduct.imageUri || null,
        newProduct.createdAt,
        newProduct.updatedAt,
      ]
    );
    
    return newProduct;
  },

  // Modified update method to include unit and imageUri
  update: async (id: string, product: Partial<ProductInput>): Promise<Product> => {
    const db = getDb();
    
    // First get the existing product
    const existingProduct = await db.getFirstAsync<Product>(
      `SELECT * FROM products WHERE id = ?`, 
      [id]
    );
    
    if (!existingProduct) {
      throw new Error('Product not found');
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
        updatedAt = ?
      WHERE id = ?`,
      [
        updatedProduct.name,
        updatedProduct.costPrice,
        updatedProduct.sellingPrice,
        updatedProduct.quantity,
        updatedProduct.unit,
        updatedProduct.category || null,
        updatedProduct.imageUri || null,
        updatedProduct.updatedAt,
        id,
      ]
    );
    
    return updatedProduct;
  },

  // Delete a product
  delete: async (id: string): Promise<void> => {
    const db = getDb();
    await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
  },

  // Get low stock products (quantity < 5)
  getLowStock: async (): Promise<Product[]> => {
    const db = getDb();
    const result = await db.getAllAsync<Product>(
      'SELECT * FROM products WHERE quantity < 5 ORDER BY quantity'
    );
    return result;
  },
};