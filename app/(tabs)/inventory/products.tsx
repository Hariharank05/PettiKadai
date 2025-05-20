// ~/(tabs)/products.tsx 
import React, { useEffect, useState, useCallback, useMemo, useReducer } from 'react';
import { View, Text, Platform, Image, ScrollView, KeyboardAvoidingView, TouchableOpacity, RefreshControl, FlatList } from 'react-native';
import { Product, ProductInput } from '~/lib/models/product'; // Corrected Product import
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
import throttle from 'lodash/throttle';

// Form state type
interface FormState {
  category: string;
  name: string;
  costPrice: string;
  sellingPrice: string;
  quantity: string;
  unit: string;
  imageUri: string;
}

// Reducer for form state
type FormAction =
  | { type: 'UPDATE_FIELD'; field: keyof FormState; value: string }
  | { type: 'SET_FORM'; payload: FormState }
  | { type: 'RESET' };

const initialFormState: FormState = {
  category: '',
  name: '',
  costPrice: '',
  sellingPrice: '',
  quantity: '',
  unit: 'piece', // Default unit
  imageUri: '',
};

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_FORM':
      return action.payload;
    case 'RESET':
      return initialFormState;
    default:
      return state;
  }
};

// Custom controlled input component
interface ControlledInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  editable?: boolean;
  className?: string; // Added className prop
}

const ControlledInput = React.memo(
  ({ value, onChangeText, placeholder, keyboardType = 'default', editable = true, className = "" }: ControlledInputProps) => {
    const [localValue, setLocalValue] = useState(value);

    const throttledUpdate = useMemo(
      () => throttle(onChangeText, 300),
      [onChangeText]
    );

    useEffect(() => {
      if (localValue !== value) { // Sync only if prop value is different to avoid issues with throttled updates
        setLocalValue(value);
      }
    }, [value]);

    return (
      <Input
        value={localValue}
        onChangeText={(text) => {
          setLocalValue(text);
          throttledUpdate(text);
        }}
        placeholder={placeholder}
        keyboardType={keyboardType}
        className={`h-12 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base placeholder-gray-400 dark:placeholder-gray-500 ${className}`}
        editable={editable}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.editable === nextProps.editable &&
      prevProps.keyboardType === nextProps.keyboardType &&
      prevProps.placeholder === nextProps.placeholder &&
      prevProps.className === nextProps.className
    );
  }
);
ControlledInput.displayName = 'ControlledInput';


// Category section component
interface CategorySectionProps {
  category: string;
  isNewCategory: boolean;
  setIsNewCategory: React.Dispatch<React.SetStateAction<boolean>>;
  setIsNewProduct: React.Dispatch<React.SetStateAction<boolean>>; // Added for consistency
  dispatch: React.Dispatch<FormAction>;
  isLoading: boolean;
  setCategoryDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const CategorySection = React.memo(
  ({
    category,
    isNewCategory,
    setIsNewCategory,
    setIsNewProduct,
    dispatch,
    isLoading,
    setCategoryDialogOpen,
  }: CategorySectionProps) => {
    return (
      <View>
        <Text className="mb-2 text-base font-semibold text-gray-700 dark:text-gray-300">Category</Text>
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {isNewCategory ? 'Enter New Category' : 'Select Existing Category'}
          </Text>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onPress={() => {
              const newIsNewCategory = !isNewCategory;
              setIsNewCategory(newIsNewCategory);
              setIsNewProduct(newIsNewCategory);
              dispatch({ type: 'UPDATE_FIELD', field: 'category', value: '' });
              if (newIsNewCategory) {
                dispatch({ type: 'UPDATE_FIELD', field: 'name', value: '' });
              }
            }}
            disabled={isLoading}
            className="px-2"
          >
            <Text className="text-[#00b9f1] dark:text-[#00b9f1] font-medium">
              {isNewCategory ? 'Select Existing' : 'Add New'}
            </Text>
          </ShadcnButton>
        </View>
        {isNewCategory ? (
          <View>
            <ControlledInput
              value={category}
              onChangeText={(text) => dispatch({ type: 'UPDATE_FIELD', field: 'category', value: text })}
              placeholder="Enter new category"
              editable={!isLoading}
            />
            {/* Optional: Add validation message if category is required for new product */}
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setCategoryDialogOpen(true)}
            className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 h-12 justify-center px-4"
            disabled={isLoading}
          >
            <Text className="text-base text-gray-900 dark:text-gray-100">
              {category || 'Select a category'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
);
CategorySection.displayName = 'CategorySection';

// Product name section component
interface ProductNameSectionProps {
  name: string;
  isNewProduct: boolean;
  setIsNewProduct: React.Dispatch<React.SetStateAction<boolean>>;
  isNewCategory: boolean;
  setIsNewCategory: React.Dispatch<React.SetStateAction<boolean>>;
  dispatch: React.Dispatch<FormAction>;
  isLoading: boolean;
  setProductDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ProductNameSection = React.memo(
  ({
    name,
    isNewProduct,
    setIsNewProduct,
    isNewCategory,
    setIsNewCategory,
    dispatch,
    isLoading,
    setProductDialogOpen,
  }: ProductNameSectionProps) => {
    return (
      <View>
        <Text className="mb-2 mt-4 text-base font-semibold text-gray-700 dark:text-gray-300">
          Product Name <Text className="text-red-500 dark:text-red-400">*</Text>
        </Text>
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {isNewProduct ? 'Enter New Product' : 'Select Existing Product'}
          </Text>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onPress={() => {
              const newIsNewProduct = !isNewProduct;
              setIsNewProduct(newIsNewProduct);
              dispatch({ type: 'UPDATE_FIELD', field: 'name', value: '' });
              if (newIsNewProduct && !isNewCategory) {
                setIsNewCategory(true);
                dispatch({ type: 'UPDATE_FIELD', field: 'category', value: '' });
              } else if (!newIsNewProduct) {
                setIsNewCategory(false);
              }
            }}
            disabled={isLoading}
            className="px-2"
          >
            <Text className="text-[#00b9f1] dark:text-[#00b9f1] font-medium">
              {isNewProduct ? 'Select Existing' : 'Add New'}
            </Text>
          </ShadcnButton>
        </View>
        {isNewProduct ? (
          <View>
            <ControlledInput
              value={name}
              onChangeText={(text) => dispatch({ type: 'UPDATE_FIELD', field: 'name', value: text })}
              placeholder="Enter new product name"
              editable={!isLoading}
            />
            {!name && (
              <Text className="text-red-500 dark:text-red-400 text-sm mt-1">Product name is required</Text>
            )}
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setProductDialogOpen(true)}
            className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 h-12 justify-center px-4"
            disabled={isLoading}
          >
            <Text className="text-base text-gray-900 dark:text-gray-100">
              {name || 'Select a product'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
);
ProductNameSection.displayName = 'ProductNameSection';

// Price section component
interface PriceSectionProps {
  costPrice: string;
  sellingPrice: string;
  dispatch: React.Dispatch<FormAction>;
  isLoading: boolean;
  profit: string;
}

const PriceSection = React.memo(
  ({ costPrice, sellingPrice, dispatch, isLoading, profit }: PriceSectionProps) => {
    return (
      <View className="flex-row gap-x-4 mt-4">
        <View className="flex-1">
          <Text className="mb-2 text-base font-semibold text-gray-700 dark:text-gray-300">
            Cost Price (₹) <Text className="text-red-500 dark:text-red-400">*</Text>
          </Text>
          <View>
            <ControlledInput
              value={costPrice}
              onChangeText={(text) => dispatch({ type: 'UPDATE_FIELD', field: 'costPrice', value: text.replace(/[^0-9.]/g, '') })}
              placeholder="0.00"
              keyboardType="numeric"
              editable={!isLoading}
            />
            {!costPrice && (
              <Text className="text-red-500 dark:text-red-400 text-sm mt-1">Cost price is required</Text>
            )}
            {costPrice && (parseFloat(costPrice) <= 0 || !/^\d*\.?\d+$/.test(costPrice)) && (
              <Text className="text-red-500 dark:text-red-400 text-sm mt-1">
                Enter a valid number greater than 0
              </Text>
            )}
          </View>
        </View>
        <View className="flex-1">
          <Text className="mb-2 text-base font-semibold text-gray-700 dark:text-gray-300">
            Selling Price (₹) <Text className="text-red-500 dark:text-red-400">*</Text>
          </Text>
          <View>
            <ControlledInput
              value={sellingPrice}
              onChangeText={(text) => dispatch({ type: 'UPDATE_FIELD', field: 'sellingPrice', value: text.replace(/[^0-9.]/g, '') })}
              placeholder="0.00"
              keyboardType="numeric"
              editable={!isLoading}
            />
            {!sellingPrice && (
              <Text className="text-red-500 dark:text-red-400 text-sm mt-1">Selling price is required</Text>
            )}
            {sellingPrice && (parseFloat(sellingPrice) <= 0 || !/^\d*\.?\d+$/.test(sellingPrice)) && (
              <Text className="text-red-500 dark:text-red-400 text-sm mt-1">
                Enter a valid number greater than 0
              </Text>
            )}
          </View>
          <Text className={`mt-2 text-sm ${parseFloat(profit) >= 0 ? 'text-green-500' : 'text-red-500 dark:text-red-400'}`}>
            Profit: ₹{profit} {parseFloat(profit) < 0 ? '(Loss)' : ''}
          </Text>
        </View>
      </View>
    );
  }
);
PriceSection.displayName = 'PriceSection';

// Quantity and unit section component
interface QuantityUnitSectionProps {
  quantity: string;
  unit: string;
  dispatch: React.Dispatch<FormAction>;
  isLoading: boolean;
}

const QuantityUnitSection = React.memo(
  ({ quantity, unit, dispatch, isLoading }: QuantityUnitSectionProps) => {
    return (
      <View className="flex-row gap-x-4 mt-4">
        <View className="flex-1">
          <Text className="mb-2 text-base font-semibold text-gray-700 dark:text-gray-300">Quantity</Text>
          <View>
            <ControlledInput
              value={quantity}
              onChangeText={(text) => dispatch({ type: 'UPDATE_FIELD', field: 'quantity', value: text.replace(/[^0-9]/g, '') })}
              placeholder="0"
              keyboardType="numeric"
              editable={!isLoading}
            />
            {quantity && !/^\d+$/.test(quantity) && (
              <Text className="text-red-500 dark:text-red-400 text-sm mt-1">Enter a valid whole number</Text>
            )}
            {quantity && parseInt(quantity, 10) < 0 && (
              <Text className="text-red-500 dark:text-red-400 text-sm mt-1">Must be 0 or greater</Text>
            )}
          </View>
        </View>
        <View className="flex-1">
          <Text className="mb-2 text-base font-semibold text-gray-700 dark:text-gray-300">Unit</Text>
          <View className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 h-12 justify-center">
            <Picker
              selectedValue={unit}
              onValueChange={(itemValue) => dispatch({ type: 'UPDATE_FIELD', field: 'unit', value: itemValue })}
              style={{ color: Platform.OS === 'ios' ? '#000000' : (isLoading ? '#a0a0a0' : '#000000'), fontSize: 16 }} // Basic styling
              dropdownIconColor={Platform.OS === 'android' ? (isLoading ? '#a0a0a0' : '#000000') : undefined}
              enabled={!isLoading}
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
    );
  }
);
QuantityUnitSection.displayName = 'QuantityUnitSection';

// Image section component
interface ImageSectionProps {
  imageUri: string; // This comes from formState.imageUri
  pickImage: () => Promise<void>;
  isLoading: boolean;
}

const ImageSection = React.memo(
  ({ imageUri, pickImage, isLoading }: ImageSectionProps) => {
    return (
      <View>
        <Text className="mb-2 mt-4 text-base font-semibold text-gray-700 dark:text-gray-300">Product Image</Text>
        <ShadcnButton
          variant="outline"
          className="w-full h-12 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          onPress={pickImage}
          disabled={isLoading}
        >
          <Text className="text-base text-gray-900 dark:text-gray-100">{imageUri ? 'Change Image' : 'Select Image'}</Text>
        </ShadcnButton>
        {imageUri && (
          <View className="mt-4 items-center">
            <Image
              source={{ uri: imageUri }}
              style={{ width: 128, height: 128 }}
              className="rounded-md border border-gray-300 dark:border-gray-600"
            />
          </View>
        )}
      </View>
    );
  }
);
ImageSection.displayName = 'ImageSection';

// Props interface for ProductFormDialogContent
interface ProductFormDialogContentProps {
  formState: FormState;
  dispatch: React.Dispatch<FormAction>;
  isNewCategory: boolean;
  setIsNewCategory: React.Dispatch<React.SetStateAction<boolean>>;
  isNewProduct: boolean;
  setIsNewProduct: React.Dispatch<React.SetStateAction<boolean>>;
  isLoading: boolean;
  formError: string | null; // Renamed from error to avoid conflict
  pickImage: () => Promise<void>;
  profit: string;
  isFormValid: boolean;
  formMode: 'add' | 'edit';
  handleSubmit: () => Promise<void>; // Consolidated submit handler
  setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  resetDialogState: () => void; // Function to reset all dialog related states
  setCategoryDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setProductDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ProductFormDialogContent = React.memo(
  ({
    formState,
    dispatch,
    isNewCategory,
    setIsNewCategory,
    isNewProduct,
    setIsNewProduct,
    isLoading,
    formError,
    pickImage,
    profit,
    isFormValid,
    formMode,
    handleSubmit,
    setDialogOpen,
    resetDialogState,
    setCategoryDialogOpen,
    setProductDialogOpen,
  }: ProductFormDialogContentProps) => {
    return (
      <ScrollView contentContainerStyle={{ padding: 0, width: '100%' }}>
        <DialogHeader className="p-6 pb-4 border-b border-gray-300 dark:border-gray-600">
          <DialogTitle className="text-xl font-bold text-[#7200da] dark:text-[#00b9f1]">
            {formMode === 'edit' ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
        </DialogHeader>
        <View className="space-y-4 p-4 w-[350px] mx-auto">
          {formError && <Text className="text-red-500 dark:text-red-400 text-center mb-4">{formError}</Text>}
          <CategorySection
            category={formState.category}
            isNewCategory={isNewCategory}
            setIsNewCategory={setIsNewCategory}
            setIsNewProduct={setIsNewProduct}
            dispatch={dispatch}
            isLoading={isLoading}
            setCategoryDialogOpen={setCategoryDialogOpen}
          />
          <ProductNameSection
            name={formState.name}
            isNewProduct={isNewProduct}
            setIsNewProduct={setIsNewProduct}
            isNewCategory={isNewCategory}
            setIsNewCategory={setIsNewCategory}
            dispatch={dispatch}
            isLoading={isLoading}
            setProductDialogOpen={setProductDialogOpen}
          />
          <PriceSection
            costPrice={formState.costPrice}
            sellingPrice={formState.sellingPrice}
            dispatch={dispatch}
            isLoading={isLoading}
            profit={profit}
          />
          <QuantityUnitSection
            quantity={formState.quantity}
            unit={formState.unit}
            dispatch={dispatch}
            isLoading={isLoading}
          />
          <ImageSection
            imageUri={formState.imageUri}
            pickImage={pickImage}
            isLoading={isLoading}
          />
        </View>
        <DialogFooter className="p-6 pt-4 flex-row justify-end gap-x-3 border-t border-gray-300 dark:border-gray-600">
          <ShadcnButton
            variant="outline"
            size="lg"
            className="h-12 px-6 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            onPress={() => {
              setDialogOpen(false);
              // resetDialogState will be called by onOpenChange of Dialog
            }}
            disabled={isLoading}
          >
            <Text className="text-base text-gray-900 dark:text-gray-100">Cancel</Text>
          </ShadcnButton>
          <ShadcnButton
            size="lg"
            className="h-12 px-6 bg-[#00b9f1] dark:bg-[#00b9f1]"
            onPress={handleSubmit}
            disabled={isLoading || !isFormValid}
          >
            <Text className="text-white dark:text-white">{formMode === 'edit' ? 'Save Changes' : 'Add Product'}</Text>
          </ShadcnButton>
        </DialogFooter>
      </ScrollView>
    );
  }
);
ProductFormDialogContent.displayName = 'ProductFormDialogContent';


const ProductManagementScreen = () => {
  const {
    products: rawProducts,
    loading: storeLoading,
    error: storeError,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useProductStore();

  const { refreshForm: appRefreshForm } = useRefresh();

  // Use formReducer for form state
  const [formState, dispatch] = useReducer(formReducer, initialFormState);

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
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [uiIsLoading, setUiIsLoading] = useState(false);

  const [categorySearch, setCategorySearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isLoading = storeLoading || uiIsLoading;

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();
    return cats;
  }, [products]);

  const productNamesForSelection = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.name).filter(Boolean))).sort();
  }, [products]);


  const filteredCategoriesForDialog = useMemo(() => {
    if (!categorySearch) return categories;
    return categories.filter((cat) =>
      cat?.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categories, categorySearch]);

  const filteredProductNamesForDialog = useMemo(() => {
    if (!productSearch) return productNamesForSelection;
    return productNamesForSelection.filter((name) =>
      name.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [productNamesForSelection, productSearch]);

  const filteredProductsDisplay = useMemo(() => {
    if (!selectedCategoryFilter || selectedCategoryFilter === 'All') return products;
    return products.filter((p) => p.category === selectedCategoryFilter);
  }, [products, selectedCategoryFilter]);

  const profit = useMemo(() => {
    const cost = parseFloat(formState.costPrice) || 0;
    const selling = parseFloat(formState.sellingPrice) || 0;
    if (isNaN(cost) || isNaN(selling)) return '0.00';
    return (selling - cost).toFixed(2);
  }, [formState.costPrice, formState.sellingPrice]);

  const isFormValid = useMemo((): boolean => {
    const costPriceNum = parseFloat(formState.costPrice);
    const sellingPriceNum = parseFloat(formState.sellingPrice);
    const quantityNum = parseInt(formState.quantity, 10);

    return (
      !!formState.name.trim() &&
      !!formState.costPrice && !isNaN(costPriceNum) && costPriceNum > 0 &&
      !!formState.sellingPrice && !isNaN(sellingPriceNum) && sellingPriceNum > 0 &&
      (formState.quantity === '' || (!isNaN(quantityNum) && quantityNum >= 0)) &&
      !!formState.unit
    );
  }, [formState]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Effect to clear formError when dialog closes or form changes
  useEffect(() => {
    if (formError) {
      setFormError(null);
    }
  }, [formState, dialogOpen]);


  const pickImage = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        alert("Permission to access camera roll is required!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        dispatch({ type: 'UPDATE_FIELD', field: 'imageUri', value: result.assets[0].uri });
      }
    } catch (e) {
      console.error("Image picking error: ", e);
      setFormError("Could not select image. Please try again.");
    }
  }, [dispatch]);

  const resetFormAndDialogState = useCallback(() => {
    dispatch({ type: 'RESET' });
    setFormMode('add');
    setSelectedProduct(null);
    setFormError(null);
    setCategorySearch('');
    setProductSearch('');
    setIsNewCategory(false);
    setIsNewProduct(false);
  }, [dispatch]);


  const handleAddProductSubmit = async () => {
    if (!isFormValid) {
      setFormError('Please fill in all required fields correctly.');
      return;
    }
    setUiIsLoading(true);
    setFormError(null);
    try {
      const productData: Omit<ProductInput, 'userId'> = {
        name: formState.name.trim(),
        costPrice: parseFloat(formState.costPrice),
        sellingPrice: parseFloat(formState.sellingPrice),
        quantity: formState.quantity ? parseInt(formState.quantity, 10) : 0,
        unit: formState.unit,
        category: formState.category.trim() || undefined,
        imageUri: formState.imageUri || undefined,
        rating: 0,
        discount: 0,
        image: '',
        isActive: false
      };
      await addProduct(productData);
      setDialogOpen(false);
      fetchProducts();
    } catch (e: any) {
      console.error('Failed to add product:', e);
      setFormError(e.message || 'Failed to add product. Please try again.');
    } finally {
      setUiIsLoading(false);
    }
  };

  const handleEditProductSubmit = async () => {
    if (!isFormValid || !selectedProduct) {
      setFormError('Please fill in all required fields correctly.');
      return;
    }
    setUiIsLoading(true);
    setFormError(null);
    try {
      const productUpdates: Partial<Omit<ProductInput, 'userId'>> = {
        name: formState.name.trim(),
        costPrice: parseFloat(formState.costPrice),
        sellingPrice: parseFloat(formState.sellingPrice),
        quantity: formState.quantity ? parseInt(formState.quantity, 10) : 0,
        unit: formState.unit,
        category: formState.category.trim() || undefined,
        imageUri: formState.imageUri || undefined,
      };
      await updateProduct(selectedProduct.id, productUpdates);
      setDialogOpen(false);
      fetchProducts();
    } catch (e: any) {
      console.error('Failed to update product:', e);
      setFormError(e.message || 'Failed to update product. Please try again.');
    } finally {
      setUiIsLoading(false);
    }
  };


  const handleEditClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    dispatch({
      type: 'SET_FORM',
      payload: {
        category: product.category || '',
        name: product.name,
        costPrice: product.costPrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        quantity: product.quantity.toString(),
        unit: product.unit || 'piece',
        imageUri: product.imageUri || '',
      },
    });
    setFormMode('edit');
    setIsNewCategory(false);
    setIsNewProduct(false);
    setFormError(null);
    setDialogOpen(true);
  }, [dispatch]);

  const handleDeleteClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return;
    setUiIsLoading(true);
    setFormError(null);
    try {
      await deleteProduct(selectedProduct.id);
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
      fetchProducts(); // Refresh list
    } catch (e: any) {
      console.error('Failed to delete product:', e);
      alert(e.message || 'Failed to delete product. Please try again.');
    } finally {
      setUiIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setFormError(null);
    setSelectedCategoryFilter(null);
    try {
      await fetchProducts();
    } catch (e) {
      console.error("Error on refresh: ", e);
    } finally {
      setRefreshing(false);
    }
  }, [fetchProducts]);

  const renderCategoryItemForDialog = useCallback(
    ({ item }: { item: string }) => (
      <TouchableOpacity
        onPress={() => {
          setIsNewCategory(false);
          // If a product was also selected, and this category doesn't match, maybe clear product?
          // For now, just update category.
          dispatch({ type: 'UPDATE_FIELD', field: 'category', value: item });
          setCategorySearch('');
          setCategoryDialogOpen(false);
        }}
        className="py-3 px-4 border-b border-gray-200 dark:border-gray-700"
      >
        <Text className="text-base text-gray-900 dark:text-gray-100">{item}</Text>
      </TouchableOpacity>
    ),
    [dispatch, setIsNewCategory]
  );

  const renderProductItemForDialog = useCallback(
    ({ item }: { item: string }) => {
      const productDetails = products.find(p => p.name === item);
      return (
        <TouchableOpacity
          onPress={() => {
            setIsNewProduct(false);
            if (productDetails) {
              dispatch({
                type: 'SET_FORM',
                payload: {
                  name: productDetails.name,
                  category: productDetails.category || formState.category,
                  costPrice: productDetails.costPrice.toString(),
                  sellingPrice: productDetails.sellingPrice.toString(),
                  quantity: productDetails.quantity.toString(),
                  unit: productDetails.unit || 'piece',
                  imageUri: productDetails.imageUri || '',
                }
              });
              if (productDetails.category) setIsNewCategory(false);
            } else {
              dispatch({ type: 'UPDATE_FIELD', field: 'name', value: item });
            }
            setProductSearch('');
            setProductDialogOpen(false);
          }}
          className="py-3 px-4 border-b border-gray-200 dark:border-gray-700"
        >
          <Text className="text-base text-gray-900 dark:text-gray-100">{item}</Text>
        </TouchableOpacity>
      );
    },
    [dispatch, products, formState.category, setIsNewProduct, setIsNewCategory]
  );

  const renderMainProductItem = useCallback(
    ({ item }: { item: Product }) => (
      <Card className="mb-3 bg-white dark:bg-gray-800 shadow-md rounded-xl overflow-hidden">
        <CardHeader className="py-3 px-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              {item.imageUri ? (
                <Image
                  source={{ uri: item.imageUri }}
                  style={{ width: 48, height: 48 }} // Slightly larger image
                  className="rounded-lg mr-3"
                />
              ) : (
                <View className="w-12 h-12 rounded-lg mr-3 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  {/* Placeholder icon or initials can go here */}
                </View>
              )}
              <View className="flex-1">
                <CardTitle className="text-base font-semibold text-[#7200da] dark:text-[#00b9f1]">{item.name}</CardTitle>
                {item.category && (
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.category}</Text>
                )}
              </View>
            </View>
            <View className="items-end">
              <Text className="text-xs text-gray-500 dark:text-gray-400">Stock</Text>
              <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.quantity} {item.unit}</Text>
            </View>
          </View>
        </CardHeader>
        <CardContent className="py-2 px-4 border-t border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            <View className="flex-row">
              <View className="mr-4">
                <Text className="text-xs text-gray-500 dark:text-gray-400">Cost</Text>
                <Text className="text-sm text-gray-900 dark:text-gray-100">₹{item.costPrice.toFixed(2)}</Text>
              </View>
              <View>
                <Text className="text-xs text-gray-500 dark:text-gray-400">Selling</Text>
                <Text className="text-sm text-gray-900 dark:text-gray-100">₹{item.sellingPrice.toFixed(2)}</Text>
              </View>
            </View>
            <View className="flex-row gap-x-1">
              <ShadcnButton
                variant="ghost"
                size="icon" // Use "icon" for compact buttons
                onPress={() => handleEditClick(item)}
                disabled={isLoading}
                className="p-1.5"
              >
                <Pencil size={18} color="#3B82F6" />
              </ShadcnButton>
              <ShadcnButton
                variant="ghost"
                size="icon"
                onPress={() => handleDeleteClick(item)}
                disabled={isLoading}
                className="p-1.5"
              >
                <Trash2 size={18} color="#EF4444" />
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
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold text-[#7200da] dark:text-[#00b9f1]">Products</Text>
        <View className="flex-row items-center gap-x-2">
          <ShadcnButton
            variant="ghost"
            size="icon"
            onPress={() => setFilterDialogOpen(true)}
            disabled={isLoading}
            className="p-2"
          >
            {selectedCategoryFilter ? (
              <ListFilter size={24} color="#3B82F6" />
            ) : (
              <Filter size={24} color="#3B82F6" />
            )}
          </ShadcnButton>
          <ShadcnButton
            onPress={() => {
              resetFormAndDialogState();
              setFormMode('add');
              setIsNewCategory(true);
              setIsNewProduct(true);
              setDialogOpen(true);
            }}
            disabled={isLoading}
            className="bg-[#00b9f1] dark:bg-[#00b9f1] px-4 py-2.5 rounded-lg"
          >
            <Text className="text-white font-semibold">Add Product</Text>
          </ShadcnButton>
        </View>
      </View>

      {storeError && !dialogOpen && (
        <Text className="text-red-500 dark:text-red-400 text-center mb-4">{storeError}</Text>
      )}

      {selectedCategoryFilter && (
        <View className="mb-3 flex-row justify-start items-center bg-blue-100 dark:bg-blue-900/50 p-2 rounded-md">
          <Text className="text-sm text-blue-700 dark:text-blue-300 mr-2">Filtered by: {selectedCategoryFilter}</Text>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onPress={() => setSelectedCategoryFilter(null)}
            disabled={isLoading}
            className="p-1 flex-row items-center"
          >
            <Text className="text-red-600 dark:text-red-500 text-xs mr-1">Clear</Text>
            <X size={16} color="#EF4444" />
          </ShadcnButton>
        </View>
      )}

      <FlatList
        data={filteredProductsDisplay}
        keyExtractor={(item: Product) => item.id}
        renderItem={renderMainProductItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#00b9f1', '#7200da']}
            tintColor={Platform.OS === "ios" ? "#00b9f1" : undefined}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center mt-10">
            <Text className="text-gray-500 dark:text-gray-400 text-lg">
              {isLoading ? 'Loading products...' : 'No products found.'}
            </Text>
            {!isLoading && rawProducts.length === 0 && (
              <Text className="text-gray-400 dark:text-gray-500 mt-2">Try adding a new product!</Text>
            )}
            {!isLoading && rawProducts.length > 0 && selectedCategoryFilter && filteredProductsDisplay.length === 0 && (
              <Text className="text-gray-400 dark:text-gray-500 mt-2">No products in category "{selectedCategoryFilter}".</Text>
            )}
          </View>
        }
      />

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-11/12 mx-auto">
          <DialogHeader className="p-5 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle><Text className="text-xl font-bold text-[#7200da] dark:text-[#00b9f1]">Filter by Category </Text></DialogTitle>
          </DialogHeader>
          <View className="p-5">
            <View className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 h-12 justify-center">
              <Picker
                selectedValue={selectedCategoryFilter || 'All'}
                onValueChange={(value) => setSelectedCategoryFilter(value === 'All' ? null : value)}
                style={{ color: Platform.OS === 'ios' ? (isLoading ? '#a0a0a0' : '#000000') : (isLoading ? '#a0a0a0' : '#000000'), fontSize: 16 }}
                dropdownIconColor={Platform.OS === 'android' ? (isLoading ? '#a0a0a0' : '#000000') : undefined}
                enabled={!isLoading}
              >
                <Picker.Item label="All Categories" value="All" />
                {categories.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
          </View>
          <DialogFooter className="p-5 flex-row justify-end gap-x-3 border-t border-gray-200 dark:border-gray-700">
            <ShadcnButton
              variant="outline"
              onPress={() => {
                setSelectedCategoryFilter(null);
                setFilterDialogOpen(false);
              }}
              className="h-11 px-5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              <Text className="text-gray-900 dark:text-gray-100">Clear</Text>
            </ShadcnButton>
            <ShadcnButton
              onPress={() => setFilterDialogOpen(false)}
              className="h-11 px-5 bg-[#00b9f1] dark:bg-[#00b9f1]"
            >
              <Text className="text-white">Apply</Text>
            </ShadcnButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Selection Dialog (for Form) */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent
          className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-11/12 mx-auto"
          style={{ maxHeight: '80%' }} // Allow content to scroll
        >
          <DialogHeader className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <DialogTitle>
              <Text className="text-xl font-bold text-[#7200da] dark:text-[#00b9f1]">Select Category</Text>
            </DialogTitle>
          </DialogHeader>
          <View className="p-3">
            <TouchableOpacity
              onPress={() => {
                setIsNewCategory(true);
                setIsNewProduct(true); // If adding new category, usually for a new product
                dispatch({ type: 'UPDATE_FIELD', field: 'category', value: '' });
                dispatch({ type: 'UPDATE_FIELD', field: 'name', value: '' });
                setCategorySearch('');
                setCategoryDialogOpen(false);
              }}
              className="py-3 px-2 mb-2 border-b border-gray-200 dark:border-gray-700"
            >
              <Text className="text-base text-[#00b9f1] dark:text-[#00b9f1] font-medium">Add New Category...</Text>
            </TouchableOpacity>
            <ControlledInput
              value={categorySearch}
              onChangeText={setCategorySearch}
              placeholder="Search categories..."
              editable={!isLoading}
              className="mb-2"
            />
          </View>
          <FlatList
            data={filteredCategoriesForDialog}
            keyExtractor={(item) => item}
            renderItem={renderCategoryItemForDialog}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 10, paddingHorizontal: 12 }}
            ListEmptyComponent={<Text className="text-center py-4 text-gray-500 dark:text-gray-400">No categories found.</Text>}
          />
        </DialogContent>
      </Dialog>

      {/* Product Selection Dialog (for Form) */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent
          className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-11/12 mx-auto"
          style={{ maxHeight: '80%' }}
        >
          <DialogHeader className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <DialogTitle>
              <Text className="text-xl font-bold text-[#7200da] dark:text-[#00b9f1]">Select Product</Text>
            </DialogTitle>
          </DialogHeader>
          <View className="p-3">
            <TouchableOpacity
              onPress={() => {
                setIsNewProduct(true);
                // If adding new product, also make category new unless one is already typed/selected
                if (!formState.category) setIsNewCategory(true);
                dispatch({ type: 'UPDATE_FIELD', field: 'name', value: '' });
                setProductSearch('');
                setProductDialogOpen(false);
              }}
              className="py-3 px-2 mb-2 border-b border-gray-200 dark:border-gray-700"
            >
              <Text className="text-base text-[#00b9f1] dark:text-[#00b9f1] font-medium">Add New Product...</Text>
            </TouchableOpacity>
            <ControlledInput
              value={productSearch}
              onChangeText={setProductSearch}
              placeholder="Search products..."
              editable={!isLoading}
              className="mb-2"
            />
          </View>
          <FlatList
            data={filteredProductNamesForDialog}
            keyExtractor={(item) => item}
            renderItem={renderProductItemForDialog}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 10, paddingHorizontal: 12 }}
            ListEmptyComponent={<Text className="text-center py-4 text-gray-500 dark:text-gray-400">No products found.</Text>}
          />
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setTimeout(() => {
              resetFormAndDialogState();
            }, 10);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
          style={{ flex: 1 }}
        >
          <DialogContent
            className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-11/12 mx-auto"
            style={{ maxHeight: '90%' }}
          >
            <ProductFormDialogContent
              formState={formState}
              dispatch={dispatch}
              isNewCategory={isNewCategory}
              setIsNewCategory={setIsNewCategory}
              isNewProduct={isNewProduct}
              setIsNewProduct={setIsNewProduct}
              isLoading={isLoading}
              formError={formError}
              pickImage={pickImage}
              profit={profit}
              isFormValid={isFormValid}
              formMode={formMode}
              handleSubmit={formMode === 'edit' ? handleEditProductSubmit : handleAddProductSubmit}
              setDialogOpen={setDialogOpen}
              resetDialogState={resetFormAndDialogState}
              setCategoryDialogOpen={setCategoryDialogOpen}
              setProductDialogOpen={setProductDialogOpen}
            />
          </DialogContent>
        </KeyboardAvoidingView>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-11/12 mx-auto">
          <DialogHeader className="p-5 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle>
              <Text className="text-xl font-bold text-[#7200da] dark:text-[#00b9f1]">Confirm Deletion</Text>
            </DialogTitle>
          </DialogHeader>
          <View className="p-5">
            <Text className="text-gray-700 dark:text-gray-300 text-base">
              Are you sure you want to delete the product "{selectedProduct?.name}"? This action will mark the product as inactive and cannot be directly undone through the app.
            </Text>
          </View>
          <DialogFooter className="p-5 flex-row justify-end gap-x-3 border-t border-gray-200 dark:border-gray-700">
            <ShadcnButton
              variant="outline"
              onPress={() => setDeleteDialogOpen(false)}
              disabled={isLoading}
              className="h-11 px-5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              <Text className="text-gray-900 dark:text-gray-100">Cancel</Text>
            </ShadcnButton>
            <ShadcnButton
              onPress={handleDeleteConfirm}
              disabled={isLoading}
              className="h-11 px-5 bg-red-600 dark:bg-red-700"
            >
              <Text className="text-white">Delete</Text>
            </ShadcnButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default ProductManagementScreen;