// ~/lib/db/database.ts

import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native'; // Import Platform

// Open or create the database with type annotation
const db: SQLite.SQLiteDatabase = SQLite.openDatabaseSync('pettiKadai.db');

// Initialize database tables
export const initDatabase = (): void => {
  console.log("%%%% EXECUTING NEW initDatabase from UPDATED file - v2 %%%%"); // Add a version
  try {
    db.withTransactionSync(() => {
      // Users Table (No change needed here for userId itself)
      db.execSync(`
        CREATE TABLE IF NOT EXISTS Users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          phone TEXT UNIQUE,
          passwordHash TEXT NOT NULL,
          passwordSalt TEXT NOT NULL,
          securityQuestion TEXT NOT NULL,
          securityAnswer TEXT NOT NULL,
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT DEFAULT (datetime('now'))
        );
      `);
      // After the Users table creation, add this migration
      const userColumnCheck = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM pragma_table_info('Users') WHERE name = 'profileImage'`
      );

      if (userColumnCheck && userColumnCheck.count === 0) {
        db.execSync(`ALTER TABLE Users ADD COLUMN profileImage TEXT`);
        console.log("[DB] Added missing column 'profileImage' to Users table");
      }
      // AuthState Table (No change needed here for userId itself)
      db.execSync(`
        CREATE TABLE IF NOT EXISTS AuthState (
          id TEXT PRIMARY KEY DEFAULT 'current_auth',
          isAuthenticated INTEGER DEFAULT 0,
          userId TEXT,
          userName TEXT,
          lastLoginAt TEXT,
          updatedAt TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (userId) REFERENCES Users(id)
        );
      `);

      // ReceiptTemplates Table (Assuming global, but could be user-specific if needed later)
      db.execSync(`
        CREATE TABLE IF NOT EXISTS ReceiptTemplates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          htmlTemplate TEXT NOT NULL,
          isDefault INTEGER DEFAULT 0,
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT DEFAULT (datetime('now'))
        );
      `);

      // Products Table - Added userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL, -- ADDED
        name TEXT NOT NULL,
        costPrice REAL NOT NULL,
        sellingPrice REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT 'piece',
        category TEXT,
        imageUri TEXT,
        createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        FOREIGN KEY (userId) REFERENCES Users(id) -- ADDED
       );
    `);
    // --- Patch: Add missing column 'isActive' if not exists ---
      const columnCheck = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM pragma_table_info('products') WHERE name = 'isActive'`
      );

      if (columnCheck && columnCheck.count === 0) {
        db.execSync(`ALTER TABLE products ADD COLUMN isActive INTEGER DEFAULT 1`);
        console.log("[DB] Added missing column 'isActive' to products table");
      }


      // Categories Table - Added userId (if categories are per-user)
      // If categories are global, remove userId and its FOREIGN KEY
      db.execSync(`
        CREATE TABLE IF NOT EXISTS Categories (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL, -- ADDED (Consider if global or per-user)
          name TEXT NOT NULL,
          description TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (userId) REFERENCES Users(id) -- ADDED
        );
      `);
      // --- Patch: Add missing column 'imageUri' if not exists ---
      const categoryColumnCheck = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM pragma_table_info('Categories') WHERE name = 'imageUri'`
      );

      if (categoryColumnCheck && categoryColumnCheck.count === 0) {
        db.execSync(`ALTER TABLE Categories ADD COLUMN imageUri TEXT`);
        console.log("[DB] Added missing column 'imageUri' to Categories table");
      }

      // Suppliers Table - Added userId (if suppliers are per-user)
      db.execSync(`
        CREATE TABLE IF NOT EXISTS Suppliers (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL, -- ADDED
          name TEXT NOT NULL,
          contactPerson TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (userId) REFERENCES Users(id) -- ADDED
        );
      `);

      // Stock Adjustments Table - Added userId (links to user who made adjustment)
      db.execSync(`
        CREATE TABLE IF NOT EXISTS StockAdjustments (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL, -- ADDED
          productId TEXT NOT NULL,
          previousQuantity INTEGER NOT NULL,
          newQuantity INTEGER NOT NULL,
          adjustmentReason TEXT NOT NULL,
          timestamp TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (userId) REFERENCES Users(id), -- ADDED
          FOREIGN KEY (productId) REFERENCES Products(id)
        );
      `);

      // Product Batches Table - Added userId (links to user who added batch)
      db.execSync(`
        CREATE TABLE IF NOT EXISTS ProductBatches (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL, -- ADDED
          productId TEXT NOT NULL,
          batchNumber TEXT,
          quantity INTEGER NOT NULL,
          manufactureDate TEXT,
          expiryDate TEXT,
          supplierId TEXT,
          purchaseDate TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (userId) REFERENCES Users(id), -- ADDED
          FOREIGN KEY (productId) REFERENCES Products(id),
          FOREIGN KEY (supplierId) REFERENCES Suppliers(id)
        );
      `);

      // Sales Table - Added userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS Sales (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL, -- ADDED
          timestamp TEXT DEFAULT (datetime('now')),
          totalAmount REAL NOT NULL,
          totalProfit REAL NOT NULL,
          subtotal REAL NOT NULL,
          discount REAL DEFAULT 0,
          tax REAL DEFAULT 0,
          customerName TEXT,
          customerPhone TEXT,
          customerEmail TEXT,
          paymentType TEXT NOT NULL,
          isPaid INTEGER DEFAULT 1,
          notes TEXT,
          salesStatus TEXT DEFAULT 'COMPLETED',
          FOREIGN KEY (userId) REFERENCES Users(id) -- ADDED
        );
      `);
       // --- Patch: Add missing column 'customerId' if not exists ---
      const salesColumnCheck = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM pragma_table_info('Sales') WHERE name = 'customerId'`
      );

      if (salesColumnCheck && salesColumnCheck.count === 0) {
        db.execSync(`ALTER TABLE Sales ADD COLUMN customerId TEXT`);
        console.log("[DB] Added missing column 'customerId' to Sales table");
      }
      
      // SaleItems Table (Implicitly user-specific via Sales.userId) - No direct userId needed
      db.execSync(`
        CREATE TABLE IF NOT EXISTS SaleItems (
          id TEXT PRIMARY KEY,
          saleId TEXT NOT NULL,
          productId TEXT NOT NULL,
          quantity REAL NOT NULL,
          unitPrice REAL NOT NULL,
          costPrice REAL NOT NULL,
          subtotal REAL NOT NULL,
          profit REAL NOT NULL,
          discount REAL DEFAULT 0,
          tax REAL DEFAULT 0,
          returnedQuantity REAL DEFAULT 0,
          FOREIGN KEY (saleId) REFERENCES Sales(id),
          FOREIGN KEY (productId) REFERENCES Products(id)
        );
      `);

      // DraftSales Table - Added userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS DraftSales (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL, -- ADDED
          timestamp TEXT DEFAULT (datetime('now')),
          totalAmount REAL NOT NULL,
          customerName TEXT,
          customerPhone TEXT,
          notes TEXT,
          expiryTime TEXT,
          FOREIGN KEY (userId) REFERENCES Users(id) -- ADDED
        );
      `);

      // DraftSaleItems Table (Implicitly user-specific via DraftSales.userId) - No direct userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS DraftSaleItems (
          id TEXT PRIMARY KEY,
          draftSaleId TEXT NOT NULL,
          productId TEXT NOT NULL,
          quantity REAL NOT NULL,
          unitPrice REAL NOT NULL,
          subtotal REAL NOT NULL,
          FOREIGN KEY (draftSaleId) REFERENCES DraftSales(id),
          FOREIGN KEY (productId) REFERENCES Products(id)
        );
      `);

      // Returns Table (Implicitly user-specific via Sales.userId) - No direct userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS Returns (
          id TEXT PRIMARY KEY,
          saleId TEXT NOT NULL,
          timestamp TEXT DEFAULT (datetime('now')),
          totalAmount REAL NOT NULL,
          reason TEXT,
          FOREIGN KEY (saleId) REFERENCES Sales(id)
        );
      `);

      // ReturnItems Table (Implicitly user-specific) - No direct userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS ReturnItems (
          id TEXT PRIMARY KEY,
          returnId TEXT NOT NULL,
          saleItemId TEXT NOT NULL,
          productId TEXT NOT NULL,
          quantity REAL NOT NULL,
          unitPrice REAL NOT NULL,
          subtotal REAL NOT NULL,
          FOREIGN KEY (returnId) REFERENCES Returns(id),
          FOREIGN KEY (saleItemId) REFERENCES SaleItems(id),
          FOREIGN KEY (productId) REFERENCES Products(id)
        );
      `);

      // Receipts Table (Implicitly user-specific via Sales.userId) - No direct userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS Receipts (
          id TEXT PRIMARY KEY,
          saleId TEXT NOT NULL,
          receiptNumber TEXT NOT NULL UNIQUE,
          format TEXT NOT NULL DEFAULT 'PDF',
          filePath TEXT,
          templateId TEXT,
          generatedAt TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (saleId) REFERENCES Sales(id),
          FOREIGN KEY (templateId) REFERENCES ReceiptTemplates(id)
        );
      `);

      // ReceiptSharing Table (Implicitly user-specific) - No direct userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS ReceiptSharing (
          id TEXT PRIMARY KEY,
          receiptId TEXT NOT NULL,
          sharedVia TEXT NOT NULL,
          recipientInfo TEXT,
          sharedAt TEXT DEFAULT (datetime('now')),
          deliveryStatus TEXT DEFAULT 'INITIATED',
          failureReason TEXT,
          FOREIGN KEY (receiptId) REFERENCES Receipts(id)
        );
      `);

      // ReceiptQRCodes Table (Implicitly user-specific) - No direct userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS ReceiptQRCodes (
          id TEXT PRIMARY KEY,
          receiptId TEXT NOT NULL UNIQUE,
          qrCodeData TEXT NOT NULL,
          verificationUrl TEXT,
          scannedCount INTEGER DEFAULT 0,
          lastScanned TEXT,
          FOREIGN KEY (receiptId) REFERENCES Receipts(id)
        );
      `);

      // Reports Table - Added userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS Reports (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL, -- ADDED
          reportType TEXT NOT NULL,
          name TEXT NOT NULL,
          parameters TEXT NOT NULL,
          createdAt TEXT DEFAULT (datetime('now')),
          lastRun TEXT,
          runCount INTEGER DEFAULT 0,
          FOREIGN KEY (userId) REFERENCES Users(id) -- ADDED
        );
      `);

      // SavedReports Table (Implicitly user-specific via Reports.userId) - No direct userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS SavedReports (
          id TEXT PRIMARY KEY,
          reportId TEXT NOT NULL,
          name TEXT NOT NULL,
          format TEXT NOT NULL,
          filePath TEXT NOT NULL,
          generatedAt TEXT DEFAULT (datetime('now')),
          fileSize INTEGER,
          FOREIGN KEY (reportId) REFERENCES Reports(id)
        );
      `);

      // ScheduledReports Table (Implicitly user-specific via Reports.userId) - No direct userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS ScheduledReports (
          id TEXT PRIMARY KEY,
          reportId TEXT NOT NULL,
          schedule TEXT NOT NULL,
          scheduleCron TEXT,
          recipientType TEXT NOT NULL,
          recipientInfo TEXT NOT NULL,
          isActive INTEGER DEFAULT 1,
          lastRun TEXT,
          nextRun TEXT,
          FOREIGN KEY (reportId) REFERENCES Reports(id)
        );
      `);

      // ReportMetrics Table - Added userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS ReportMetrics (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL, -- ADDED
          metricName TEXT NOT NULL,
          metricValue REAL NOT NULL,
          calculationDate TEXT NOT NULL,
          metricType TEXT NOT NULL,
          updatedAt TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (userId) REFERENCES Users(id) -- ADDED
        );
      `);

      // ProductPerformance Table (Implicitly user-specific via Products.userId) - No direct userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS ProductPerformance (
          id TEXT PRIMARY KEY,
          productId TEXT NOT NULL,
          period TEXT NOT NULL,
          quantitySold REAL DEFAULT 0,
          revenue REAL DEFAULT 0,
          profit REAL DEFAULT 0,
          averageSellingPrice REAL DEFAULT 0,
          margin REAL DEFAULT 0,
          stockTurnoverRate REAL DEFAULT 0,
          FOREIGN KEY (productId) REFERENCES Products(id)
        );
      `);

      // Settings Table
      // Option 1: Global settings (as it is now).
      // Option 2: User-specific settings (add userId, make id non-default).
      // For today's speed, keeping it mostly global, but user-specific preferences like darkMode could be moved.
      // Let's add userId for potential future user-specific store settings, but the 'app_settings' ID logic will need adjustment if multiple users have their *own* settings.
      // For now, we'll assume one primary user configures store-wide settings, and other settings like darkMode are per user instance.
      db.execSync(`
        CREATE TABLE IF NOT EXISTS Settings (
          id TEXT PRIMARY KEY, -- Can be 'app_settings' for global or a userId for user-specific
          userId TEXT, -- ADDED (Can be NULL for global 'app_settings' row)
          storeName TEXT NOT NULL,
          storeAddress TEXT,
          storePhone TEXT,
          storeEmail TEXT,
          taxRate REAL DEFAULT 0,
          defaultDiscountRate REAL DEFAULT 0,
          currencySymbol TEXT DEFAULT '₹',
          receiptFooter TEXT,
          backupFrequency TEXT DEFAULT 'WEEKLY',
          lastBackupDate TEXT,
          darkMode INTEGER DEFAULT 0,
          language TEXT DEFAULT 'en',
          updatedAt TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (userId) REFERENCES Users(id) -- ADDED
        );
      `);
      // After the Users table creation, add this migration
      const SettingscolumnCheck = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM pragma_table_info('Users') WHERE name = 'profileImage'`
      );

      if (SettingscolumnCheck && SettingscolumnCheck.count === 0) {
        db.execSync(`ALTER TABLE Users ADD COLUMN profileImage TEXT`);
        console.log("[DB] Added missing column 'profileImage' to Users table");
      }
      // AppUsage Table - Added userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS AppUsage (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL, -- ADDED
          featureName TEXT NOT NULL,
          usageCount INTEGER DEFAULT 1,
          lastUsed TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (userId) REFERENCES Users(id) -- ADDED
        );
      `);

      // Customers Table - Added userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS Customers (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL, -- ADDED
          name TEXT NOT NULL,
          phone TEXT NOT NULL, -- UNIQUE constraint will be per user now if combined with userId in logic
          email TEXT,
          address TEXT,
          totalPurchases REAL DEFAULT 0,
          outstandingBalance REAL DEFAULT 0,
          creditLimit REAL DEFAULT 0,
          loyaltyPoints INTEGER DEFAULT 0,
          lastPurchaseDate TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (userId) REFERENCES Users(id) -- ADDED
          -- Consider adding UNIQUE(userId, phone) if phone must be unique per user
        );
      `);

      // CreditSales Table (Implicitly user-specific via Sales.userId or Customers.userId) - No direct userId needed
      db.execSync(`
        CREATE TABLE IF NOT EXISTS CreditSales (
          id TEXT PRIMARY KEY,
          saleId TEXT NOT NULL UNIQUE,
          customerId TEXT NOT NULL,
          creditAmount REAL NOT NULL,
          dueDate TEXT NOT NULL,
          termsInDays INTEGER DEFAULT 30,
          interestRate REAL DEFAULT 0,
          creditStatus TEXT DEFAULT 'OUTSTANDING',
          approvedBy TEXT,
          notesOrReason TEXT,
          FOREIGN KEY (saleId) REFERENCES Sales(id),
          FOREIGN KEY (customerId) REFERENCES Customers(id)
        );
      `);

      // CreditPayments Table (Implicitly user-specific) - No direct userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS CreditPayments (
          id TEXT PRIMARY KEY,
          creditSaleId TEXT NOT NULL,
          paymentAmount REAL NOT NULL,
          paymentDate TEXT DEFAULT (datetime('now')),
          paymentMethod TEXT NOT NULL,
          receivedBy TEXT,
          transactionReference TEXT,
          notes TEXT,
          FOREIGN KEY (creditSaleId) REFERENCES CreditSales(id)
        );
      `);

      // PaymentReminders Table (Implicitly user-specific) - No direct userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS PaymentReminders (
          id TEXT PRIMARY KEY,
          creditSaleId TEXT NOT NULL,
          reminderType TEXT NOT NULL,
          reminderDate TEXT,
          reminderSent INTEGER DEFAULT 0,
          sentVia TEXT,
          sentAt TEXT,
          responseReceived INTEGER DEFAULT 0,
          responseNotes TEXT,
          FOREIGN KEY (creditSaleId) REFERENCES CreditSales(id)
        );
      `);

      // PaymentCommitments Table (Implicitly user-specific) - No direct userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS PaymentCommitments (
          id TEXT PRIMARY KEY,
          creditSaleId TEXT NOT NULL,
          promisedAmount REAL NOT NULL,
          promisedDate TEXT NOT NULL,
          commitmentStatus TEXT DEFAULT 'PENDING',
          notes TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (creditSaleId) REFERENCES CreditSales(id)
        );
      `);

      // CustomerCreditHistory Table (Implicitly user-specific via Customers.userId) - No direct userId
      db.execSync(`
        CREATE TABLE IF NOT EXISTS CustomerCreditHistory (
          id TEXT PRIMARY KEY,
          customerId TEXT NOT NULL,
          period TEXT NOT NULL,
          totalCreditAmount REAL DEFAULT 0,
          totalRepaidAmount REAL DEFAULT 0,
          latePaymentCount INTEGER DEFAULT 0,
          averagePaymentDelay INTEGER DEFAULT 0,
          creditScore INTEGER,
          FOREIGN KEY (customerId) REFERENCES Customers(id)
        );
      `);

      // Check if Settings has a default global row
      const settingsExists = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM Settings WHERE id = "app_settings"'
      );

      // Create default global settings if none exist
      if (!settingsExists || settingsExists.count === 0) {
        db.runSync(
          `INSERT INTO Settings (
            id, userId, storeName, storeAddress, storePhone, storeEmail,
            currencySymbol, taxRate, defaultDiscountRate, darkMode, language, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'app_settings', // Primary key for this global/default row
            null,             // userId is null for this global settings row
            'My Store',       // Default store name
            '',               // Default store address
            '',               // Default store phone
            '',               // Default store email
            '₹',              // Default currency symbol
            0,                // Default tax rate
            0,                // Default discount rate
            0,                // Default dark mode (false)
            'en',             // Default language
            new Date().toISOString()
          ]
        );
      }

      // Enable foreign keys
      db.execSync('PRAGMA foreign_keys = ON;');
    });
    console.log("Database initialized with multi-user schema.");
  } catch (error) {
    console.error('Failed to initialize database with multi-user schema:', error);
    // If running on web, SQLite might not be fully supported by expo-sqlite in all browsers/environments
    if (Platform.OS === 'web') {
        console.warn("SQLite operations on web might have limitations. Ensure your environment supports it fully or consider alternative storage for web.");
    }
    throw error; // Re-throw to signal failure
  }
};

// Export the database instance with type
export const getDatabase = (): SQLite.SQLiteDatabase => db;