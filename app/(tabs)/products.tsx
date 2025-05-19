import React, { useEffect, useState, useCallback, useMemo, useReducer } from 'react';
import { View, Text, Platform, Image, ScrollView, KeyboardAvoidingView, TouchableOpacity, RefreshControl, FlatList } from 'react-native';
import { Product } from '~/lib/stores/types';
import { useProductStore } from '~/lib/stores/productStore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { Input } from '~/components/ui/input';
import { Button as ShadcnButton } from '~/components/ui/button';
import { Filter, Pencil, Trash2, X, ListFilter } from 'lucide-react-native';
import { useRefresh } from '~/components/RefreshProvider';

const ProductManagementScreen = () => {
  const { products: rawProducts, fetchProducts, addProduct, updateProduct, deleteProduct } = useProductStore();
  const { refreshForm: appRefreshForm } = useRefresh();
  const products = useMemo(
    () =>
      rawProducts.map((product) => ({
        ...product,
        isActive: product.isActive ?? true,
        imageUri: product.imageUri ?? '',
        category: product.category ?? '',
        unit: product.unit || 'piece',
      })),
    [rawProducts]
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [categorySearch, setCategorySearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formState, dispatch] = useReducer(formReducer, {
    category: '',
    name: '',
    costPrice: '',
    sellingPrice: '',
    quantity: '',
    unit: 'piece',
    imageUri: '',
  });

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category).filter((c) => c))).sort();
    return ['Add New Category', ...cats];
  }, [products]);

  const productNames = useMemo(() => {
    const names = Array.from(new Set(products.map((p) => p.name).filter((n) => n))).sort();
    return ['Add New Product', ...names];
  }, [products]);

  const filteredCategories = useMemo(() => {
    const filtered = categories.filter((cat) => cat !== 'Add New Category');
    if (!categorySearch) return filtered;
    return filtered.filter((cat) =>
      cat?.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categories, categorySearch]);

  const filteredProductNames = useMemo(() => {
    const filtered = productNames.filter((name) => name !== 'Add New Product');
    if (!productSearch) return filtered;
    return filtered.filter((name) =>
      name.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [productNames, productSearch]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'All') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const profit = useMemo(() => {
    const cost = parseFloat(formState.costPrice) || 0;
    const selling = parseFloat(formState.sellingPrice) || 0;
    return (selling - cost).toFixed(2);
  }, [formState.costPrice, formState.sellingPrice]);

  const isFormValid = useMemo((): boolean => {
    return (
      !!formState.name &&
      !!formState.costPrice &&
      /^\d*\.?\d+$/.test(formState.costPrice) &&
      parseFloat(formState.costPrice) > 0 &&
      !!formState.sellingPrice &&
      /^\d*\.?\d+$/.test(formState.sellingPrice) &&
      parseFloat(formState.sellingPrice) > 0 &&
      (!formState.quantity || (/^\d+$/.test(formState.quantity) && parseInt(formState.quantity) >= 0))
    );
  }, [formState]);

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
      dispatch({ type: 'UPDATE_FIELD', field: 'imageUri', value: result.assets[0].uri });
    }
  }, []);

  const handleAddProduct = useCallback(async () => {
    if (isLoading || !isFormValid) {
      setError('Please fill in all required fields correctly.');
      return;
    }
    setIsLoading(true);
    try {
      await addProduct({
        category: formState.category || undefined,
        name: formState.name,
        costPrice: parseFloat(formState.costPrice),
        sellingPrice: parseFloat(formState.sellingPrice),
        quantity: parseInt(formState.quantity) || 0,
        imageUri: formState.imageUri || undefined,
        isActive: false,
        unit: formState.unit,
      });
      dispatch({ type: 'RESET' });
      setDialogOpen(false);
      setError(null);
      await fetchProducts();
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      setError('Failed to add product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isFormValid, formState, addProduct, fetchProducts]);

  const handleEditClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    dispatch({ type: 'UPDATE_FIELD', field: 'category', value: product.category || '' });
    dispatch({ type: 'UPDATE_FIELD', field: 'name', value: product.name });
    dispatch({ type: 'UPDATE_FIELD', field: 'costPrice', value: product.costPrice.toString() });
    dispatch({ type: 'UPDATE_FIELD', field: 'sellingPrice', value: product.sellingPrice.toString() });
    dispatch({ type: 'UPDATE_FIELD', field: 'quantity', value: product.quantity.toString() });
    dispatch({ type: 'UPDATE_FIELD', field: 'unit', value: product.unit || 'piece' });
    dispatch({ type: 'UPDATE_FIELD', field: 'imageUri', value: product.imageUri || '' });
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
    if (isLoading || !isFormValid || !selectedProduct) {
      setError('Please fill in all required fields correctly.');
      return;
    }
    setIsLoading(true);
    try {
      const updatedFields = {
        category: formState.category || undefined,
        name: formState.name,
        costPrice: parseFloat(formState.costPrice),
        sellingPrice: parseFloat(formState.sellingPrice),
        quantity: parseInt(formState.quantity) || 0,
        imageUri: formState.imageUri || undefined,
        unit: formState.unit,
      };
      await updateProduct(selectedProduct.id, updatedFields);
      setDialogOpen(false);
      dispatch({ type: 'RESET' });
      setFormMode('add');
      setSelectedProduct(null);
      setError(null);
      await fetchProducts();
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      setError('Failed to update product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isFormValid, selectedProduct, formState, updateProduct, fetchProducts]);

  const handleDelete = useCallback(async () => {
    if (selectedProduct) {
      try {
        await deleteProduct(selectedProduct.id);
        setDeleteDialogOpen(false);
        setSelectedProduct(null);
        setError(null);
        await fetchProducts();
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        setError('Failed to delete product. Please try again.');
      }
    }
  }, [selectedProduct, deleteProduct, fetchProducts]);

  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET' });
    setSelectedImage(null);
    setCategorySearch('');
    setProductSearch('');
    setIsNewCategory(false);
    setIsNewProduct(false);
  }, []);

  const renderCategoryItem = useCallback(
    ({ item }: { item: string }) => (
      <TouchableOpacity
        onPress={() => {
          setIsNewCategory(false);
          setIsNewProduct(false);
          dispatch({ type: 'UPDATE_FIELD', field: 'category', value: item || '' });
          dispatch({ type: 'UPDATE_FIELD', field: 'name', value: '' });
          setCategorySearch('');
          setCategoryDialogOpen(false);
        }}
        className="py-2 px-4 border-b border-gray-300 dark:border-gray-600"
      >
        <Text className="text-base text-gray-900 dark:text-gray-100">{item}</Text>
      </TouchableOpacity>
    ),
    []
  );

  const renderProductItem = useCallback(
    ({ item }: { item: string }) => (
      <TouchableOpacity
        onPress={() => {
          setIsNewProduct(false);
          setIsNewCategory(false);
          dispatch({ type: 'UPDATE_FIELD', field: 'name', value: item });
          setProductSearch('');
          setProductDialogOpen(false);
        }}
        className="py-2 px-4 border-b border-gray-300 dark:border-gray-600"
      >
        <Text className="text-base text-gray-900 dark:text-gray-100">{item}</Text>
      </TouchableOpacity>
    ),
    []
  );

  const renderMainProductItem = useCallback(
    ({ item }: { item: Product }) => (
      <Card className="mb-2 bg-white dark:bg-gray-800 shadow-md rounded-xl overflow-hidden">
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
                <View className="w-[40px] h-[40px] rounded-md mr-2 bg-[#f9c00c]/20 dark:bg-[#f9c00c]/30" />
              )}
              <View>
                <CardTitle className="text-base text-[#7200da] dark:text-[#00b9f1]">{item.name}</CardTitle>
                {item.category && (
                  <Text className="text-xs text-gray-500 dark:text-gray-400">{item.category}</Text>
                )}
              </View>
            </View>
            <View>
              <Text className="text-xs text-gray-500 dark:text-gray-400">Stock</Text>
              <Text className="text-sm text-gray-900 dark:text-gray-100">{item.quantity} {item.unit}</Text>
            </View>
          </View>
        </CardHeader>
        <CardContent className="py-1 px-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row">
              <View className="w-[100px] pr-1">
                <Text className="text-xs text-gray-500 dark:text-gray-400">Cost</Text>
                <Text className="text-sm text-gray-900 dark:text-gray-100">₹{item.costPrice.toFixed(2)}</Text>
              </View>
              <View className="w-[100px] pl-1">
                <Text className="text-xs text-gray-500 dark:text-gray-400">Selling</Text>
                <Text className="text-sm text-gray-900 dark:text-gray-100">₹{item.sellingPrice.toFixed(2)}</Text>
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
    ),
    [handleEditClick, handleDeleteClick, isLoading]
  );

  return (
    <View className="p-4 flex-1 bg-gray-100 dark:bg-gray-900">
      <View className="flex-row justify-between items-center mb-4 gap-x-2">
        <Text className="text-2xl font-bold text-[#7200da] dark:text-[#00b9f1]">Products</Text>
        <View className="flex-row items-center gap-x-2">
          <ShadcnButton
            variant="ghost"
            size="sm"
            onPress={() => setFilterDialogOpen(true)}
            disabled={isLoading}
            className="p-2"
          >
            {selectedCategory ? (
              <ListFilter size={30} color="#3B82F6" />
            ) : (
              <Filter size={30} color="#3B82F6" />
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
            className="bg-[#00b9f1] dark:bg-[#00b9f1] px-4 py-2 rounded-lg"
          >
            <Text className="text-white dark:text-white">Add Product</Text>
          </ShadcnButton>
        </View>
      </View>

      {error && !dialogOpen && (
        <Text className="text-[#f9320c] dark:text-[#f9320c] text-center mb-4">{error}</Text>
      )}

      {selectedCategory && (
        <View className="mb-2 flex-row justify-start">
          <ShadcnButton
            variant="ghost"
            size="sm"
            onPress={() => {
              setSelectedCategory(null);
              setFilterDialogOpen(false);
            }}
            disabled={isLoading}
            className="flex-row items-center px-2"
          >
            <Text className="text-[#f9320c] dark:text-[#f9320c] font-medium">Clear All</Text>
            <X size={20} color="#EF4444" />
          </ShadcnButton>
        </View>
      )}

      <FlatList
        data={filteredProducts}
        keyExtractor={(item: Product) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setSelectedCategory(null);
              fetchProducts().finally(() => {
                setRefreshing(false);
                setRefreshKey((prev) => prev + 1);
              });
            }}
            colors={['#00b9f1']}
            tintColor="#00b9f1"
          />
        }
        renderItem={renderMainProductItem}
      />

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#7200da] dark:text-[#00b9f1]">Filter by Category</DialogTitle>
          </DialogHeader>
          <View className="my-4 w-[250px]">
            <View className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 h-12 justify-center">
              <Picker
                selectedValue={selectedCategory || 'All'}
                onValueChange={(value) => setSelectedCategory(value === 'All' ? null : value)}
                style={{ color: Platform.OS === 'ios' ? '#000' : '#fff', fontSize: 16 }}
                dropdownIconColor={Platform.OS === 'android' ? '#999' : undefined}
              >
                <Picker.Item label="All" value="All" />
                {categories.filter((cat) => cat !== 'Add New Category').map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
          </View>
          <DialogFooter className="flex-row justify-end gap-x-3">
            <ShadcnButton
              variant="outline"
              onPress={() => {
                setSelectedCategory(null);
                setFilterDialogOpen(false);
              }}
              className="h-12 px-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            >
              <Text className="text-gray-900 dark:text-gray-100">Clear</Text>
            </ShadcnButton>
            <ShadcnButton
              variant="outline"
              onPress={() => setFilterDialogOpen(false)}
              className="h-12 px-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            >
              <Text className="text-gray-900 dark:text-gray-100">Cancel</Text>
            </ShadcnButton>
            <ShadcnButton
              onPress={() => setFilterDialogOpen(false)}
              className="h-12 px-4 bg-[#00b9f1] dark:bg-[#00b9f1]"
            >
              <Text className="text-white dark:text-white">Apply</Text>
            </ShadcnButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Selection Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent
          className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg w-auto mx-auto"
          style={{ maxHeight: '70%', overflow: 'hidden' }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#7200da] dark:text-[#00b9f1] p-4">Select Category</DialogTitle>
          </DialogHeader>
          <View className="mb-0">
            <View className="w-[250px] p-2 mt-0">
              <TouchableOpacity
                onPress={() => {
                  setIsNewCategory(true);
                  setIsNewProduct(true);
                  dispatch({ type: 'UPDATE_FIELD', field: 'category', value: '' });
                  dispatch({ type: 'UPDATE_FIELD', field: 'name', value: '' });
                  setCategorySearch('');
                  setCategoryDialogOpen(false);
                }}
                className="py-2 px-4 border-b border-gray-300 dark:border-gray-600"
              >
                <Text className="text-base text-[#00b9f1] dark:text-[#00b9f1]">Add New Category</Text>
              </TouchableOpacity>
            </View>
            <View className="w-[250px] p-2 mt-0">
              <ControlledInput
                value={categorySearch}
                onChangeText={setCategorySearch}
                placeholder="Search categories..."
                editable={!isLoading}
              />
            </View>
            <View style={{ flex: 1, maxHeight: 450, paddingVertical: 8 }}>
              <FlatList
                style={{ height: '100%' }}
                data={filteredCategories}
                keyExtractor={(item) => item || 'unknown-key'}
                showsVerticalScrollIndicator={true}
                alwaysBounceVertical={true}
                overScrollMode="always"
                renderItem={renderCategoryItem}
              />
            </View>
          </View>
        </DialogContent>
      </Dialog>

      {/* Product Selection Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent
          className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg w-auto mx-auto"
          style={{ maxHeight: '70%', overflow: 'hidden' }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#7200da] dark:text-[#00b9f1] p-4">Select Product</DialogTitle>
          </DialogHeader>
          <View className="mb-0">
            <View className="w-[250px] p-2">
              <TouchableOpacity
                onPress={() => {
                  setIsNewProduct(true);
                  dispatch({ type: 'UPDATE_FIELD', field: 'name', value: '' });
                  setProductSearch('');
                  setProductDialogOpen(false);
                }}
                className="py-2 px-4 border-b border-gray-300 dark:border-gray-600"
              >
                <Text className="text-base text-[#00b9f1] dark:text-[#00b9f1]">Add New Product</Text>
              </TouchableOpacity>
            </View>
            <View className="w-[250px] p-2">
              <ControlledInput
                value={productSearch}
                onChangeText={setProductSearch}
                placeholder="Search products..."
                editable={!isLoading}
              />
            </View>
            <View style={{ flex: 1, maxHeight: 450, paddingVertical: 8 }}>
              <FlatList
                style={{ height: '100%' }}
                data={filteredProductNames}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={true}
                alwaysBounceVertical={true}
                overScrollMode="always"
                renderItem={renderProductItem}
              />
            </View>
          </View>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setTimeout(() => {
              dispatch({ type: 'RESET' });
              setFormMode('add');
              setSelectedProduct(null);
              setError(null);
            }, 0);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 100}
        >
          <DialogContent
            className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg w-auto mx-auto mt-5"
            style={{ maxHeight: '100%' }}
          >
            <ProductFormDialogContent
              formState={formState}
              dispatch={dispatch}
              isNewCategory={isNewCategory}
              setIsNewCategory={setIsNewCategory}
              isNewProduct={isNewProduct}
              setIsNewProduct={setIsNewProduct}
              isLoading={isLoading}
              error={error}
              selectedImage={selectedImage}
              pickImage={pickImage}
              profit={profit}
              isFormValid={isFormValid}
              formMode={formMode}
              handleAddProduct={handleAddProduct}
              handleEditSubmit={handleEditSubmit}
              setDialogOpen={setDialogOpen}
              setFormMode={setFormMode}
              setSelectedProduct={setSelectedProduct}
              setError={setError}
              setCategoryDialogOpen={setCategoryDialogOpen}
              setProductDialogOpen={setProductDialogOpen}
            />
          </DialogContent>
        </KeyboardAvoidingView>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#7200da] dark:text-[#00b9f1]">Are you sure?</DialogTitle>
            <Text className="text-gray-700 dark:text-gray-300">
              This will permanently delete the product "{selectedProduct?.name}". This action cannot be undone.
            </Text>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-x-3">
            <ShadcnButton
              variant="outline"
              onPress={() => setDeleteDialogOpen(false)}
              disabled={isLoading}
              className="h-12 px-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            >
              <Text className="text-gray-900 dark:text-gray-100">Cancel</Text>
            </ShadcnButton>
            <ShadcnButton
              onPress={handleDelete}
              disabled={isLoading}
              className="h-12 px-4 bg-[#f9320c] dark:bg-[#f9320c]"
            >
              <Text className="text-white dark:text-white">Delete</Text>
            </ShadcnButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default ProductManagementScreen;