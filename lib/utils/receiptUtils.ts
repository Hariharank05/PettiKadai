// lib/utils/receiptUtils.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { getDatabase } from '~/lib/db/database'; // Adjust path as needed
import { useAuthStore } from '../stores/authStore';
// import { v4 as uuidv4 } from 'uuid'; // Not used in generateAndShareReceipt directly

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
  customer?: { // Optional customer details
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  paymentMethod?: string | null; // Added
}

// HTML Generation Function
export const generateReceiptHtml = (
  saleDetails: SaleDetailsForReceipt,
  storeSettings?: ReceiptStoreSettings | null // storeSettings now part of saleDetails effectively
): string => {
  const { cartItems, totalAmount, saleId, saleTimestamp, customer, paymentMethod } = saleDetails;
  
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

  let customerHtml = '';
  if (customer && customer.name) {
    customerHtml = `
      <div class="info-section customer-info">
        <p><strong>Customer:</strong> ${customer.name}</p>
        ${customer.phone ? `<p><strong>Phone:</strong> ${customer.phone}</p>` : ''}
        ${customer.email ? `<p><strong>Email:</strong> ${customer.email}</p>` : ''}
      </div>
    `;
  }
  
  let paymentMethodHtml = '';
  if (paymentMethod) {
    paymentMethodHtml = `<p><strong>Payment Method:</strong> ${paymentMethod}</p>`;
  }

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale:1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 15px; font-size: 12px; color: #333; }
          .container { max-width: 300px; margin: auto; border: 1px solid #ddd; padding: 15px; box-shadow: 0 0 5px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 15px; }
          .store-name { font-size: 16px; font-weight: bold; margin-bottom: 3px; }
          .store-details { font-size: 10px; color: #555; margin-bottom: 3px; }
          .info-section { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #ccc; }
          .info-section p { margin: 2px 0; font-size: 10px; }
          .customer-info p { margin: 1px 0; } /* Tighter spacing for customer info */
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
            ${paymentMethodHtml}
          </div>

          ${customerHtml}

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
  const authStore =useAuthStore.getState(); // Dynamically import to avoid cycle
  const currentUserId = authStore.userId;

  try {
    // 1. Fetch Store Settings for Receipt
    let storeSettings: ReceiptStoreSettings | null = null;
    if (currentUserId) {
        storeSettings = await db.getFirstAsync<ReceiptStoreSettings>(
            'SELECT storeName, storeAddress, storePhone, storeEmail, currencySymbol FROM Settings WHERE userId = ? AND id = ?', // Use id = userId for user-specific settings
            [currentUserId, currentUserId]
        );
    }
    if (!storeSettings) { // Fallback to global settings
        storeSettings = await db.getFirstAsync<ReceiptStoreSettings>(
            'SELECT storeName, storeAddress, storePhone, storeEmail, currencySymbol FROM Settings WHERE id = "app_settings"'
        );
    }


    // 2. Generate Receipt HTML
    // The generateReceiptHtml function now takes saleDetails which includes customer and paymentMethod
    const receiptHtml = generateReceiptHtml(saleDetails, storeSettings);


    // 3. Generate PDF from HTML
    const { uri: pdfUri } = await Print.printToFileAsync({ html: receiptHtml, base64: false });

    // 4. Share Receipt (which allows preview)
    if (Platform.OS !== 'web' && await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share Receipt RCPT-${saleDetails.saleId.substring(0, 8).toUpperCase()}`,
        UTI: 'com.adobe.pdf', // UTI for iOS
      });
      return pdfUri; // Return URI after successful sharing
    } else if (Platform.OS === 'web') {
        // For web, we can prompt download or just log, as direct sharing is different
        console.log('Receipt PDF (Web - for download):', pdfUri);
        // You might use a library or anchor tag to trigger download on web
        // const link = document.createElement('a');
        // link.href = pdfUri;
        // link.download = `Receipt_RCPT-${saleDetails.saleId.substring(0, 8).toUpperCase()}.pdf`;
        // document.body.appendChild(link);
        // link.click();
        // document.body.removeChild(link);
        Alert.alert('Receipt Generated (Web)', 'Receipt PDF is ready. On a live web deployment, this would trigger a download.');
        return pdfUri;
    }
     else {
      Alert.alert('Sharing Not Available', 'Sharing is not available on this device. Receipt saved locally.');
      console.log('Receipt saved at (for non-web without sharing):', pdfUri);
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
    if (Platform.OS !== 'web' && await Sharing.isAvailableAsync()) {
        try {
            await Sharing.shareAsync(filePath, {
                mimeType: 'application/pdf',
                dialogTitle: `Preview Receipt ${receiptNumber}`,
            });
        } catch (error) {
            console.error("Error sharing/previewing receipt:", error);
            Alert.alert("Error", "Could not open receipt for preview.");
        }
    } else if (Platform.OS === 'web') {
        // On web, try to open in new tab or log
        // window.open(filePath, '_blank'); // This might be blocked by pop-up blockers
        console.log("Web Preview: Receipt located at - ", filePath);
        Alert.alert("Web Preview", "On a live web environment, this might open in a new tab. Path: " + filePath);
    } else {
        Alert.alert("Preview Not Available", "Cannot open receipt for preview on this device. File located at: " + filePath);
    }
};