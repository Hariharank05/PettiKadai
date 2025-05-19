// ~/app/(tabs)/sales.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  // Text, // Using custom Text from ~/components/ui/text
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
  StyleSheet,
  TextInput, // Standard TextInput
  Keyboard,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Package, PlusCircle, MinusCircle, XCircle, Search, ShoppingCart, AlertCircle } from 'lucide-react-native';
import { Text } from '~/components/ui/text'; // Using your custom Text component
import { Input } from '~/components/ui/input'; // Your custom Input component
import { Button } from '~/components/ui/button'; // Your custom Button component
import { Card, CardContent } from '~/components/ui/card';
import { useProductStore } from '~/lib/stores/productStore';
import { Product } from '~/lib/models/product'; // Ensure this path is correct
import { Separator } from '~/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog';

// --- Database and Utility Imports ---
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import 'react-native-get-random-values'; // Required for uuid
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '~/lib/db/database'; // Ensure this path is correct
import { generateAndShareReceipt } from '~/lib/utils/receiptUtils';
import { useAuthStore } from '~/lib/stores/authStore';

// Interface for items in the cart
interface CartItem extends Product {
  quantityInCart: number;
}

// Interface for Store Settings (fetched for receipt)
interface ReceiptStoreSettings {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  currencySymbol?: string;
}

// Interface for simplified cart item for receipt generation
interface CartItemForReceipt {
  name: string;
  quantityInCart: number;
  sellingPrice: number;
  costPrice: number;
  category?: string | null;
}

const userId = useAuthStore.getState().userId;
// if (!userId) {
//   throw new Error("User not authenticated");
// }

// --- generateReceiptHtml function ---
const generateReceiptHtml = (
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


export default function SalesScreen() {
  const router = useRouter();
  const { products, fetchProducts } = useProductStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  const db = getDatabase();

  const loadProducts = useCallback(async () => {
    try {
      await fetchProducts();
    } catch (error) {
      console.error("Error fetching products:", error);
      Alert.alert("Error", "Failed to load products. Please try again.", [{ text: "OK" }]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts().finally(() => setRefreshing(false));
  }, [fetchProducts]);

  useEffect(() => {
    setIsLoading(true);
    fetchProducts().finally(() => setIsLoading(false));
  }, [fetchProducts]);

  useEffect(() => {
    if (products.length > 0) {
      const updatedProducts = products.map((product) => {
        const inCart = cartItems.find((item) => item.id === product.id);
        if (inCart) {
          return {
            ...product,
            quantity: product.quantity - inCart.quantityInCart,
          };
        }
        return product;
      });
      setDisplayProducts(updatedProducts);

      const updatedQuantities: Record<string, number> = {};
      cartItems.forEach((item) => {
        updatedQuantities[item.id] = item.quantityInCart;
      });
      setSelectedQuantities(updatedQuantities);
    } else {
      setDisplayProducts([]);
    }
  }, [products, cartItems]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return displayProducts;
    return displayProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [displayProducts, searchQuery]);

  const updateItemQuantity = useCallback((productId: string, quantity: number) => {
    setCartItems((prevCart) =>
      prevCart.map((cartItem) =>
        cartItem.id === productId ? { ...cartItem, quantityInCart: quantity } : cartItem
      )
    );
  }, []);

  const addToCart = useCallback(
    (productId: string, quantityToAdd: number) => {
      if (quantityToAdd <= 0) return;
      const originalProduct = products.find((p) => p.id === productId);
      if (!originalProduct) {
        console.error(`Product with ID ${productId} not found`);
        return;
      }
      const displayProduct = displayProducts.find((p) => p.id === productId);
      if (!displayProduct) {
        console.error(`Display product with ID ${productId} not found`);
        return;
      }
      if (quantityToAdd > displayProduct.quantity) {
        Alert.alert(`Only ${displayProduct.quantity} left in stock`);
        return;
      }
      setCartItems((prev) => {
        const existingItem = prev.find((item) => item.id === productId);
        if (existingItem) {
          return prev.map((item) =>
            item.id === productId
              ? { ...item, quantityInCart: item.quantityInCart + quantityToAdd }
              : item
          );
        } else {
          return [...prev, { ...originalProduct, quantityInCart: quantityToAdd }];
        }
      });
      setSelectedQuantities((prev) => ({
        ...prev,
        [productId]: (prev[productId] || 0) + quantityToAdd,
      }));
      setIsCartOpen(true);
    },
    [products, displayProducts]
  );

  const increaseListQuantity = useCallback(
    (productId: string, maxStock: number) => {
      const displayProduct = displayProducts.find((p) => p.id === productId);
      if (!displayProduct) return;
      setSelectedQuantities((prev) => {
        const currentQty = prev[productId] || 0;
        if (currentQty >= maxStock) {
          Alert.alert(`Maximum quantity available is ${maxStock}`);
          return prev;
        }
        const newQty = currentQty + 1;
        if (newQty > 0) {
          setCartItems((prevCart) => {
            const existingItem = prevCart.find((item) => item.id === productId);
            const originalProduct = products.find((p) => p.id === productId);
            if (!originalProduct) return prevCart;
            if (existingItem) {
              return prevCart.map((item) =>
                item.id === productId
                  ? { ...item, quantityInCart: newQty }
                  : item
              );
            } else {
              return [...prevCart, { ...originalProduct, quantityInCart: newQty }];
            }
          });
        }
        return { ...prev, [productId]: newQty };
      });
    },
    [products, displayProducts]
  );

  const decreaseListQuantity = useCallback(
    (productId: string) => {
      setSelectedQuantities((prev) => {
        const currentQty = prev[productId] || 0;
        if (currentQty <= 0) {
          return prev;
        }
        const newQty = currentQty - 1;
        setCartItems((prevCart) => {
          if (newQty === 0) {
            const newCart = prevCart.filter((item) => item.id !== productId);
            if (newCart.length === 0) setIsCartOpen(false);
            return newCart;
          }
          return prevCart.map((item) =>
            item.id === productId
              ? { ...item, quantityInCart: newQty }
              : item
          );
        });
        return { ...prev, [productId]: newQty };
      });
    },
    []
  );

  const increaseQuantity = useCallback(
    (productId: string) => {
      setCartItems((prevCart) => {
        const itemIndex = prevCart.findIndex((item) => item.id === productId);
        if (itemIndex === -1) return prevCart;

        const item = prevCart[itemIndex];
        const originalProduct = products.find(p => p.id === productId);
        if (!originalProduct) return prevCart;

        const stockAvailableToAdd = originalProduct.quantity - item.quantityInCart;

        if (stockAvailableToAdd <= 0) {
          Alert.alert(
            "Stock Limit Reached",
            `Cannot add more ${item.name || 'product'}. All available stock is in the cart.`,
            [{ text: "OK" }]
          );
          return prevCart;
        }

        const newQty = item.quantityInCart + 1;
        const updatedCart = [...prevCart];
        updatedCart[itemIndex] = {
          ...item,
          quantityInCart: newQty,
        };
        setSelectedQuantities((prev) => ({
          ...prev,
          [productId]: newQty,
        }));
        return updatedCart;
      });
    },
    [products]
  );

  const decreaseQuantity = useCallback(
    (productId: string) => {
      setCartItems((prevCart) => {
        const itemIndex = prevCart.findIndex((item) => item.id === productId);
        if (itemIndex === -1) return prevCart;

        const item = prevCart[itemIndex];
        if (item.quantityInCart > 1) {
          const newQty = item.quantityInCart - 1;
          const updatedCart = [...prevCart];
          updatedCart[itemIndex] = {
            ...item,
            quantityInCart: newQty,
          };
          setSelectedQuantities((prev) => ({
            ...prev,
            [productId]: newQty,
          }));
          return updatedCart;
        } else {
          const newCart = prevCart.filter((i) => i.id !== productId);
          setSelectedQuantities((prev) => {
            const newQuantities = { ...prev };
            delete newQuantities[productId];
            return newQuantities;
          });
          if (newCart.length === 0) {
            setIsCartOpen(false);
          }
          return newCart;
        }
      });
    },
    []
  );

  const removeCartItem = useCallback(
    (productId: string) => {
      setCartItems((prevCart) => {
        const newCart = prevCart.filter((item) => item.id !== productId);
        setSelectedQuantities((prev) => {
          const newQuantities = { ...prev };
          delete newQuantities[productId];
          return newQuantities;
        });
        if (newCart.length === 0) {
          setIsCartOpen(false);
        }
        return newCart;
      });
    },
    []
  );

  const clearCart = useCallback(() => {
    setIsClearCartDialogOpen(true);
  }, []);

  const confirmClearCart = useCallback(() => {
    setCartItems([]);
    setSelectedQuantities({});
    setIsCartOpen(false);
    setIsClearCartDialogOpen(false);
  }, []);

  const { subtotal, totalAmount, totalProfit } = useMemo(() => {
    let currentSubtotal = 0;
    let currentProfit = 0;
    cartItems.forEach((item) => {
      const itemSubtotal = item.sellingPrice * item.quantityInCart;
      const costPrice = typeof item.costPrice === 'number' ? item.costPrice : 0;
      const itemProfit = (item.sellingPrice - costPrice) * item.quantityInCart;
      currentSubtotal += itemSubtotal;
      currentProfit += itemProfit;
    });
    const currentTotalAmount = currentSubtotal;
    return { subtotal: currentSubtotal, totalAmount: currentTotalAmount, totalProfit: currentProfit };
  }, [cartItems]);

  const confirmSale = async () => {
    if (cartItems.length === 0) {
      console.warn("Attempted to confirm sale with empty cart.");
      return;
    }
    setIsProcessingSale(true);

    try {
      // Get state inside the async function scope for reliability
      const authState = useAuthStore.getState();
      const currentUserId = authState.userId; // Type: string | undefined

      if (!currentUserId) {
        const errorMessage = 'User not authenticated to complete sale.';
        console.warn(errorMessage);
        setIsProcessingSale(false); // Stop loading
        Alert.alert('Authentication Error', errorMessage); // Inform user
        return; // Stop process
      }

      // currentUserId is now guaranteed to be a string within this block
      const saleId = uuidv4();
      const saleTimestamp = new Date().toISOString();
      const paymentType = 'CASH';

      await db.execAsync('BEGIN TRANSACTION;');

      await db.runAsync(
        `INSERT INTO Sales (id, userId, timestamp, totalAmount, totalProfit, subtotal, paymentType, salesStatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        // Use the currentUserId which is guaranteed string
        [saleId, currentUserId, saleTimestamp, totalAmount, totalProfit, subtotal, paymentType, 'COMPLETED']
      );

      const saleCartItems: CartItemForReceipt[] = [];

      for (const item of cartItems) {
        const saleItemId = uuidv4();
        await db.runAsync(
          `INSERT INTO SaleItems (id, saleId, productId, quantity, unitPrice, costPrice, subtotal, profit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            saleItemId,
            saleId,
            item.id,
            item.quantityInCart,
            item.sellingPrice,
            item.costPrice,
            item.sellingPrice * item.quantityInCart,
            (item.sellingPrice - item.costPrice) * item.quantityInCart,
          ]
        );
        await db.runAsync(
          'UPDATE products SET quantity = quantity - ?, updatedAt = ? WHERE id = ? AND userId = ?',
          [item.quantityInCart, new Date().toISOString(), item.id, currentUserId] // Add userId to UPDATE for safety
        );
        saleCartItems.push({
          name: item.name,
          quantityInCart: item.quantityInCart,
          sellingPrice: item.sellingPrice,
          costPrice: item.costPrice,
          category: item.category
        });
      }

      // Call the utility function
      const pdfUri = await generateAndShareReceipt({
        saleId,
        saleTimestamp,
        totalAmount,
        cartItems: saleCartItems,
        // Assuming generateAndShareReceipt might need userId or store settings based on userId
        // If it fetches settings internally, ensure it also gets userId there.
        // If it needs userId passed, add it here: userId: currentUserId
      });

      if (pdfUri) {
        const receiptId = uuidv4();
        const receiptNumber = `RCPT-${saleId.substring(0, 8).toUpperCase()}`;
        // Save the receipt record with the generated PDF URI
        // Note: The Receipt table schema does NOT have a userId. It relies on Sales.saleId.
        await db.runAsync(
          `INSERT INTO Receipts (id, saleId, receiptNumber, format, filePath, generatedAt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [receiptId, saleId, receiptNumber, 'PDF', pdfUri, new Date().toISOString()]
        );
        console.log('Receipt record saved to DB with filePath:', pdfUri);
      } else {
        // Handle case where PDF generation/sharing failed but sale was committed
        Alert.alert("Sale Confirmed", "Sale completed, but there was an issue generating or sharing the receipt.");
      }

      await db.execAsync('COMMIT;');


      setCartItems([]);
      setSelectedQuantities({});
      setIsCartOpen(false);
      setIsConfirmDialogOpen(false);
      // loadProducts(); // This will be called in finally

      if (pdfUri) { // Only show full success if PDF was handled
        Alert.alert('Sale Confirmed', `Sale completed. Receipt ready for sharing.`);
      }

    } catch (error) {
      await db.execAsync('ROLLBACK;');
      console.error('Error confirming sale:', error);
      Alert.alert('Error', `Failed to confirm sale: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessingSale(false);
      loadProducts();
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <Card className={`mb-2 bg-card border border-border ${item.quantity <= 0 ? 'opacity-50' : ''}`}>
      <CardContent className="p-3 flex-row items-center">
        {item.imageUri ? (
          <Image
            source={{ uri: item.imageUri }}
            style={{ width: 40, height: 40 }}
            className="rounded-md mr-3"
            resizeMode="cover"
            onError={(e) => console.log(`Image load error for ${item.name}:`, e.nativeEvent.error)}
          />
        ) : (
          <View className="w-10 h-10 rounded-md mr-3 bg-muted items-center justify-center">
            <Package size={20} className="text-muted-foreground" />
          </View>
        )}
        <View className="flex-1 mr-3">
          <Text
            className="text-sm font-medium text-foreground native:text-black"
            numberOfLines={1}
          >
            {item.name || 'Unknown Product'}
          </Text>
          <View className="flex-row items-center mt-0.5">
            {item.quantity > 0 ? (
              <View
                className={`mr-1 px-1.5 py-0.5 rounded ${item.quantity > 5 ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'}`}
              >
                <Text
                  className={`text-xs ${item.quantity > 5 ? 'text-green-700 dark:text-green-200' : 'text-yellow-700 dark:text-yellow-200'}`}
                >
                  {item.quantity}
                </Text>
              </View>
            ) : (
              <View className="mr-1 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900">
                <Text className="text-xs text-red-700 dark:text-red-200">Out</Text>
              </View>
            )}
            <Text
              className="text-xs text-muted-foreground native:text-gray-600"
            >
              {item.category || 'No category'}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <Text className="text-sm font-semibold text-primary mr-2 native:text-blue-600">₹{item.sellingPrice.toFixed(2)}</Text>
          <TouchableOpacity
            onPress={() => decreaseListQuantity(item.id)}
            disabled={item.quantity <= 0 || (selectedQuantities[item.id] || 0) <= 0}
            className="p-1"
          >
            <MinusCircle size={18} color={(item.quantity <= 0 || (selectedQuantities[item.id] || 0) <= 0) ? '#9CA3AF' : '#EF4444'} />
          </TouchableOpacity>
          <TextInput
            className="bg-background rounded w-10 h-7 text-center text-sm text-foreground border border-input native:text-black"
            keyboardType="number-pad"
            value={String(selectedQuantities[item.id] || 0)}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              if (isNaN(num) || num < 0) {
                setSelectedQuantities((prev) => ({ ...prev, [item.id]: 0 }));
                setCartItems(prevCart => prevCart.filter(cartItem => cartItem.id !== item.id || 0 > 0));
              } else if (num <= item.quantity) {
                setSelectedQuantities((prev) => ({ ...prev, [item.id]: num }));
              } else {
                setSelectedQuantities((prev) => ({ ...prev, [item.id]: item.quantity }));
                Alert.alert(`Maximum quantity available is ${item.quantity}`);
              }
            }}
            editable={item.quantity > 0}
          />
          <TouchableOpacity
            onPress={() => increaseListQuantity(item.id, item.quantity)}
            disabled={item.quantity <= 0}
            className="p-1"
          >
            <PlusCircle size={18} color={item.quantity <= 0 ? '#9CA3AF' : '#3B82F6'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => addToCart(item.id, selectedQuantities[item.id] || 0)}
            disabled={item.quantity <= 0 || (selectedQuantities[item.id] || 0) <= 0}
            className="p-1 ml-1"
          >
            <ShoppingCart size={20} color={(item.quantity <= 0 || (selectedQuantities[item.id] || 0) <= 0) ? '#9CA3AF' : '#3B82F6'} />
          </TouchableOpacity>
        </View>
      </CardContent>
    </Card>
  );

  const renderCartItem = ({ item }: { item: CartItem }) => {
    const handleQuantityChange = (text: string) => {
      const newQuantity = parseInt(text.replace(/[^0-9]/g, ''), 10);
      const productInStore = products.find((p) => p.id === item.id);
      if (!productInStore) {
        console.error(`Product with ID ${item.id} not found in store`);
        return;
      }
      if (isNaN(newQuantity)) {
        if (text === '') {
          updateItemQuantity(item.id, 1);
          setSelectedQuantities((prev) => ({ ...prev, [item.id]: 1 }));
        }
        return;
      }
      if (newQuantity === 0) {
        removeCartItem(item.id);
        return;
      }
      if (newQuantity > productInStore.quantity) {
        Alert.alert(
          "Stock Limit Reached",
          `Cannot set quantity to ${newQuantity}. Only ${productInStore.quantity} ${item.name || 'product'} originally in stock.`,
          [{
            text: "OK", onPress: () => {
              updateItemQuantity(item.id, productInStore.quantity);
              setSelectedQuantities((prev) => ({ ...prev, [item.id]: productInStore.quantity }));
            }
          }]
        );
        return;
      }
      updateItemQuantity(item.id, newQuantity);
      setSelectedQuantities((prev) => ({ ...prev, [item.id]: newQuantity }));
    };

    return (
      <Card className="mb-2 bg-card border border-border">
        <CardContent className="p-3 flex-row items-center">
          {item.imageUri ? (
            <Image
              source={{ uri: item.imageUri }}
              style={{ width: 40, height: 40 }}
              className="rounded-md mr-3"
              resizeMode="cover"
            />
          ) : (
            <View className="w-10 h-10 rounded-md mr-3 bg-muted items-center justify-center">
              <Package size={20} className="text-muted-foreground" />
            </View>
          )}
          <View className="flex-1 mr-3">
            <Text className="text-sm font-medium text-foreground native:text-black">{item.name}</Text>
            <View className="flex-row items-center mt-0.5">
              <Text className="text-xs text-muted-foreground mr-1 native:text-gray-600">{item.category || 'No category'}</Text>
              <Text className="text-xs text-muted-foreground native:text-gray-600">₹{item.sellingPrice.toFixed(2)}</Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => decreaseQuantity(item.id)} className="p-1">
              <MinusCircle size={18} color="#EF4444" />
            </TouchableOpacity>
            <TextInput
              className="bg-background rounded w-10 h-7 text-center text-sm text-foreground border border-input native:text-black"
              value={item.quantityInCart.toString()}
              onChangeText={handleQuantityChange}
              keyboardType="number-pad"
              selectTextOnFocus
              maxLength={3}
            />
            <TouchableOpacity onPress={() => increaseQuantity(item.id)} className="p-1">
              <PlusCircle size={18} color="#3B82F6" />
            </TouchableOpacity>
            <Text className="text-sm font-semibold text-primary w-20 text-center native:text-blue-600">
              ₹{(item.sellingPrice * item.quantityInCart).toFixed(2)}
            </Text>
            <TouchableOpacity onPress={() => removeCartItem(item.id)} className="p-1">
              <XCircle size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </CardContent>
      </Card>
    );
  };

  const handleProceedToPayment = () => {
    if (cartItems.length === 0) return;
    Keyboard.dismiss();
    setIsConfirmDialogOpen(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 p-4 pt-2">
        <View className="mb-4 flex-row items-center bg-card border border-border rounded-lg px-3">
          <Search size={20} className="text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="flex-1 h-12 border-0 bg-transparent ml-2 text-base text-foreground"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-muted-foreground mt-2 native:text-gray-500">Loading Products...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <AlertCircle size={40} color="#9CA3AF" />
            <Text className="text-muted-foreground font-medium mt-2 native:text-gray-500">No products found</Text>
            {products.length > 0 && searchQuery !== '' && (
              <Text className="text-muted-foreground text-center mt-1 text-sm native:text-gray-500">Try adjusting your search.</Text>
            )}
            {products.length === 0 && (
              <View className="items-center mt-4">
                <Text className="text-muted-foreground text-center text-sm mb-2 native:text-gray-500">Your inventory is empty.</Text>
                <Button variant="outline" onPress={() => router.push('/(tabs)/products')}>
                  <Text className="text-primary native:text-blue-600">Add Your First Product</Text>
                </Button>
              </View>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>

      {cartItems.length > 0 && !isLoading && (
        <TouchableOpacity
          className="bg-primary rounded-full shadow-lg items-center justify-center absolute bottom-8 right-8 w-16 h-16"
          onPress={() => setIsCartOpen(true)}
          activeOpacity={0.7}
        >
          <ShoppingCart size={24} color="white" />
          <View className="bg-destructive rounded-full items-center justify-center absolute -top-1 -right-1 min-w-6 h-6 px-1">
            <Text className="text-white font-bold text-xs">
              {cartItems.reduce((sum, item) => sum + item.quantityInCart, 0)}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="p-0 bg-background rounded-lg shadow-lg max-w-sm w-[95%] mx-auto">
          <DialogHeader className="p-4 border-b border-border">
            <View className="flex-row items-center">
              <ShoppingCart size={22} color="#3B82F6" className="mr-2" />
              <DialogTitle className="text-lg font-bold text-foreground native:text-black">
                <Text>Current Sale</Text> {/* FIX APPLIED */}
              </DialogTitle>
            </View>
          </DialogHeader>
          <View className="p-3" style={{ maxHeight: Platform.OS === 'ios' ? 300 : 250 }}>
            {cartItems.length === 0 ? (
              <View className="items-center justify-center border border-dashed border-border rounded-lg p-6 my-4 min-h-32">
                <ShoppingCart size={40} color="#9CA3AF" />
                <Text className="text-muted-foreground font-medium mt-2 native:text-gray-500">Cart is empty</Text>
                <Text className="text-muted-foreground text-xs mt-1 native:text-gray-500">Select products to add them here</Text>
              </View>
            ) : (
              <FlatList
                data={cartItems}
                renderItem={renderCartItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={true}
              />
            )}
          </View>
          {cartItems.length > 0 && (
            <View className="border-t border-border p-4">
              <View className="space-y-2 mb-4">
                <View className="flex-row justify-between">
                  <Text className="text-muted-foreground native:text-gray-600">Subtotal:</Text>
                  <Text className="text-foreground font-medium native:text-black">₹{subtotal.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-lg font-bold text-foreground native:text-black">Total:</Text>
                  <Text className="text-lg font-bold text-primary native:text-blue-600">₹{totalAmount.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-muted-foreground text-sm native:text-gray-600">Est. Profit:</Text>
                  <Text className="text-green-600 text-sm">₹{totalProfit.toFixed(2)}</Text>
                </View>
              </View>
              <DialogFooter className="flex-row gap-2 pt-2">
                <Button variant="outline" className="h-10 flex-1" onPress={clearCart} disabled={isProcessingSale}>
                  <Text className="text-muted-foreground native:text-gray-600">Clear Sale</Text>
                </Button>
                <Button className="h-10 flex-1" onPress={handleProceedToPayment} disabled={isProcessingSale}>
                  {isProcessingSale ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-primary-foreground font-semibold native:text-white">Proceed to Payment</Text>
                  )}
                </Button>
              </DialogFooter>
            </View>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="p-6 bg-background rounded-lg shadow-lg max-w-md w-[95%] mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground native:text-black">
              <Text>Confirm Sale</Text> {/* FIX APPLIED */}
            </DialogTitle>
          </DialogHeader>
          <View className="my-4">
            <Text className="text-foreground mb-4 native:text-black">Please confirm the following sale:</Text>
            {cartItems.map((item) => (
              <View key={item.id} className="flex-row justify-between py-1">
                <Text className="text-foreground native:text-black" numberOfLines={1} ellipsizeMode="tail" style={{ flex: 1, marginRight: 8 }}>
                  {item.name} {item.category ? `(${item.category})` : ''} × {item.quantityInCart}
                </Text>
                <Text className="text-foreground native:text-black">₹{(item.sellingPrice * item.quantityInCart).toFixed(2)}</Text>
              </View>
            ))}
            <Separator className="my-2" />
            <View className="flex-row justify-between py-1">
              <Text className="text-lg font-bold text-foreground native:text-black">Total:</Text>
              <Text className="text-lg font-bold text-primary native:text-blue-600">₹{totalAmount.toFixed(2)}</Text>
            </View>
          </View>
          <DialogFooter className="flex-row justify-end gap-x-3">
            <Button variant="outline" onPress={() => setIsConfirmDialogOpen(false)} disabled={isProcessingSale}>
              <Text className="native:text-black">Cancel</Text>
            </Button>
            <Button onPress={confirmSale} disabled={isProcessingSale}>
              {isProcessingSale ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-primary-foreground native:text-white">Confirm Sale</Text>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isClearCartDialogOpen} onOpenChange={setIsClearCartDialogOpen}>
        <DialogContent className="p-6 bg-background rounded-lg shadow-lg max-w-md w-[95%] mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground native:text-black">
              <Text>Clear Cart</Text>
            </DialogTitle>
          </DialogHeader>
          <View className="my-4">
            <Text className="text-foreground native:text-black">Are you sure you want to clear all items from the cart?</Text>
          </View>
          <DialogFooter className="flex-row justify-end gap-x-3">
            <Button variant="outline" onPress={() => setIsClearCartDialogOpen(false)} disabled={isProcessingSale}>
              <Text className="native:text-black">Cancel</Text>
            </Button>
            <Button variant="destructive" onPress={confirmClearCart} disabled={isProcessingSale}>
              <Text className="text-destructive-foreground native:text-white">Clear</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  );
}