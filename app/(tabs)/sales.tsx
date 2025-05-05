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

  // Update displayProducts when products or cartItems change
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

  const handleSelectProduct = useCallback(
    (product: Product) => {
      setCartItems((prevCart) => {
        const existingItemIndex = prevCart.findIndex((item) => item.id === product.id);
        const quantityInCart = existingItemIndex !== -1 ? prevCart[existingItemIndex].quantityInCart : 0;

        // Check available stock from displayProducts, which accounts for cart quantities
        const displayProduct = displayProducts.find((p) => p.id === product.id);
        const availableStock = displayProduct ? displayProduct.quantity : product.quantity;

        if (availableStock <= 0) {
          Alert.alert(
            "Stock Limit Reached",
            `Cannot add more ${product.name}${product.category ? ` (${product.category})` : ''}. No more in stock.`,
            [{ text: "OK" }]
          );
          return prevCart;
        }

        let updatedCart;
        if (existingItemIndex !== -1) {
          updatedCart = [...prevCart];
          updatedCart[existingItemIndex] = {
            ...updatedCart[existingItemIndex],
            quantityInCart: updatedCart[existingItemIndex].quantityInCart + 1,
          };
        } else {
          updatedCart = [...prevCart, { ...product, quantityInCart: 1 }];
        }

        setIsCartOpen(true);
        return updatedCart;
      });
    },
    [displayProducts]
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
            `Cannot add more ${item.name}${item.category ? ` (${item.category})` : ''}. No more in stock.`,
            [{ text: "OK" }]
          );
          return prevCart;
        }

        const updatedCart = [...prevCart];
        updatedCart[itemIndex] = {
          ...item,
          quantityInCart: item.quantityInCart + 1,
        };
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
          const updatedCart = [...prevCart];
          updatedCart[itemIndex] = {
            ...item,
            quantityInCart: item.quantityInCart - 1,
          };
          return updatedCart;
        } else {
          const newCart = prevCart.filter((i) => i.id !== productId);
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
    <TouchableOpacity onPress={() => handleSelectProduct(item)} disabled={item.quantity <= 0}>
      <Card className={`mb-3 overflow-hidden bg-card border border-border ${item.quantity <= 0 ? 'opacity-50' : ''}`}>
        <CardContent className="p-4 flex-row items-center">
          {item.imageUri ? (
            <Image
              source={{ uri: item.imageUri }}
              style={{ width: 50, height: 50 }}
              className="rounded-md mr-3"
              resizeMode="cover"
            />
          ) : (
            <View className="w-12 h-12 rounded-md mr-3 bg-muted items-center justify-center">
              <Package size={24} className="text-muted-foreground" />
            </View>
          )}
          <View className="flex-1 mr-2">
            <Text className="text-base font-medium text-foreground" numberOfLines={1}>
              {item.name}
            </Text>
            <View className="flex-row items-center mt-1 flex-wrap">
              {item.quantity > 0 ? (
                <View
                  className={`mr-2 px-2 py-0.5 rounded ${
                    item.quantity > 5 ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      item.quantity > 5 ? 'text-green-700 dark:text-green-200' : 'text-yellow-700 dark:text-yellow-200'
                    }`}
                  >
                    Stock: {item.quantity}
                  </Text>
                </View>
              ) : (
                <View className="mr-2 px-2 py-0.5 rounded bg-red-100 dark:bg-red-900">
                  <Text className="text-xs text-red-700 dark:text-red-200">Out of Stock</Text>
                </View>
              )}
              {item.category && (
                <View className="px-2 py-0.5 rounded border border-border mt-1 sm:mt-0">
                  <Text className="text-xs text-muted-foreground">{item.category}</Text>
                </View>
              )}
            </View>
          </View>
          <View className="items-end">
            <Text className="text-base font-semibold text-primary">₹{item.sellingPrice.toFixed(2)}</Text>
          </View>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }: { item: CartItem }) => {
    const handleQuantityChange = (text: string) => {
      const newQuantity = parseInt(text.replace(/[^0-9]/g, ''), 10);
      const productInStore = products.find((p) => p.id === item.id);
      if (!productInStore) return;

      const currentInCart = item.quantityInCart;
      const maxAllowed = productInStore.quantity + currentInCart;

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

      if (newQuantity > maxAllowed) {
        Alert.alert(
          "Stock Limit Reached",
          `Cannot set quantity to ${newQuantity}. Only ${maxAllowed} ${item.name}${
            item.category ? ` (${item.category})` : ''
          } in stock.`,
          [{ text: "OK", onPress: () => updateItemQuantity(item.id, maxAllowed) }]
        );
        updateItemQuantity(item.id, maxAllowed);
        return;
      }

      updateItemQuantity(item.id, newQuantity);
    };

    return (
      <View className="flex-row items-center py-3 border-b border-border ">
        <View className="flex-1 mr-2">
          <Text className="text-base font-medium text-foreground" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {item.category || 'Uncategorized'}
          </Text>
          <Text className="text-xs text-muted-foreground mt-1">₹{item.sellingPrice.toFixed(2)} each</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => decreaseQuantity(item.id)} className="p-1">
            <MinusCircle size={22} color="#EF4444" />
          </TouchableOpacity>
          <TextInput
            className="border border-input bg-background rounded-md w-12 h-9 text-center mx-1 text-base text-foreground"
            value={item.quantityInCart.toString()}
            onChangeText={handleQuantityChange}
            keyboardType="number-pad"
            selectTextOnFocus
            maxLength={3}
          />
          <TouchableOpacity onPress={() => increaseQuantity(item.id)} className="p-1">
            <PlusCircle size={22} color="#3B82F6" />
          </TouchableOpacity>
        </View>
        <Text className="text-base font-medium text-foreground w-20 text-right ml-2">
          ₹{(item.sellingPrice * item.quantityInCart).toFixed(2)}
        </Text>
        <TouchableOpacity onPress={() => removeCartItem(item.id)} className="ml-2 p-1">
          <XCircle size={20} className="text-muted-foreground" />
        </TouchableOpacity>
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
        <DialogContent className="p-0 bg-background rounded-lg shadow-lg max-w-md w-auto mx-auto">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle className="text-xl font-bold text-foreground flex-row items-center">
              <ShoppingCart size={24} color="#3B82F6" className="mr-2" />
              <Text>Current Sale</Text>
            </DialogTitle>
          </DialogHeader>
          <View className="p-4" style={{ maxHeight: 400 }}>
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
                <Button variant="outline" className="h-12 flex-1" onPress={clearCart}>
                  <Text className="text-muted-foreground">Clear Sale</Text>
                </Button>
                <Button className="h-12 flex-1" onPress={handleProceedToPayment}>
                  <Text className="text-white font-semibold">Proceed to Payment</Text>
                </Button>
              </DialogFooter>
            </View>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Sale Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="p-6 bg-background rounded-lg shadow-lg max-w-md w-full mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Confirm Sale</DialogTitle>
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
        <DialogContent className="p-6 bg-background rounded-lg shadow-lg max-w-md w-full mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Clear Cart</DialogTitle>
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