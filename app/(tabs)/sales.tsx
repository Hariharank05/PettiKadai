// ~/app/(tabs)/sales.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
  StyleSheet,
  TextInput,
  Keyboard,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Package, PlusCircle, MinusCircle, XCircle, Search, ShoppingCart, AlertCircle } from 'lucide-react-native';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
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

// Define the structure for items in the cart
interface CartItem extends Product {
  quantityInCart: number;
}

export default function SalesScreen() {
  const router = useRouter();
  const { products, fetchProducts } = useProductStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  // Load products function
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

  // Refresh function
  const onRefresh = useCallback(() => {
    console.log("ON REFRESH: Called");
    setRefreshing(true);
    fetchProducts().finally(() => setRefreshing(false));
  }, [fetchProducts]);

  // Initial product load effect
  useEffect(() => {
    console.log("SALES SCREEN: Initial mount effect");
    setIsLoading(true);
    fetchProducts().finally(() => setIsLoading(false));
  }, [fetchProducts]);

  // Update displayProducts and sync selectedQuantities when products or cartItems change
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

      // Sync selectedQuantities with cartItems
      const updatedQuantities: Record<string, number> = {};
      cartItems.forEach((item) => {
        updatedQuantities[item.id] = item.quantityInCart;
      });
      setSelectedQuantities(updatedQuantities);

      // Log products for debugging (once per render)
      // console.log('Rendering ProductItems:', updatedProducts);
    }
  }, [products, cartItems]);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return displayProducts;
    return displayProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [displayProducts, searchQuery]);

  // --- Cart Logic ---
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
            if (newCart.length === 0) {
              setIsCartOpen(false);
            }
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
        const displayProduct = displayProducts.find((p) => p.id === productId);
        const availableStock = displayProduct ? displayProduct.quantity : 0;

        if (availableStock <= 0) {
          Alert.alert(
            "Stock Limit Reached",
            `Cannot add more ${item.name || 'product'}${item.category ? ` (${item.category})` : ''}. No more in stock.`,
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
    [displayProducts]
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

  // --- Calculations ---
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

  // --- Render Functions ---
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
            className="text-sm font-medium text-foreground"
            numberOfLines={1}
            style={{ color: '#000', backgroundColor: 'transparent' }}
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
              className="text-xs text-muted-foreground"
              style={{ color: '#6B7280', backgroundColor: 'transparent' }}
            >
              {item.category || 'No category'}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <Text className="text-sm font-semibold text-primary mr-2">₹{item.sellingPrice.toFixed(2)}</Text>
          <TouchableOpacity
            onPress={() => decreaseListQuantity(item.id)}
            disabled={item.quantity <= 0 || (selectedQuantities[item.id] || 0) <= 0}
            className="p-1"
          >
            <MinusCircle size={18} color={(item.quantity <= 0 || (selectedQuantities[item.id] || 0) <= 0) ? '#9CA3AF' : '#EF4444'} />
          </TouchableOpacity>
          <TextInput
            className="bg-background rounded w-10 h-7 text-center text-sm text-foreground"
            keyboardType="number-pad"
            value={String(selectedQuantities[item.id] || 0)}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              if (isNaN(num) || num < 0) {
                setSelectedQuantities((prev) => ({ ...prev, [item.id]: 0 }));
                setCartItems((prevCart) => prevCart.filter((i) => i.id !== item.id));
              } else if (num <= item.quantity) {
                setSelectedQuantities((prev) => ({ ...prev, [item.id]: num }));
                setCartItems((prevCart) => {
                  const existingItem = prevCart.find((i) => i.id === item.id);
                  const originalProduct = products.find((p) => p.id === item.id);
                  if (!originalProduct) return prevCart;
                  if (num === 0) {
                    return prevCart.filter((i) => i.id !== item.id);
                  }
                  if (existingItem) {
                    return prevCart.map((i) =>
                      i.id === item.id ? { ...i, quantityInCart: num } : i
                    );
                  }
                  return [...prevCart, { ...originalProduct, quantityInCart: num }];
                });
              } else {
                setSelectedQuantities((prev) => ({ ...prev, [item.id]: item.quantity }));
                setCartItems((prevCart) => {
                  const existingItem = prevCart.find((i) => i.id === item.id);
                  const originalProduct = products.find((p) => p.id === item.id);
                  if (!originalProduct) return prevCart;
                  if (existingItem) {
                    return prevCart.map((i) =>
                      i.id === item.id ? { ...i, quantityInCart: item.quantity } : i
                    );
                  }
                  return [...prevCart, { ...originalProduct, quantityInCart: item.quantity }];
                });
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
            onPress={() => addToCart(item.id, selectedQuantities[item.id] || 1)}
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
    console.log('Rendering CartItem:', item); // Debug log to inspect data
    const handleQuantityChange = (text: string) => {
      const newQuantity = parseInt(text.replace(/[^0-9]/g, ''), 10);
      const productInStore = products.find((p) => p.id === item.id);
      if (!productInStore) {
        console.error(`Product with ID ${item.id} not found in store`);
        return;
      }

      const currentInCart = item.quantityInCart;
      const maxAllowed = productInStore.quantity + currentInCart;

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

      if (newQuantity > maxAllowed) {
        Alert.alert(
          "Stock Limit Reached",
          `Cannot set quantity to ${newQuantity}. Only ${maxAllowed} ${item.name || 'product'}${item.category ? ` (${item.category})` : ''} in stock.`,
          [{ text: "OK", onPress: () => {
            updateItemQuantity(item.id, maxAllowed);
            setSelectedQuantities((prev) => ({ ...prev, [item.id]: maxAllowed }));
          } }]
        );
        return;
      }

      updateItemQuantity(item.id, newQuantity);
      setSelectedQuantities((prev) => ({ ...prev, [item.id]: newQuantity }));
    };

    return (
      <View className="flex-row items-center py-3 px-4 border-b border-border bg-card rounded-lg mb-2">
        {item.imageUri ? (
          <Image
            source={{ uri: item.imageUri }}
            style={{ width: 40, height: 40 }}
            className="rounded-md mr-3"
            resizeMode="cover"
            onError={(e) => console.log(`Cart image load error for ${item.name}:`, e.nativeEvent.error)}
          />
        ) : (
          <View className="w-10 h-10 rounded-md mr-3 bg-muted items-center justify-center">
            <Package size={20} className="text-muted-foreground" />
          </View>
        )}
        <View className="flex-1 mr-4">
          <Text
            className="text-lg font-semibold text-foreground"
            numberOfLines={1}
            style={{ color: '#000', backgroundColor: 'transparent' }}
          >
            {item.name}
          </Text>
          <Text
            className="text-sm text-muted-foreground mt-1"
            style={{ color: '#6B7280', backgroundColor: 'transparent' }}
          >
            {item.category || 'No category'}
          </Text>
          <Text
            className="text-sm text-muted-foreground mt-1"
            style={{ color: '#6B7280', backgroundColor: 'transparent' }}
          >
            ₹{item.sellingPrice.toFixed(2)} each
          </Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => decreaseQuantity(item.id)} className="p-2">
            <MinusCircle size={26} color="#EF4444" />
          </TouchableOpacity>
          <TextInput
            className="border border-input bg-background rounded-md w-16 h-10 text-center mx-2 text-base text-foreground"
            value={item.quantityInCart.toString()}
            onChangeText={handleQuantityChange}
            keyboardType="number-pad"
            selectTextOnFocus
            maxLength={3}
          />
          <TouchableOpacity onPress={() => increaseQuantity(item.id)} className="p-2">
            <PlusCircle size={26} color="#3B82F6" />
          </TouchableOpacity>
          <Text className="text-base font-medium text-foreground w-24 text-right ml-4">
            ₹{(item.sellingPrice * item.quantityInCart).toFixed(2)}
          </Text>
          <TouchableOpacity onPress={() => removeCartItem(item.id)} className="ml-4 p-2">
            <XCircle size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Proceed to Payment Handler
  const handleProceedToPayment = () => {
    if (cartItems.length === 0) return;
    Keyboard.dismiss();
    setIsConfirmDialogOpen(true);
  };

  const confirmSale = () => {
    console.log("Sale Confirmed");
    setCartItems([]);
    setSelectedQuantities({});
    setIsCartOpen(false);
    setIsConfirmDialogOpen(false);
  };

  // --- Main Return ---
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Product Selection Section */}
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
            <Text className="text-muted-foreground mt-2">Loading Products...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <AlertCircle size={40} color="#9CA3AF" />
            <Text className="text-muted-foreground font-medium mt-2">No products found</Text>
            {products.length > 0 && searchQuery !== '' && (
              <Text className="text-muted-foreground text-center mt-1 text-sm">Try adjusting your search.</Text>
            )}
            {products.length === 0 && (
              <View className="items-center mt-4">
                <Text className="text-muted-foreground text-center text-sm mb-2">Your inventory is empty.</Text>
                <Button variant="outline" onPress={() => router.push('/(tabs)/products')}>
                  <Text className="text-primary">Add Your First Product</Text>
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
          />
        )}
      </View>

      {/* Floating Cart Button */}
      {cartItems.length > 0 && !isLoading && (
        <TouchableOpacity
          className="bg-primary rounded-full shadow-lg items-center justify-center absolute bottom-8 right-8 w-16 h-16"
          onPress={() => setIsCartOpen(true)}
        >
          <ShoppingCart size={24} color="white" />
          <View className="bg-destructive rounded-full items-center justify-center absolute -top-1 -right-1 min-w-6 h-6 px-1">
            <Text className="text-white font-bold text-xs">
              {cartItems.reduce((sum, item) => sum + item.quantityInCart, 0)}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Cart Dialog */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="p-0 bg-background rounded-lg shadow-lg max-w-md w-[95%] mx-auto">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle className="text-lg font-bold text-foreground flex-row items-center">
              <ShoppingCart size={22} color="#3B82F6" className="mr-2" />
              <Text>Current Sale</Text>
            </DialogTitle>
          </DialogHeader>
          <View className="p-3" style={{ maxHeight: 400 }}>
            {cartItems.length === 0 ? (
              <View className="items-center justify-center border border-dashed border-border rounded-lg p-6 my-4 min-h-32">
                <ShoppingCart size={40} color="#9CA3AF" />
                <Text className="text-muted-foreground font-medium mt-2">Cart is empty</Text>
                <Text className="text-muted-foreground text-xs mt-1">Select products to add them here</Text>
              </View>
            ) : (
              <FlatList
                data={cartItems}
                renderItem={renderCartItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>
          {cartItems.length > 0 && (
            <View className="border-t border-border p-4">
              <View className="space-y-2 mb-4">
                <View className="flex-row justify-between">
                  <Text className="text-muted-foreground">Subtotal:</Text>
                  <Text className="text-foreground font-medium">₹{subtotal.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-lg font-bold text-foreground">Total:</Text>
                  <Text className="text-lg font-bold text-primary">₹{totalAmount.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-muted-foreground text-sm">Est. Profit:</Text>
                  <Text className="text-green-600 text-sm">₹{totalProfit.toFixed(2)}</Text>
                </View>
              </View>
              <DialogFooter className="flex-row gap-2 pt-2">
                <Button variant="outline" className="h-10 flex-1" onPress={clearCart}>
                  <Text className="text-muted-foreground">Clear Sale</Text>
                </Button>
                <Button className="h-10 flex-1" onPress={handleProceedToPayment}>
                  <Text className="text-white font-semibold">Proceed to Payment</Text>
                </Button>
              </DialogFooter>
            </View>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Sale Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="p-6 bg-background rounded-lg shadow-lg max-w-md w-[95%] mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Confirm Sale</DialogTitle>
          </DialogHeader>
          <View className="my-4">
            <Text className="text-foreground mb-4">Please confirm the following sale:</Text>
            {cartItems.map((item) => (
              <View key={item.id} className="flex-row justify-between py-1">
                <Text className="text-foreground">
                  {item.name} {item.category ? `(${item.category})` : ''} × {item.quantityInCart}
                </Text>
                <Text className="text-foreground">₹{(item.sellingPrice * item.quantityInCart).toFixed(2)}</Text>
              </View>
            ))}
            <Separator className="my-2" />
            <View className="flex-row justify-between py-1">
              <Text className="text-lg font-bold text-foreground">Total:</Text>
              <Text className="text-lg font-bold text-primary">₹{totalAmount.toFixed(2)}</Text>
            </View>
          </View>
          <DialogFooter className="flex-row justify-end gap-x-3">
            <Button variant="outline" onPress={() => setIsConfirmDialogOpen(false)}>
              <Text>Cancel</Text>
            </Button>
            <Button onPress={confirmSale}>
              <Text className="text-white">Confirm Sale</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Cart Confirmation Dialog */}
      <Dialog open={isClearCartDialogOpen} onOpenChange={setIsClearCartDialogOpen}>
        <DialogContent className="p-6 bg-background rounded-lg shadow-lg max-w-md w-[95%] mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Clear Cart</DialogTitle>
          </DialogHeader>
          <View className="my-4">
            <Text className="text-foreground">Are you sure you want to clear all items from the cart?</Text>
          </View>
          <DialogFooter className="flex-row justify-end gap-x-3">
            <Button variant="outline" onPress={() => setIsClearCartDialogOpen(false)}>
              <Text>Cancel</Text>
            </Button>
            <Button variant="destructive" onPress={confirmClearCart}>
              <Text className="text-white">Clear</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  );
}

// --- StyleSheet ---
const styles = StyleSheet.create({
  // Add any platform-specific styles if needed
});