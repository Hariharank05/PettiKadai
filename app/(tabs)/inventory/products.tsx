import React, { useEffect, useState, useCallback, useMemo, useReducer } from 'react';
import { View, Text, Platform, Image, ScrollView, KeyboardAvoidingView, TouchableOpacity, RefreshControl, FlatList, Alert, useColorScheme as rnColorScheme } from 'react-native';
import { Product, ProductInput } from '~/lib/models/product';
import { useProductStore } from '~/lib/stores/productStore';
import { useCategoryStore } from '~/lib/stores/categoryStore'; // Import category store
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
import { Filter, Pencil, Trash2, X, ListFilter, ChevronDown, ChevronUp, Package } from 'lucide-react-native';
import { useRefresh } from '~/components/RefreshProvider';
import throttle from 'lodash/throttle';
import { LinearGradient } from 'expo-linear-gradient';

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
  unit: 'piece',
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
  className?: string;
}

const ControlledInput = React.memo(
  ({ value, onChangeText, placeholder, keyboardType = 'default', editable = true, className = "" }: ControlledInputProps) => {
    const [localValue, setLocalValue] = useState(value);

    const throttledUpdate = useMemo(
      () => throttle(onChangeText, 300),
      [onChangeText]
    );

    useEffect(() => {
      // Sync localValue if the prop `value` changes from outside
      if (localValue !== value) {
        setLocalValue(value);
      }
    }, [value]); // Only re-run if `value` prop changes


    const handleTextChange = (text: string) => {
      setLocalValue(text);
      throttledUpdate(text);
    };

    return (
      <Input
        value={localValue}
        onChangeText={handleTextChange}
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
  setIsNewProduct: React.Dispatch<React.SetStateAction<boolean>>; // To toggle product to new if new category is chosen
  dispatch: React.Dispatch<FormAction>;
  isLoading: boolean;
  isAccordionOpen: boolean;
  setIsAccordionOpen: React.Dispatch<React.SetStateAction<boolean>>;
  categorySearch: string;
  setCategorySearch: React.Dispatch<React.SetStateAction<string>>;
  filteredCategoriesFromStore: string[]; // Changed prop name
  onSelectCategory: (category: string) => void;
  onAddNewCategory: () => void;
}

const CategorySection = React.memo(
  ({
    category,
    isNewCategory,
    setIsNewCategory,
    setIsNewProduct,
    dispatch,
    isLoading,
    isAccordionOpen,
    setIsAccordionOpen,
    categorySearch,
    setCategorySearch,
    filteredCategoriesFromStore, // Changed prop name
    onSelectCategory,
    onAddNewCategory,
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
              dispatch({ type: 'UPDATE_FIELD', field: 'category', value: '' });

              if (newIsNewCategory) { // If switching to "Add New Category"
                // Optionally, if adding a new category, it's often for a new product too.
                // This behavior can be customized.
                setIsNewProduct(true);
                dispatch({ type: 'UPDATE_FIELD', field: 'name', value: '' }); // Clear product name
                setIsAccordionOpen(false); // Close accordion if open
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
              placeholder="Enter new category name"
              editable={!isLoading}
            />
          </View>
        ) : (
          <View>
            <TouchableOpacity
              onPress={() => setIsAccordionOpen(!isAccordionOpen)}
              className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 h-12 justify-between items-center px-4 flex-row"
              disabled={isLoading}
            >
              <Text className="text-base text-gray-900 dark:text-gray-100">
                {category || 'Select a category'}
              </Text>
              {isAccordionOpen ? <ChevronUp size={20} color="#6b7280" /> : <ChevronDown size={20} color="#6b7280" />}
            </TouchableOpacity>
            {isAccordionOpen && (
              <View className="mt-1 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-lg z-10">
                <View className="p-2">
                  {/* "Add New Category..." button INSIDE the accordion */}
                  <TouchableOpacity
                    onPress={onAddNewCategory}
                    className="py-2.5 px-2 mb-1 border-b border-gray-200 dark:border-gray-700"
                  >
                    <Text className="text-base text-[#00b9f1] dark:text-[#00b9f1] font-medium">Add New Category...</Text>
                  </TouchableOpacity>
                  <ControlledInput
                    value={categorySearch}
                    onChangeText={setCategorySearch}
                    placeholder="Search categories..."
                    editable={!isLoading}
                    className="mb-1 text-sm"
                  />
                </View>
                <FlatList
                  data={filteredCategoriesFromStore} // Use store categories
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => onSelectCategory(item)}
                      className="py-2.5 px-4 border-t border-gray-200 dark:border-gray-700"
                    >
                      <Text className="text-base text-gray-900 dark:text-gray-100">{item}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text className="text-center py-3 text-gray-500 dark:text-gray-400">No categories found.</Text>}
                  style={{ maxHeight: 150 }}
                  nestedScrollEnabled
                />
              </View>
            )}
          </View>
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
  isNewCategory: boolean; // To know if category is also new
  setIsNewCategory: React.Dispatch<React.SetStateAction<boolean>>; // To set category to new if product is new
  dispatch: React.Dispatch<FormAction>;
  isLoading: boolean;
  isAccordionOpen: boolean;
  setIsAccordionOpen: React.Dispatch<React.SetStateAction<boolean>>;
  productSearch: string;
  setProductSearch: React.Dispatch<React.SetStateAction<string>>;
  filteredProductNames: string[];
  onSelectProduct: (productName: string) => void;
  onAddNewProduct: () => void;
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
    isAccordionOpen,
    setIsAccordionOpen,
    productSearch,
    setProductSearch,
    filteredProductNames,
    onSelectProduct,
    onAddNewProduct,
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

              if (newIsNewProduct) { // If switching to "Add New Product"
                // If currently "Select Existing Category", switch it to "Add New Category"
                // because a new product usually means a new category unless specified otherwise.
                // This behavior can be adjusted based on desired UX.
                if (!isNewCategory) {
                  setIsNewCategory(true);
                  dispatch({ type: 'UPDATE_FIELD', field: 'category', value: '' }); // Clear category as well
                }
                setIsAccordionOpen(false); // Close accordion if open
              } else { // If switching to "Select Existing Product"
                // If category was also new, maybe revert it to select?
                // For now, let's keep category as is, user can change it separately.
                // Or, if category was new, and product is now existing, this might be an odd state.
                // A safer bet: if product is existing, category should also be existing (or cleared).
                if (isNewCategory) {
                  setIsNewCategory(false); // Revert category to select mode
                  // dispatch({ type: 'UPDATE_FIELD', field: 'category', value: '' }); // Optionally clear category
                }
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
          <View>
            <TouchableOpacity
              onPress={() => setIsAccordionOpen(!isAccordionOpen)}
              className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 h-12 justify-between items-center px-4 flex-row"
              disabled={isLoading}
            >
              <Text className="text-base text-gray-900 dark:text-gray-100">
                {name || 'Select a product'}
              </Text>
              {isAccordionOpen ? <ChevronUp size={20} color="#6b7280" /> : <ChevronDown size={20} color="#6b7280" />}
            </TouchableOpacity>
            {isAccordionOpen && (
              <View className="mt-1 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-lg z-10">
                <View className="p-2">
                  {/* "Add New Product..." button INSIDE the accordion */}
                  <TouchableOpacity
                    onPress={onAddNewProduct}
                    className="py-2.5 px-2 mb-1 border-b border-gray-200 dark:border-gray-700"
                  >
                    <Text className="text-base text-[#00b9f1] dark:text-[#00b9f1] font-medium">Add New Product...</Text>
                  </TouchableOpacity>
                  <ControlledInput
                    value={productSearch}
                    onChangeText={setProductSearch}
                    placeholder="Search products..."
                    editable={!isLoading}
                    className="mb-1 text-sm"
                  />
                </View>
                <FlatList
                  data={filteredProductNames}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => onSelectProduct(item)}
                      className="py-2.5 px-4 border-t border-gray-200 dark:border-gray-700"
                    >
                      <Text className="text-base text-gray-900 dark:text-gray-100">{item}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text className="text-center py-3 text-gray-500 dark:text-gray-400">No products found.</Text>}
                  style={{ maxHeight: 150 }}
                  nestedScrollEnabled
                />
              </View>
            )}
          </View>
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
            {costPrice && (parseFloat(costPrice) <= 0 || !/^\d*\.?\d+(\.\d*)?$/.test(costPrice)) && (
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
            {sellingPrice && (parseFloat(sellingPrice) <= 0 || !/^\d*\.?\d+(\.\d*)?$/.test(sellingPrice)) && (
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
              style={{ color: Platform.OS === 'ios' ? '#000000' : (isLoading ? '#a0a0a0' : '#000000'), fontSize: 16 }} // Fixed color logic for native
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
  imageUri: string;
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
  formError: string | null;
  pickImage: () => Promise<void>;
  profit: string;
  isFormValid: boolean;
  formMode: 'add' | 'edit';
  handleSubmit: () => Promise<void>;
  setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  resetDialogState: () => void;
  isCategoryAccordionOpen: boolean;
  setIsCategoryAccordionOpen: React.Dispatch<React.SetStateAction<boolean>>;
  categorySearch: string;
  setCategorySearch: React.Dispatch<React.SetStateAction<string>>;
  filteredCategoriesFromStore: string[]; // Changed prop name
  onSelectCategory: (category: string) => void;
  onAddNewCategory: () => void;
  isProductAccordionOpen: boolean;
  setIsProductAccordionOpen: React.Dispatch<React.SetStateAction<boolean>>;
  productSearch: string;
  setProductSearch: React.Dispatch<React.SetStateAction<string>>;
  filteredProductNames: string[];
  onSelectProduct: (productName: string) => void;
  onAddNewProduct: () => void;
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
    // resetDialogState, // Not used directly here, but kept for potential future use
    isCategoryAccordionOpen,
    setIsCategoryAccordionOpen,
    categorySearch,
    setCategorySearch,
    filteredCategoriesFromStore,
    onSelectCategory,
    onAddNewCategory,
    isProductAccordionOpen,
    setIsProductAccordionOpen,
    productSearch,
    setProductSearch,
    filteredProductNames,
    onSelectProduct,
    onAddNewProduct,
  }: ProductFormDialogContentProps) => {
    return (
      <FlatList // Using FlatList for scrollability inside dialog on smaller screens
        data={[1]} // Dummy data to render the form once
        keyExtractor={() => 'product-form-scroll'}
        renderItem={() => (
          <View>
            <DialogHeader className="p-6 pb-4 border-b border-gray-300 dark:border-gray-600">
              <DialogTitle>
                <Text className="text-xl font-bold text-[#7200da] dark:text-[#00b9f1]">
                  {formMode === 'edit' ? 'Edit Product' : 'Add New Product'}
                </Text>
              </DialogTitle>
            </DialogHeader>
            <View className="space-y-4 p-4 w-[350px] mx-auto" style={{ zIndex: 0 }}>
              {formError && <Text className="text-red-500 dark:text-red-400 text-center mb-4">{formError}</Text>}
              <View style={{ zIndex: isCategoryAccordionOpen ? 20 : 1 }}>
                <CategorySection
                  category={formState.category}
                  isNewCategory={isNewCategory}
                  setIsNewCategory={setIsNewCategory}
                  setIsNewProduct={setIsNewProduct}
                  dispatch={dispatch}
                  isLoading={isLoading}
                  isAccordionOpen={isCategoryAccordionOpen}
                  setIsAccordionOpen={setIsCategoryAccordionOpen}
                  categorySearch={categorySearch}
                  setCategorySearch={setCategorySearch}
                  filteredCategoriesFromStore={filteredCategoriesFromStore}
                  onSelectCategory={onSelectCategory}
                  onAddNewCategory={onAddNewCategory}
                />
              </View>
              <View style={{ zIndex: isProductAccordionOpen ? 20 : 1 }}>
                <ProductNameSection
                  name={formState.name}
                  isNewProduct={isNewProduct}
                  setIsNewProduct={setIsNewProduct}
                  isNewCategory={isNewCategory}
                  setIsNewCategory={setIsNewCategory}
                  dispatch={dispatch}
                  isLoading={isLoading}
                  isAccordionOpen={isProductAccordionOpen}
                  setIsAccordionOpen={setIsProductAccordionOpen}
                  productSearch={productSearch}
                  setProductSearch={setProductSearch}
                  filteredProductNames={filteredProductNames}
                  onSelectProduct={onSelectProduct}
                  onAddNewProduct={onAddNewProduct}
                />
              </View>
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
                  setDialogOpen(false); // This will trigger the onOpenChange which calls resetDialogState
                }}
                disabled={isLoading}
              >
                <Text className="text-base text-gray-900 dark:text-gray-100">Cancel</Text>
              </ShadcnButton>
              <ShadcnButton
                size="lg"
                className="h-12 px-6 bg-[#a855f7] dark:bg-[#00b9f1]"
                onPress={handleSubmit}
                disabled={isLoading || !isFormValid}
              >
                <Text className="text-white dark:text-white">{formMode === 'edit' ? 'Save Changes' : 'Add Product'}</Text>
              </ShadcnButton>
            </DialogFooter>
          </View>
        )}
        contentContainerStyle={{ padding: 0, width: '100%' }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled" // Important for inputs inside scrollable dialogs
        showsVerticalScrollIndicator={false}
      />
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

  const {
    categories: storeCategories,
    fetchCategories: fetchStoreCategories,
    addCategory: addStoreCategory, // Renamed to avoid conflict
  } = useCategoryStore();

  const currentRNColorScheme = rnColorScheme();
  const COLORS = getColors(currentRNColorScheme || 'light');

  const { refreshForm: appRefreshForm } = useRefresh(); // Assuming this is setup elsewhere
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
  const [isFilterAccordionOpen, setIsFilterAccordionOpen] = useState(false);

  const [isCategoryAccordionOpen, setIsCategoryAccordionOpen] = useState(false);
  const [isProductAccordionOpen, setIsProductAccordionOpen] = useState(false);

  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [uiIsLoading, setUiIsLoading] = useState(false); // For UI-specific loading states

  const [categorySearch, setCategorySearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isLoading = storeLoading || uiIsLoading;

  // Categories for the filter dropdown (main screen)
  const categoriesForFilter = useMemo(() => {
    const cats = Array.from(new Set(storeCategories.map((c) => c.name).filter(Boolean))).sort();
    return ['All Categories', ...cats];
  }, [storeCategories]);

  // Categories for the form accordion (inside dialog)
  const categoriesForFormAccordion = useMemo(() => {
    return storeCategories.map(c => c.name).sort();
  }, [storeCategories]);

  const productNamesForSelection = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.name).filter(Boolean))).sort();
  }, [products]);

  const filteredCategoriesForFormAccordion = useMemo(() => {
    if (!categorySearch) return categoriesForFormAccordion;
    return categoriesForFormAccordion.filter((cat) =>
      cat?.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categoriesForFormAccordion, categorySearch]);

  const filteredProductNamesForAccordion = useMemo(() => {
    if (!productSearch) return productNamesForSelection;
    return productNamesForSelection.filter((name) =>
      name.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [productNamesForSelection, productSearch]);

  const filteredProductsDisplay = useMemo(() => {
    if (!selectedCategoryFilter || selectedCategoryFilter === 'All Categories') return products;
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

    const isNameValid = !!formState.name.trim();
    const isCostPriceValid = !!formState.costPrice && !isNaN(costPriceNum) && costPriceNum > 0;
    const isSellingPriceValid = !!formState.sellingPrice && !isNaN(sellingPriceNum) && sellingPriceNum > 0;
    const isQuantityValid = formState.quantity === '' || (!isNaN(quantityNum) && quantityNum >= 0);
    const isUnitValid = !!formState.unit;
    // Category can be empty initially if user is adding a new one
    const isCategoryValid = isNewCategory ? true : !!formState.category.trim();


    return (
      isNameValid &&
      isCostPriceValid &&
      isSellingPriceValid &&
      isQuantityValid &&
      isUnitValid &&
      isCategoryValid
    );
  }, [formState, isNewCategory]);

  useEffect(() => {
    fetchProducts();
    fetchStoreCategories(); // Fetch categories from store
  }, [fetchProducts, fetchStoreCategories]);

  useEffect(() => {
    // Clear form error when form state changes or dialog opens/closes,
    // but not if the error is from the store (e.g., network error)
    if (formError && formError !== storeError) {
      setFormError(null);
    }
  }, [formState, dialogOpen, storeError, formError]);


  const pickImage = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permission Denied", "Permission to access camera roll is required!");
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

  const resetDialogState = useCallback(() => {
    dispatch({ type: 'RESET' });
    setFormMode('add');
    setSelectedProduct(null);
    setFormError(null);
    setCategorySearch('');
    setProductSearch('');
    setIsNewCategory(false);
    setIsNewProduct(false);
    setIsCategoryAccordionOpen(false);
    setIsProductAccordionOpen(false);
  }, [dispatch]);

  const handleProductSubmit = async () => {
    if (!isFormValid) {
      let errorMsg = 'Please fill in all required fields correctly.';
      if (!formState.name.trim()) errorMsg = 'Product name is required.';
      else if (!formState.costPrice || parseFloat(formState.costPrice) <= 0) errorMsg = 'Valid cost price is required.';
      else if (!formState.sellingPrice || parseFloat(formState.sellingPrice) <= 0) errorMsg = 'Valid selling price is required.';
      else if (formState.category.trim() === '' && !isNewCategory) errorMsg = 'Category is required if not adding a new one.';
      setFormError(errorMsg);
      return;
    }
    setUiIsLoading(true);
    setFormError(null);

    try {
      let finalCategoryName = formState.category.trim();

      // If a new category name is provided and it's marked as new
      if (finalCategoryName && isNewCategory) {
        const existingStoreCategory = storeCategories.find(
          (sc) => sc.name.toLowerCase() === finalCategoryName.toLowerCase()
        );
        if (!existingStoreCategory) {
          try {
            console.log(`Attempting to add new category from product form: ${finalCategoryName}`);
            await addStoreCategory({ name: finalCategoryName, description: '', imageUri: undefined });
            console.log(`New category "${finalCategoryName}" added to store.`);
            await fetchStoreCategories(); // Re-fetch to update UI if needed
          } catch (catError) {
            console.error(`Failed to add new category "${finalCategoryName}" from product form:`, catError);
            Alert.alert("Category Error", `Could not add new category: ${catError instanceof Error ? catError.message : String(catError)}. Product will be saved with this category name.`);
            // Proceed with product saving, category might be created later or manually.
          }
        } else {
          console.log(`Category "${finalCategoryName}" already exists in store. Using existing.`);
        }
      } else if (!finalCategoryName && formMode === 'add') {
        // This case should ideally be caught by isFormValid, but as a safeguard:
        // If category is empty and it's not a new category being defined
        // Or if it's a new product without any category selected/entered.
        setFormError('Category is required. Please select or add a new category.');
        setUiIsLoading(false);
        return;
      }


      const productData: Omit<ProductInput, 'userId'> = { // Omit userId, productStore will add it
        name: formState.name.trim(),
        costPrice: parseFloat(formState.costPrice),
        sellingPrice: parseFloat(formState.sellingPrice),
        quantity: formState.quantity ? parseInt(formState.quantity, 10) : 0,
        unit: formState.unit,
        category: finalCategoryName || undefined,
        imageUri: formState.imageUri || undefined,
        // Default other fields from ProductInput model
        rating: 0,
        discount: 0,
        image: '', // This might be deprecated if imageUri is primary
        isActive: true, // New products are active by default
      };

      if (formMode === 'add') {
        await addProduct(productData);
      } else if (selectedProduct) {
        await updateProduct(selectedProduct.id, productData);
      }

      setDialogOpen(false); // This will trigger resetDialogState via onOpenChange
      fetchProducts(); // Re-fetch products to update the list
    } catch (e: any) {
      console.error(`Failed to ${formMode === 'add' ? 'add' : 'update'} product:`, e);
      setFormError(e.message || `Failed to ${formMode === 'add' ? 'add' : 'update'} product. Please try again.`);
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
    setIsNewCategory(false); // When editing, assume category exists unless changed
    setIsNewProduct(false); // Editing an existing product
    setIsCategoryAccordionOpen(false);
    setIsProductAccordionOpen(false);
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
      fetchProducts(); // Re-fetch products
    } catch (e: any) {
      console.error('Failed to delete product:', e);
      Alert.alert("Delete Error", e.message || 'Failed to delete product. Please try again.');
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
      await fetchStoreCategories();
    } catch (e) {
      console.error("Error on refresh: ", e);
    } finally {
      setRefreshing(false);
    }
  }, [fetchProducts, fetchStoreCategories]);

  // Handler for when an existing category is selected from the accordion
  const handleSelectCategoryFromAccordion = useCallback((item: string) => {
    setIsNewCategory(false); // No longer adding a new category
    dispatch({ type: 'UPDATE_FIELD', field: 'category', value: item });
    setCategorySearch(''); // Clear search
    setIsCategoryAccordionOpen(false); // Close accordion
  }, [dispatch]);

  // Handler for "Add New Category..." clicked within the accordion
  const handleAddNewCategoryMode = useCallback(() => {
    setIsNewCategory(true);
    setIsNewProduct(true); // Usually, new category means new product details
    dispatch({ type: 'UPDATE_FIELD', field: 'category', value: '' }); // Clear category field for new input
    dispatch({ type: 'UPDATE_FIELD', field: 'name', value: '' }); // Clear product name as well
    setCategorySearch('');
    setIsCategoryAccordionOpen(false);
  }, [dispatch]);

  // Handler for when an existing product is selected from the accordion
  const handleSelectProductFromAccordion = useCallback((itemName: string) => {
    const productDetails = products.find(p => p.name === itemName);

    setIsNewProduct(false); // No longer adding a new product
    dispatch({ type: 'UPDATE_FIELD', field: 'name', value: itemName });

    if (productDetails) {
      // Pre-fill form with selected product details
      dispatch({
        type: 'SET_FORM', payload: {
          name: productDetails.name,
          category: productDetails.category || '',
          costPrice: productDetails.costPrice.toString(),
          sellingPrice: productDetails.sellingPrice.toString(),
          quantity: productDetails.quantity.toString(),
          unit: productDetails.unit || 'piece',
          imageUri: productDetails.imageUri || '',
        }
      });
      setIsNewCategory(!productDetails.category); // If product has no category, set to new category mode
    } else {
      // Should not happen if itemName is from products list
      // Clear other fields or set to new category mode if desired
      dispatch({ type: 'UPDATE_FIELD', field: 'category', value: '' });
      setIsNewCategory(true);
    }
    setProductSearch('');
    setIsProductAccordionOpen(false);
  }, [dispatch, products]);

  // Handler for "Add New Product..." clicked within the accordion
  const handleAddNewProductMode = useCallback(() => {
    setIsNewProduct(true);
    dispatch({ type: 'UPDATE_FIELD', field: 'name', value: '' }); // Clear name field
    // If category is not already in 'new' mode, switch it too
    if (!isNewCategory) {
      setIsNewCategory(true);
      dispatch({ type: 'UPDATE_FIELD', field: 'category', value: '' }); // Clear category field
    }
    setProductSearch('');
    setIsProductAccordionOpen(false);
  }, [dispatch, isNewCategory]);


  const renderMainProductItem = useCallback(
    ({ item }: { item: Product }) => (
      <Card className="mb-3 bg-white dark:bg-gray-800 shadow-md rounded-xl overflow-hidden">
        <CardHeader className="py-3 px-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              {item.imageUri ? (
                <Image
                  source={{ uri: item.imageUri }}
                  style={{ width: 48, height: 48 }}
                  className="rounded-lg mr-3"
                />
              ) : (
                <View className="w-12 h-12 rounded-lg mr-3 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Package size={24} className="text-gray-400 dark:text-gray-500" />
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
                size="icon"
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
    <LinearGradient
        colors={[COLORS.white, COLORS.yellow]}
        style={{ flex: 1 }}
    >
        <View className="p-4 flex-1 bg-transparent">
        <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-bold text-black dark:text-[#00b9f1]">Products</Text>
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
                resetDialogState();
                setFormMode('add');
                setIsNewCategory(true); // Default to new category for new product
                setIsNewProduct(true);  // Default to new product
                setDialogOpen(true);
                }}
                disabled={isLoading}
                className="bg-[#a855f7] dark:bg-[#00b9f1] px-4 py-2.5 rounded-lg"
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
            <DialogHeader className="p-5 border-b border-gray-200 dark:border-gray-700 w-80">
                <DialogTitle>
                <Text className="text-xl font-bold text-[#7200da] dark:text-[#00b9f1]">Filter by Category</Text>
                </DialogTitle>
            </DialogHeader>
            <View className="p-5">
                <TouchableOpacity
                onPress={() => setIsFilterAccordionOpen(!isFilterAccordionOpen)}
                className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 h-12 justify-between items-center px-4 flex-row"
                disabled={isLoading}
                >
                <Text className="text-base text-gray-900 dark:text-gray-100">
                    {selectedCategoryFilter || 'All Categories'}
                </Text>
                {isFilterAccordionOpen ? <ChevronUp size={20} color="#6b7280" /> : <ChevronDown size={20} color="#6b7280" />}
                </TouchableOpacity>
                {isFilterAccordionOpen && (
                <View className="mt-1 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-lg z-10">
                    <FlatList
                    data={categoriesForFilter} // Use categories from store for filter
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                        onPress={() => {
                            setSelectedCategoryFilter(item === 'All Categories' ? null : item);
                            setIsFilterAccordionOpen(false);
                        }}
                        className="py-2.5 px-4 border-t border-gray-200 dark:border-gray-700"
                        >
                        <Text className="text-base text-gray-900 dark:text-gray-100">{item}</Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text className="text-center py-3 text-gray-500 dark:text-gray-400">No categories found.</Text>}
                    style={{ maxHeight: 150 }}
                    nestedScrollEnabled
                    />
                </View>
                )}
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

        {/* Add/Edit Product Dialog */}
        <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
                // Delay reset to allow animations to finish, reducing flicker
                setTimeout(() => {
                resetDialogState();
                }, Platform.OS === 'web' ? 10 : 150); // Shorter delay for web
            }
            }}
        >
            <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0} // Adjust as needed
            style={{ flex: 1 }}
            >
            <DialogContent
                className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-11/12 mx-auto"
                style={{ maxHeight: '95%' }} // Ensure content doesn't overflow screen
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
                handleSubmit={handleProductSubmit} // Combined submit handler
                setDialogOpen={setDialogOpen}
                resetDialogState={resetDialogState}
                isCategoryAccordionOpen={isCategoryAccordionOpen}
                setIsCategoryAccordionOpen={setIsCategoryAccordionOpen}
                categorySearch={categorySearch}
                setCategorySearch={setCategorySearch}
                filteredCategoriesFromStore={filteredCategoriesForFormAccordion} // Use store categories
                onSelectCategory={handleSelectCategoryFromAccordion}
                onAddNewCategory={handleAddNewCategoryMode} // For "Add New Category..." button
                isProductAccordionOpen={isProductAccordionOpen}
                setIsProductAccordionOpen={setIsProductAccordionOpen}
                productSearch={productSearch}
                setProductSearch={setProductSearch}
                filteredProductNames={filteredProductNamesForAccordion}
                onSelectProduct={handleSelectProductFromAccordion}
                onAddNewProduct={handleAddNewProductMode} // For "Add New Product..." button
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
    </LinearGradient>
  );
};

export default ProductManagementScreen;