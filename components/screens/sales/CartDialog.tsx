import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Platform,
  Alert,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ShoppingCart,
  Package,
  MinusCircle,
  PlusCircle,
  XCircle,
  Edit3,
  UserPlus,
  Search,
} from 'lucide-react-native';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog';
import { useCartStore } from '~/lib/stores/cartStore';
import { useProductStore } from '~/lib/stores/productStore';
import { useCustomerStore } from '~/lib/stores/customerStore';
import { Text as UIText } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardHeader, CardContent } from '~/components/ui/card';
import { Picker } from '@react-native-picker/picker';
import { getDatabase } from '~/lib/db/database';
import {
  generateAndShareReceipt,
  CartItemForReceipt,
  SaleDetailsForReceipt,
} from '~/lib/utils/receiptUtils';
import { v4 as uuidv4 } from 'uuid';
import { Separator } from '~/components/ui/separator';
import { getColors } from '~/app/(tabs)/sale';
import { useColorScheme as rnColorScheme } from 'react-native';
import { useAuthStore } from '~/lib/stores/authStore';
import debounce from 'lodash/debounce';

interface CartItem {
  id: string;
  name: string;
  sellingPrice: number;
  costPrice?: number;
  quantityInCart: number;
  imageUri?: string;
  category?: string;
}

const PAYMENT_METHODS = [
  { label: 'Cash', value: 'CASH' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Credit Card', value: 'CREDIT_CARD' },
  { label: 'Debit Card', value: 'DEBIT_CARD' },
  { label: 'Credit ', value: 'CREDIT_KHATA' },
  { label: 'Other', value: 'OTHER' },
];

interface DebouncedInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  className?: string;
  placeholderTextColor?: string;
  style?: any;
}

const DebouncedInput = React.memo(
  ({
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    className = '',
    placeholderTextColor,
    style,
  }: DebouncedInputProps) => {
    const [localValue, setLocalValue] = useState(value);

    const debouncedUpdate = useMemo(
      () => debounce(onChangeText, 300),
      [onChangeText]
    );

    useEffect(() => {
      if (localValue !== value) {
        setLocalValue(value);
      }
    }, [value]);

    const handleTextChange = (text: string) => {
      setLocalValue(text);
      debouncedUpdate(text);
    };

    return (
      <Input
        value={localValue}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        className={`h-11 border border-gray-300 dark:border-gray-600 ${className}`}
        style={style}
        placeholderTextColor={placeholderTextColor}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.placeholder === nextProps.placeholder &&
      prevProps.keyboardType === nextProps.keyboardType &&
      prevProps.autoCapitalize === nextProps.autoCapitalize &&
      prevProps.className === nextProps.className &&
      prevProps.placeholderTextColor === nextProps.placeholderTextColor &&
      prevProps.style === nextProps.style
    );
  }
);
DebouncedInput.displayName = 'DebouncedInput';

export default function CartDialog() {
  const router = useRouter();
  const colorSchemeFromHook = rnColorScheme();
  const COLORS = getColors(colorSchemeFromHook || 'light');
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    increaseQuantity,
    decreaseQuantity,
    removeCartItem,
    clearCart,
  } = useCartStore();
  const { products, fetchProducts } = useProductStore();
  const {
    selectedCustomer,
    selectedPaymentMethod,
    setSelectedCustomer,
    setSelectedPaymentMethod,
    customers,
    fetchCustomers,
    addCustomer,
  } = useCustomerStore();
  const currentUserId = useAuthStore((state) => state.userId);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '' });

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
    return {
      subtotal: currentSubtotal,
      totalAmount: currentSubtotal,
      totalProfit: currentProfit,
    };
  }, [cartItems]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        (customer.phone && customer.phone.includes(customerSearchQuery))
    );
  }, [customers, customerSearchQuery]);

  const handleAddNewCustomer = async () => {
    if (!newCustomerForm.name.trim() || !newCustomerForm.phone.trim()) {
      Alert.alert('Validation Error', 'Customer name and phone are required.');
      return;
    }
    if (!currentUserId) {
      Alert.alert('Error', 'User not authenticated to add customer.');
      return;
    }
    setIsProcessing(true);
    try {
      const newCustData = {
        name: newCustomerForm.name,
        phone: newCustomerForm.phone,
        email: newCustomerForm.email || undefined,
        creditLimit: 0,
      };
      await addCustomer(newCustData);
      await fetchCustomers();

      const justAddedCustomer = customers.find(
        (c) => c.phone === newCustomerForm.phone && c.name === newCustomerForm.name
      );

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
          creditLimit: 0,
        });
      }

      setNewCustomerForm({ name: '', phone: '', email: '' });
      setIsAddingNewCustomer(false);
      setIsCustomerModalOpen(false);
      setCustomerSearchQuery('');
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to add customer: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmSale = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to the cart before proceeding.');
      return;
    }
    if (!selectedPaymentMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method.');
      return;
    }
    setIsProcessing(true);

    try {
      if (!currentUserId) {
        Alert.alert('Authentication Error', 'User not authenticated to complete sale.');
        return;
      }

      const db = getDatabase();
      const saleId = uuidv4();
      const saleTimestamp = new Date().toISOString();

      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO Sales (id, userId, customerId, timestamp, totalAmount, totalProfit, subtotal, paymentType, salesStatus, customerName, customerPhone, customerEmail)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            saleId,
            currentUserId,
            selectedCustomer?.id.startsWith('temp-') ? null : selectedCustomer?.id || null,
            saleTimestamp,
            totalAmount,
            totalProfit,
            subtotal,
            selectedPaymentMethod,
            'COMPLETED',
            selectedCustomer?.name || null,
            selectedCustomer?.phone || null,
            selectedCustomer?.email || null,
          ]
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
            category: item.category,
          });
        }

        const saleDetails: SaleDetailsForReceipt = {
          saleId,
          saleTimestamp,
          totalAmount,
          cartItems: saleCartItems,
          customer: selectedCustomer
            ? {
              name: selectedCustomer.name,
              phone: selectedCustomer.phone,
              email: selectedCustomer.email,
            }
            : null,
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
            {
              text: 'OK',
              onPress: () =>
                router.push({
                  pathname: '/(tabs)/sale/receipts',
                  params: { highlightSaleId: saleId },
                }),
            },
          ]);
        } else {
          Alert.alert('Sale Confirmed', 'Sale completed, but there was an issue generating or sharing the receipt.', [
            {
              text: 'OK',
              onPress: () =>
                router.push({
                  pathname: '/(tabs)/sale/receipts',
                  params: { highlightSaleId: saleId },
                }),
            },
          ]);
        }
      });

      clearCart();
      setSelectedCustomer(null);
      setSelectedPaymentMethod(PAYMENT_METHODS[0].value);
      await fetchProducts();
    } catch (error) {
      console.error('Error confirming sale:', error);
      Alert.alert(
        'Error',
        `Failed to confirm sale: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsProcessing(false);
      setIsConfirmDialogOpen(false);
    }
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
        increaseQuantity(item.id);
        return;
      }
      if (newQuantity === 0) {
        removeCartItem(item.id);
        return;
      }
      if (newQuantity > productInStore.quantity) {
        Alert.alert('Stock Limit Reached', `Max stock is ${productInStore.quantity}.`);
        useCartStore.getState().addToCart(productInStore, productInStore.quantity);
        return;
      }
      useCartStore.getState().addToCart(productInStore, newQuantity);
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
                <View className="w-12 h-12 rounded-lg mr-3 items-center justify-center">
                  <Package size={24} color={COLORS.primary} />
                </View>
              )}
              <View className="flex-1">
                <UIText className="text-base font-semibold" style={{ color: COLORS.gray }}>
                  {item.name}
                </UIText>
                {item.category && (
                  <UIText className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.category}
                  </UIText>
                )}
              </View>
            </View>
            <View className="items-end">
              <UIText className="text-xs text-gray-500 dark:text-gray-400">Price</UIText>
              <UIText className="text-sm font-medium text-gray-900 dark:text-gray-100">
                ₹{item.sellingPrice.toFixed(2)}
              </UIText>
            </View>
          </View>
        </CardHeader>
        <CardContent className="py-2 px-4 border-t border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-x-1">
              <TouchableOpacity onPress={() => decreaseQuantity(item.id)} className="p-1.5">
                <MinusCircle
                  size={18}
                  color={item.quantityInCart <= 1 ? COLORS.gray : COLORS.danger}
                />
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
                  (products.find((p) => p.id === item.id)?.quantity ?? 0) <=
                  item.quantityInCart
                }
              >
                <PlusCircle
                  size={18}
                  color={
                    (products.find((p) => p.id === item.id)?.quantity ?? 0) <=
                      item.quantityInCart
                      ? COLORS.gray
                      : COLORS.yellow
                  }
                />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center gap-x-1">
              <UIText className="text-sm font-bold" style={{ color: COLORS.primary }}>
                ₹{(item.quantityInCart * item.sellingPrice).toFixed(2)}
              </UIText>
              <TouchableOpacity onPress={() => removeCartItem(item.id)} className="p-1.5">
                <XCircle size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {cartItems.length > 0 && (
        <TouchableOpacity
          className="rounded-full shadow-lg items-center justify-center absolute bottom-24 right-8 w-16 h-16"
          style={{ backgroundColor: COLORS.primary }}
          onPress={() => setIsCartOpen(true)}
          activeOpacity={0.7}
        >
          <ShoppingCart size={24} color={COLORS.white} />
          <View className="rounded-full items-center justify-center absolute -top-1 -right-0 min-w-6 h-6 px-1" style={{ backgroundColor: COLORS.danger }}>
            <UIText className="text-white font-bold text-xs">
              {cartItems.reduce((sum, item) => sum + item.quantityInCart, 0)}
            </UIText>
          </View>
        </TouchableOpacity>
      )}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent
          className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-10/12 max-w-lg mx-auto"
          style={{ maxHeight: '90%', minHeight: 640 }}
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
                <UIText className="font-semibold mt-2" style={{ color: COLORS.dark }}>
                  Cart is empty
                </UIText>
                <UIText className="text-xs mt-1" style={{ color: COLORS.gray }}>
                  Select products to add them here
                </UIText>
              </View>
            ) : (
              <View style={{ flex: 1, width: 320 }}>
                <View className="mb-3 border-b" style={{ borderColor: COLORS.border }}>
                  <UIText className="text-sm font-medium mb-1" style={{ color: COLORS.gray }}>
                    Customer
                  </UIText>
                  {selectedCustomer ? (
                    <View className="flex-row justify-between items-center p-2 rounded-md" style={{ backgroundColor: COLORS.white }}>
                      <View>
                        <UIText
                          className="text-base font-semibold"
                          style={{ color: COLORS.dark }}
                        >
                          {selectedCustomer.name}
                        </UIText>
                        {selectedCustomer.phone && (
                          <UIText className="text-xs" style={{ color: COLORS.gray }}>
                            {selectedCustomer.phone}
                          </UIText>
                        )}
                      </View>
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => setIsCustomerModalOpen(true)}
                      >
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
                        <UserPlus size={18} color={COLORS.white} className="mr-3" />
                        <UIText style={{ color: COLORS.white }}>
                          Add / Select Customer
                        </UIText>
                      </View>
                    </Button>
                  )}
                </View>
                <UIText
                  className="text-base font-semibold mt-0 mb-4"
                  style={{ color: COLORS.dark }}
                >
                  Items in Cart:
                </UIText>
                <FlatList
                  data={cartItems}
                  renderItem={renderCartItem}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
                  style={{ flex: 1, maxHeight: 400 }}
                  key={cartItems.length}
                />
                <View style={{ paddingTop: 2, paddingHorizontal: 12 }}>
                  <View className="mb-3">
                    <UIText
                      className="text-sm font-medium mb-1"
                      style={{ color: COLORS.gray }}
                    >
                      Payment Method
                    </UIText>
                    <View
                      className="rounded-md border"
                      style={{ borderColor: COLORS.border, backgroundColor: COLORS.white, width: '100%' }}
                    >
                      <Picker
                        selectedValue={selectedPaymentMethod}
                        onValueChange={(itemValue) => setSelectedPaymentMethod(itemValue)}
                        style={{
                          height: Platform.OS === 'ios' ? 120 : 55,
                          color: COLORS.dark,
                          width: '100%',
                          paddingHorizontal: 8,
                        }}
                        itemStyle={{ color: COLORS.dark, fontSize: 14, paddingHorizontal: 8 }}
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <Picker.Item
                            key={method.value}
                            label={method.label}
                            value={method.value}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                  <View className="mb-2">
                    <View className="flex-row justify-between items-center mt-4">
                      <UIText className="text-sm" style={{ color: COLORS.gray }}>
                        Subtotal:
                      </UIText>
                      <UIText
                        className="text-sm font-semibold"
                        style={{ color: COLORS.dark }}
                      >
                        ₹{subtotal.toFixed(2)}
                      </UIText>
                    </View>
                    <View className="flex-row justify-between items-center mt-2">
                      <UIText
                        className="text-base font-bold"
                        style={{ color: COLORS.dark }}
                      >
                        Total:
                      </UIText>
                      <UIText
                        className="text-base font-bold"
                        style={{ color: COLORS.primary }}
                      >
                        ₹{totalAmount.toFixed(2)}
                      </UIText>
                    </View>
                    <View className="flex-row justify-between items-center mt-2">
                      <UIText className="text-xs" style={{ color: COLORS.gray }}>
                        Est. Profit:
                      </UIText>
                      <UIText
                        className="text-xs font-semibold"
                        style={{ color: COLORS.accent }}
                      >
                        ₹{totalProfit.toFixed(2)}
                      </UIText>
                    </View>
                  </View>
                  <DialogFooter className="flex-row gap-x-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1 h-10 border border-gray-300 dark:border-gray-600 mt-1"
                      style={{ backgroundColor: COLORS.white }}
                      onPress={() => setIsClearCartDialogOpen(true)}
                      disabled={isProcessing}
                    >
                      <UIText
                        className="font-semibold text-sm"
                        style={{ color: COLORS.dark }}
                      >
                        Clear Sale
                      </UIText>
                    </Button>
                    <Button
                      className="flex-1 h-10 mt-1"
                      style={{ backgroundColor: COLORS.primary }}
                      onPress={() => setIsConfirmDialogOpen(true)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <UIText
                          className="font-semibold text-sm"
                          style={{ color: COLORS.white }}
                        >
                          Proceed to Payment
                        </UIText>
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
            <DialogTitle className="text-xl font-bold" style={{ color: COLORS.gray }}>
              Confirm Sale
            </DialogTitle>
          </DialogHeader>
          <View className="p-4 h-80 w-80">
            <UIText className="mb-4 text-base font-medium" style={{ color: COLORS.dark }}>
              Please confirm the following sale:
            </UIText>
            {selectedCustomer && (
              <View className="mb-2 p-2 rounded-md" style={{ backgroundColor: COLORS.white }}>
                <UIText
                  className="text-sm font-semibold"
                  style={{ color: COLORS.dark }}
                >
                  Customer: {selectedCustomer.name}
                </UIText>
                {selectedCustomer.phone && (
                  <UIText className="text-xs" style={{ color: COLORS.gray }}>
                    {selectedCustomer.phone}
                  </UIText>
                )}
              </View>
            )}
            <UIText className="text-sm font-medium mb-2" style={{ color: COLORS.dark }}>
              Payment Method:{' '}
              <UIText className="font-semibold">
                {PAYMENT_METHODS.find((p) => p.value === selectedPaymentMethod)?.label ||
                  selectedPaymentMethod}
              </UIText>
            </UIText>
            <FlatList
              data={cartItems}
              renderItem={({ item }) => (
                <View className="flex-row justify-between py-1">
                  <UIText
                    className="text-sm font-medium"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ flex: 1, marginRight: 8, color: COLORS.gray }}
                  >
                    {item.name} {item.category ? `(${item.category})` : ''} ×{' '}
                    {item.quantityInCart}
                  </UIText>
                  <UIText
                    className="text-sm font-semibold"
                    style={{ color: COLORS.accent }}
                  >
                    ₹{(item.sellingPrice * item.quantityInCart).toFixed(2)}
                  </UIText>
                </View>
              )}
              keyExtractor={(item) => item.id}
              style={{ flexGrow: 1, maxHeight: 200 }}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 8 }}
            />
            <Separator className="my-2" style={{ backgroundColor: COLORS.gray }} />
            <View className="flex-row justify-between py-1">
              <UIText className="text-lg font-bold" style={{ color: COLORS.dark }}>
                Total:
              </UIText>
              <UIText
                className="text-lg font-bold"
                style={{ color: COLORS.primary }}
              >
                ₹{totalAmount.toFixed(2)}
              </UIText>
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
              <UIText className="font-semibold" style={{ color: COLORS.dark }}>
                Cancel
              </UIText>
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
                <UIText className="font-semibold" style={{ color: COLORS.white }}>
                  Confirm Sale
                </UIText>
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
            <UIText className="text-base font-medium" style={{ color: COLORS.dark }}>
              Are you sure you want to clear all items from the cart? This will also remove any selected customer.
            </UIText>
          </View>
          <DialogFooter className="p-4 pt-2 flex-row justify-end gap-x-3 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              className="h-12 px-5 border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: COLORS.white }}
              onPress={() => setIsClearCartDialogOpen(false)}
              disabled={isProcessing}
            >
              <UIText className="font-semibold" style={{ color: COLORS.dark }}>
                Cancel
              </UIText>
            </Button>
            <Button
              variant="destructive"
              className="h-12 px-5"
              style={{ backgroundColor: COLORS.danger }}
              onPress={() => {
                clearCart();
                setSelectedCustomer(null);
                setSelectedPaymentMethod(PAYMENT_METHODS[0].value);
                setIsClearCartDialogOpen(false);
              }}
              disabled={isProcessing}
            >
              <UIText className="font-semibold" style={{ color: COLORS.white }}>
                Clear
              </UIText>
            </Button>
          </DialogFooter>
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
                <DebouncedInput
                  placeholder="Customer Name*"
                  value={newCustomerForm.name}
                  onChangeText={(text) => setNewCustomerForm((prev) => ({ ...prev, name: text }))}
                  style={{ backgroundColor: COLORS.white, color: COLORS.dark }}
                  placeholderTextColor={COLORS.gray}
                  className="mb-3"
                />
                <DebouncedInput
                  placeholder="Phone Number*"
                  value={newCustomerForm.phone}
                  onChangeText={(text) => setNewCustomerForm((prev) => ({ ...prev, phone: text }))}
                  keyboardType="phone-pad"
                  style={{ backgroundColor: COLORS.white, color: COLORS.dark }}
                  placeholderTextColor={COLORS.gray}
                  className="mb-3"
                />
                <DebouncedInput
                  placeholder="Email (Optional)"
                  value={newCustomerForm.email}
                  onChangeText={(text) => setNewCustomerForm((prev) => ({ ...prev, email: text }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{ backgroundColor: COLORS.white, color: COLORS.dark }}
                  placeholderTextColor={COLORS.gray}
                  className="mb-4"
                />
                <View className="flex-row justify-end gap-x-2">
                  <Button variant="ghost" onPress={() => setIsAddingNewCustomer(false)}>
                    <UIText style={{ color: COLORS.gray }}>Cancel</UIText>
                  </Button>
                  <Button
                    onPress={handleAddNewCustomer}
                    disabled={isProcessing}
                    style={{ backgroundColor: COLORS.primary}}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <UIText className="text-white">Save Customer</UIText>
                    )}
                  </Button>
                </View>
              </View>
            ) : (
              <View style={{ flex: 1, minHeight: 500 }}>
                <View
                  className="mb-5 flex-row items-center rounded-md px-3 border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: COLORS.white }}
                >
                  <Search size={18} color={COLORS.gray} />
                  <DebouncedInput
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
                      <UIText className="text-base font-medium" style={{ color: COLORS.dark }}>
                        {item.name}
                      </UIText>
                      <UIText className="text-xs" style={{ color: COLORS.gray }}>
                        {item.phone}
                      </UIText>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View className="items-center py-4">
                      <UIText style={{ color: COLORS.gray }}>No customers found.</UIText>
                    </View>
                  }
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
                  style={{ flex: 1 }}
                />
                <Button
                  variant="outline"
                  className="mt-4 h-10 border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: COLORS.primary }}
                  onPress={() => setIsAddingNewCustomer(true)}
                >
                  <View className="flex-row items-center">
                    <UserPlus size={18} color={COLORS.white} className="mr-2" />
                    <UIText style={{ color: COLORS.white }}>Add New Customer</UIText>
                  </View>
                </Button>
              </View>
            )}
          </View>
        </DialogContent>
      </Dialog>
    </>
  );
}