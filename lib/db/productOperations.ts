// ~/lib/db/productOperations.ts
import { getDatabase } from './database';
import { Product } from '../stores/types';
import { v4 as uuidv4 } from 'uuid';

const db = getDatabase();

export const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  const newProduct: Product = {
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
    isActive: true,
    ...product,
  };

  await db.runAsync(
    `
    INSERT INTO Products (
      id, name, costPrice, sellingPrice, quantity, category, 
      minStockLevel, barcode, tax_percentage, isActive, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      product.name,
      product.costPrice,
      product.sellingPrice,
      product.quantity ?? 0,
      product.category ?? null,
      product.minStockLevel ?? 5,
      product.barcode ?? null,
      product.tax_percentage ?? 0,
      1, // isActive
      timestamp,
      timestamp,
    ]
  );

  return newProduct;
};

export const getAllProducts = async (): Promise<Product[]> => {
  const rows = await db.getAllAsync<Product>('SELECT * FROM Products WHERE isActive = 1');
  return rows.map((row: Product) => ({
    ...row,
    isActive: Boolean(row.isActive),
  }));
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product> => {
  const timestamp = new Date().toISOString();
  const fields = Object.keys(updates)
    .map((key) => `${key} = ?`)
    .join(', ');
  const values = [...Object.values(updates), timestamp, id];

  await db.runAsync(`UPDATE Products SET ${fields}, updatedAt = ? WHERE id = ?`, values);

  const updatedProduct = await db.getFirstAsync<Product>('SELECT * FROM Products WHERE id = ?', [id]);
  if (!updatedProduct) throw new Error('Product not found');
  return { ...updatedProduct, isActive: Boolean(updatedProduct.isActive) };
};

export const deleteProduct = async (id: string): Promise<void> => {
  const timestamp = new Date().toISOString();
  await db.runAsync('UPDATE Products SET isActive = 0, updatedAt = ? WHERE id = ?', [timestamp, id]);
};