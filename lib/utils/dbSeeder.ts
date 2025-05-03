// ~/lib/utils/dbSeeder.ts
import { getDatabase } from '../db/database';
import { hashPassword, generateSalt } from './authUtils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seeds the database with sample data for testing
 * This should only be used in development
 */
export const seedDatabase = async () => {
  const db = getDatabase();
  
  try {
    // Begin transaction
    await db.runAsync('BEGIN TRANSACTION');
    
    // Add a test user
    const userId = uuidv4();
    const salt = generateSalt();
    const passwordHash = hashPassword('password123', salt);
    const now = new Date().toISOString();
    
    // Check if the test user already exists
    const existingUser = await db.getFirstAsync(
      'SELECT id FROM Users WHERE email = ?',
      ['test@example.com']
    );
    
    if (!existingUser) {
      await db.runAsync(
        `INSERT INTO Users (
          id, name, email, phone, passwordHash, passwordSalt, 
          securityQuestion, securityAnswer, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          'Test User',
          'test@example.com',
          '+1234567890',
          passwordHash,
          salt,
          'What was your first pet\'s name?',
          'fido',
          now,
          now
        ]
      );
      
      console.log('Test user created');
    }
    
    // Seed sample products
    const sampleProducts = [
      {
        name: 'Rice (Basmati)',
        costPrice: 80,
        sellingPrice: 95,
        quantity: 50,
        unit: 'kg',
        category: 'Grains'
      },
      {
        name: 'Sugar',
        costPrice: 40,
        sellingPrice: 48,
        quantity: 30,
        unit: 'kg',
        category: 'Baking'
      },
      {
        name: 'Cooking Oil',
        costPrice: 110,
        sellingPrice: 125,
        quantity: 25,
        unit: 'liter',
        category: 'Cooking'
      },
      {
        name: 'Milk',
        costPrice: 25,
        sellingPrice: 30,
        quantity: 15,
        unit: 'liter',
        category: 'Dairy'
      },
      {
        name: 'Wheat Flour',
        costPrice: 35,
        sellingPrice: 42,
        quantity: 40,
        unit: 'kg',
        category: 'Baking'
      },
      {
        name: 'Salt',
        costPrice: 18,
        sellingPrice: 22,
        quantity: 45,
        unit: 'kg',
        category: 'Baking'
      },
      {
        name: 'Lentils',
        costPrice: 55,
        sellingPrice: 65,
        quantity: 35,
        unit: 'kg',
        category: 'Grains'
      },
      {
        name: 'Soap',
        costPrice: 15,
        sellingPrice: 20,
        quantity: 60,
        unit: 'piece',
        category: 'Household'
      },
      {
        name: 'Toothpaste',
        costPrice: 45,
        sellingPrice: 55,
        quantity: 25,
        unit: 'piece',
        category: 'Household'
      },
      {
        name: 'Eggs',
        costPrice: 5,
        sellingPrice: 7,
        quantity: 100,
        unit: 'piece',
        category: 'Dairy'
      },
      {
        name: 'Tomatoes',
        costPrice: 30,
        sellingPrice: 40,
        quantity: 20,
        unit: 'kg',
        category: 'Vegetables'
      },
      {
        name: 'Onions',
        costPrice: 25,
        sellingPrice: 35,
        quantity: 30,
        unit: 'kg',
        category: 'Vegetables'
      },
      {
        name: 'Potatoes',
        costPrice: 20,
        sellingPrice: 30,
        quantity: 40,
        unit: 'kg',
        category: 'Vegetables'
      },
      {
        name: 'Cheese',
        costPrice: 120,
        sellingPrice: 150,
        quantity: 10,
        unit: 'kg',
        category: 'Dairy'
      },
      {
        name: 'Yogurt',
        costPrice: 35,
        sellingPrice: 45,
        quantity: 15,
        unit: 'piece',
        category: 'Dairy'
      }
    ];
    
    // Check if products already exist
    const productCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM products'
    );
    
    if (!productCount || productCount.count < sampleProducts.length) {
      // Clear existing products to avoid duplication
      await db.runAsync('DELETE FROM products');
      
      // Insert sample products
      for (const product of sampleProducts) {
        const id = uuidv4();
        
        await db.runAsync(
          `INSERT INTO products (
            id, name, costPrice, sellingPrice, quantity, unit, 
            category, isActive, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            product.name,
            product.costPrice,
            product.sellingPrice,
            product.quantity,
            product.unit,
            product.category,
            1, // isActive
            now,
            now
          ]
        );
      }
      
      console.log('Sample products created');
    }
    
    // Sample categories
    const categories = [
      'Grains',
      'Dairy',
      'Vegetables',
      'Fruits',
      'Baking',
      'Snacks',
      'Beverages',
      'Household',
      'Cooking',
      'Personal Care'
    ];
    
    // Check if categories already exist
    const categoryCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM Categories'
    );
    
    if (!categoryCount || categoryCount.count < categories.length) {
      // Clear existing categories to avoid duplication
      await db.runAsync('DELETE FROM Categories');
      
      // Insert sample categories
      for (const categoryName of categories) {
        const id = uuidv4();
        
        await db.runAsync(
          `INSERT INTO Categories (id, name, createdAt) VALUES (?, ?, ?)`,
          [id, categoryName, now]
        );
      }
      
      console.log('Sample categories created');
    }
    
    // Setup default store settings
    const settingsExists = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM Settings WHERE id = "app_settings"'
    );
    
    if (!settingsExists || settingsExists.count === 0) {
      await db.runAsync(
        `INSERT INTO Settings (
          id, storeName, storeAddress, storePhone, storeEmail, 
          currencySymbol, taxRate, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'app_settings',
          'Petti Grocery Store',
          '123 Main Street, Coimbatore, Tamil Nadu',
          '+91 9876543210',
          'store@example.com',
          '₹',
          5, // 5% tax rate
          now
        ]
      );
      
      console.log('Default store settings created');
    }
    
    // Commit transaction
    await db.runAsync('COMMIT');
    console.log('Database seeded successfully');
    
    return true;
  } catch (error) {
    // Rollback on error
    await db.runAsync('ROLLBACK');
    console.error('Error seeding database:', error);
    return false;
  }
};

/**
 * Adds the test user credentials to the auth state for immediate login
 * This is a development convenience function
 */
export const loginWithTestUser = async () => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    // Get the test user
    const testUser = await db.getFirstAsync<{ id: string; name: string }>(
      'SELECT id, name FROM Users WHERE email = ?',
      ['test@example.com']
    );
    
    if (!testUser) {
      console.error('Test user not found. Run seedDatabase() first.');
      return false;
    }
    
    // Update auth state
    const existingAuth = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM AuthState WHERE id = "current_auth"'
    );
    
    if (existingAuth) {
      await db.runAsync(
        `UPDATE AuthState SET 
          isAuthenticated = ?, userId = ?, userName = ?, 
          lastLoginAt = ?, updatedAt = ? 
        WHERE id = "current_auth"`,
        [1, testUser.id, testUser.name, now, now]
      );
    } else {
      await db.runAsync(
        `INSERT INTO AuthState (
          id, isAuthenticated, userId, userName, lastLoginAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        ['current_auth', 1, testUser.id, testUser.name, now, now]
      );
    }
    
    console.log('Logged in with test user');
    return true;
  } catch (error) {
    console.error('Error logging in with test user:', error);
    return false;
  }
};