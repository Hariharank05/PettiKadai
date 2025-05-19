// ~/lib/db/reportDbUtils.ts

import { getDatabase } from './database'; // Adjust path as needed
import * as Crypto from 'expo-crypto';

const db = getDatabase();

// Input data structure for saving a generated report instance
export interface SavedReportData {
    name: string; // e.g., Sales_Report_20231027_112233.pdf
    format: 'PDF' | 'CSV';
    filePath: string; // Path in FileSystem.documentDirectory
    generatedAt: string; // ISO timestamp string
    fileSize?: number | null | undefined; // Can be undefined if not available
    reportType: 'SALES' | 'INVENTORY' | 'PRODUCT_PERFORMANCE';
    parameters?: string | null | undefined; // JSON string of filters used, can be undefined
    // sourceReportConfigId?: string | null | undefined; // Optional: ID from a 'Reports' table (predefined report config)
}

export const saveGeneratedReportRecord = async (record: SavedReportData): Promise<string> => {
    console.log('[DB_UTIL] Attempting to save report record:', record.name);
    
    const newSavedInstanceId = Crypto.randomUUID(); // Unique ID for this specific saved report file/instance

    // Ensure optional values are explicitly 'null' if they are 'undefined' for SQLite
    const fileSizeForDb = record.fileSize === undefined ? null : record.fileSize;
    const parametersForDb = record.parameters === undefined ? null : record.parameters;
    // const sourceReportConfigIdForDb = record.sourceReportConfigId === undefined ? null : record.sourceReportConfigId;

    return new Promise((resolve, reject) => {
        try {
            // IMPORTANT: Adjust the table name ('SavedReports') and column names to match YOUR database.ts schema
            // This example assumes an 'id' (PK for this saved instance) and an optional 'reportId' (FK to a general Report config).
            // If your 'SavedReports' table doesn't have a 'reportId' FK, remove it from SQL and params.
            db.withTransactionSync(() => {
                db.runSync(
                    `INSERT INTO SavedReports (id, name, format, filePath, generatedAt, fileSize, reportType, parameters, reportId) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, // 9 placeholders
                    [
                        newSavedInstanceId,         // 1. id (PK of this saved instance)
                        record.name,                // 2. name
                        record.format,              // 3. format
                        record.filePath,            // 4. filePath
                        record.generatedAt,         // 5. generatedAt
                        fileSizeForDb,              // 6. fileSize (now correctly null if undefined)
                        record.reportType,          // 7. reportType
                        parametersForDb,            // 8. parameters (now correctly null if undefined)
                        null                        // 9. reportId (FK to a 'Reports' table config ID - pass actual ID or null)
                                                    //    If you don't have this FK concept, remove this column and placeholder.
                    ]
                );
            });
            console.log('[DB_UTIL] Report record saved successfully with ID:', newSavedInstanceId);
            resolve(newSavedInstanceId); // Resolve with the ID of the newly saved record instance
        } catch (error) {
            console.error('[DB_UTIL] Error saving report record:', error);
            reject(error);
        }
    });
};