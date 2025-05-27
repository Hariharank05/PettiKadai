import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
  // Alert, // We'll replace Alert with toast
} from 'react-native';
import { useRouter } from 'expo-router';
import { Package, PlusCircle, MinusCircle, Search, UserPlus, Edit3, AlertCircle } from 'lucide-react-native';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
// import { Card } from '~/components/ui/card'; // Not used directly in renderProductItem
import { useProductStore } from '~/lib/stores/productStore';
import { Product } from '~/lib/models/product';
import { useCustomerStore } from '~/lib/stores/customerStore';
import { useCartStore } from '~/lib/stores/cartStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { getColors } from '~/app/(tabs)/sale'; // Assuming this path is correct
import { useColorScheme as rnColorScheme } from 'react-native';
// import { v4 as uuidv4 } from 'uuid'; // uuidv4 seems unused
import { useAuthStore } from '~/lib/stores/authStore';
import GlobalToaster, { Toaster } from '~/components/toaster/Toaster'; 

export default function SalesScreen() {
  const colorSchemeFromHook = rnColorScheme();
  const COLORS = getColors(colorSchemeFromHook || 'light');
  const router = useRouter();
  const { products, fetchProducts } = useProductStore();
  const { customers, fetchCustomers, addCustomer, setSelectedCustomer } = useCustomerStore();
  const { addToCart, selectedQuantities } = useCartStore();
  const currentUserId = useAuthStore((state) => state.userId);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchProducts(), fetchCustomers()]);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      Toaster.error("Load Error", { description: `Failed to load initial data: ${message}. Please try again.` });
    } finally {
      setIsLoading(false);
    }
  }, [fetchProducts, fetchCustomers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadInitialData();
      Toaster.info("Data Refreshed", { description: "Products and customers updated." });
    } catch (error) {
      // Error is handled by loadInitialData's toast
    }
    finally {
      setRefreshing(false)
    };
  }, [loadInitialData]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (products.length > 0) {
      const updatedDisplayProducts = products.map((product) => {
        const quantityInCart = selectedQuantities[product.id] || 0;
        return {
          ...product,
          // This quantity is for display on the card, representing what's left AFTER cart deductions
          // The original product.quantity is the true store stock
          displayableStock: product.quantity - quantityInCart,
        };
      });
      setDisplayProducts(updatedDisplayProducts);
    } else {
      setDisplayProducts([]);
    }
  }, [products, selectedQuantities]);

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

  const increaseListQuantity = useCallback(
    (productId: string) => {
      const originalProduct = products.find((p) => p.id === productId);
      if (!originalProduct) return;
      const currentSelectedQty = selectedQuantities[productId] || 0;
      if (currentSelectedQty >= originalProduct.quantity) {
        Toaster.warning("Stock Limit", { description: `Maximum stock for ${originalProduct.name} is ${originalProduct.quantity}.` });
        return;
      }
      const newSelectedQty = currentSelectedQty + 1;
      addToCart(originalProduct, newSelectedQty);
    },
    [products, addToCart, selectedQuantities]
  );

  const decreaseListQuantity = useCallback(
    (productId: string) => {
      const currentSelectedQty = selectedQuantities[productId] || 0;
      if (currentSelectedQty <= 0) return;
      const originalProduct = products.find((p) => p.id === productId);
      if (!originalProduct) return;
      const newSelectedQty = currentSelectedQty - 1;
      addToCart(originalProduct, newSelectedQty);
    },
    [addToCart, selectedQuantities, products]
  );

  const handleAddNewCustomer = async () => {
    if (!newCustomerForm.name.trim() || !newCustomerForm.phone.trim()) {
      Toaster.warning("Validation Error", { description: "Customer name and phone are required." });
      return;
    }
    if (!currentUserId) {
      Toaster.error("Authentication Error", { description: "User not authenticated to add customer." });
      return;
    }
    setIsProcessing(true);
    const customerName = newCustomerForm.name; // Store for success message
    try {
      const newCustData = {
        name: newCustomerForm.name,
        phone: newCustomerForm.phone,
        email: newCustomerForm.email || undefined,
        creditLimit: 0,
      };
      const newCustomer = await addCustomer(newCustData);
      await fetchCustomers(); // Re-fetch to ensure the list is up-to-date
      setSelectedCustomer(newCustomer); // Automatically select the new customer
      setNewCustomerForm({ name: '', phone: '', email: '' }); // Reset form
      setIsAddingNewCustomer(false); // Go back to customer selection view
      setIsCustomerModalOpen(false); // Close the modal
      Toaster.success("Customer Added", { description: `"${customerName}" has been added and selected.` });
    } catch (error: any) { // Catch any error
      let errorTitle = "Add Customer Failed";
      let errorMessage = "An unexpected error occurred. Please try again.";

      // Check if the error is the specific "Phone number already exists"
      if (error instanceof Error && error.message === "Phone number already exists.") {
        errorTitle = "Duplicate Phone Number";
        errorMessage = "This phone number is already registered. Please use a different one or select the existing customer.";
      } else if (error instanceof Error) {
        errorMessage = error.message; // Use the message from other errors
      } else if (typeof error === 'string') {
        errorMessage = error; // If the error is just a string
      }
      console.error("Add customer error in SalesScreen:", error); // Log the original error for debugging
      Toaster.error(errorTitle, { description: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderProductItem = ({ item }: { item: Product & { displayableStock?: number } }) => {
    const originalProductFromStore = products.find((p) => p.id === item.id);
    const totalOriginalStoreStock = originalProductFromStore ? originalProductFromStore.quantity : 0;
    const currentSelectedQtyOnCard = selectedQuantities[item.id] || 0;
    const stockAvailableForAddingToCart = totalOriginalStoreStock - currentSelectedQtyOnCard;

    return (
      <TouchableOpacity
        disabled={(totalOriginalStoreStock <= 0) && currentSelectedQtyOnCard === 0}
        className={`w-[48%] m-1 rounded-xl overflow-hidden shadow-sm 
                    ${((totalOriginalStoreStock <= 0) && currentSelectedQtyOnCard === 0) ? 'opacity-50' : ''}`}
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
                onPress={(e) => {
                  e.stopPropagation();
                  decreaseListQuantity(item.id);
                }}
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
                  const op = products.find((p) => p.id === item.id);
                  const maxStock = op ? op.quantity : 0;
                  let num = parseInt(text, 10);
                  if (isNaN(num) || num < 0 || text === '') num = 0;
                  if (num > maxStock) {
                    num = maxStock;
                    Toaster.warning("Stock Limit", { description: `Maximum available stock for ${op?.name} is ${maxStock}.` });
                  }
                  if (op) {
                     addToCart(op, num);
                  }
                }}
                editable={totalOriginalStoreStock > 0}
                style={{ backgroundColor: COLORS.white, color: COLORS.primary }}
              />
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  increaseListQuantity(item.id);
                }}
                disabled={currentSelectedQtyOnCard >= totalOriginalStoreStock}
                className="p-1"
              >
                <PlusCircle size={16} color={currentSelectedQtyOnCard >= totalOriginalStoreStock ? COLORS.gray : COLORS.dark} />
              </TouchableOpacity>
            </View>
          </View>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Stock: {stockAvailableForAddingToCart} {item.unit || 'piece'}
          </Text>
        </View>
      </TouchableOpacity>
    );
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
                    style={{ backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10 }}
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
            style={{ maxHeight: '90%', minHeight: 500 }}
          >
            <DialogHeader className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center justify-between">
                <DialogTitle className="text-lg font-bold" style={{ color: COLORS.dark }}>
                  {isAddingNewCustomer ? 'Add New Customer' : 'Select Customer'}
                </DialogTitle>
              </View>
            </DialogHeader>
            <View className="p-4 flex-1">
              {isAddingNewCustomer ? (
                <View>
                  <Input
                    placeholder="Customer Name*"
                    value={newCustomerForm.name}
                    onChangeText={(text) => setNewCustomerForm((prev) => ({ ...prev, name: text }))}
                    className="mb-3 h-11 border border-gray-300 dark:border-gray-600 rounded-md px-3"
                    style={{ backgroundColor: COLORS.white, color: COLORS.dark }}
                    placeholderTextColor={COLORS.gray}
                  />
                  <Input
                    placeholder="Phone Number*"
                    value={newCustomerForm.phone}
                    onChangeText={(text) => setNewCustomerForm((prev) => ({ ...prev, phone: text }))}
                    keyboardType="phone-pad"
                    className="mb-3 h-11 border border-gray-300 dark:border-gray-600 rounded-md px-3"
                    style={{ backgroundColor: COLORS.white, color: COLORS.dark }}
                    placeholderTextColor={COLORS.gray}
                  />
                  <Input
                    placeholder="Email (Optional)"
                    value={newCustomerForm.email}
                    onChangeText={(text) => setNewCustomerForm((prev) => ({ ...prev, email: text }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="mb-4 h-11 border border-gray-300 dark:border-gray-600 rounded-md px-3"
                    style={{ backgroundColor: COLORS.white, color: COLORS.dark }}
                    placeholderTextColor={COLORS.gray}
                  />
                  <View className="flex-row justify-end gap-x-2 mt-2">
                    <Button variant="ghost" onPress={() => setIsAddingNewCustomer(false)} className="px-4 py-2">
                      <Text style={{ color: COLORS.gray }}>Cancel</Text>
                    </Button>
                    <Button
                      onPress={handleAddNewCustomer}
                      disabled={isProcessing}
                      style={{ backgroundColor: COLORS.secondary }}
                      className="px-4 py-2"
                    >
                      {isProcessing ? (
                        <ActivityIndicator color={COLORS.white} size="small" />
                      ) : (
                        <Text className="font-semibold" style={{color: COLORS.white}}>Save Customer</Text>
                      )}
                    </Button>
                  </View>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <View
                    className="mb-3 flex-row items-center rounded-md px-3 border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: COLORS.white }}
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
                    contentContainerStyle={{ flexGrow: 1 }}
                  />
                  <Button
                    variant="outline"
                    className="mt-4 h-11 border border-gray-300 dark:border-gray-600 flex-row items-center justify-center rounded-md"
                    style={{ backgroundColor: COLORS.primary }}
                    onPress={() => setIsAddingNewCustomer(true)}
                  >
                    <UserPlus size={18} color={COLORS.white} className="mr-2" />
                    <Text className="font-semibold" style={{ color: COLORS.white }}>Add New Customer</Text>
                  </Button>
                </View>
              )}
            </View>
          </DialogContent>
        </Dialog>
      </SafeAreaView>
    </LinearGradient>
  );
}