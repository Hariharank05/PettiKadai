import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Platform, Image, ScrollView, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
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
import { Filter, Pencil, Trash2, X, ListFilter } from 'lucide-react-native';

const ProductManagementScreen = () => {
  const { products: rawProducts, fetchProducts, addProduct, updateProduct, deleteProduct } = useProductStore();
  const products = useMemo(() => rawProducts.map(product => ({
    ...product,
    isActive: product.isActive ?? true,
    imageUri: product.imageUri ?? '',
    category: product.category ?? '',
  })), [rawProducts]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: '',
    name: '',
    costPrice: '',
    sellingPrice: '',
    quantity: '',
    unit: 'piece',
    imageUri: '',
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // To force FlashList re-render
  const [categorySearch, setCategorySearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(c => c))).sort();
    return ['Add New Category', ...cats];
  }, [products]);

  const productNames = useMemo(() => {
    const names = Array.from(new Set(products.map(p => p.name).filter(n => n))).sort();
    return ['Add New Product', ...names];
  }, [products]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch) return categories;
    return categories.filter(cat => 
      (cat?.toLowerCase() ?? '').includes(categorySearch.toLowerCase())
    );
  }, [categories, categorySearch]);

  const filteredProductNames = useMemo(() => {
    if (!productSearch) return productNames;
    return productNames.filter(name => 
      name.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [productNames, productSearch]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'All') return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

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
        imageUri: form.imageUri || undefined,
        isActive: false,
        unit: ''
      });
      resetForm();
      setDialogOpen(false);
      setError(null);
      await fetchProducts();
      setRefreshKey(prev => prev + 1); // Force FlashList re-render
    } catch (error) {
      setError('Failed to add product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [form, addProduct, isLoading, isFormValid, fetchProducts]);

  const handleEditClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    setForm({
      category: product.category || '',
      name: product.name,
      costPrice: product.costPrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      quantity: product.quantity.toString(),
      unit: 'piece',
      imageUri: product.imageUri || '',
    });
    setSelectedImage(product.imageUri || null);
    setFormMode('edit');
    setDialogOpen(true);
    setError(null);
    setIsNewCategory(false);
    setIsNewProduct(false);
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
        imageUri: form.imageUri || undefined,
      };
      await updateProduct(selectedProduct.id, updatedFields);
      setDialogOpen(false);
      resetForm();
      setFormMode('add');
      setSelectedProduct(null);
      setError(null);
      await fetchProducts();
      setRefreshKey(prev => prev + 1); // Force FlashList re-render
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
        await fetchProducts();
        setRefreshKey(prev => prev + 1); // Force FlashList re-render
      } catch (error) {
        setError('Failed to delete product. Please try again.');
      }
    }
  }, [selectedProduct, deleteProduct, fetchProducts]);

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
    setCategorySearch('');
    setProductSearch('');
    setIsNewCategory(false);
    setIsNewProduct(false);
  }, []);

  const clearFilter = useCallback(() => {
    setSelectedCategory(null);
    setFilterDialogOpen(false);
  }, []);

  const handleCategoryToggle = useCallback(() => {
    const newIsNewCategory = !isNewCategory;
    setIsNewCategory(newIsNewCategory);
    setForm({ ...form, category: '' });
    setCategorySearch('');
    setIsNewProduct(newIsNewCategory);
    setForm({ ...form, category: '', name: '' });
  }, [isNewCategory, form]);

  const handleProductToggle = useCallback(() => {
    const newIsNewProduct = !isNewProduct;
    setIsNewProduct(newIsNewProduct);
    setForm({ ...form, name: '' });
    setProductSearch('');
    if (!newIsNewProduct) {
      setIsNewCategory(false);
      setForm({ ...form, name: '' });
    }
  }, [isNewProduct, form]);

  return (
    <View className="p-4 flex-1 bg-background">
      <View className="flex-row justify-between items-center mb-4 gap-x-2">
        <Text className="text-2xl font-bold text-foreground">Products</Text>
        <View className="flex-row gap-x-1 items-center">
          {selectedCategory && (
            <ShadcnButton
              variant="ghost"
              size="sm"
              onPress={clearFilter}
              disabled={isLoading}
            >
              <X size={20} color="#EF4444" />
            </ShadcnButton>
          )}
          <ShadcnButton
            variant="ghost"
            size="sm"
            onPress={() => setFilterDialogOpen(true)}
            disabled={isLoading}
          >
            {selectedCategory ? (
              <ListFilter size={24} color="#3B82F6" />
            ) : (
              <Filter size={24} color="#3B82F6" />
            )}
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
        key={refreshKey} // Force re-render after add/edit/delete
        data={filteredProducts}
        keyExtractor={(item: Product) => item.id}
        renderItem={({ item }: { item: Product }) => (
          <Card className="mb-2 overflow-hidden">
            <CardHeader className="py-2 px-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  {item.imageUri ? (
                    <Image
                      source={{ uri: item.imageUri }}
                      style={{ width: 40, height: 40 }}
                      className="rounded-md mr-2"
                    />
                  ) : (
                    <View className="w-[40px] h-[40px] rounded-md mr-2 bg-muted" />
                  )}
                  <View>
                    <CardTitle className="text-base text-foreground">{item.name}</CardTitle>
                    {item.category && (
                      <Text className="text-xs text-muted-foreground">{item.category}</Text>
                    )}
                  </View>
                </View>
                <View>
                  <Text className="text-xs text-muted-foreground">Stock</Text>
                  <Text className="text-sm text-foreground">{item.quantity} piece</Text>
                </View>
              </View>
            </CardHeader>
            <CardContent className="py-1 px-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row">
                  <View className="w-[100px] pr-1">
                    <Text className="text-xs text-muted-foreground">Cost</Text>
                    <Text className="text-sm text-foreground">₹{item.costPrice.toFixed(2)}</Text>
                  </View>
                  <View className="w-[100px] pl-1">
                    <Text className="text-xs text-muted-foreground">Selling</Text>
                    <Text className="text-sm text-foreground">₹{item.sellingPrice.toFixed(2)}</Text>
                  </View>
                </View>
                <View className="flex-row gap-x-1">
                  <ShadcnButton
                    variant="ghost"
                    size="sm"
                    onPress={() => handleEditClick(item)}
                    disabled={isLoading}
                  >
                    <Pencil size={16} color="#3B82F6" />
                  </ShadcnButton>
                  <ShadcnButton
                    variant="ghost"
                    size="sm"
                    onPress={() => handleDeleteClick(item)}
                    disabled={isLoading}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </ShadcnButton>
                </View>
              </View>
            </CardContent>
          </Card>
        )}
        estimatedItemSize={100}
      />

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="p-6 bg-background rounded-lg shadow-lg max-w-md w-full mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Filter by Category</DialogTitle>
          </DialogHeader>
          <View className="my-4 w-[250px]">
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
              onPress={clearFilter}
            >
              <Text>Clear</Text>
            </ShadcnButton>
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

      {/* Category Selection Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="p-6 bg-background rounded-lg shadow-lg max-w-md w-full mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Select Category</DialogTitle>
          </DialogHeader>
          <View className="my-4">
            <View className="w-[250px] mb-2">
              <Input
                placeholder="Search categories..."
                value={categorySearch}
                onChangeText={setCategorySearch}
                className="h-12 rounded-md text-base"
                editable={!isLoading}
              />
            </View>
            <FlashList
              data={filteredCategories}
              keyExtractor={(item) => item || 'unknown-key'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    if (item === 'Add New Category') {
                      setIsNewCategory(true);
                      setIsNewProduct(true);
                      setForm({ ...form, category: '', name: '' });
                    } else {
                      setIsNewCategory(false);
                      setIsNewProduct(false);
                      setForm({ ...form, category: item || '', name: '' });
                    }
                    setCategorySearch('');
                    setCategoryDialogOpen(false);
                  }}
                  className="py-2 px-4 border-b border-border"
                >
                  <Text className="text-base text-foreground">{item}</Text>
                </TouchableOpacity>
              )}
              estimatedItemSize={40}
            />
          </View>
          <DialogFooter className="flex-row justify-end gap-x-3">
            <ShadcnButton
              variant="outline"
              onPress={() => {
                setCategorySearch('');
                setCategoryDialogOpen(false);
              }}
            >
              <Text>Cancel</Text>
            </ShadcnButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Selection Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="p-6 bg-background rounded-lg shadow-lg max-w-md w-full mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Select Product</DialogTitle>
          </DialogHeader>
          <View className="my-4">
            <View className="w-[250px] mb-2">
              <Input
                placeholder="Search products..."
                value={productSearch}
                onChangeText={setProductSearch}
                className="h-12 rounded-md text-base"
                editable={!isLoading}
              />
            </View>
            <FlashList
              data={filteredProductNames}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    if (item === 'Add New Product') {
                      setIsNewProduct(true);
                      setForm({ ...form, name: '' });
                    } else {
                      setIsNewProduct(false);
                      setIsNewCategory(false);
                      setForm({ ...form, name: item });
                    }
                    setProductSearch('');
                    setProductDialogOpen(false);
                  }}
                  className="py-2 px-4 border-b border-border"
                >
                  <Text className="text-base text-foreground">{item}</Text>
                </TouchableOpacity>
              )}
              estimatedItemSize={40}
            />
          </View>
          <DialogFooter className="flex-row justify-end gap-x-3">
            <ShadcnButton
              variant="outline"
              onPress={() => {
                setProductSearch('');
                setProductDialogOpen(false);
              }}
            >
              <Text>Cancel</Text>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 100}
        >
          <DialogContent className="p-0 bg-background rounded-lg shadow-lg max-w-lg w-auto mx-auto" style={{ maxHeight: '100%' }}>
            <ScrollView contentContainerStyle={{ padding: 0, width: '100%' }}>
              <DialogHeader className="p-6 pb-4 border-b border-border">
                <DialogTitle className="text-xl font-bold text-foreground">
                  {formMode === 'edit' ? 'Edit Product' : 'Add New Product'}
                </DialogTitle>
              </DialogHeader>
              <View className="space-y-4 p-4 w-[350px] mx-auto">
                {error && (
                  <Text className="text-destructive text-center mb-4">{error}</Text>
                )}
                <View>
                  <Text className="mb-2 text-base font-semibold text-muted-foreground">Category</Text>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-muted-foreground mt-2">
                      {isNewCategory ? 'Enter New Category' : 'Select Existing Category'}
                    </Text>
                    <ShadcnButton
                      variant="ghost"
                      size="sm"
                      onPress={handleCategoryToggle}
                    >
                      <Text className="text-blue-500">
                        {isNewCategory ? 'Select Existing' : 'Add New'}
                      </Text>
                    </ShadcnButton>
                  </View>
                  {isNewCategory ? (
                    <Input
                      placeholder="Enter new category"
                      value={form.category}
                      onChangeText={(text) => setForm({ ...form, category: text })}
                      className="h-12 rounded-md text-base"
                      editable={!isLoading}
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => setCategoryDialogOpen(true)}
                      className="border border-input rounded-md bg-background h-12 justify-center px-4"
                      disabled={isLoading}
                    >
                      <Text className="text-base text-foreground">
                        {form.category || 'Select a category'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View>
                  <Text className="mb-2 mt-4 text-base font-semibold text-muted-foreground">
                    Product Name <Text className="text-destructive">*</Text>
                  </Text>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-muted-foreground mt-2">
                      {isNewProduct ? 'Enter New Product' : 'Select Existing Product'}
                    </Text>
                    <ShadcnButton
                      variant="ghost"
                      size="sm"
                      onPress={handleProductToggle}
                    >
                      <Text className="text-blue-500">
                        {isNewProduct ? 'Select Existing' : 'Add New'}
                      </Text>
                    </ShadcnButton>
                  </View>
                  {isNewProduct ? (
                    <Input
                      placeholder="Enter new product name"
                      value={form.name}
                      onChangeText={(text) => setForm({ ...form, name: text })}
                      className="h-12 rounded-md text-base"
                      editable={!isLoading}
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => setProductDialogOpen(true)}
                      className="border border-input rounded-md bg-background h-12 justify-center px-4"
                      disabled={isLoading}
                    >
                      <Text className="text-base text-foreground">
                        {form.name || 'Select a product'}
                      </Text>
                    </TouchableOpacity>
                  )}
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
                    <Text className={`mt-2 text-sm ${parseFloat(profit) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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
            </ScrollView>
          </DialogContent>
        </KeyboardAvoidingView>
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
            <ShadcnButton  
            variant="outline" 
            onPress={() => setDeleteDialogOpen(false)} 
            disabled={isLoading}>
           <Text>Cancel</Text>
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

