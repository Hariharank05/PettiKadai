// ~/lib/utils/dbTestUtil.ts
import { getDatabase } from '../db/database';

/**
 * Tests database connection and reports status
 * This is useful for debugging database issues
 */
export const testDatabaseConnection = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    const db = getDatabase();
    
    // Try to get database version
    const versionResult = await db.getFirstAsync<{ version: string }>('SELECT sqlite_version() as version');
    
    if (!versionResult) {
      return {
        success: false,
        message: 'Unable to get SQLite version'
      };
    }
    
    // Check tables
    const tablesResult = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    
    const tables = tablesResult.map(t => t.name).filter(name => 
      !name.startsWith('sqlite_') && 
      !name.startsWith('android_')
    );
    
    // Check for essential tables
    const essentialTables = ['Users', 'AuthState', 'products', 'Settings'];
    const missingTables = essentialTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      return {
        success: false,
        message: `Database is missing essential tables: ${missingTables.join(', ')}`,
        details: { 
          version: versionResult.version, 
          existingTables: tables 
        }
      };
    }
    
    // Check users table
    const usersCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM Users');
    
    // Check products table
    const productsCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM products');
    
    return {
      success: true,
      message: 'Database connection successful',
      details: {
        version: versionResult.version,
        tables: tables,
        usersCount: usersCount?.count || 0,
        productsCount: productsCount?.count || 0
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
};

/**
 * Shows database stats
 * This can be used to check database status and table counts
 */
export const getDatabaseStats = async (): Promise<{
  totalUsers: number;
  totalProducts: number;
  totalCategories: number;
  databaseSize: number; // in bytes
  tableCount: number;
}> => {
  try {
    const db = getDatabase();
    
    const usersCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM Users');
    const productsCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM products');
    
    let categoriesCount = { count: 0 };
    try {
      categoriesCount = (await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM Categories')) || { count: 0 };
    } catch (e) {
      // Table might not exist yet
    }
    
    // Get table list
    const tablesResult = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    
    const tables = tablesResult.map(t => t.name).filter(name => 
      !name.startsWith('sqlite_') && 
      !name.startsWith('android_')
    );
    
    // We can't directly get the database size in SQLite, so we estimate
    // This is a very rough approximation
    const dbSizeEstimate = (usersCount?.count || 0) * 500 + 
                           (productsCount?.count || 0) * 300 + 
                           (categoriesCount?.count || 0) * 100 + 
                           1024 * 10; // Base size + tables
    
    return {
      totalUsers: usersCount?.count || 0,
      totalProducts: productsCount?.count || 0,
      totalCategories: categoriesCount?.count || 0,
      databaseSize: dbSizeEstimate,
      tableCount: tables.length
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return {
      totalUsers: 0,
      totalProducts: 0,
      totalCategories: 0,
      databaseSize: 0,
      tableCount: 0
    };
  }
};