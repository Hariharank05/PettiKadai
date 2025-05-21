import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
  Platform,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Package, PlusCircle, MinusCircle, XCircle, Search, ShoppingCart, AlertCircle } from 'lucide-react-native';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Card, CardHeader, CardContent } from '~/components/ui/card';
import { useProductStore } from '~/lib/stores/productStore';
import { Product } from '~/lib/models/product';
import { Separator } from '~/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '~/lib/db/database';
import { generateAndShareReceipt } from '~/lib/utils/receiptUtils';
import { useAuthStore } from '~/lib/stores/authStore';

interface CartItem extends Product {
  quantityInCart: number;
}

interface ReceiptStoreSettings {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  currencySymbol?: string;
}

interface CartItemForReceipt {
  name: string;
  quantityInCart: number;
  sellingPrice: number;
  costPrice: number;
  category?: string | null;
}

// Define the color palette based on theme
const getColors = (colorScheme: 'light' | 'dark') => ({
  primary: colorScheme === 'dark' ? '#a855f7' : '#7200da',
  secondary: colorScheme === 'dark' ? '#22d3ee' : '#00b9f1',
  accent: '#f9c00c',
  danger: colorScheme === 'dark' ? '#ff4d4d' : '#f9320c',
  lightPurple: colorScheme === 'dark' ? '#4b2e83' : '#e9d5ff',
  lightBlue: colorScheme === 'dark' ? '#164e63' : '#d0f0ff',
  lightYellow: colorScheme === 'dark' ? '#854d0e' : '#fff3d0',
  lightRed: colorScheme === 'dark' ? '#7f1d1d' : '#ffe5e0',
  white: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
  dark: colorScheme === 'dark' ? '#e5e7eb' : '#1a1a1a',
  gray: colorScheme === 'dark' ? '#9ca3af' : '#666',
  green: colorScheme === 'dark' ? '#4ade80' : '#22c55e',
});

const userId = useAuthStore.getState().userId;

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
        <meta name="viewport" content="width=device-width, initial-scale:1.0">
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
  const colorScheme = useColorScheme() || 'light';
  const colors = getColors(colorScheme);
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
      const authState = useAuthStore.getState();
      const currentUserId = authState.userId;

      if (!currentUserId) {
        const errorMessage = 'User not authenticated to complete sale.';
        console.warn(errorMessage);
        setIsProcessingSale(false);
        Alert.alert('Authentication Error', errorMessage);
        return;
      }

      const saleId = uuidv4();
      const saleTimestamp = new Date().toISOString();
      const paymentType = 'CASH';

      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO Sales (id, userId, timestamp, totalAmount, totalProfit, subtotal, paymentType, salesStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
            [item.quantityInCart, new Date().toISOString(), item.id, currentUserId]
          );
          saleCartItems.push({
            name: item.name,
            quantityInCart: item.quantityInCart,
            sellingPrice: item.sellingPrice,
            costPrice: item.costPrice,
            category: item.category
          });
        }

        const pdfUri = await generateAndShareReceipt({
          saleId,
          saleTimestamp,
          totalAmount,
          cartItems: saleCartItems,
        });

        if (pdfUri) {
          const receiptId = uuidv4();
          const receiptNumber = `RCPT-${saleId.substring(0, 8).toUpperCase()}`;
          await db.runAsync(
            `INSERT INTO Receipts (id, saleId, receiptNumber, format, filePath, generatedAt)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [receiptId, saleId, receiptNumber, 'PDF', pdfUri, new Date().toISOString()]
          );
          console.log('Receipt record saved to DB with filePath:', pdfUri);
        } else {
          Alert.alert("Sale Confirmed", "Sale completed, but there was an issue generating or sharing the receipt.");
        }
      });

      setCartItems([]);
      setSelectedQuantities({});
      setIsCartOpen(false);
      setIsConfirmDialogOpen(false);

      Alert.alert('Sale Confirmed', `Sale completed. Receipt ready for sharing.`);

    } catch (error) {
      console.error('Error confirming sale:', error);
      Alert.alert('Error', `Failed to confirm sale: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessingSale(false);
      loadProducts();
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      onPress={() => addToCart(item.id, selectedQuantities[item.id] || 0)}
      disabled={item.quantity <= 0 || (selectedQuantities[item.id] || 0) <= 0}
      className={`w-[48%] m-1 rounded-xl overflow-hidden shadow-sm ${item.quantity <= 0 ? 'opacity-50' : ''}`}
      style={{ backgroundColor: colors.white }}
    >
      <View className="relative">
        {item.imageUri ? (
          <Image
            source={{ uri: item.imageUri }}
            style={{ width: '100%', height: 120 }}
            className="rounded-t-xl"
            resizeMode="cover"
            onError={(e) => console.log(`Image load error for ${item.name}:`, e.nativeEvent.error)}
          />
        ) : (
          <View className="w-full h-32 rounded-t-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <Package size={32} color={colors.primary} />
          </View>
        )}

      </View>
      <View className="p-3">
        <Text
          className="text-sm font-semibold"
          numberOfLines={1}
          style={{ color: colors.dark }}
        >
          {item.name || 'Unknown Product'}
        </Text>
        {item.category && (
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {item.category}
          </Text>
        )}
        <View className="flex-row justify-between items-center mt-1">
          <Text className="text-sm font-bold" style={{ color: colors.dark }}>
            ₹{item.sellingPrice.toFixed(2)}
          </Text>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => decreaseListQuantity(item.id)}
              disabled={item.quantity <= 0 || (selectedQuantities[item.id] || 0) <= 0}
              className="p-1"
            >
              <MinusCircle size={16} color={(item.quantity <= 0 || (selectedQuantities[item.id] || 0) <= 0) ? colors.gray : colors.danger} />
            </TouchableOpacity>
            <Input
              className="w-10 h-8 mx-2 text-center text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600"
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
              style={{ backgroundColor: colors.white, color: colors.primary }}
            />
            <TouchableOpacity
              onPress={() => increaseListQuantity(item.id, item.quantity)}
              disabled={item.quantity <= 0}
              className="p-1"
            >
              <PlusCircle size={16} color={item.quantity <= 0 ? colors.gray : colors.gray} />
            </TouchableOpacity>
          </View>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Stock: {item.quantity} {item.unit || 'piece'}
        </Text>
      </View>
    </TouchableOpacity>
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
      <Card className="mb-3 bg-white dark:bg-gray-800 shadow-md rounded-xl overflow-hidden">
        <CardHeader className="py-3 px-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              {item.imageUri ? (
                <Image
                  source={{ uri: item.imageUri }}
                  style={{ width: 48, height: 48 }}
                  className="rounded-lg mr-3"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-12 h-12 rounded-lg mr-3 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Package size={24} color={colors.primary} />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-base font-semibold" style={{ color: colors.gray }}>
                  {item.name}
                </Text>
                {item.category && (
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.category}
                  </Text>
                )}
              </View>
            </View>
            <View className="items-end">
              <Text className="text-xs text-gray-500 dark:text-gray-400">Price</Text>
              <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                ₹{item.sellingPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        </CardHeader>
        <CardContent className="py-2 px-4 border-t border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-x-1">
              <TouchableOpacity onPress={() => decreaseQuantity(item.id)} className="p-1.5">
                <MinusCircle size={18} color={item.quantityInCart <= 1 ? colors.gray : colors.danger} />
              </TouchableOpacity>
              <Input
                className="w-10 h-8 text-center text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600"
                value={item.quantityInCart.toString()}
                onChangeText={handleQuantityChange}
                keyboardType="number-pad"
                selectTextOnFocus
                maxLength={3}
                style={{ backgroundColor: colors.white, color: colors.primary }}
              />
              <TouchableOpacity
                onPress={() => increaseQuantity(item.id)}
                className="p-1.5"
                disabled={
                  (products.find((p) => p.id === item.id)?.quantity ?? 0) <= item.quantityInCart
                }
              >
                <PlusCircle
                  size={18}
                  color={
                    (products.find((p) => p.id === item.id)?.quantity ?? 0) <= item.quantityInCart
                      ? colors.gray
                      : colors.gray
                  }
                />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center gap-x-1">
              <Text className="text-sm font-bold" style={{ color: colors.green }}>
                ₹{(item.sellingPrice * item.quantityInCart).toFixed(2)}
              </Text>
              <TouchableOpacity onPress={() => removeCartItem(item.id)} className="p-1.5">
                <XCircle size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

  const handleProceedToPayment = () => {
    if (cartItems.length === 0) return;
    setIsConfirmDialogOpen(true);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: `${colors.white}1A` }}>
      <View className="flex-1 p-4 pt-2 bg-gray-100 dark:bg-gray-900">
        <View className="mb-4 flex-row items-center rounded-lg px-3 shadow-md" style={{ backgroundColor: colors.white }}>
          <Search size={20} color={colors.secondary} />
          <Input
            placeholder="Search products..."
            className="flex-1 h-12 border-0 bg-transparent ml-2 text-base font-medium"
            placeholderTextColor={colors.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ color: colors.dark }}
          />
        </View>
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.secondary} />
            <Text className="font-medium mt-2" style={{ color: colors.dark }}>Loading Products...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <AlertCircle size={40} color={colors.danger} />
            <Text className="font-semibold mt-2" style={{ color: colors.dark }}>No products found</Text>
            {products.length > 0 && searchQuery !== '' && (
              <Text className="text-center mt-1 text-sm" style={{ color: colors.gray }}>Try adjusting your search.</Text>
            )}
            {products.length === 0 && (
              <View className="items-center mt-4">
                <Text className="text-center text-sm mb-2" style={{ color: colors.gray }}>Your inventory is empty.</Text>
                <Button
                  variant="outline"
                  className="border"
                  style={{ backgroundColor: `${colors.secondary}1A` }}
                  onPress={() => router.push('/(tabs)/sale/sales-management')}
                >
                  <Text className="font-semibold" style={{ color: colors.gray }}>Add Your First Product</Text>
                </Button>
              </View>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>

      {cartItems.length > 0 && !isLoading && (
        <TouchableOpacity
          className="rounded-full shadow-lg items-center justify-center absolute bottom-8 right-8 w-16 h-16"
          style={{ backgroundColor: colors.secondary }}
          onPress={() => setIsCartOpen(true)}
          activeOpacity={0.7}
        >
          <ShoppingCart size={24} color={colors.white} />
          <View className="rounded-full items-center justify-center absolute -top-1 -right-1 min-w-6 h-6 px-1" style={{ backgroundColor: colors.danger }}>
            <Text className="text-white font-bold text-xs">
              {cartItems.reduce((sum, item) => sum + item.quantityInCart, 0)}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-11/12 mx-auto" style={{ maxHeight: '90%' }}>
          <DialogHeader className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center">
              <ShoppingCart size={24} color={colors.secondary} className="mr-2" />
              <DialogTitle className="text-xl font-bold" style={{ color: colors.gray }}>
                Current Sale
              </DialogTitle>
            </View>
          </DialogHeader>
          <View style={{ padding: 16, width: '100%' }}>
            {cartItems.length === 0 ? (
              <View className="items-center justify-center rounded-lg p-6 my-4">
                <ShoppingCart size={40} color={colors.danger} />
                <Text className="font-semibold mt-2" style={{ color: colors.dark }}>Cart is empty</Text>
                <Text className="text-xs mt-1" style={{ color: colors.gray }}>Select products to add them here</Text>
              </View>
            ) : (
              <>
                <Text className="text-base font-semibold mb-3" style={{ color: colors.dark }}>Items in Cart:</Text>
                <FlatList
                  data={cartItems}
                  renderItem={renderCartItem}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 16 }}
                />
                <View className="pt-2 px-3 h-80 w-80">
                  <View className="mb-2">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-sm" style={{ color: colors.gray }}>Subtotal:</Text>
                      <Text className="text-sm font-semibold" style={{ color: colors.dark }}>₹{subtotal.toFixed(2)}</Text>
                    </View>
                    <View className="flex-row justify-between items-center mt-2">
                      <Text className="text-base font-bold" style={{ color: colors.dark }}>Total:</Text>
                      <Text className="text-base font-bold" style={{ color: colors.green }}>₹{totalAmount.toFixed(2)}</Text>
                    </View>
                    <View className="flex-row justify-between items-center mt-2">
                      <Text className="text-xs" style={{ color: colors.gray }}>Est. Profit:</Text>
                      <Text className="text-xs font-semibold" style={{ color: colors.accent }}>₹{totalProfit.toFixed(2)}</Text>
                    </View>
                  </View>
                  <DialogFooter className="flex-row gap-x-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1 h-10 border border-gray-300 dark:border-gray-600 mt-1"
                      style={{ backgroundColor: colors.white }}
                      onPress={clearCart}
                      disabled={isProcessingSale}
                    >
                      <Text className="font-semibold text-sm" style={{ color: colors.dark }}>Clear Sale</Text>
                    </Button>
                    <Button
                      className="flex-1 h-10 mt-1"
                      style={{ backgroundColor: colors.secondary }}
                      onPress={handleProceedToPayment}
                      disabled={isProcessingSale}
                    >
                      {isProcessingSale ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Text className="font-semibold text-sm" style={{ color: colors.white }}>Proceed to Payment</Text>
                      )}
                    </Button>
                  </DialogFooter>
                </View>
              </>
            )}
          </View>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-11/12 mx-auto">
          <DialogHeader className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-xl font-bold" style={{ color: colors.gray }}>
              Confirm Sale
            </DialogTitle>
          </DialogHeader>
          <View className="p-4 h-80 w-80">
            <Text className="mb-4 text-base font-medium" style={{ color: colors.dark }}>Please confirm the following sale:</Text>
            {cartItems.map((item) => (
              <View key={item.id} className="flex-row justify-between py-1">
                <Text
                  className="text-sm font-medium"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{ flex: 1, marginRight: 8, color: colors.gray }}
                >
                  {item.name} {item.category ? `(${item.category})` : ''} × {item.quantityInCart}
                </Text>
                <Text className="text-sm font-semibold" style={{ color: colors.accent }}>
                  ₹{(item.sellingPrice * item.quantityInCart).toFixed(2)}
                </Text>
              </View>
            ))}
            <Separator className="my-2" style={{ backgroundColor: colors.gray }} />
            <View className="flex-row justify-between py-1">
              <Text className="text-lg font-bold" style={{ color: colors.dark }}>Total:</Text>
              <Text className="text-lg font-bold" style={{ color: colors.green }}>₹{totalAmount.toFixed(2)}</Text>
            </View>
          </View>
          <DialogFooter className="p-6 pt-4 flex-row justify-end gap-x-3 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              className="h-12 px-6 border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: colors.white }}
              onPress={() => setIsConfirmDialogOpen(false)}
              disabled={isProcessingSale}
            >
              <Text className="font-semibold" style={{ color: colors.dark }}>Cancel</Text>
            </Button>
            <Button
              className="h-12 px-6"
              style={{ backgroundColor: colors.secondary }}
              onPress={confirmSale}
              disabled={isProcessingSale}
            >
              {isProcessingSale ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text className="font-semibold" style={{ color: colors.white }}>Confirm Sale</Text>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isClearCartDialogOpen} onOpenChange={setIsClearCartDialogOpen}>
        <DialogContent className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-11/12 mx-auto">
          <DialogHeader className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-xl font-bold" style={{ color: colors.primary }}>
              Clear Cart
            </DialogTitle>
          </DialogHeader>
          <View className="p-4">
            <Text className="text-base font-medium" style={{ color: colors.dark }}>
              Are you sure you want to clear all items from the cart?
            </Text>
          </View>
          <DialogFooter className="p-6 pt-4 flex-row justify-end gap-x-3 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              className="h-12 px-6 border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: colors.white }}
              onPress={() => setIsClearCartDialogOpen(false)}
              disabled={isProcessingSale}
            >
              <Text className="font-semibold" style={{ color: colors.dark }}>Cancel</Text>
            </Button>
            <Button
              variant="destructive"
              className="h-12 px-6"
              style={{ backgroundColor: colors.danger }}
              onPress={confirmClearCart}
              disabled={isProcessingSale}
            >
              <Text className="font-semibold" style={{ color: colors.white }}>Clear</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  );
}