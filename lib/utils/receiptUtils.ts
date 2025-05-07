// lib/utils/receiptUtils.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { getDatabase } from '~/lib/db/database'; // Adjust path as needed
import { v4 as uuidv4 } from 'uuid';

// Interfaces (can also be in a shared types file)
export interface ReceiptStoreSettings {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  currencySymbol?: string;
}

export interface CartItemForReceipt {
  name: string;
  quantityInCart: number;
  sellingPrice: number;
  costPrice: number; // Keep for potential future use in HTML or internal logic
  category?: string | null;
}

export interface SaleDetailsForReceipt {
  saleId: string;
  saleTimestamp: string;
  totalAmount: number;
  cartItems: CartItemForReceipt[];
}

// HTML Generation Function (same as you provided, but exported)
export const generateReceiptHtml = (
  cartItems: CartItemForReceipt[],
  totalAmount: number,
  saleId: string,
  saleTimestamp: string,
  storeSettings?: ReceiptStoreSettings | null
): string => {
  const storeName = storeSettings?.storeName || 'Petti Kadai';
  const storeAddress = storeSettings?.storeAddress || '';
  const storePhone = storeSettings?.storePhone || '';
  const currency = storeSettings?.currencySymbol || '₹';

  const itemsHtml = cartItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name} ${item.category ? `(${item.category})` : ''}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantityInCart}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${currency}${item.sellingPrice.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${currency}${(item.sellingPrice * item.quantityInCart).toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 15px; font-size: 12px; color: #333; }
          .container { max-width: 300px; margin: auto; border: 1px solid #ddd; padding: 15px; box-shadow: 0 0 5px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 15px; }
          .store-name { font-size: 16px; font-weight: bold; margin-bottom: 3px; }
          .store-details { font-size: 10px; color: #555; margin-bottom: 3px; }
          .info-section { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #ccc; }
          .info-section p { margin: 2px 0; font-size: 10px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .items-table th { font-size: 11px; text-align: left; padding: 8px 4px; border-bottom: 1px solid #555; }
          .items-table td { font-size: 11px; padding: 6px 4px; vertical-align: top; }
          .totals-section { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ccc; }
          .totals-section p { margin: 4px 0; font-size: 12px; display: flex; justify-content: space-between; }
          .totals-section .grand-total { font-weight: bold; font-size: 14px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #777; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="store-name">${storeName}</div>
            ${storeAddress ? `<div class="store-details">${storeAddress}</div>` : ''}
            ${storePhone ? `<div class="store-details">Phone: ${storePhone}</div>` : ''}
          </div>

          <div class="info-section">
            <p><strong>Receipt No:</strong> RCPT-${saleId.substring(0, 8).toUpperCase()}</p>
            <p><strong>Date:</strong> ${new Date(saleTimestamp).toLocaleString()}</p>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals-section">
            <p class="grand-total"><span>GRAND TOTAL:</span> <span>${currency}${totalAmount.toFixed(2)}</span></p>
          </div>

          <div class="footer">
            Thank you for your purchase!
          </div>
        </div>
      </body>
    </html>
  `;
};


/**
 * Generates a PDF receipt, saves its metadata, and provides a sharing option.
 * @param saleDetails Details of the sale for the receipt.
 * @returns Promise<string | null> The URI of the generated PDF file, or null if failed.
 */
export const generateAndShareReceipt = async (
  saleDetails: SaleDetailsForReceipt
): Promise<string | null> => {
  const db = getDatabase();
  try {
    // 1. Fetch Store Settings for Receipt
    const storeSettings = await db.getFirstAsync<ReceiptStoreSettings>(
      'SELECT storeName, storeAddress, storePhone, storeEmail, currencySymbol FROM Settings WHERE id = "app_settings"'
    );

    // 2. Generate Receipt HTML
    const receiptHtml = generateReceiptHtml(
      saleDetails.cartItems,
      saleDetails.totalAmount,
      saleDetails.saleId,
      saleDetails.saleTimestamp,
      storeSettings
    );

    // 3. Generate PDF from HTML
    const { uri: pdfUri } = await Print.printToFileAsync({ html: receiptHtml, base64: false });

    // 4. Save Receipt Metadata to DB (if not already saved by the calling function)
    // This part might be redundant if confirmSale already saves it.
    // For a generic utility, it's good to have the option or ensure it's handled.
    // For now, we assume the calling function (e.g., confirmSale) handles saving the primary Receipt record.
    // This utility will focus on generation and sharing.

    // 5. Share Receipt (which allows preview)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share Receipt RCPT-${saleDetails.saleId.substring(0, 8).toUpperCase()}`,
        UTI: 'com.adobe.pdf',
      });
      return pdfUri; // Return URI after successful sharing
    } else {
      Alert.alert('Sharing Not Available', 'Sharing is not available on this device. Receipt saved locally.');
      console.log('Receipt saved at:', pdfUri);
      return pdfUri; // Return URI even if sharing is not available
    }
  } catch (error) {
    console.error('Error in generateAndShareReceipt utility:', error);
    Alert.alert('Receipt Error', `Failed to generate or share receipt: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
};

/**
 * Previews an existing receipt by allowing the user to share/open it.
 * @param filePath The local URI of the PDF file.
 * @param receiptNumber The receipt number for the sharing dialog title.
 */
export const previewExistingReceipt = async (filePath: string | null, receiptNumber: string): Promise<void> => {
    if (!filePath) {
        Alert.alert("Error", "Receipt file path is missing.");
        return;
    }
    if (await Sharing.isAvailableAsync()) {
        try {
            await Sharing.shareAsync(filePath, {
                mimeType: 'application/pdf',
                dialogTitle: `Preview Receipt ${receiptNumber}`,
            });
        } catch (error) {
            console.error("Error sharing/previewing receipt:", error);
            Alert.alert("Error", "Could not open receipt for preview.");
        }
    } else {
        Alert.alert("Preview Not Available", "Cannot open receipt for preview on this device. File located at: " + filePath);
    }
};