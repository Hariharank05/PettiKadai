
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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Package, PlusCircle, MinusCircle, XCircle, Search, ShoppingCart, AlertCircle, Heart } from 'lucide-react-native';
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
  border: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
  inputBackground: colorScheme === 'dark' ? '#374151' : '#f3f4f6',
});

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
  const currentUserId = useAuthStore((state) => state.userId);
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

  // Debug logging for dialog rendering
  useEffect(() => {
    if (isCartOpen) {
      console.log('Current Sale Dialog Rendered:', { isCartOpen, cartItemsLength: cartItems.length });
    }
  }, [isCartOpen, cartItems]);

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
    loadProducts().finally(() => setRefreshing(false));
  }, [loadProducts]);

  useEffect(() => {
    setIsLoading(true);
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (products.length > 0) {
      const updatedDisplayProducts = products.map((product) => {
        const itemInCart = cartItems.find((item) => item.id === product.id);
        const quantityInCart = itemInCart ? itemInCart.quantityInCart : 0;
        return {
          ...product,
          quantity: product.quantity - quantityInCart,
        };
      });
      setDisplayProducts(updatedDisplayProducts);

      const newSelectedQuantities: Record<string, number> = {};
      products.forEach(p => {
        const cartItem = cartItems.find(ci => ci.id === p.id);
        newSelectedQuantities[p.id] = cartItem ? cartItem.quantityInCart : 0;
      });
      setSelectedQuantities(newSelectedQuantities);
    } else {
      setDisplayProducts([]);
      setSelectedQuantities({});
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
    setSelectedQuantities(prev => ({ ...prev, [productId]: quantity }));
  }, []);

  const addToCart = useCallback(
    (productId: string, newTotalQuantityInCart: number) => {
      const originalProduct = products.find((p) => p.id === productId);
      if (!originalProduct) {
        console.error(`Product with ID ${productId} not found`);
        return;
      }

      let quantityToSet = newTotalQuantityInCart;

      if (quantityToSet <= 0) {
        setCartItems((prev) => prev.filter((item) => item.id !== productId));
        setSelectedQuantities((prev) => ({ ...prev, [productId]: 0 }));
        return;
      }
      
      if (quantityToSet > originalProduct.quantity) {
        Alert.alert(`Only ${originalProduct.quantity} of ${originalProduct.name} available in stock. Setting to max.`);
        quantityToSet = originalProduct.quantity;
      }

      setCartItems((prev) => {
        const existingItem = prev.find((item) => item.id === productId);
        if (existingItem) {
          return prev.map((item) =>
            item.id === productId
              ? { ...item, quantityInCart: quantityToSet }
              : item
          );
        } else {
           return [...prev, { ...originalProduct, quantityInCart: quantityToSet }];
        }
      });

      setSelectedQuantities((prev) => ({
        ...prev,
        [productId]: quantityToSet,
      }));
    },
    [products]
  );

  const increaseListQuantity = useCallback(
    (productId: string, _maxStockIgnored: number) => {
        const originalProduct = products.find((p) => p.id === productId);
        if (!originalProduct) return;

        setSelectedQuantities((prevSelected) => {
            let currentSelectedQty = prevSelected[productId] || 0;
            
            if (currentSelectedQty >= originalProduct.quantity) {
                Alert.alert(`Maximum stock for ${originalProduct.name} is ${originalProduct.quantity}.`);
                return prevSelected;
            }
            
            const newSelectedQty = currentSelectedQty + 1;
            
            setCartItems((prevCart) => {
                const existingItem = prevCart.find((item) => item.id === productId);
                if (existingItem) {
                    return prevCart.map((item) =>
                        item.id === productId ? { ...item, quantityInCart: newSelectedQty } : item
                    );
                } else {
                    return [...prevCart, { ...originalProduct, quantityInCart: newSelectedQty }];
                }
            });
            return { ...prevSelected, [productId]: newSelectedQty };
        });
    },
    [products]
);

const decreaseListQuantity = useCallback(
    (productId: string) => {
        setSelectedQuantities((prevSelected) => {
            let currentSelectedQty = prevSelected[productId] || 0;
            if (currentSelectedQty <= 0) {
                return prevSelected;
            }

            const newSelectedQty = currentSelectedQty - 1;

            setCartItems((prevCart) => {
                if (newSelectedQty === 0) {
                    return prevCart.filter((item) => item.id === productId);
                }
                return prevCart.map((item) =>
                    item.id === productId ? { ...item, quantityInCart: newSelectedQty } : item
                );
            });
            return { ...prevSelected, [productId]: newSelectedQty };
        });
    },
    []
);

  const increaseQuantity = useCallback(
    (productId: string) => {
      const originalProduct = products.find(p => p.id === productId);
      if (!originalProduct) return;

      setCartItems((prevCart) => {
        const itemIndex = prevCart.findIndex((item) => item.id === productId);
        if (itemIndex === -1) return prevCart;

        const item = prevCart[itemIndex];
        if (item.quantityInCart >= originalProduct.quantity) {
          Alert.alert(
            "Stock Limit Reached",
            `Cannot add more ${item.name || 'product'}. Max stock is ${originalProduct.quantity}.`,
            [{ text: "OK" }]
          );
          return prevCart;
        }

        const newQty = item.quantityInCart + 1;
        const updatedCart = [...prevCart];
        updatedCart[itemIndex] = { ...item, quantityInCart: newQty };
        
        setSelectedQuantities((prev) => ({ ...prev, [productId]: newQty }));
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
        const newQty = item.quantityInCart - 1;

        if (newQty <= 0) {
          const newCart = prevCart.filter((i) => i.id !== productId);
          setSelectedQuantities((prev) => ({ ...prev, [productId]: 0 }));
          if (newCart.length === 0 && prevCart.length > 0) setIsCartOpen(false);
          return newCart;
        } else {
          const updatedCart = [...prevCart];
          updatedCart[itemIndex] = { ...item, quantityInCart: newQty };
          setSelectedQuantities((prev) => ({ ...prev, [productId]: newQty }));
          return updatedCart;
        }
      });
    },
    []
  );

  const removeCartItem = useCallback(
    (productId: string) => {
      setCartItems((prevCart) => {
        const newCart = prevCart.filter((item) => item.id === productId);
        setSelectedQuantities((prev) => ({ ...prev, [productId]: 0 }));
        if (newCart.length === 0 && prevCart.length > 0) {
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
    return { subtotal: currentSubtotal, totalAmount: currentSubtotal, totalProfit: currentProfit };
  }, [cartItems]);

  const confirmSale = async () => {
    if (cartItems.length === 0) {
      console.warn("Attempted to confirm sale with empty cart.");
      return;
    }
    setIsProcessingSale(true);

    try {
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
              item.costPrice || 0,
              item.sellingPrice * item.quantityInCart,
              (item.sellingPrice - (item.costPrice || 0)) * item.quantityInCart,
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
            costPrice: item.costPrice || 0,
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
          Alert.alert('Sale Confirmed', 'Sale completed. Receipt ready for sharing.', [
            {
              text: 'OK',
              onPress: () => router.push(`/sale/receipts?saleId=${saleId}`),
            },
          ]);
        } else {
          Alert.alert('Sale Confirmed', 'Sale completed, but there was an issue generating or sharing the receipt.', [
            {
              text: 'OK',
              onPress: () => router.push(`/sale/receipts?saleId=${saleId}`),
            },
          ]);
        }
      });

      setCartItems([]);
      setSelectedQuantities({});
      setIsCartOpen(false);
      setIsConfirmDialogOpen(false);

    } catch (error) {
      console.error('Error confirming sale:', error);
      Alert.alert('Error', `Failed to confirm sale: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessingSale(false);
      loadProducts();
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const originalProduct = products.find(p => p.id === item.id);
    const totalOriginalStock = originalProduct ? originalProduct.quantity : 0;
    const currentSelectedQtyOnCard = selectedQuantities[item.id] || 0;

    return (
    <TouchableOpacity
      onPress={() => addToCart(item.id, selectedQuantities[item.id] || 0)}
      disabled={(originalProduct ? originalProduct.quantity <= 0 : true) && (selectedQuantities[item.id] || 0) === 0 || (selectedQuantities[item.id] || 0) === 0 }
      className={`w-[48%] m-1 rounded-xl overflow-hidden shadow-sm ${
        (originalProduct ? originalProduct.quantity <= 0 : true) && (selectedQuantities[item.id] || 0) === 0 ? 'opacity-50' : ''
      }`}
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
          <View className="w-full h-[120px] rounded-t-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
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
              onPress={(e) => { e.stopPropagation(); decreaseListQuantity(item.id); }}
              disabled={currentSelectedQtyOnCard <= 0}
              className="p-1"
            >
              <MinusCircle size={16} color={currentSelectedQtyOnCard <= 0 ? colors.gray : colors.danger} />
            </TouchableOpacity>
            <Input
              className="w-10 h-8 mx-2 text-center text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600"
              keyboardType="number-pad"
              value={String(currentSelectedQtyOnCard)}
              onTouchStart={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              onChangeText={(text) => {
                const op = products.find(p => p.id === item.id);
                const maxStock = op ? op.quantity : 0;
                let num = parseInt(text, 10);

                if (isNaN(num) || num < 0 || text === '') {
                  num = 0;
                }
                
                if (num > maxStock) {
                  num = maxStock;
                  Alert.alert(`Maximum quantity available is ${maxStock}`);
                }
                setSelectedQuantities((prev) => ({ ...prev, [item.id]: num }));
                if (num === 0) {
                    setCartItems(prevCart => prevCart.filter(cartItem => cartItem.id !== item.id));
                } else if (op) {
                    setCartItems((prevCart) => {
                        const existingItem = prevCart.find((ci) => ci.id === item.id);
                        if (existingItem) {
                            return prevCart.map((ci) =>
                                ci.id === item.id ? { ...ci, quantityInCart: num } : ci
                            );
                        } else {
                            return [...prevCart, { ...op, quantityInCart: num }];
                        }
                    });
                }
              }}
              editable={totalOriginalStock > 0}
              style={{ backgroundColor: colors.white, color: colors.primary }}
            />
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); increaseListQuantity(item.id, totalOriginalStock);}}
              disabled={currentSelectedQtyOnCard >= totalOriginalStock}
              className="p-1"
            >
              <PlusCircle size={16} color={currentSelectedQtyOnCard >= totalOriginalStock ? colors.gray : colors.dark} />
            </TouchableOpacity>
          </View>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Stock: {totalOriginalStock} {item.unit || 'piece'}
        </Text>
      </View>
    </TouchableOpacity>
  );
  };

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
            }
          }]
        );
        return;
      }
      updateItemQuantity(item.id, newQuantity);
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
                      : colors.secondary
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: colorScheme === 'dark' ? colors.dark : '#F3F4F6' }}>
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
                  <Text className="font-semibold" style={{ color: colors.gray}}>Add Your First Product</Text>
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} colors={[colors.secondary]} />}
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
        <DialogContent
          className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-11/12 mx-auto"
          style={{ maxHeight: '100%', minHeight: 600 }}
        >
          <DialogHeader className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center">
              <ShoppingCart size={24} color={colors.secondary} className="mr-2" />
              <DialogTitle className="text-xl font-bold" style={{ color: colors.gray }}>
                Current Sale
              </DialogTitle>
            </View>
          </DialogHeader>
          <View style={{ padding: 16, width: '100%', flex: 1 }}>
            {cartItems.length === 0 ? (
              <View className="items-center justify-center rounded-lg p-6 my-4">
                <ShoppingCart size={40} color={colors.danger} />
                <Text className="font-semibold mt-2" style={{ color: colors.dark }}>Cart is empty</Text>
                <Text className="text-xs mt-1" style={{ color: colors.gray }}>Select products to add them here</Text>
              </View>
            ) : (
              <View style={{ height: 600, width: 280 }}>
                <Text className="text-base font-semibold mt-0 mb-4" style={{ color: colors.dark }}>Items in Cart:</Text>
                <View style={{ flex: 1, maxHeight: 280 }}>
                  <FlatList
                    data={cartItems}
                    renderItem={renderCartItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={{ paddingBottom: 16 }}
                    key={cartItems.length}
                  />
                </View>
                <View style={{ paddingTop: 8, paddingHorizontal: 12, flexShrink: 0 }}>
                  <View className="mb-2">
                    <View className="flex-row justify-between items-center mt-4">
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
              </View>
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
            <Text className="mb-4 text-base font-medium" style={{ color: colors.dark }}>
              Please confirm the following sale:
            </Text>
            <ScrollView
              style={{ flexGrow: 1, maxHeight: 256 }}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingVertical: 4 }}
            >
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
            </ScrollView>
            <Separator className="my-2" style={{ backgroundColor: colors.gray }} />
            <View className="flex-row justify-between py-1">
              <Text className="text-lg font-bold" style={{ color: colors.dark }}>Total:</Text>
              <Text className="text-lg font-bold" style={{ color: colors.green }}>
                ₹{totalAmount.toFixed(2)}
              </Text>
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
