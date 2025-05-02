import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Platform, Image } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Product } from '~/lib/stores/types';
import { useProductStore } from '~/lib/stores/productStore';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { Input } from '~/components/ui/input';
import { Button as ShadcnButton } from '~/components/ui/button';
import { MaterialIcons } from '@expo/vector-icons';

const ProductManagementScreen = () => {
  const { products: rawProducts, fetchProducts, addProduct, updateProduct, deleteProduct } = useProductStore();
  const products = useMemo(() => rawProducts.map(product => ({
    ...product,
    isActive: product.isActive ?? true,
    imageUri: product.imageUri ?? '', // Ensure imageUri is always defined
  })), [rawProducts]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: '',
    name: '',
    costPrice: '',
    sellingPrice: '',
    quantity: '',
    unit: 'piece', // Kept for UI purposes
    imageUri: '', // Kept for UI purposes
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Derive unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(c => c))).sort();
    return ['All', ...cats];
  }, [products]);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'All') return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  // Calculate profit
  const profit = useMemo(() => {
    const cost = parseFloat(form.costPrice) || 0;
    const selling = parseFloat(form.sellingPrice) || 0;
    return (selling - cost).toFixed(2);
  }, [form.costPrice, form.sellingPrice]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setForm({ ...form, imageUri: result.assets[0].uri });
    }
  }, [form]);

  const isFormValid = useCallback(() => {
    return (
      form.name.trim() !== '' &&
      !isNaN(parseFloat(form.costPrice)) &&
      parseFloat(form.costPrice) > 0 &&
      !isNaN(parseFloat(form.sellingPrice)) &&
      parseFloat(form.sellingPrice) > 0 &&
      (form.quantity === '' || !isNaN(parseInt(form.quantity)))
    );
  }, [form]);

  const handleAddProduct = useCallback(async () => {
    if (isLoading || !isFormValid()) {
      setError('Please fill in all required fields correctly.');
      return;
    }
    setIsLoading(true);
    try {
      await addProduct({
        category: form.category || undefined,
        name: form.name,
        costPrice: parseFloat(form.costPrice),
        sellingPrice: parseFloat(form.sellingPrice),
        quantity: parseInt(form.quantity) || 0,
        imageUri: form.imageUri || undefined, // Include imageUri
        isActive: false,
        unit: ''
      });
      resetForm();
      setDialogOpen(false);
      setError(null);
    } catch (error) {
      setError('Failed to add product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [form, addProduct, isLoading, isFormValid]);

  const handleEditClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    setForm({
      category: product.category || '',
      name: product.name,
      costPrice: product.costPrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      quantity: product.quantity.toString(),
      unit: 'piece', // Default since not in DB
      imageUri: product.imageUri || '', // Use product's imageUri
    });
    setSelectedImage(product.imageUri || null); // Set selectedImage for UI
    setFormMode('edit');
    setDialogOpen(true);
    setError(null);
  }, []);

  const handleDeleteClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  }, []);

  const handleEditSubmit = useCallback(async () => {
    if (isLoading || !isFormValid() || !selectedProduct) {
      setError('Please fill in all required fields correctly.');
      return;
    }
    setIsLoading(true);
    try {
      const updatedFields = {
        category: form.category || undefined,
        name: form.name,
        costPrice: parseFloat(form.costPrice),
        sellingPrice: parseFloat(form.sellingPrice),
        quantity: parseInt(form.quantity) || 0,
        imageUri: form.imageUri || undefined, // Include imageUri
      };
      await updateProduct(selectedProduct.id, updatedFields);
      setDialogOpen(false);
      resetForm();
      setFormMode('add');
      setSelectedProduct(null);
      setError(null);
      fetchProducts();
    } catch (error) {
      setError('Failed to update product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [form, updateProduct, selectedProduct, isLoading, isFormValid, fetchProducts]);

  const handleDelete = useCallback(async () => {
    if (selectedProduct) {
      try {
        await deleteProduct(selectedProduct.id);
        setDeleteDialogOpen(false);
        setSelectedProduct(null);
        setError(null);
      } catch (error) {
        setError('Failed to delete product. Please try again.');
      }
    }
  }, [selectedProduct, deleteProduct]);

  const resetForm = useCallback(() => {
    setForm({
      category: '',
      name: '',
      costPrice: '',
      sellingPrice: '',
      quantity: '',
      unit: 'piece',
      imageUri: '',
    });
    setSelectedImage(null);
  }, []);

  return (
    <View className="p-4 flex-1 bg-background">
      <View className="flex-row justify-between items-center mb-4 gap-x-2">
        <Text className="text-2xl font-bold text-foreground">Products</Text>
        <View className="flex-row gap-x-2">
          <ShadcnButton
            onPress={() => setFilterDialogOpen(true)}
            disabled={isLoading}
          >
            <Text className="text-primary-foreground">Filter</Text>
          </ShadcnButton>
          <ShadcnButton
            onPress={() => {
              resetForm();
              setFormMode('add');
              setDialogOpen(true);
              setError(null);
            }}
            disabled={isLoading}
          >
            <Text className="text-primary-foreground">Add Product</Text>
          </ShadcnButton>
        </View>
      </View>

      {error && !dialogOpen && (
        <Text className="text-destructive text-center mb-4">{error}</Text>
      )}

      <FlashList
        data={filteredProducts}
        keyExtractor={(item: Product) => item.id}
        renderItem={({ item }: { item: Product }) => (
          <Card className="mb-3 overflow-hidden">
            <CardHeader className="pb-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  {item.imageUri ? (
                    <Image
                      source={{ uri: item.imageUri }}
                      style={{ width: 50, height: 50 }}
                      className="rounded-md mr-3"
                    />
                  ) : (
                    <View className="w-[50px] h-[50px] rounded-md mr-3 bg-muted" />
                  )}
                  <View>
                    <CardTitle className="text-foreground">{item.name}</CardTitle>
                    {item.category && (
                      <Text className="text-sm text-muted-foreground">{item.category}</Text>
                    )}
                  </View>
                </View>
                <View>
                  <Text className="text-xs text-muted-foreground">Stock</Text>
                  <Text className="text-foreground">{item.quantity} piece</Text>
                </View>
              </View>
            </CardHeader>
            <CardContent className="py-2">
              <View className="flex-row flex-wrap">
                <View className="w-1/2 mb-1 pr-1">
                  <Text className="text-xs text-muted-foreground">Cost</Text>
                  <Text className="text-foreground">₹{item.costPrice.toFixed(2)}</Text>
                </View>
                <View className="w-1/2 mb-1 pl-1">
                  <Text className="text-xs text-muted-foreground">Selling</Text>
                  <Text className="text-foreground">₹{item.sellingPrice.toFixed(2)}</Text>
                </View>
              </View>
            </CardContent>
            <CardFooter className="flex-row justify-end pt-2 pb-3 px-4 gap-x-2 bg-muted/50">
              <ShadcnButton
                variant="ghost"
                size="sm"
                onPress={() => handleEditClick(item)}
                disabled={isLoading}
              >
                <MaterialIcons name="edit" size={20} color="#3B82F6" />
              </ShadcnButton>
              <ShadcnButton
                variant="ghost"
                size="sm"
                onPress={() => handleDeleteClick(item)}
                disabled={isLoading}
              >
                <MaterialIcons name="delete" size={20} color="#EF4444" />
              </ShadcnButton>
            </CardFooter>
          </Card>
        )}
        estimatedItemSize={150} // Approximate height of each card
      />

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="p-6 bg-background rounded-lg shadow-lg max-w-md w-full mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Filter by Category</DialogTitle>
          </DialogHeader>
          <View className="my-4">
            <Picker
              selectedValue={selectedCategory || 'All'}
              onValueChange={(value) => setSelectedCategory(value === 'All' ? null : value)}
              style={{ color: Platform.OS === 'ios' ? '#000' : undefined, fontSize: 16 }}
              dropdownIconColor={Platform.OS === 'android' ? '#999' : undefined}
            >
              {categories.map(cat => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
          <DialogFooter className="flex-row justify-end gap-x-3">
            <ShadcnButton
              variant="outline"
              onPress={() => setFilterDialogOpen(false)}
            >
              <Text>Cancel</Text>
            </ShadcnButton>
            <ShadcnButton
              onPress={() => setFilterDialogOpen(false)}
            >
              <Text className="text-white">Apply</Text>
            </ShadcnButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          resetForm();
          setFormMode('add');
          setSelectedProduct(null);
          setError(null);
        }
      }}>
        <DialogContent className="p-0 bg-background rounded-lg shadow-lg max-w-lg w-full mx-auto">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle className="text-xl font-bold text-foreground">
              {formMode === 'edit' ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <View className="space-y-4 p-4 w-[320px]">
            {error && (
              <Text className="text-destructive text-center">{error}</Text>
            )}
            <View>
              <Text className="mb-2 text-base font-semibold text-muted-foreground">Category (Optional)</Text>
              <Input
                placeholder="e.g., Groceries, Electronics"
                value={form.category}
                onChangeText={(text) => setForm({ ...form, category: text })}
                className="h-12 rounded-md text-base"
                editable={!isLoading}
              />
            </View>
            <View>
              <Text className="mb-2 mt-4 text-base font-semibold text-muted-foreground">
                Product Name <Text className="text-destructive">*</Text>
              </Text>
              <Input
                placeholder="Enter product name"
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
                className="h-12 rounded-md text-base"
                editable={!isLoading}
              />
            </View>
            <View className="flex-row gap-x-4 mt-4">
              <View className="flex-1">
                <Text className="mb-2 text-base font-semibold text-muted-foreground">
                  Cost Price (₹) <Text className="text-destructive">*</Text>
                </Text>
                <Input
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={form.costPrice}
                  onChangeText={(text) => setForm({ ...form, costPrice: text })}
                  className="h-12 rounded-md text-base"
                  editable={!isLoading}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-2 text-base font-semibold text-muted-foreground">
                  Selling Price (₹) <Text className="text-destructive">*</Text>
                </Text>
                <Input
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={form.sellingPrice}
                  onChangeText={(text) => setForm({ ...form, sellingPrice: text })}
                  className="h-12 rounded-md text-base"
                  editable={!isLoading}
                />
                <Text className="mt-2 text-sm text-foreground">
                  Profit: ₹{profit} {parseFloat(profit) < 0 ? '(Loss)' : ''}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-x-4 mt-4">
              <View className="flex-1">
                <Text className="mb-2 text-base font-semibold text-muted-foreground">Quantity</Text>
                <Input
                  placeholder="0"
                  keyboardType="numeric"
                  value={form.quantity}
                  onChangeText={(text) => setForm({ ...form, quantity: text })}
                  className="h-12 rounded-md text-base"
                  editable={!isLoading}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-2 text-base font-semibold text-muted-foreground">Unit</Text>
                <View className="border border-input rounded-md bg-background h-12 justify-center">
                  <Picker
                    selectedValue={form.unit}
                    onValueChange={(value) => setForm({ ...form, unit: value })}
                    style={{ color: Platform.OS === 'ios' ? '#000' : undefined, fontSize: 16 }}
                    dropdownIconColor={Platform.OS === 'android' ? '#999' : undefined}
                  >
                    <Picker.Item label="Piece" value="piece" />
                    <Picker.Item label="Kilogram (kg)" value="kg" />
                    <Picker.Item label="Gram (g)" value="g" />
                    <Picker.Item label="Liter (l)" value="l" />
                    <Picker.Item label="Milliliter (ml)" value="ml" />
                    <Picker.Item label="Dozen" value="dozen" />
                    <Picker.Item label="Box" value="box" />
                    <Picker.Item label="Packet" value="packet" />
                  </Picker>
                </View>
              </View>
            </View>
            <View>
              <Text className="mb-2 mt-4 text-base font-semibold text-muted-foreground">Product Image</Text>
              <ShadcnButton
                variant="outline"
                className="w-full h-12"
                onPress={pickImage}
                disabled={isLoading}
              >
                <Text className="text-base">{form.imageUri ? 'Change Image' : 'Select Image'}</Text>
              </ShadcnButton>
              {selectedImage && (
                <View className="mt-4 items-center">
                  <Image
                    source={{ uri: selectedImage }}
                    style={{ width: 128, height: 128 }}
                    className="rounded-md border border-border"
                  />
                </View>
              )}
            </View>
          </View>
          <DialogFooter className="p-6 pt-4 flex-row justify-end gap-x-3 border-t border-border">
            <ShadcnButton
              variant="outline"
              size="lg"
              className="h-12 px-6"
              onPress={() => {
                setDialogOpen(false);
                resetForm();
                setFormMode('add');
                setSelectedProduct(null);
                setError(null);
              }}
              disabled={isLoading}
            >
              <Text className="text-base">Cancel</Text>
            </ShadcnButton>
            <ShadcnButton
              size="lg"
              className="h-12 px-6"
              onPress={formMode === 'edit' ? handleEditSubmit : handleAddProduct}
              disabled={isLoading || !isFormValid()}
            >
              <Text className="text-white">{formMode === 'edit' ? 'Save Changes' : 'Add Product'}</Text>
            </ShadcnButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <Text>
              This will permanently delete the product "{selectedProduct?.name}". This action cannot be undone.
            </Text>
          </DialogHeader>
          <DialogFooter>
            <ShadcnButton onPress={() => setDeleteDialogOpen(false)} disabled={isLoading}>
              <Text className="text-base">Cancel</Text>
            </ShadcnButton>
            <ShadcnButton onPress={handleDelete} disabled={isLoading}>
              <Text className="text-white">Delete</Text>
            </ShadcnButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default ProductManagementScreen;