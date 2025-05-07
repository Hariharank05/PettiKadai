// ~/app/(tabs)/home.tsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '~/lib/stores/authStore';
import { useProductStore } from '~/lib/stores/productStore';
import { Text } from '~/components/ui/text'; // Your custom Text component
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { BarChart4, TrendingUp, Package, DollarSign, AlertTriangle, Plus, Users } from 'lucide-react-native';
import { format } from 'date-fns';

export default function HomeScreen() {
  const router = useRouter();
  const { userName } = useAuthStore();
  
  // Get products directly from the store. Zustand ensures this component re-renders when 'products' changes.
  const storeProducts = useProductStore((state) => state.products);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const productStoreLoading = useProductStore((state) => state.loading);

  // Local loading state for this screen's initial setup
  const [isScreenLoading, setIsScreenLoading] = useState(true); 

  const [lowStockProductsCount, setLowStockProductsCount] = useState<number>(0);
  const [outOfStockProductsCount, setOutOfStockProductsCount] = useState<number>(0);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [totalValue, setTotalValue] = useState<number>(0);


  useEffect(() => {
    fetchProducts().finally(() => {
        setIsScreenLoading(false); // Stop screen loading once fetch is done (success or fail)
    });
  }, [fetchProducts]);

  useEffect(() => {
    // This effect will run whenever storeProducts changes (after fetchProducts updates the store)
    // or when productStoreLoading changes.
    if (!productStoreLoading && storeProducts.length > 0) {
        const lowStock = storeProducts.filter(p => p.quantity > 0 && p.quantity < 5).length;
        setLowStockProductsCount(lowStock);

        const outOfStock = storeProducts.filter(p => p.quantity === 0).length;
        setOutOfStockProductsCount(outOfStock);

        setTotalProducts(storeProducts.length);
        const invValue = storeProducts.reduce((sum, product) => sum + (product.costPrice * product.quantity), 0);
        setTotalValue(invValue);
    } else if (!productStoreLoading && storeProducts.length === 0) {
        // Handle case where there are no products after loading
        setLowStockProductsCount(0);
        setOutOfStockProductsCount(0);
        setTotalProducts(0);
        setTotalValue(0);
    }
  }, [storeProducts, productStoreLoading]);


  const today = new Date();
  const dateFormatted = format(today, 'EEEE, MMMM d, yyyy');

  const navigateToProducts = () => router.push('/(tabs)/products');
  const navigateToNewSale = () => router.push('/(tabs)/sales');
  const navigateToCustomer = () => router.push('/(tabs)/customers');
  const navigateToReports = () => router.push('/(tabs)/reports' as any); // Cast if type is an issue

  if (isScreenLoading) { // Use the screen-specific loading state
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="hsl(var(--primary))" />
        <Text className="mt-4 text-muted-foreground">Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-4">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-2xl font-bold text-foreground">Welcome back</Text>
            <Text className="text-lg text-foreground">{userName || 'Store Owner'}</Text>
          </View>
          <View className="bg-muted p-2 rounded-md">
            <Text className="text-sm text-muted-foreground">{dateFormatted}</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="flex-row mb-6 gap-x-2">
          <Card className="flex-1">
            <CardContent className="p-4 flex-row items-center">
              <View className="h-10 w-10 rounded-md bg-blue-100 dark:bg-blue-900 justify-center items-center mr-3">
                <Package size={20} className="text-blue-500 dark:text-blue-300" />
              </View>
              <View>
                <Text className="text-muted-foreground text-sm">Products</Text>
                <Text className="text-foreground text-lg font-medium">{totalProducts}</Text>
              </View>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-4 flex-row items-center">
              <View className="h-10 w-10 rounded-md bg-green-100 dark:bg-green-900 justify-center items-center mr-3">
                <DollarSign size={20} className="text-green-500 dark:text-green-300" />
              </View>
              <View>
                <Text className="text-muted-foreground text-sm">Inventory Value</Text>
                <Text className="text-foreground text-lg font-medium">₹{totalValue.toFixed(2)}</Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Low Stock Alert */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            {/* Ensure CardTitle internally renders Text or is a Text component itself */}
            <CardTitle>Inventory Alerts</CardTitle> 
          </CardHeader>
          <CardContent className="pt-0">
            {lowStockProductsCount > 0 && (
              <View className="flex-row items-center py-2">
                <View className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 justify-center items-center mr-3">
                  <AlertTriangle size={16} className="text-yellow-500 dark:text-yellow-300" />
                </View>
                <View>
                  <Text className="text-foreground">{lowStockProductsCount} products with low stock</Text>
                </View>
              </View>
            )}
            {outOfStockProductsCount > 0 && (
              <View className="flex-row items-center py-2">
                <View className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 justify-center items-center mr-3">
                  <AlertTriangle size={16} className="text-red-500 dark:text-red-300" />
                </View>
                <View>
                  <Text className="text-foreground">{outOfStockProductsCount} products out of stock</Text>
                </View>
              </View>
            )}
            {(lowStockProductsCount === 0 && outOfStockProductsCount === 0) && (
              <View className="flex-row items-center py-2">
                <Text className="text-muted-foreground">All products are well stocked!</Text>
              </View>
            )}
            <TouchableOpacity
              className="bg-muted py-2 px-4 rounded-md mt-2 items-center"
              onPress={navigateToProducts}
            >
              <Text className="text-primary text-sm font-medium">View All Inventory</Text>
            </TouchableOpacity>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <View className="flex-row flex-wrap -m-1">
              <TouchableOpacity className="w-1/2 p-1" onPress={navigateToNewSale}>
                <View className="bg-muted p-4 rounded-md items-center">
                  <Plus size={20} className="text-blue-500 dark:text-blue-300 mb-1" />
                  <Text className="text-foreground text-sm font-medium">New Sale</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity className="w-1/2 p-1" onPress={navigateToProducts}>
                <View className="bg-muted p-4 rounded-md items-center">
                  <Package size={20} className="text-green-500 dark:text-green-300 mb-1" />
                  <Text className="text-foreground text-sm font-medium">Add Product</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity className="w-1/2 p-1" onPress={navigateToCustomer}>
                <View className="bg-muted p-4 rounded-md items-center">
                  <Users size={20} className="text-indigo-500 dark:text-indigo-300 mb-1" />
                  <Text className="text-foreground text-sm font-medium">Manage Customers</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity className="w-1/2 p-1" onPress={navigateToReports}>
                <View className="bg-muted p-4 rounded-md items-center">
                  <BarChart4 size={20} className="text-purple-500 dark:text-purple-300 mb-1" />
                  <Text className="text-foreground text-sm font-medium">View Reports</Text>
                </View>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card>

        {/* Recent Sales - Placeholder */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <View className="items-center justify-center py-6">
              <Text className="text-muted-foreground text-center">No recent sales data available.</Text>
              <TouchableOpacity className="bg-primary py-2 px-4 rounded-md mt-4" onPress={navigateToNewSale}>
                <Text className="text-primary-foreground">Create New Sale</Text>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card>

        {/* Store Performance - Placeholder */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle>Store Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <View className="items-center justify-center py-6">
              <View className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 justify-center items-center mb-3">
                <TrendingUp size={24} className="text-blue-500 dark:text-blue-300" />
              </View>
              <Text className="text-base text-foreground text-center mb-1">Start tracking your sales</Text>
              <Text className="text-sm text-muted-foreground text-center mb-4">
                Create sales to see your store's performance over time.
              </Text>
              <TouchableOpacity className="bg-muted py-2 px-4 rounded-md" onPress={navigateToReports}>
                <Text className="text-primary text-sm font-medium">View Reports</Text>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}