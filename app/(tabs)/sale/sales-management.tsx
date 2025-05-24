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
  useColorScheme as rnColorScheme,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Package, PlusCircle, MinusCircle, XCircle, Search, ShoppingCart, AlertCircle, UserPlus, UserCheck, Edit3 } from 'lucide-react-native';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Card, CardHeader, CardContent } from '~/components/ui/card';
import { useProductStore } from '~/lib/stores/productStore';
import { Product } from '~/lib/models/product';
import { Customer } from '~/lib/stores/types';
import { useCustomerStore } from '~/lib/stores/customerStore';
import { Separator } from '~/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog';
import { Picker } from '@react-native-picker/picker';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '~/lib/db/database';
import { CartItemForReceipt, generateAndShareReceipt, SaleDetailsForReceipt } from '~/lib/utils/receiptUtils';
import { useAuthStore } from '~/lib/stores/authStore';
import { LinearGradient } from 'expo-linear-gradient';

// Define the color palette based on theme
export const getColors = (colorScheme: 'light' | 'dark') => ({
  primary: colorScheme === 'dark' ? '#a855f7' : '#a855f7',
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
  border: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
  yellow: colorScheme === 'dark' ? '#f9c00c' : '#f9c00c',
  inputBackground: colorScheme === 'dark' ? '#374151' : '#f3f4f6',
  green: colorScheme === 'dark' ? '#4ade80' : '#22c55e',
});


interface CartItem extends Product {
  quantityInCart: number;
}

const PAYMENT_METHODS = [
  { label: 'Cash', value: 'CASH' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Credit Card', value: 'CREDIT_CARD' },
  { label: 'Debit Card', value: 'DEBIT_CARD' },
  { label: 'Credit (Khata)', value: 'CREDIT_KHATA' },
  { label: 'Other', value: 'OTHER' },
];

export default function SalesScreen() {
  const colorSchemeFromHook = rnColorScheme(); // from react-native
  const COLORS = getColors(colorSchemeFromHook || 'light');
  const router = useRouter();
  const { products, fetchProducts } = useProductStore();
  const { customers, fetchCustomers, addCustomer: addStoreCustomer } = useCustomerStore();
  const currentUserId = useAuthStore((state) => state.userId);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '' });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(PAYMENT_METHODS[0].value);

  const db = getDatabase();

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchProducts(), fetchCustomers()]);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      Alert.alert("Error", "Failed to load initial data. Please try again.", [{ text: "OK" }]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchProducts, fetchCustomers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInitialData().finally(() => setRefreshing(false));
  }, [loadInitialData]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (products.length > 0 || cartItems.length > 0) {
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

  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        (customer.phone && customer.phone.includes(customerSearchQuery))
    );
  }, [customers, customerSearchQuery]);

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
        if (cartItems.length === 1 && cartItems[0].id === productId) setIsCartOpen(false);
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
      if (quantityToSet > 0 && !isCartOpen) setIsCartOpen(true);
    },
    [products, isCartOpen, cartItems]
  );

  const increaseListQuantity = useCallback(
    (productId: string) => {
      const originalProduct = products.find((p) => p.id === productId);
      if (!originalProduct) return;

      setSelectedQuantities((prevSelected) => {
        let currentSelectedQty = prevSelected[productId] || 0;
        if (currentSelectedQty >= originalProduct.quantity) {
          Alert.alert(`Maximum stock for ${originalProduct.name} is ${originalProduct.quantity}.`);
          return prevSelected;
        }
        const newSelectedQty = currentSelectedQty + 1;
        addToCart(productId, newSelectedQty);
        return { ...prevSelected, [productId]: newSelectedQty };
      });
    },
    [products, addToCart]
  );

  const decreaseListQuantity = useCallback(
    (productId: string) => {
      setSelectedQuantities((prevSelected) => {
        let currentSelectedQty = prevSelected[productId] || 0;
        if (currentSelectedQty <= 0) return prevSelected;

        const newSelectedQty = currentSelectedQty - 1;
        addToCart(productId, newSelectedQty);
        return { ...prevSelected, [productId]: newSelectedQty };
      });
    },
    [addToCart]
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
          Alert.alert("Stock Limit Reached", `Max stock for ${item.name} is ${originalProduct.quantity}.`);
          return prevCart;
        }
        const newQty = item.quantityInCart + 1;
        setSelectedQuantities(prev => ({ ...prev, [productId]: newQty }));
        return prevCart.map(ci => ci.id === productId ? { ...ci, quantityInCart: newQty } : ci);
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
          setSelectedQuantities((prev) => ({ ...prev, [productId]: 0 }));
          const newCart = prevCart.filter((i) => i.id !== productId);
          if (newCart.length === 0) setIsCartOpen(false);
          return newCart;
        } else {
          setSelectedQuantities((prev) => ({ ...prev, [productId]: newQty }));
          return prevCart.map(ci => ci.id === productId ? { ...ci, quantityInCart: newQty } : ci);
        }
      });
    },
    []
  );

  const removeCartItem = useCallback(
    (productId: string) => {
      setCartItems((prevCart) => {
        const newCart = prevCart.filter((item) => item.id !== productId);
        setSelectedQuantities((prev) => ({ ...prev, [productId]: 0 }));
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
    setSelectedCustomer(null);
    setSelectedPaymentMethod(PAYMENT_METHODS[0].value);
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

  const handleAddNewCustomer = async () => {
    if (!newCustomerForm.name.trim() || !newCustomerForm.phone.trim()) {
      Alert.alert("Validation Error", "Customer name and phone are required.");
      return;
    }
    if (!currentUserId) {
      Alert.alert("Error", "User not authenticated to add customer.");
      return;
    }
    setIsProcessing(true);
    try {
      const newCustData = {
        name: newCustomerForm.name,
        phone: newCustomerForm.phone,
        email: newCustomerForm.email || undefined,
        creditLimit: 0
      };
      await addStoreCustomer(newCustData);
      await fetchCustomers();

      const justAddedCustomer = customers.find(c => c.phone === newCustomerForm.phone && c.name === newCustomerForm.name);

      if (justAddedCustomer) {
        setSelectedCustomer(justAddedCustomer);
      } else {
        setSelectedCustomer({
          id: 'temp-' + uuidv4(),
          userId: currentUserId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalPurchases: 0,
          outstandingBalance: 0,
          loyaltyPoints: 0,
          ...newCustomerForm,
          creditLimit: 0
        });
      }

      setNewCustomerForm({ name: '', phone: '', email: '' });
      setIsAddingNewCustomer(false);
    } catch (error) {
      Alert.alert("Error", `Failed to add customer: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmSale = async () => {
    if (cartItems.length === 0) {
      Alert.alert("Empty Cart", "Please add items to the cart before proceeding.");
      return;
    }
    if (!selectedPaymentMethod) {
      Alert.alert("Payment Method Required", "Please select a payment method.");
      return;
    }
    setIsProcessing(true);

    try {
      if (!currentUserId) {
        const errorMessage = 'User not authenticated to complete sale.';
        setIsProcessing(false);
        Alert.alert('Authentication Error', errorMessage);
        return;
      }

      const saleId = uuidv4();
      const saleTimestamp = new Date().toISOString();

      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO Sales (id, userId, customerId, timestamp, totalAmount, totalProfit, subtotal, paymentType, salesStatus, customerName, customerPhone, customerEmail)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            saleId, currentUserId, selectedCustomer?.id.startsWith('temp-') ? null : selectedCustomer?.id || null,
            saleTimestamp, totalAmount, totalProfit, subtotal, selectedPaymentMethod, 'COMPLETED',
            selectedCustomer?.name || null, selectedCustomer?.phone || null, selectedCustomer?.email || null
          ]
        );

        const saleCartItems: CartItemForReceipt[] = [];

        for (const item of cartItems) {
          const saleItemId = uuidv4();
          await db.runAsync(
            `INSERT INTO SaleItems (id, saleId, productId, quantity, unitPrice, costPrice, subtotal, profit)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              saleItemId, saleId, item.id, item.quantityInCart,
              item.sellingPrice, item.costPrice || 0,
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

        const saleDetails: SaleDetailsForReceipt = {
          saleId,
          saleTimestamp,
          totalAmount,
          cartItems: saleCartItems,
          customer: selectedCustomer ? { name: selectedCustomer.name, phone: selectedCustomer.phone, email: selectedCustomer.email } : null,
          paymentMethod: selectedPaymentMethod,
        };

        const pdfUri = await generateAndShareReceipt(saleDetails);

        if (pdfUri) {
          const receiptId = uuidv4();
          const receiptNumber = `RCPT-${saleId.substring(0, 8).toUpperCase()}`;
          await db.runAsync(
            `INSERT INTO Receipts (id, saleId, receiptNumber, format, filePath, generatedAt)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [receiptId, saleId, receiptNumber, 'PDF', pdfUri, new Date().toISOString()]
          );
          Alert.alert('Sale Confirmed', 'Sale completed. Receipt ready for sharing.', [
            { text: 'OK', onPress: () => router.push({ pathname: '/(tabs)/sale/receipts', params: { highlightSaleId: saleId } }) },
          ]);
        } else {
          Alert.alert('Sale Confirmed', 'Sale completed, but there was an issue generating or sharing the receipt.', [
            { text: 'OK', onPress: () => router.push({ pathname: '/(tabs)/sale/receipts', params: { highlightSaleId: saleId } }) },
          ]);
        }
      });

      confirmClearCart();

    } catch (error) {
      console.error('Error confirming sale:', error);
      Alert.alert('Error', `Failed to confirm sale: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
      setIsConfirmDialogOpen(false);
      loadInitialData();
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const originalProduct = products.find(p => p.id === item.id);
    const totalOriginalStock = originalProduct ? originalProduct.quantity : 0;
    const currentSelectedQtyOnCard = selectedQuantities[item.id] || 0;

    return (
      <TouchableOpacity
        onPress={() => addToCart(item.id, selectedQuantities[item.id] || 0)}
        disabled={(originalProduct ? originalProduct.quantity <= 0 : true) && (selectedQuantities[item.id] || 0) === 0}
        className={`w-[48%] m-1 rounded-xl overflow-hidden shadow-sm ${(originalProduct ? originalProduct.quantity <= 0 : true) && (selectedQuantities[item.id] || 0) === 0 ? 'opacity-50' : ''
          }`}
        style={{ backgroundColor: COLORS.white }}
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
              <Package size={32} color={COLORS.primary} />
            </View>
          )}
        </View>
        <View className="p-3">
          <Text
            className="text-sm font-semibold"
            numberOfLines={1}
            style={{ color: COLORS.dark }}
          >
            {item.name || 'Unknown Product'}
          </Text>
          {item.category && (
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {item.category}
            </Text>
          )}
          <View className="flex-row justify-between items-center mt-1">
            <Text className="text-sm font-bold" style={{ color: COLORS.dark }}>
              ₹{item.sellingPrice.toFixed(2)}
            </Text>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); decreaseListQuantity(item.id); }}
                disabled={currentSelectedQtyOnCard <= 0}
                className="p-1"
              >
                <MinusCircle size={16} color={currentSelectedQtyOnCard <= 0 ? COLORS.gray : COLORS.danger} />
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

                  if (isNaN(num) || num < 0 || text === '') num = 0;
                  if (num > maxStock) {
                    num = maxStock;
                    Alert.alert("Stock Limit", `Maximum available stock for ${op?.name} is ${maxStock}.`);
                  }
                  setSelectedQuantities((prev) => ({ ...prev, [item.id]: num }));
                  addToCart(item.id, num);
                }}
                editable={totalOriginalStock > 0}
                style={{ backgroundColor: COLORS.white, color: COLORS.primary }}
              />
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); increaseListQuantity(item.id); }}
                disabled={currentSelectedQtyOnCard >= totalOriginalStock}
                className="p-1"
              >
                <PlusCircle size={16} color={currentSelectedQtyOnCard >= totalOriginalStock ? COLORS.gray : COLORS.dark} />
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
      if (isNaN(newQuantity) || text === '') {
        updateItemQuantity(item.id, 1);
        return;
      }
      if (newQuantity === 0) {
        removeCartItem(item.id);
        return;
      }
      if (newQuantity > productInStore.quantity) {
        Alert.alert("Stock Limit Reached", `Max stock is ${productInStore.quantity}.`);
        updateItemQuantity(item.id, productInStore.quantity);
        return;
      }
      updateItemQuantity(item.id, newQuantity);
    };

    return (
      <Card className="mb-3 bg-white dark:bg-gray-800 shadow-md rounded-xl overflow-hidden">
        <CardHeader className="py-1 px-4">
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
                  <Package size={24} color={COLORS.primary} />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-base font-semibold" style={{ color: COLORS.gray }}>
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
                <MinusCircle size={18} color={item.quantityInCart <= 1 ? COLORS.gray : COLORS.danger} />
              </TouchableOpacity>
              <Input
                className="w-10 h-8 text-center text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600"
                value={item.quantityInCart.toString()}
                onChangeText={handleQuantityChange}
                keyboardType="number-pad"
                selectTextOnFocus
                maxLength={3}
                style={{ backgroundColor: COLORS.white, color: COLORS.primary }}
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
                      ? COLORS.gray
                      : COLORS.secondary
                  }
                />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center gap-x-1">
              <Text className="text-sm font-bold" style={{ color: COLORS.green }}>
                ₹{(item.sellingPrice * item.quantityInCart).toFixed(2)}
              </Text>
              <TouchableOpacity onPress={() => removeCartItem(item.id)} className="p-1.5">
                <XCircle size={18} color={COLORS.danger} />
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
    <LinearGradient colors={[COLORS.white, COLORS.yellow]} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: 'transparent' }}>
        <View className="flex-1 p-4 pt-2 bg-transparent">
          <View className="mb-4 flex-row items-center rounded-lg px-3 shadow-md" style={{ backgroundColor: COLORS.white }}>
            <Search size={20} color={COLORS.secondary} />
            <Input
              placeholder="Search products..."
              className="flex-1 h-12 border-0 bg-transparent ml-2 text-base font-medium"
              placeholderTextColor={COLORS.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ color: COLORS.dark }}
            />
          </View>
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={COLORS.secondary} />
              <Text className="font-medium mt-2" style={{ color: COLORS.dark }}>Loading Products...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <AlertCircle size={40} color={COLORS.danger} />
              <Text className="font-semibold mt-2" style={{ color: COLORS.dark }}>No products found</Text>
              {products.length > 0 && searchQuery !== '' && (
                <Text className="text-center mt-1 text-sm" style={{ color: COLORS.gray }}>Try adjusting your search.</Text>
              )}
              {products.length === 0 && (
                <View className="items-center mt-4">
                  <Text className="text-center text-sm mb-2" style={{ color: COLORS.gray }}>Your inventory is empty.</Text>
                  <Button
                    variant="outline"
                    className="border"
                    style={{ backgroundColor: `${COLORS.primary}` }}
                    onPress={() => router.push('/(tabs)/inventory/products')}
                  >
                    <Text className="font-semibold" style={{ color: COLORS.white }}>Add Your First Product</Text>
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
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} colors={[COLORS.secondary]} />}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>

        {cartItems.length > 0 && !isLoading && (
          <TouchableOpacity
            className="rounded-full shadow-lg items-center justify-center absolute bottom-8 right-8 w-16 h-16"
            style={{ backgroundColor: COLORS.secondary }}
            onPress={() => setIsCartOpen(true)}
            activeOpacity={0.7}
          >
            <ShoppingCart size={24} color={COLORS.white} />
            <View className="rounded-full items-center justify-center absolute -top-1 -right-1 min-w-6 h-6 px-1" style={{ backgroundColor: COLORS.danger }}>
              <Text className="text-white font-bold text-xs">
                {cartItems.reduce((sum, item) => sum + item.quantityInCart, 0)}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
          <DialogContent
            className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-11/12 mx-auto"
            style={{ maxHeight: '100%', minHeight: 720 }}
          >
            <DialogHeader className="p-6 pb-1 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center">
                <ShoppingCart size={24} color={COLORS.secondary} className="mr-2" />
                <DialogTitle className="text-xl font-bold" style={{ color: COLORS.gray }}>
                  Current Sale
                </DialogTitle>
              </View>
            </DialogHeader>
            <View style={{ padding: 16, width: '100%', flex: 1 }}>
              {cartItems.length === 0 ? (
                <View className="items-center justify-center rounded-lg p-6 my-4">
                  <ShoppingCart size={40} color={COLORS.danger} />
                  <Text className="font-semibold mt-2" style={{ color: COLORS.dark }}>Cart is empty</Text>
                  <Text className="text-xs mt-1" style={{ color: COLORS.gray }}>Select products to add them here</Text>
                </View>
              ) : (
                <View style={{ flex: 1, width: 320 }}>
                  {/* Customer Section */}
                  <View className="mb-3 border-b" style={{ borderColor: COLORS.border }}>
                    <Text className="text-sm font-medium mb-1" style={{ color: COLORS.gray }}>Customer</Text>
                    {selectedCustomer ? (
                      <View className="flex-row justify-between items-center p-2 rounded-md" style={{ backgroundColor: COLORS.inputBackground }}>
                        <View>
                          <Text className="text-base font-semibold" style={{ color: COLORS.dark }}>{selectedCustomer.name}</Text>
                          {selectedCustomer.phone && <Text className="text-xs" style={{ color: COLORS.gray }}>{selectedCustomer.phone}</Text>}
                        </View>
                        <Button variant="ghost" size="sm" onPress={() => setIsCustomerModalOpen(true)}>
                          <Edit3 size={16} color={COLORS.primary} />
                        </Button>
                      </View>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full h-10 justify-start px-3 border"
                        style={{ borderColor: COLORS.border, backgroundColor: COLORS.primary }}
                        onPress={() => setIsCustomerModalOpen(true)}
                      >
                        <View className="flex-row justify-between items-center">
                          <UserPlus size={18} color={COLORS.white} className='mr-3' />
                          <Text style={{ color: COLORS.white }}>Add / Select Customer</Text>
                        </View>
                      </Button>
                    )}
                  </View>
                  {/* Cart Items */}
                  <Text className="text-base font-semibold mt-0 mb-4" style={{ color: COLORS.dark }}>Items in Cart:</Text>
                  <View style={{ flex: 1, minHeight: cartItems.length === 0 ? 100 : 80, maxHeight: 400 }}>
                    <FlatList
                      data={cartItems}
                      renderItem={renderCartItem}
                      keyExtractor={(item) => item.id}
                      showsVerticalScrollIndicator={true}
                      contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
                      key={cartItems.length}
                    />
                  </View>
                  {/* Payment Method and Totals */}
                  <View style={{ paddingTop: 2, paddingHorizontal: 12 }}>
                    <View className="mb-3">
                      <Text className="text-sm font-medium mb-1" style={{ color: COLORS.gray }}>Payment Method</Text>
                      <View className="rounded-md border" style={{ borderColor: COLORS.border, backgroundColor: COLORS.inputBackground, width: '100%' }}>
                        <Picker
                          selectedValue={selectedPaymentMethod}
                          onValueChange={(itemValue) => setSelectedPaymentMethod(itemValue)}
                          style={{ height: Platform.OS === 'ios' ? 120 : 44, color: COLORS.dark, width: '100%', paddingHorizontal: 8 }}
                          itemStyle={{ color: COLORS.dark, fontSize: 14, paddingHorizontal: 8 }}
                        >
                          {PAYMENT_METHODS.map(method => (
                            <Picker.Item key={method.value} label={method.label} value={method.value} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                    <View className="mb-2">
                      <View className="flex-row justify-between items-center mt-4">
                        <Text className="text-sm" style={{ color: COLORS.gray }}>Subtotal:</Text>
                        <Text className="text-sm font-semibold" style={{ color: COLORS.dark }}>₹{subtotal.toFixed(2)}</Text>
                      </View>
                      <View className="flex-row justify-between items-center mt-2">
                        <Text className="text-base font-bold" style={{ color: COLORS.dark }}>Total:</Text>
                        <Text className="text-base font-bold" style={{ color: COLORS.green }}>₹{totalAmount.toFixed(2)}</Text>
                      </View>
                      <View className="flex-row justify-between items-center mt-2">
                        <Text className="text-xs" style={{ color: COLORS.gray }}>Est. Profit:</Text>
                        <Text className="text-xs font-semibold" style={{ color: COLORS.accent }}>₹{totalProfit.toFixed(2)}</Text>
                      </View>
                    </View>
                    <DialogFooter className="flex-row gap-x-2 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1 h-10 border border-gray-300 dark:border-gray-600 mt-1"
                        style={{ backgroundColor: COLORS.white }}
                        onPress={clearCart}
                        disabled={isProcessing}
                      >
                        <Text className="font-semibold text-sm" style={{ color: COLORS.dark }}>Clear Sale</Text>
                      </Button>
                      <Button
                        className="flex-1 h-10 mt-1"
                        style={{ backgroundColor: COLORS.primary }}
                        onPress={handleProceedToPayment}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                          <Text className="font-semibold text-sm" style={{ color: COLORS.white }}>Proceed to Payment</Text>
                        )}
                      </Button>
                    </DialogFooter>
                  </View>
                </View>
              )}
            </View>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isCustomerModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsAddingNewCustomer(false);
              setNewCustomerForm({ name: '', phone: '', email: '' });
              setCustomerSearchQuery('');
            }
            setIsCustomerModalOpen(open);
          }}
        >
          <DialogContent
            className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-xl w-11/12 mx-auto"
            style={{ maxHeight: '90%', minHeight: 600 }}
          >
            <DialogHeader className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center justify-between">
                <DialogTitle className="text-lg font-bold" style={{ color: COLORS.gray }}>
                  {isAddingNewCustomer ? 'Add New Customer' : 'Select Customer'}
                </DialogTitle>
              </View>
            </DialogHeader>
            <View className="p-4 h-80 w-80">
              {isAddingNewCustomer ? (
                <View>
                  <Input
                    placeholder="Customer Name*"
                    value={newCustomerForm.name}
                    onChangeText={(text) => setNewCustomerForm((prev) => ({ ...prev, name: text }))}
                    className="mb-3 h-11 border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: COLORS.inputBackground, color: COLORS.dark }}
                    placeholderTextColor={COLORS.gray}
                  />
                  <Input
                    placeholder="Phone Number*"
                    value={newCustomerForm.phone}
                    onChangeText={(text) => setNewCustomerForm((prev) => ({ ...prev, phone: text }))}
                    keyboardType="phone-pad"
                    className="mb-3 h-11 border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: COLORS.inputBackground, color: COLORS.dark }}
                    placeholderTextColor={COLORS.gray}
                  />
                  <Input
                    placeholder="Email (Optional)"
                    value={newCustomerForm.email}
                    onChangeText={(text) => setNewCustomerForm((prev) => ({ ...prev, email: text }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="mb-4 h-11 border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: COLORS.inputBackground, color: COLORS.dark }}
                    placeholderTextColor={COLORS.gray}
                  />
                  <View className="flex-row justify-end gap-x-2">
                    <Button variant="ghost" onPress={() => setIsAddingNewCustomer(false)}>
                      <Text style={{ color: COLORS.gray }}>Cancel</Text>
                    </Button>
                    <Button
                      onPress={handleAddNewCustomer}
                      disabled={isProcessing}
                      style={{ backgroundColor: COLORS.secondary }}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color={COLORS.white} size="small" />
                      ) : (
                        <Text className="text-white">Save Customer</Text>
                      )}
                    </Button>
                  </View>
                </View>
              ) : (
                <View style={{ flex: 1, minHeight: 500 }}>
                  <View
                    className="mb-5 flex-row items-center rounded-md px-3 border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: COLORS.inputBackground }}
                  >
                    <Search size={18} color={COLORS.gray} />
                    <Input
                      placeholder="Search by name or phone..."
                      value={customerSearchQuery}
                      onChangeText={setCustomerSearchQuery}
                      className="flex-1 h-10 border-0 bg-transparent ml-2 text-sm"
                      style={{ color: COLORS.dark }}
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                  <FlatList
                    data={filteredCustomers}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        className="py-3 px-2 border-b border-gray-200 dark:border-gray-700"
                        onPress={() => {
                          setSelectedCustomer(item);
                          setIsCustomerModalOpen(false);
                          setCustomerSearchQuery('');
                        }}
                      >
                        <Text className="text-base font-medium" style={{ color: COLORS.dark }}>
                          {item.name}
                        </Text>
                        <Text className="text-xs" style={{ color: COLORS.gray }}>
                          {item.phone}
                        </Text>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <View className="items-center py-4">
                        <Text style={{ color: COLORS.gray }}>No customers found.</Text>
                      </View>
                    }
                    style={{ flex: 1 }}
                  />
                  <Button
                    variant="outline"
                    className="mt-4 h-10 border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: COLORS.primary }}
                    onPress={() => setIsAddingNewCustomer(true)}
                  >
                    <View className='text-center justify-between flex-row items-center'>
                      <UserPlus size={18} color={COLORS.white} className="mr-2" />
                      <Text style={{ color: COLORS.white }}>Add New Customer</Text>
                    </View>
                  </Button>
                </View>
              )}
            </View>
          </DialogContent>
        </Dialog>

        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-11/12 mx-auto">
            <DialogHeader className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-xl font-bold" style={{ color: COLORS.gray }}>
                Confirm Sale
              </DialogTitle>
            </DialogHeader>
            <View className="p-4 h-80 w-80">
              <Text className="mb-4 text-base font-medium" style={{ color: COLORS.dark }}>
                Please confirm the following sale:
              </Text>
              {selectedCustomer && (
                <View className="mb-2 p-2 rounded-md" style={{ backgroundColor: COLORS.inputBackground }}>
                  <Text className="text-sm font-semibold" style={{ color: COLORS.dark }}>Customer: {selectedCustomer.name}</Text>
                  {selectedCustomer.phone && <Text className="text-xs" style={{ color: COLORS.gray }}>{selectedCustomer.phone}</Text>}
                </View>
              )}
              <Text className="text-sm font-medium mb-2" style={{ color: COLORS.dark }}>
                Payment Method: <Text className="font-semibold">{PAYMENT_METHODS.find(p => p.value === selectedPaymentMethod)?.label || selectedPaymentMethod}</Text>
              </Text>
              <ScrollView
                style={{ flexGrow: 1, maxHeight: 200 }}
                showsVerticalScrollIndicator={true}
              >
                {cartItems.map((item) => (
                  <View key={item.id} className="flex-row justify-between py-1">
                    <Text
                      className="text-sm font-medium"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{ flex: 1, marginRight: 8, color: COLORS.gray }}
                    >
                      {item.name} {item.category ? `(${item.category})` : ''} × {item.quantityInCart}
                    </Text>
                    <Text className="text-sm font-semibold" style={{ color: COLORS.accent }}>
                      ₹{(item.sellingPrice * item.quantityInCart).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <Separator className="my-2" style={{ backgroundColor: COLORS.gray }} />
              <View className="flex-row justify-between py-1">
                <Text className="text-lg font-bold" style={{ color: COLORS.dark }}>Total:</Text>
                <Text className="text-lg font-bold" style={{ color: COLORS.green }}>
                  ₹{totalAmount.toFixed(2)}
                </Text>
              </View>
            </View>
            <DialogFooter className="p-6 pt-4 flex-row justify-end gap-x-3 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                className="h-12 px-6 border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: COLORS.white }}
                onPress={() => setIsConfirmDialogOpen(false)}
                disabled={isProcessing}
              >
                <Text className="font-semibold" style={{ color: COLORS.dark }}>Cancel</Text>
              </Button>
              <Button
                className="h-12 px-6"
                style={{ backgroundColor: COLORS.primary }}
                onPress={confirmSale}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text className="font-semibold" style={{ color: COLORS.white }}>Confirm Sale</Text>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isClearCartDialogOpen} onOpenChange={setIsClearCartDialogOpen}>
          <DialogContent className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[90%] max-w-sm mx-auto">
            <DialogHeader className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-xl font-bold" style={{ color: COLORS.primary }}>
                Clear Cart
              </DialogTitle>
            </DialogHeader>
            <View className="p-4">
              <Text className="text-base font-medium" style={{ color: COLORS.dark }}>
                Are you sure you want to clear all items from the cart? This will also remove any selected customer.
              </Text>
            </View>
            <DialogFooter className="p-4 pt-2 flex-row justify-end gap-x-3 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                className="h-12 px-5 border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: COLORS.white }}
                onPress={() => setIsClearCartDialogOpen(false)}
                disabled={isProcessing}
              >
                <Text className="font-semibold" style={{ color: COLORS.dark }}>Cancel</Text>
              </Button>
              <Button
                variant="destructive"
                className="h-12 px-5"
                style={{ backgroundColor: COLORS.danger }}
                onPress={confirmClearCart}
                disabled={isProcessing}
              >
                <Text className="font-semibold" style={{ color: COLORS.white }}>Clear</Text>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </SafeAreaView>
    </LinearGradient>
  );
}