import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let db: SQLite.SQLiteDatabase;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    if (Platform.OS === 'web') {
      throw new Error('SQLite is not supported in web environment');
    }
    db = SQLite.openDatabaseSync('petti_kadai.db');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = getDb();
  
  // Create Products table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      costPrice REAL NOT NULL,
      sellingPrice REAL NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      category TEXT,
      imageUri TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);
  
  // Create Sales table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      totalAmount REAL NOT NULL,
      totalProfit REAL NOT NULL,
      customerName TEXT,
      customerContact TEXT,
      paymentType TEXT NOT NULL,
      isPaid INTEGER NOT NULL
    );
  `);
  
  // Create SaleItems table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS saleItems (
      id TEXT PRIMARY KEY,
      saleId TEXT NOT NULL,
      productId TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      subtotal REAL NOT NULL,
      profit REAL NOT NULL,
      FOREIGN KEY (saleId) REFERENCES sales (id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE
    );
  `);
  
  // Create Customers table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      outstandingBalance REAL NOT NULL
    );
  `);
  
  // Create Settings table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      storeName TEXT NOT NULL,
      storeAddress TEXT,
      storePhone TEXT,
      taxRate REAL,
      discountRate REAL
    );
  `);
}