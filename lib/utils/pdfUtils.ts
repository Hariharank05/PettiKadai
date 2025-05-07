// ~/lib/utils/pdfUtils.ts

import * as FileSystem from 'expo-file-system';
import { format as formatDateFns } from 'date-fns';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts'; // This is vfs_fonts.js
import { TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';

// --- CRITICAL FONT SETUP ---
if (pdfMake.vfs) {
  const currentVfsKeys = Object.keys(pdfMake.vfs).length;
  const pdfFontsVfsKeys = Object.keys(pdfFonts.vfs).length;
  if (currentVfsKeys !== pdfFontsVfsKeys) {
    console.warn("[PDF Utils] pdfMake.vfs might have been set with a different font set. Overwriting with imported pdfFonts.vfs.");
    pdfMake.vfs = pdfFonts.vfs;
  }
} else {
  pdfMake.vfs = pdfFonts.vfs;
}
// console.log(`[PDF Utils] pdfMake.vfs keys count: ${Object.keys(pdfMake.vfs || {}).length}`);
// --- END CRITICAL FONT SETUP ---

interface ReportDataInput {
  reportType: 'SALES' | 'INVENTORY' | 'PRODUCT_PERFORMANCE';
  data: any[];
  fileName: string;
  currencySymbol?: string;
}

export async function generatePDFReport({ reportType, data, fileName, currencySymbol = '₹' }: ReportDataInput): Promise<string> {
  console.log(`[PDF] Attempting to generate ${reportType} report. Data items: ${Array.isArray(data) ? data.length : 'N/A (Data not an array)'}.`);

  if (!Array.isArray(data)) {
    console.error(`[PDF] Data for report type ${reportType} is not an array. Received:`, data);
    throw new Error(`Data for report type ${reportType} must be an array.`);
  }

  try {
    const currentDate = formatDateFns(new Date(), 'yyyy-MM-dd');
    const reportTitleText = `${reportType.charAt(0).toUpperCase() + reportType.slice(1).toLowerCase()} Report`;

    let tableHeaders: TableCell[] = [];
    const tableDataRows: TableCell[][] = [];

    const safeCellText = (value: any, defaultValue: string = 'N/A'): string => {
        if (value === null || value === undefined) return defaultValue;
        return String(value);
    };
    
    const safeToFixed = (value: any, digits: number = 2, defaultValue: string = 'N/A'): string => {
        const num = parseFloat(value);
        if (isNaN(num)) return defaultValue;
        return num.toFixed(digits);
    };

    if (reportType === 'SALES') {
      tableHeaders = [
        { text: 'Date', style: 'tableHeader' },
        { text: `Subtotal (${currencySymbol})`, style: 'tableHeader' },
      ];
      data.forEach((item: any = {}) => {
        tableDataRows.push([
          { text: item.date ? formatDateFns(new Date(item.date), 'yyyy-MM-dd') : 'N/A' },
          { text: safeToFixed(item.subtotal) },
        ]);
      });
    } else if (reportType === 'INVENTORY') {
      tableHeaders = [
        { text: 'Product ID', style: 'tableHeader' },
        { text: 'Name', style: 'tableHeader' },
        { text: 'Quantity', style: 'tableHeader' },
      ];
      data.forEach((item: any = {}) => {
        tableDataRows.push([
          { text: safeCellText(item.productId) },
          { text: safeCellText(item.name) },
          { text: safeCellText(item.quantity) },
        ]);
      });
    } else if (reportType === 'PRODUCT_PERFORMANCE') {
      tableHeaders = [
        { text: 'Product ID', style: 'tableHeader' },
        { text: 'Period', style: 'tableHeader' },
        { text: `Revenue (${currencySymbol})`, style: 'tableHeader' },
        { text: 'Margin (%)', style: 'tableHeader' },
      ];
      data.forEach((item: any = {}) => {
        tableDataRows.push([
          { text: safeCellText(item.productId) },
          { text: safeCellText(item.period) },
          { text: safeToFixed(item.revenue) },
          { text: safeToFixed(item.margin) },
        ]);
      });
    } else {
        console.error(`[PDF] Unsupported report type: ${reportType}`);
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    const completeTableBody: TableCell[][] = [tableHeaders, ...tableDataRows];
    const tableWidths = tableHeaders.length > 0 ? tableHeaders.map(() => '*') : ['*'];

    const documentDefinition: TDocumentDefinitions = {
      content: [
        { text: reportTitleText, style: 'header' },
        { text: `Generated on: ${currentDate}`, style: 'subheader' },
        { text: '', margin: [0, 5, 0, 10] },
        (completeTableBody[0] && completeTableBody[0].length > 0) || completeTableBody.length > 1 ? {
          table: {
            headerRows: 1,
            widths: tableWidths,
            body: completeTableBody,
          },
          layout: 'lightHorizontalLines',
        } : { text: 'No data available for this report.', style: 'italic' },
      ],
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 5] },
        subheader: { fontSize: 10, italics: true, margin: [0, 0, 0, 10] },
        tableHeader: { bold: true, fontSize: 10, color: 'black', fillColor: '#eeeeee' },
        italic: {italics: true, color: 'gray'}
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
      },
    };
    
    const pdfPath = `${FileSystem.documentDirectory}${fileName}.pdf`;
    const pdfDoc = pdfMake.createPdf(documentDefinition);
    // console.log(`[PDF] pdfDoc instance created for ${fileName}.`);

    const base64 = await new Promise<string>((resolve, reject) => {
        try {
            pdfDoc.getBase64((dataString: string) => {
                // console.log(`[PDF] getBase64 callback success for ${fileName}.`);
                resolve(dataString);
            });
        } catch (e) {
            console.error(`[PDF] Error in new Promise wrapping pdfDoc.getBase64 for ${fileName}:`, e);
            reject(e);
        }
    });

    await FileSystem.writeAsStringAsync(pdfPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    // console.log(`[PDF] PDF content written to file: ${pdfPath}`);

    const fileInfo = await FileSystem.getInfoAsync(pdfPath);
    if (fileInfo.exists) {
      // console.log(`[PDF] PDF saved successfully: ${pdfPath}, size: ${fileInfo.size} bytes`);
      return pdfPath;
    } else {
      console.error(`[PDF] PDF file was not created or found at ${pdfPath}. Info: ${JSON.stringify(fileInfo)}`);
      throw new Error(`PDF file was not created at ${pdfPath}.`);
    }
  } catch (error: any) {
    console.error(`[PDF] Critical error in generatePDFReport for ${reportType}:`, error.message);
    if (error.stack) {
        console.error("[PDF] Stack trace:", error.stack);
    }
    if (error instanceof RangeError || error.message.includes("Maximum call stack size exceeded")) {
        console.error("[PDF] RangeError (Maximum call stack size exceeded). Data items (if array):", Array.isArray(data) ? data.length: 'Data not an array');
    }
    throw error; 
  }
}