
import * as SQLite from 'expo-sqlite';

// Open or create the database with type annotation
const db: SQLite.SQLiteDatabase = SQLite.openDatabaseSync('pettiKadai.db');

// Initialize database tables
export const initDatabase = (): void => {
  try {
    db.withTransactionSync(() => {
      // ReceiptTemplates Table (moved first due to foreign key dependency)
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

      // Products Table
      db.execSync(`
       CREATE TABLE IF NOT EXISTS products (
       id TEXT PRIMARY KEY,
       name TEXT NOT NULL,
       costPrice REAL NOT NULL,
       sellingPrice REAL NOT NULL,
       quantity INTEGER NOT NULL DEFAULT 0,     
       unit TEXT NOT NULL DEFAULT 'piece',     
       category TEXT,                           
       imageUri TEXT,                         
       createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), 
       updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))  
      );
   `);

      // Categories Table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS Categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          createdAt TEXT DEFAULT (datetime('now'))
        );
      `);

      // Suppliers Table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS Suppliers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          contactPerson TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT DEFAULT (datetime('now'))
        );
      `);

      // Stock Adjustments Table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS StockAdjustments (
          id TEXT PRIMARY KEY,
          productId TEXT NOT NULL,
          previousQuantity INTEGER NOT NULL,
          newQuantity INTEGER NOT NULL,
          adjustmentReason TEXT NOT NULL,
          timestamp TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (productId) REFERENCES Products(id)
        );
      `);

      // Product Batches Table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS ProductBatches (
          id TEXT PRIMARY KEY,
          productId TEXT NOT NULL,
          batchNumber TEXT,
          quantity INTEGER NOT NULL,
          manufactureDate TEXT,
          expiryDate TEXT,
          supplierId TEXT,
          purchaseDate TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (productId) REFERENCES Products(id),
          FOREIGN KEY (supplierId) REFERENCES Suppliers(id)
        );
      `);

      // Sales Table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS Sales (
          id TEXT PRIMARY KEY,
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
          salesStatus TEXT DEFAULT 'COMPLETED'
        );
      `);

      // SaleItems Table
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

      // DraftSales Table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS DraftSales (
          id TEXT PRIMARY KEY,
          timestamp TEXT DEFAULT (datetime('now')),
          totalAmount REAL NOT NULL,
          customerName TEXT,
          customerPhone TEXT,
          notes TEXT,
          expiryTime TEXT
        );
      `);

      // DraftSaleItems Table
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

      // Returns Table
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

      // ReturnItems Table
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

      // Receipts Table
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

      // ReceiptSharing Table
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

      // ReceiptQRCodes Table
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

      // Reports Table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS Reports (
          id TEXT PRIMARY KEY,
          reportType TEXT NOT NULL,
          name TEXT NOT NULL,
          parameters TEXT NOT NULL,
          createdAt TEXT DEFAULT (datetime('now')),
          lastRun TEXT,
          runCount INTEGER DEFAULT 0
        );
      `);

      // SavedReports Table
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

      // ScheduledReports Table
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

      // ReportMetrics Table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS ReportMetrics (
          id TEXT PRIMARY KEY,
          metricName TEXT NOT NULL,
          metricValue REAL NOT NULL,
          calculationDate TEXT NOT NULL,
          metricType TEXT NOT NULL,
          updatedAt TEXT DEFAULT (datetime('now'))
        );
      `);

      // ProductPerformance Table
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
      db.execSync(`
        CREATE TABLE IF NOT EXISTS Settings (
          id TEXT PRIMARY KEY DEFAULT 'app_settings',
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
          updatedAt TEXT DEFAULT (datetime('now'))
        );
      `);

      // AppUsage Table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS AppUsage (
          id TEXT PRIMARY KEY,
          featureName TEXT NOT NULL,
          usageCount INTEGER DEFAULT 1,
          lastUsed TEXT DEFAULT (datetime('now'))
        );
      `);

      // Customers Table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS Customers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT NOT NULL UNIQUE,
          email TEXT,
          address TEXT,
          totalPurchases REAL DEFAULT 0,
          outstandingBalance REAL DEFAULT 0,
          creditLimit REAL DEFAULT 0,
          loyaltyPoints INTEGER DEFAULT 0,
          lastPurchaseDate TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT DEFAULT (datetime('now'))
        );
      `);

      // CreditSales Table
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

      // CreditPayments Table
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

      // PaymentReminders Table
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

      // PaymentCommitments Table
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

      // CustomerCreditHistory Table
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

      // Enable foreign keys
      db.execSync('PRAGMA foreign_keys = ON;');
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

// Export the database instance with type
export const getDatabase = (): SQLite.SQLiteDatabase => db;