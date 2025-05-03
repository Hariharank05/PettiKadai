import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '~/lib/stores/authStore';
import { useProductStore } from '~/lib/stores/productStore';
import { Text } from '~/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { BarChart4, TrendingUp, Package, DollarSign, AlertTriangle, Plus, Calendar } from 'lucide-react-native';
import { format } from 'date-fns';

export default function HomeScreen() {
  const router = useRouter();
  const { userName } = useAuthStore();
  const { products, fetchProducts
    // , getLowStockProducts 
  } = useProductStore();
  const [isLoading, setIsLoading] = useState(true);
  const [lowStockProducts, setLowStockProducts] = useState<number>(0);
  const [outOfStockProducts, setOutOfStockProducts] = useState<number>(0);

  // Load products and stats on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchProducts();

        // Count low stock products
        const lowStock = products.filter(p => p.quantity < 5 && p.quantity > 0).length;
        setLowStockProducts(lowStock);

        // Count out of stock products
        const outOfStock = products.filter(p => p.quantity === 0).length;
        setOutOfStockProducts(outOfStock);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchProducts, products]);

  // Calculate statistics
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, product) => sum + (product.costPrice * product.quantity), 0);

  // Get current date
  const today = new Date();
  const dateFormatted = format(today, 'EEEE, MMMM d, yyyy');

  // Navigate to products page
  const navigateToProducts = () => {
    router.push('/(tabs)/products');
  };

  if (isLoading) {
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
            <CardContent className="p-4 flex-row">
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
            <CardContent className="p-4 flex-row">
              <View className="h-10 w-10 rounded-md bg-green-100 dark:bg-green-900 justify-center items-center mr-3">
                <DollarSign size={20} className="text-green-500 dark:text-green-300" />
              </View>
              <View>
                <Text className="text-muted-foreground text-sm">Inventory</Text>
                <Text className="text-foreground text-lg font-medium">₹{totalValue.toFixed(2)}</Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Low Stock Alert */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Inventory Alerts</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {lowStockProducts > 0 && (
              <View className="flex-row items-center py-2">
                <View className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 justify-center items-center mr-3">
                  <AlertTriangle size={16} className="text-yellow-500 dark:text-yellow-300" />
                </View>
                <View>
                  <Text className="text-foreground">{lowStockProducts} products with low stock</Text>
                </View>
              </View>
            )}

            {outOfStockProducts > 0 && (
              <View className="flex-row items-center py-2">
                <View className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 justify-center items-center mr-3">
                  <AlertTriangle size={16} className="text-red-500 dark:text-red-300" />
                </View>
                <View>
                  <Text className="text-foreground">{outOfStockProducts} products out of stock</Text>
                </View>
              </View>
            )}

            {lowStockProducts === 0 && outOfStockProducts === 0 && (
              <View className="flex-row items-center py-2">
                <Text className="text-foreground">All products are well stocked!</Text>
              </View>
            )}

            <TouchableOpacity
              className="bg-muted py-2 px-4 rounded-md mt-2 items-center"
              onPress={navigateToProducts}
            >
              <Text className="text-primary text-sm">View All Inventory</Text>
            </TouchableOpacity>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <View className="flex-row flex-wrap">
              <TouchableOpacity className="w-1/2 p-2">
                <View className="bg-muted p-4 rounded-md items-center">
                  <Plus size={20} className="text-blue-500 dark:text-blue-300 mb-1" />
                  <Text className="text-foreground text-sm">New Sale</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-1/2 p-2"
                onPress={navigateToProducts}
              >
                <View className="bg-muted p-4 rounded-md items-center">
                  <Package size={20} className="text-green-500 dark:text-green-300 mb-1" />
                  <Text className="text-foreground text-sm">Add Product</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="w-1/2 p-2">
                <View className="bg-muted p-4 rounded-md items-center">
                  <BarChart4 size={20} className="text-purple-500 dark:text-purple-300 mb-1" />
                  <Text className="text-foreground text-sm">Reports</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="w-1/2 p-2">
                <View className="bg-muted p-4 rounded-md items-center">
                  <Calendar size={20} className="text-orange-500 dark:text-orange-300 mb-1" />
                  <Text className="text-foreground text-sm">Daily Summary</Text>
                </View>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <View className="items-center justify-center py-6">
              <Text className="text-muted-foreground text-center">No recent sales data available</Text>
              <TouchableOpacity className="bg-primary py-2 px-4 rounded-md mt-4">
                <Text className="text-primary-foreground">Create New Sale</Text>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card>

        {/* Store Info */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Store Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <View className="items-center justify-center py-6">
              <View className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 justify-center items-center mb-3">
                <TrendingUp size={24} className="text-blue-500 dark:text-blue-300" />
              </View>
              <Text className="text-base text-foreground text-center mb-1">Start tracking your sales</Text>
              <Text className="text-sm text-muted-foreground text-center mb-4">
                Create sales to track your store's performance over time
              </Text>
              <TouchableOpacity className="bg-muted py-2 px-4 rounded-md">
                <Text className="text-primary text-sm">View Reports</Text>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}