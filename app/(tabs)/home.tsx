import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, ImageBackground, Dimensions, Animated, useColorScheme as rnColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '~/lib/stores/authStore';
import { useProductStore } from '~/lib/stores/productStore';
import { Text } from '~/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { BarChart4, TrendingUp, Package, DollarSign, AlertTriangle, Plus, Users, ChevronDown, Tag, ChevronUp, ChevronRight } from 'lucide-react-native';
import { format } from 'date-fns';
import { useCategoryStore } from '~/lib/stores/categoryStore';

// Define the color palette based on theme
export const getColors = (colorScheme: 'light' | 'dark') => ({
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
  yellow: colorScheme === 'dark' ? '#f9c00c' : '#f9c00c',
});

const { width } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = width / 2.5; // ~2.5 cards visible, ~5 in scroll

// Fallback images
const FALLBACK_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1494390248081-4e521a5940db';
const FALLBACK_CATEGORY_IMAGE = 'https://images.unsplash.com/photo-1543083477-4f785aeafaa8';

// Card shadow
const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
};

// Hardcoded categories
const hardcodedCategories = [
  { name: 'Vegetables', image: 'https://images.pexels.com/photos/30397673/pexels-photo-30397673/free-photo-of-colorful-fresh-vegetables-and-ingredients-flat-lay.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
  { name: 'Fruits', image: 'https://images.pexels.com/photos/11738254/pexels-photo-11738254.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
  { name: 'Snacks', image: 'https://images.pexels.com/photos/2725744/pexels-photo-2725744.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
  { name: 'Dairy', image: 'https://images.pexels.com/photos/248412/pexels-photo-248412.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Grains', image: 'https://images.pexels.com/photos/17109241/pexels-photo-17109241/free-photo-of-seeds-for-sale-on-market.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { userName } = useAuthStore();
  const storeProducts = useProductStore((state) => state.products);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const productStoreLoading = useProductStore((state) => state.loading);
  const storeCategories = useCategoryStore((state) => state.categories);
  const fetchStoreCategories = useCategoryStore((state) => state.fetchCategories);
  const categoriesLoading = useCategoryStore((state) => state.isLoading);

  const currentColorScheme = rnColorScheme();
  const COLORS = getColors(currentColorScheme || 'light');

  const [isScreenLoading, setIsScreenLoading] = useState(true);
  const [lowStockProductsCount, setLowStockProductsCount] = useState<number>(0);
  const [outOfStockProductsCount, setOutOfStockProductsCount] = useState<number>(0);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [filter, setFilter] = useState<'All' | 'Low Stock' | 'Out of Stock'>('All');
  const [sortBy, setSortBy] = useState<'Product Name' | 'Category' | 'Inventory Value' | 'Quantity'>('Product Name');
  const [insightsExpanded, setInsightsExpanded] = useState<{ sales: boolean; performance: boolean }>({ sales: false, performance: false });

  // Animations
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const offerScrollX = useRef(new Animated.Value(0)).current;
  const [offerIndex, setOfferIndex] = useState(0);
  const offerScrollViewRef = useRef<ScrollView>(null);

  // Scale animations for touchables
 // Product image by category
 const getProductImageByCategory = useCallback((product: { imageUri?: string; category?: string }) => {
 if (product.imageUri) {
 return product.imageUri;
 }
 const productCategoryName = product.category?.toLowerCase();
 if (!productCategoryName) return FALLBACK_PRODUCT_IMAGE;
 if (storeCategories.length > 0) {
 const matchedStoreCategory = storeCategories.find(
 (cat) => cat.name.toLowerCase() === productCategoryName && cat.imageUri
 );
 if (matchedStoreCategory && matchedStoreCategory.imageUri) {
 return matchedStoreCategory.imageUri;
 }
 }
 const matchedHardcodedCategory = hardcodedCategories.find(
 (cat) => cat.name.toLowerCase() === productCategoryName
 );
 if (matchedHardcodedCategory) {
 return matchedHardcodedCategory.image;
 }
 return FALLBACK_PRODUCT_IMAGE;
 }, [storeCategories]);

  const scaleValues = useRef(new Map()).current;

  const getScaleValue = (key: string) => {
    if (!scaleValues.has(key)) {
      scaleValues.set(key, new Animated.Value(1));
    }
    return scaleValues.get(key);
  };

  const handlePressIn = (key: string) => {
    Animated.spring(getScaleValue(key), {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (key: string) => {
    Animated.spring(getScaleValue(key), {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    Promise.all([fetchProducts(), fetchStoreCategories()]).finally(() => {
      setIsScreenLoading(false);
    });
  }, [fetchProducts, fetchStoreCategories]);

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

  // Quick Actions
  const quickActions = [
    {
      title: 'New Sale',
     image: 'https://images.pexels.com/photos/8422724/pexels-photo-8422724.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      onPress: () => router.push('/(tabs)/sale/sales-management'),
    },
    {
      title: 'Add Product',
     image: 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg',
      onPress: () => router.push('/(tabs)/inventory/products'),
    },
    {
      title: 'Manage Categories',
      image: 'https://images.pexels.com/photos/4483775/pexels-photo-4483775.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      onPress: () => router.push('/(tabs)/inventory/category'),
    },
    {
      title: 'Manage Customers',
      image: 'https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=600',
      onPress: () => router.push('/(tabs)/inventory/customers'),
    },
    {
      title: 'Reports',
      image: 'https://images.pexels.com/photos/669610/pexels-photo-669610.jpeg?auto=compress&cs=tinysrgb&w=600',
      onPress: () => router.push('/(tabs)/ReportsScreen'),
    },
  ];

  // Auto-scroll for Quick Actions Carousel
  useEffect(() => {
    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= quickActions.length) {
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


  // Display categories
  const displayCategories = !categoriesLoading && storeCategories.length > 0
    ? storeCategories.map(cat => ({ name: cat.name, image: cat.imageUri || FALLBACK_CATEGORY_IMAGE }))
    : hardcodedCategories;

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
  const navigateToReports = () => router.push('/(tabs)/ReportsScreen');
  const navigateToCategories = () => router.push('/(tabs)/inventory/category');

  if (isScreenLoading || categoriesLoading) {
    return (
      <View style={{ backgroundColor: COLORS.white }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.dark }} className="mt-4 text-lg font-medium">
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[COLORS.white, COLORS.yellow]}
      style={{ flex: 1 }}
    >
      <ScrollView className="flex-1">
        <View className="p-5">
          {/* Quick Actions Carousel - Replaces Hero Carousel */}
          <Card
            style={{ ...cardShadow, borderRadius: 24, height: 200 }}
            className="mb-6 rounded-2xl overflow-hidden"
          >
            <Animated.ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
              scrollEventThrottle={16}
              style={{ borderRadius: 24, overflow: 'hidden' }}
            >
              {quickActions.map((action, index) => (
                <View key={index} style={{ width, height: 200, borderRadius: 24, overflow: 'hidden' }}>
                  <ImageBackground
                    source={{ uri: action.image }}
                    style={{ width: '100%', height: 200, borderRadius: 24, overflow: 'hidden' }}
                    className="justify-center items-center"
                  >
                    <LinearGradient
                      colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.2)']}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                    
                    <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: 'bold' }} className="text-center px-5">
                      {action.title.toUpperCase()}
                    </Text>
                    <TouchableOpacity
                      style={{ backgroundColor: COLORS.lightBlue, marginTop: 12 }}
                      className="px-4 py-2 rounded-full"
                      onPress={action.onPress}
                      onPressIn={() => handlePressIn(`action-carousel-${index}`)}
                      onPressOut={() => handlePressOut(`action-carousel-${index}`)}
                    >
                      <Animated.View style={{ transform: [{ scale: getScaleValue(`action-carousel-${index}`) }] }}>
                        <Text style={{ color: COLORS.dark, fontSize: 14, fontWeight: 'bold' }}>
                          GO TO {action.title.toUpperCase()}
                        </Text>
                      </Animated.View>
                    </TouchableOpacity>
                  </ImageBackground>
                </View>
              ))}
            </Animated.ScrollView>
            <View className="flex-row justify-center absolute bottom-2 w-full">
              {quickActions.map((_, index) => {
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
          </Card>

          {/* Product Categories - "See All" as Plain Text in Header and Scrollbar */}
          <View className="mb-6 mt-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text style={{ color: COLORS.dark, fontSize: 20, fontWeight: 'bold' }}>
                Product Categories
              </Text>
              <TouchableOpacity
                onPress={navigateToCategories}
              >
                <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: 'bold' }}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
              <View className="flex-row">
                {displayCategories.map((category, index) => (
                  <TouchableOpacity
                    key={index}
                    className="mr-4 items-center"
                    onPress={() => router.push({ pathname: '/(tabs)/inventory/products', params: { category: category.name } })}
                    onPressIn={() => handlePressIn(`category-${index}`)}
                    onPressOut={() => handlePressOut(`category-${index}`)}
                  >
                    <Animated.View style={{ transform: [{ scale: getScaleValue(`category-${index}`) }] }}>
                      <View className='mt-2' style={{ backgroundColor: COLORS.white, borderRadius: 45, padding: 5 }}>
                        <ImageBackground
                          source={{ uri: category.image }}
                          style={{ width: 90, height: 90, borderRadius: 45, overflow: 'hidden' }}
                          onError={() => console.log(`Failed to load image for category: ${category.name}`)}
                        />
                      </View>
                      <Text className='text-center mt-2' style={{ color: COLORS.dark, fontSize: 16, fontWeight: 'bold', marginTop: 8 }}>
                        {category.name}
                      </Text>
                    </Animated.View>
                  </TouchableOpacity>
                ))}
                {displayCategories.length > 0 && (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, padding: 8 }}
                    onPress={navigateToCategories}
                    onPressIn={() => handlePressIn('category-see-all-scroll')}
                    onPressOut={() => handlePressOut('category-see-all-scroll')}
                  >
                    <Animated.View style={{ transform: [{ scale: getScaleValue('category-see-all-scroll') }] }}>
                      <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: 'bold', marginRight: 4 }}>
                        See All
                      </Text>
                      <ChevronRight size={18} color={COLORS.primary} />
                    </Animated.View>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>

          {/* Product Inventory - "See All" as Plain Text in Header and Scrollbar */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3 mt-4">
              <Text style={{ color: COLORS.dark, fontSize: 20, fontWeight: 'bold' }}>
                Product Inventory
              </Text>
              <TouchableOpacity
                onPress={navigateToProducts}
              >
                <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: 'bold' }}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <Card style={{ ...cardShadow }} className="rounded-2xl">
              <CardContent className="pt-5 px-5 pb-5">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
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
                        onPressIn={() => handlePressIn(`filter-${f}`)}
                        onPressOut={() => handlePressOut(`filter-${f}`)}
                      >
                        <Animated.View style={{ transform: [{ scale: getScaleValue(`filter-${f}`) }] }}>
                          <Text style={{ color: COLORS.dark, fontSize: 14 }}>
                            {f}
                          </Text>
                        </Animated.View>
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
                      onPressIn={() => handlePressIn('sort')}
                      onPressOut={() => handlePressOut('sort')}
                    >
                      <Animated.View style={{ transform: [{ scale: getScaleValue('sort') }] }}>
                        <Text style={{ color: COLORS.dark, fontSize: 14 }}>
                          Sort by: {sortBy}
                        </Text>
                        <ChevronDown size={18} color={COLORS.gray} style={{ marginLeft: 4 }} />
                      </Animated.View>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
                {sortedProducts.length === 0 ? (
                  <View className="items-center justify-center py-6">
                    <Text style={{ color: COLORS.gray }} className="text-base text-center">
                      No products available.
                    </Text>
                    <TouchableOpacity
                      style={{ backgroundColor: COLORS.primary }}
                      className="py-3 px-6 rounded-lg mt-4"
                      onPress={navigateToProducts}
                      onPressIn={() => handlePressIn('add-products')}
                      onPressOut={() => handlePressOut('add-products')}
                    >
                      <Animated.View style={{ transform: [{ scale: getScaleValue('add-products') }] }}>
                        <Text style={{ color: COLORS.white }} className="text-base font-medium">
                          Add Products
                        </Text>
                      </Animated.View>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
                    <View className="flex-row">
                      {sortedProducts.map((product, index) => {
                        const productImage = getProductImageByCategory(product);
                        const isFallback = productImage === FALLBACK_PRODUCT_IMAGE || productImage === FALLBACK_CATEGORY_IMAGE;
                        return (
                          <TouchableOpacity
                            key={index}
                            style={{ width: PRODUCT_CARD_WIDTH, marginRight: 12 }}
                            onPress={() => router.push({ pathname: '/(tabs)/inventory/products', params: { productId: product.id } })}
                            onPressIn={() => handlePressIn(`product-${index}`)}
                            onPressOut={() => handlePressOut(`product-${index}`)}
                          >
                            <Animated.View style={{ transform: [{ scale: getScaleValue(`product-${index}`) }] }}>
                              <Card
                                style={{
                                  backgroundColor: COLORS.white,
                                  borderColor: COLORS.lightPurple,
                                  borderWidth: 1,
                                  ...cardShadow,
                                }}
                                className="rounded-2xl"
                              >
                                <ImageBackground
                                  source={{ uri: productImage }}
                                  style={{ width: '100%', height: 100 }}
                                  className="rounded-t-2xl overflow-hidden"
                                  onError={() => console.log(`Failed to load image for product: ${product.name}`)}
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
                                    className="text-base font-medium mb-1"
                                    numberOfLines={1}
                                  >
                                    {product.name}
                                  </Text>
                                  <Text style={{ color: COLORS.gray }} className="text-sm">
                                    Value: ₹{(product.costPrice * product.quantity).toFixed(0)}
                                  </Text>
                                  {product.category && (
                                    <Text style={{ color: COLORS.gray }} className="text-sm mt-1">
                                      Category: {product.category}
                                    </Text>
                                  )}
                                </CardContent>
                              </Card>
                            </Animated.View>
                          </TouchableOpacity>
                        );
                      })}
                      {sortedProducts.length > 0 && (
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, padding: 8 }}
                          onPress={navigateToProducts}
                          onPressIn={() => handlePressIn('product-see-all-scroll')}
                          onPressOut={() => handlePressOut('product-see-all-scroll')}
                        >
                          <Animated.View style={{ transform: [{ scale: getScaleValue('product-see-all-scroll') }] }}>
                            <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: 'bold', marginRight: 4 }}>
                              See All
                            </Text>
                            <ChevronRight size={18} color={COLORS.primary} />
                          </Animated.View>
                        </TouchableOpacity>
                      )}
                    </View>
                  </ScrollView>
                )}
              </CardContent>
            </Card>
          </View>

          {/* Inventory Alerts */}
          <Card style={{ ...cardShadow }} className="mb-6 rounded-2xl">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle style={{ color: COLORS.dark }} className="text-xl font-bold">
                Inventory Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-5">
              {lowStockProductsCount > 0 && (
                <View className="flex-row items-center py-2">
                  <View style={{ backgroundColor: COLORS.lightYellow, borderRadius: 999, padding: 8, marginRight: 12 }}>
                    <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: 'bold' }}>
                      {lowStockProductsCount}
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.dark }} className="text-base">
                    Products with low stock
                  </Text>
                </View>
              )}
              {outOfStockProductsCount > 0 && (
                <View className="flex-row items-center py-2">
                  <View style={{ backgroundColor: COLORS.lightRed, borderRadius: 999, padding: 8, marginRight: 12 }}>
                    <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: 'bold' }}>
                      {outOfStockProductsCount}
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.dark }} className="text-base">
                    Products out of stock
                  </Text>
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
                onPressIn={() => handlePressIn('view-inventory')}
                onPressOut={() => handlePressOut('view-inventory')}
              >
                <Animated.View style={{ transform: [{ scale: getScaleValue('view-inventory') }] }}>
                  <Text style={{ color: COLORS.white }} className="text-base font-medium">
                    View All Inventory
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            </CardContent>
          </Card>

          {/* Insights (Recent Sales + Store Performance) */}
          <Card style={{ ...cardShadow }} className="mb-6 rounded-2xl">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle style={{ color: COLORS.dark }} className="text-xl font-bold">
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-5">
              {/* Recent Sales */}
              <TouchableOpacity
                className="flex-row justify-between items-center py-3"
                onPress={() => setInsightsExpanded({ ...insightsExpanded, sales: !insightsExpanded.sales })}
              >
                <Text style={{ color: COLORS.dark, fontSize: 16, fontWeight: 'bold' }}>
                  Recent Sales
                </Text>
                {insightsExpanded.sales ? <ChevronUp size={20} color={COLORS.gray} /> : <ChevronDown size={20} color={COLORS.gray} />}
              </TouchableOpacity>
              {insightsExpanded.sales && (
                <View className="items-center py-4">
                  <Text style={{ color: COLORS.gray }} className="text-base text-center mb-3">
                    No recent sales data available.
                  </Text>
                  <TouchableOpacity
                    style={{ backgroundColor: COLORS.secondary }}
                    className="py-3 px-6 rounded-lg"
                    onPress={navigateToNewSale}
                    onPressIn={() => handlePressIn('new-sale')}
                    onPressOut={() => handlePressOut('new-sale')}
                  >
                    <Animated.View style={{ transform: [{ scale: getScaleValue('new-sale') }] }}>
                      <Text style={{ color: COLORS.white }} className="text-base font-medium">
                        Create New Sale
                      </Text>
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              )}
              {/* Store Performance */}
              <TouchableOpacity
                className="flex-row justify-between items-center py-3"
                onPress={() => setInsightsExpanded({ ...insightsExpanded, performance: !insightsExpanded.performance })}
              >
                <Text style={{ color: COLORS.dark, fontSize: 16, fontWeight: 'bold' }}>
                  Store Performance
                </Text>
                {insightsExpanded.performance ? <ChevronUp size={20} color={COLORS.gray} /> : <ChevronDown size={20} color={COLORS.gray} />}
              </TouchableOpacity>
              {insightsExpanded.performance && (
                <View className="items-center py-4">
                  <View style={{ backgroundColor: COLORS.lightBlue, borderRadius: 999, padding: 12, marginBottom: 8 }}>
                    <TrendingUp size={28} color={COLORS.secondary} />
                  </View>
                  <Text style={{ color: COLORS.dark }} className="text-base text-center mb-1 font-medium">
                    Start tracking your sales
                  </Text>
                  <Text style={{ color: COLORS.gray }} className="text-sm text-center mb-3">
                    Create sales to see your store's performance over time.
                  </Text>
                  <TouchableOpacity
                    style={{ backgroundColor: COLORS.lightPurple }}
                    className="py-3 px-6 rounded-lg"
                    onPress={navigateToReports}
                    onPressIn={() => handlePressIn('view-reports')}
                    onPressOut={() => handlePressOut('view-reports')}
                  >
                    <Animated.View style={{ transform: [{ scale: getScaleValue('view-reports') }] }}>
                      <Text style={{ color: COLORS.primary }} className="text-base font-medium">
                        View Reports
                      </Text>
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              )}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}