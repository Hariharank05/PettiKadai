import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, ImageBackground, Dimensions, Animated, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '~/lib/stores/authStore';
import { useProductStore } from '~/lib/stores/productStore';
import { Text } from '~/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { BarChart4, TrendingUp, Package, DollarSign, AlertTriangle, Plus, Users, ChevronDown, Tag } from 'lucide-react-native';
import { format } from 'date-fns';

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
  border: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
});

const { width } = Dimensions.get('window');

// Updated Carousel images to match grocery theme
const CAROUSEL_IMAGES = [
  'https://images.pexels.com/photos/4173325/pexels-photo-4173325.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/19956105/pexels-photo-19956105/free-photo-of-woman-doing-grocery-shopping.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.unsplash.com/photo-1542838132-92c53300491e',
  'https://images.pexels.com/photos/4053267/pexels-photo-4053267.jpeg',
];

// Fallback image for products without a matching category or image
const FALLBACK_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1494390248081-4e521a5940db';

// Define shadow style for Card components
const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5, // For Android
};

export default function HomeScreen() {
  const router = useRouter();
  const { userName } = useAuthStore();
  const storeProducts = useProductStore((state) => state.products);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const productStoreLoading = useProductStore((state) => state.loading);
  const colorScheme = useColorScheme();
  const COLORS = getColors(colorScheme || 'light');

  const [isScreenLoading, setIsScreenLoading] = useState(true);
  const [lowStockProductsCount, setLowStockProductsCount] = useState<number>(0);
  const [outOfStockProductsCount, setOutOfStockProductsCount] = useState<number>(0);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [filter, setFilter] = useState<'All' | 'Low Stock' | 'Out of Stock'>('All');
  const [sortBy, setSortBy] = useState<'Product Name' | 'Category' | 'Inventory Value' | 'Quantity'>('Product Name');

  // Hero Carousel animation
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Offer Zone Carousel animation
  const offerScrollX = useRef(new Animated.Value(0)).current;
  const [offerIndex, setOfferIndex] = useState(0);
  const offerScrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchProducts().finally(() => {
      setIsScreenLoading(false);
    });
  }, [fetchProducts]);

  useEffect(() => {
    if (!productStoreLoading && storeProducts.length > 0) {
      const lowStock = storeProducts.filter((p) => p.quantity > 0 && p.quantity < 5).length;
      setLowStockProductsCount(lowStock);
      const outOfStock = storeProducts.filter((p) => p.quantity === 0).length;
      setOutOfStockProductsCount(outOfStock);
      setTotalProducts(storeProducts.length);
      const invValue = storeProducts.reduce((sum, product) => sum + product.costPrice * product.quantity, 0);
      setTotalValue(invValue);
    } else if (!productStoreLoading && storeProducts.length === 0) {
      setLowStockProductsCount(0);
      setOutOfStockProductsCount(0);
      setTotalProducts(0);
      setTotalValue(0);
    }
  }, [storeProducts, productStoreLoading]);

  // Auto-scroll for Hero Carousel
  useEffect(() => {
    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= CAROUSEL_IMAGES.length) {
        nextIndex = 0;
      }
      scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setCurrentIndex(nextIndex);
    }, 3000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  // Auto-scroll for Offer Zone Carousel
  const discountedProducts = storeProducts.filter((product) => product.discount && product.discount > 0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (discountedProducts.length === 0) return;
      let nextIndex = offerIndex + 1;
      if (nextIndex >= discountedProducts.length) {
        nextIndex = 0;
      }
      offerScrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setOfferIndex(nextIndex);
    }, 3000);
    return () => clearInterval(interval);
  }, [offerIndex, discountedProducts.length]);

  // Category data for "Product Categories" section and to map images in Product Inventory
  const categories = [
    { name: 'Vegetables', image: 'https://images.pexels.com/photos/30397673/pexels-photo-30397673/free-photo-of-colorful-fresh-vegetables-and-ingredients-flat-lay.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
    { name: 'Fruits', image: 'https://images.pexels.com/photos/11738254/pexels-photo-11738254.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
    { name: 'Snacks', image: 'https://images.pexels.com/photos/2725744/pexels-photo-2725744.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
    { name: 'Dairy', image: 'https://images.pexels.com/photos/248412/pexels-photo-248412.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { name: 'Grains', image: 'https://images.pexels.com/photos/17109241/pexels-photo-17109241/free-photo-of-seeds-for-sale-on-market.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
  ];

  // Function to get the image URL based on the product's image field or category
  const getProductImageByCategory = (product: { image?: string; category?: string }) => {
    // Prioritize the product's own image field if it exists
    if (product.image) {
      return product.image;
    }
    // Otherwise, fall back to category-based image
    if (!product.category) return FALLBACK_PRODUCT_IMAGE;
    const matchedCategory = categories.find((cat) => cat.name.toLowerCase() === product.category?.toLowerCase());
    return matchedCategory ? matchedCategory.image : FALLBACK_PRODUCT_IMAGE;
  };

  // Define Quick Actions data
  const quickActions = [
    {
      title: 'New Sale',
      icon: <Plus size={24} color={COLORS.secondary} />,
      backgroundColor: COLORS.lightBlue,
      image: 'https://images.pexels.com/photos/4439456/pexels-photo-4439456.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Shopping cart image
      onPress: () => router.push('/(tabs)/sale/sales-management'),
    },
    {
      title: 'Add Product',
      icon: <Package size={24} color={COLORS.primary} />,
      backgroundColor: COLORS.lightPurple,
      // Use the first product's image if available, otherwise fall back to static image
      image: storeProducts.length > 0 ? getProductImageByCategory(storeProducts[0]) : 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=600',
      onPress: () => router.push('/(tabs)/inventory/products'),
    },
    {
      title: 'Manage Categories',
      icon: <Tag size={24} color={COLORS.secondary} />,
      backgroundColor: COLORS.lightBlue,
      image: 'https://images.pexels.com/photos/4483775/pexels-photo-4483775.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      onPress: () => router.push('/(tabs)/inventory/category'),
    },
    {
      title: 'Manage Customers',
      icon: <Users size={24} color={COLORS.accent} />,
      backgroundColor: COLORS.lightYellow,
      image: 'https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=600', // Customer at counter image
      onPress: () => router.push('/(tabs)/inventory/customers'),
    },
    {
      title: 'Reports',
      icon: <BarChart4 size={24} color={COLORS.danger} />,
      backgroundColor: COLORS.lightRed,
      image: 'https://images.pexels.com/photos/669610/pexels-photo-669610.jpeg?auto=compress&cs=tinysrgb&w=600', // Analytics dashboard image
      onPress: () => router.push('/(tabs)/ReportsScreen'),
    },
  ];

  // Filter and sort products
  const filteredProducts = storeProducts.filter((product) => {
    if (filter === 'Low Stock') return product.quantity > 0 && product.quantity < 5;
    if (filter === 'Out of Stock') return product.quantity === 0;
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'Inventory Value') {
      return (b.costPrice * b.quantity) - (a.costPrice * a.quantity);
    } else if (sortBy === 'Quantity') {
      return b.quantity - a.quantity;
    } else if (sortBy === 'Category') {
      const categoryA = a.category ?? '';
      const categoryB = b.category ?? '';
      return categoryA.localeCompare(categoryB) || a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });

  const toggleSortBy = () => {
    const sortOptions: ('Product Name' | 'Category' | 'Inventory Value' | 'Quantity')[] = ['Product Name', 'Category', 'Inventory Value', 'Quantity'];
    const currentIndex = sortOptions.indexOf(sortBy);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    setSortBy(sortOptions[nextIndex]);
  };

  const today = new Date();
  const dateFormatted = format(today, 'EEEE, MMMM d, yyyy');

  const navigateToProducts = () => router.push('/(tabs)/inventory/products');
  const navigateToNewSale = () => router.push('/(tabs)/sale/sales-management');
  const navigateToCustomer = () => router.push('/(tabs)/inventory/customers');
  const navigateToReports = () => router.push('/(tabs)/ReportsScreen');

  if (isScreenLoading) {
    return (
      <View style={{ backgroundColor: COLORS.white }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.dark }} className="mt-4 font-medium">
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: COLORS.white }} className="flex-1">
      <View className="p-4">
        {/* Welcome Section - No Card, but has ImageBackground */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1556740738-6b4a6d6b6b6b' }}
          style={{ borderRadius: 16, overflow: 'hidden' }}
          className="mb-6"
        >
          <View style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(139,92,246,0.8)' : 'rgba(114,0,218,0.8)' }} className="rounded-2xl p-5">
            <View className="flex-row justify-between items-center">
              <View>
                <Text style={{ color: COLORS.white }} className="text-2xl font-bold">
                  Welcome, {userName || 'Store Owner'}
                </Text>
                <Text style={{ color: COLORS.white }} className="text-base opacity-80">
                  {dateFormatted}
                </Text>
              </View>
              <TouchableOpacity
                style={{ backgroundColor: COLORS.accent }}
                className="px-4 py-2 rounded-full"
                onPress={navigateToNewSale}
              >
                <Text style={{ color: COLORS.dark }} className="text-sm font-medium">
                  Start Sale
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>

        {/* Hero Carousel - No Shadow */}
        <View className="mb-6 h-64 rounded-2xl overflow-hidden">
          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
            scrollEventThrottle={16}
          >
            {CAROUSEL_IMAGES.map((image, index) => (
              <View key={index} style={{ width, height: 256, position: 'relative' }}>
                <ImageBackground
                  source={{ uri: image }}
                  style={{ width: '100%', height: '100%' }}
                  className="justify-center items-center"
                >
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                  <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: 'bold' }} className="text-center">
                    MANAGE YOUR STOCK
                  </Text>
                  <TouchableOpacity
                    style={{ backgroundColor: COLORS.accent, marginTop: 8 }}
                    className="px-4 py-2 rounded-full"
                    onPress={navigateToProducts}
                  >
                    <Text style={{ color: COLORS.dark, fontSize: 14, fontWeight: 'bold' }}>
                      VIEW INVENTORY
                    </Text>
                  </TouchableOpacity>
                </ImageBackground>
              </View>
            ))}
          </Animated.ScrollView>
          {/* Pagination Dots */}
          <View className="flex-row justify-center mt-2">
            {CAROUSEL_IMAGES.map((_, index) => {
              const opacity = scrollX.interpolate({
                inputRange: [(index - 1) * width, index * width, (index + 1) * width],
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={index}
                  style={{
                    opacity,
                    height: 8,
                    width: 8,
                    backgroundColor: COLORS.white,
                    marginHorizontal: 4,
                    borderRadius: 4,
                  }}
                />
              );
            })}
          </View>
        </View>

        {/* Quick Stats - Add Shadow to Cards with Compact ImageBackground */}
        <View className="flex-row mb-6 gap-x-3">
          <Card
            style={{
              borderColor: COLORS.secondary,
              borderWidth: 1,
              ...cardShadow, // Apply shadow
            }}
            className="flex-1 rounded-2xl overflow-hidden"
          >
            <ImageBackground
              source={{ uri: 'https://images.pexels.com/photos/7055126/pexels-photo-7055126.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1                            ' }}
              style={{ width: '100%' }}
              resizeMode="cover"
            >
              {/* Overlay for better text readability */}
              <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
              <CardContent className="p-4 flex-row items-center">
                <View
                  style={{ backgroundColor: COLORS.lightBlue }}
                  className="h-12 w-12 rounded-full justify-center items-center mr-3"
                >
                  <Package size={24} color={COLORS.secondary} />
                </View>
                <View>
                  <Text style={{ color: COLORS.white }} className="text-sm">Products</Text>
                  <Text style={{ color: COLORS.white }} className="text-xl font-bold">
                    {totalProducts}
                  </Text>
                </View>
              </CardContent>
            </ImageBackground>
          </Card>
          <Card
            style={{
              borderColor: COLORS.accent,
              borderWidth: 1,
              ...cardShadow, // Apply shadow
            }}
            className="flex-1 rounded-2xl overflow-hidden"
          >
            <ImageBackground
              source={{ uri: 'https://images.pexels.com/photos/259165/pexels-photo-259165.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' }}
              style={{ width: '100%' }}
              resizeMode="cover"
            >
              {/* Overlay for better text readability */}
              <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
              <CardContent className="p-4 flex-row items-center">
                <View
                  style={{ backgroundColor: COLORS.lightYellow }}
                  className="h-12 w-12 rounded-full justify-center items-center mr-3"
                >
                  <DollarSign size={24} color={COLORS.accent} />
                </View>
                <View>
                  <Text style={{ color: COLORS.white }} className="text-sm">Inventory Value</Text>
                  <Text style={{ color: COLORS.white }} className="text-xl font-bold">
                    ₹{totalValue.toFixed(0)}
                  </Text>
                </View>
              </CardContent>
            </ImageBackground>
          </Card>
        </View>

        {/* Inventory Alerts - No Card, but has ImageBackground */}
        <ImageBackground
          source={{ uri: 'https://images.pexels.com/photos/1797428/pexels-photo-1797428.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' }}
          style={{ borderRadius: 16, overflow: 'hidden' }}
          className="mb-6"
        >
          <View style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(55,65,81,0.95)' : 'rgba(255,255,255,0.95)' }} className="rounded-2xl">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle style={{ color: COLORS.dark }} className="text-lg font-bold">
                Inventory Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-5">
              {lowStockProductsCount > 0 && (
                <View className="flex-row items-center py-2">
                  <View
                    style={{ backgroundColor: COLORS.lightYellow }}
                    className="h-10 w-10 rounded-full justify-center items-center mr-3"
                  >
                    <AlertTriangle size={20} color={COLORS.accent} />
                  </View>
                  <View>
                    <Text style={{ color: COLORS.dark }} className="text-base">
                      {lowStockProductsCount} products with low stock
                    </Text>
                  </View>
                </View>
              )}
              {outOfStockProductsCount > 0 && (
                <View className="flex-row items-center py-2">
                  <View
                    style={{ backgroundColor: COLORS.lightRed }}
                    className="h-10 w-10 rounded-full justify-center items-center mr-3"
                  >
                    <AlertTriangle size={20} color={COLORS.danger} />
                  </View>
                  <View>
                    <Text style={{ color: COLORS.dark }} className="text-base">
                      {outOfStockProductsCount} products out of stock
                    </Text>
                  </View>
                </View>
              )}
              {lowStockProductsCount === 0 && outOfStockProductsCount === 0 && (
                <View className="flex-row items-center py-2">
                  <Text style={{ color: COLORS.gray }} className="text-base">
                    All products are well stocked!
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={{ backgroundColor: COLORS.primary }}
                className="py-3 px-4 rounded-lg mt-3 items-center"
                onPress={navigateToProducts}
              >
                <Text style={{ color: COLORS.white }} className="text-sm font-medium">
                  View All Inventory
                </Text>
              </TouchableOpacity>
            </CardContent>
          </View>
        </ImageBackground>

        {/* Product Categories - No Shadow */}
        <View className="mb-6">
          <Text style={{ color: COLORS.dark, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
            Product Categories
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {categories.map((category, index) => (
                <TouchableOpacity
                  key={index}
                  className="mr-4 items-center"
                  onPress={() => router.push({ pathname: '/(tabs)/inventory/products', params: { category: category.name } })}
                >
                  <ImageBackground
                    source={{ uri: category.image }}
                    style={{ width: 80, height: 80, borderRadius: 40, overflow: 'hidden' }}
                  />
                  <Text style={{ color: COLORS.dark, fontSize: 14, marginTop: 8 }}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Product Inventory */}
        {/* Filters and Sort By - Moved Above the Card, No Shadow */}
        <View className="mt-4" style={{ marginBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {['All', 'Low Stock', 'Out of Stock'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 999,
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    backgroundColor: filter === f ? COLORS.lightRed : COLORS.white,
                  }}
                  onPress={() => setFilter(f as 'All' | 'Low Stock' | 'Out of Stock')}
                >
                  <Text style={{ color: COLORS.dark, fontSize: 14 }}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 999,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                onPress={toggleSortBy}
              >
                <Text style={{ color: COLORS.dark, fontSize: 14 }}>
                  Sort by: {sortBy}
                </Text>
                <ChevronDown size={18} color={COLORS.gray} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Product Inventory Card - Add Shadow */}
        <Card
          style={{
            backgroundColor: COLORS.white,
            ...cardShadow, // Apply shadow
          }}
          className="mb-6 rounded-2xl"
        >
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle style={{ color: COLORS.dark }} className="text-lg font-bold">
              Product Inventory
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-5">
            {sortedProducts.length === 0 ? (
              <View className="items-center justify-center py-6">
                <Text style={{ color: COLORS.gray }} className="text-center">
                  No products available.
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.primary }}
                  className="py-3 px-6 rounded-lg mt-4"
                  onPress={navigateToProducts}
                >
                  <Text style={{ color: COLORS.white }} className="font-medium">
                    Add Products
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row">
                  {sortedProducts.map((product, index) => {
                    const productImage = getProductImageByCategory(product);
                    const isFallback = productImage === FALLBACK_PRODUCT_IMAGE;

                    return (
                      <TouchableOpacity
                        key={index}
                        className="w-40 mr-3"
                        onPress={() => router.push({ pathname: '/(tabs)/inventory/products', params: { productId: product.id } })}
                      >
                        <Card
                          style={{
                            backgroundColor: COLORS.white,
                            borderColor: COLORS.lightPurple,
                            borderWidth: 1,
                            ...cardShadow, // Apply shadow to individual product cards
                          }}
                          className="rounded-xl"
                        >
                          <ImageBackground
                            source={{ uri: productImage }}
                            style={{ width: '100%', height: 80 }}
                            className="rounded-t-xl overflow-hidden"
                          >
                            {isFallback && (
                              <View
                                style={{
                                  backgroundColor: 'rgba(0,0,0,0.1)',
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                }}
                              />
                            )}
                          </ImageBackground>
                          <CardContent className="p-3">
                            <Text
                              style={{ color: COLORS.dark }}
                              className="text-sm font-medium mb-1"
                              numberOfLines={1}
                            >
                              {product.name}
                            </Text>
                            <Text style={{ color: COLORS.gray }} className="text-xs">
                              Value: ₹{(product.costPrice * product.quantity).toFixed(0)}
                            </Text>
                            {product.category && (
                              <Text style={{ color: COLORS.gray }} className="text-xs mt-1">
                                Category: {product.category}
                              </Text>
                            )}
                          </CardContent>
                        </Card>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions - Add Shadow to Card, but not to individual items */}
        <Card
          style={{
            backgroundColor: COLORS.white,
            ...cardShadow, // Apply shadow
          }}
          className="mb-6 rounded-2xl"
        >
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle style={{ color: COLORS.dark }} className="text-lg font-bold">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-5">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              contentContainerStyle={{ paddingVertical: 8 }}
            >
              <View className="flex-row">
                {quickActions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={{ width: 160, height: 140, marginRight: 12 }}
                    onPress={action.onPress}
                  >
                    <ImageBackground
                      source={{ uri: action.image }}
                      style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                      className="rounded-xl overflow-hidden"
                    >
                      {/* Overlay for better text/icon readability */}
                      <View
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.4)',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                        }}
                      />
                      <View
                        style={{
                          backgroundColor: action.backgroundColor,
                          borderRadius: 999,
                          padding: 12,
                          marginBottom: 8,
                        }}
                      >
                        {action.icon}
                      </View>
                      <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
                        {action.title}
                      </Text>
                    </ImageBackground>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </CardContent>
        </Card>

        {/* Recent Sales - No Card, but has ImageBackground */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d' }}
          style={{ borderRadius: 16, overflow: 'hidden' }}
          className="mb-6"
        >
          <View style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(55,65,81,0.95)' : 'rgba(255,255,255,0.95)' }} className="rounded-2xl">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle style={{ color: COLORS.dark }} className="text-lg font-bold">
                Recent Sales
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-5">
              <View className="items-center justify-center py-6">
                <Text style={{ color: COLORS.gray }} className="text-center">
                  No recent sales data available.
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.secondary }}
                  className="py-3 px-6 rounded-lg mt-4"
                  onPress={navigateToNewSale}
                >
                  <Text style={{ color: COLORS.white }} className="font-medium">
                    Create New Sale
                  </Text>
                </TouchableOpacity>
              </View>
            </CardContent>
          </View>
        </ImageBackground>

        {/* Store Performance - Add Shadow to Card */}
        <Card
          style={{
            backgroundColor: COLORS.white,
            ...cardShadow, // Apply shadow
          }}
          className="mb-6 rounded-2xl"
        >
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle style={{ color: COLORS.dark }} className="text-lg font-bold">
              Store Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-5">
            <View className="items-center justify-center py-6">
              <View
                style={{ backgroundColor: COLORS.lightBlue }}
                className="h-14 w-14 rounded-full justify-center items-center mb-3"
              >
                <TrendingUp size={28} color={COLORS.secondary} />
              </View>
              <Text style={{ color: COLORS.dark }} className="text-base text-center mb-1 font-medium">
                Start tracking your sales
              </Text>
              <Text style={{ color: COLORS.gray }} className="text-sm text-center mb-4">
                Create sales to see your store's performance over time.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: COLORS.lightPurple }}
                className="py-3 px-6 rounded-lg"
                onPress={navigateToReports}
              >
                <Text style={{ color: COLORS.primary }} className="text-sm font-medium">
                  View Reports
                </Text>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}