import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Image, useColorScheme as rnColorScheme, Platform } from 'react-native'; // Added Platform
import { Text } from '~/components/ui/text';
import { Card, CardContent } from '~/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Tag, Pencil, Trash2, Search, ArrowDownUp, XCircle, PlusIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Category } from '~/lib/stores/types';
import { useCategoryStore } from '~/lib/stores/categoryStore';
import { LinearGradient } from 'expo-linear-gradient';
import GlobalToaster, { Toaster } from '~/components/toaster/Toaster'; 

// Define the color palette based on theme (assuming this is correctly defined elsewhere or here)
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


type SortOrder = 'asc' | 'desc' | 'none';

interface ImageSectionProps {
  imageUri: string;
  selectedImage: string | null;
  pickImage: () => Promise<void>;
  isLoading: boolean;
}

const ImageSection = React.memo(
  ({ imageUri, selectedImage, pickImage, isLoading }: ImageSectionProps) => {
    return (
      <View>
        <Text className="mb-2 mt-4 text-base font-semibold text-gray-700 dark:text-gray-300">Category Image</Text>
        <Button
          variant="outline"
          className="w-full h-12 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          onPress={pickImage}
          disabled={isLoading}
        >
          <Text className="text-base text-gray-900 dark:text-gray-100">{imageUri || selectedImage ? 'Change Image' : 'Select Image'}</Text>
        </Button>
        {selectedImage && (
          <View className="mt-4 items-center">
            <Image
              source={{ uri: selectedImage }}
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

const CategoryManagementScreen = () => {
  const {
    categories,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    isLoading: storeIsLoading,
    error: storeError,
    clearError,
  } = useCategoryStore();

  const currentRNColorScheme = rnColorScheme();
  const COLORS = getColors(currentRNColorScheme || 'light');

  const [initialLoading, setInitialLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    imageUri: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortByName, setSortByName] = useState<SortOrder>('none');

  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      try {
        await fetchCategories();
      } catch (e: any) {
        const message = e.message || "Failed to load categories initially.";
        Toaster.error("Load Error", { description: message });
      } finally {
        setInitialLoading(false);
      }
    };
    loadData();
  }, [fetchCategories]);

  useEffect(() => {
    if (storeError) {
        if (dialogOpen || deleteConfirmDialogOpen) {
            setFormError(storeError); // Display error within the active dialog
        }
        // Specific actions (add, edit, delete) will show their own toasts on error.
        // A general toast for storeError when no dialog is open might be too broad
        // if fetchCategories on load already has a toast.
    } else {
        setFormError(null); // Clear form error if storeError is cleared
    }
  }, [storeError, dialogOpen, deleteConfirmDialogOpen]);


  const pickImage = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Toaster.error("Permission Denied", { description: "Permission to access camera roll is required!" });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        console.log('Selected image URI:', uri);
        setSelectedImage(uri);
        setForm((prev) => ({ ...prev, imageUri: uri }));
      }
    } catch (e: any) {
      console.error("Image picking error: ", e);
      Toaster.error("Image Error", { description: e.message || "Could not select image. Please try again." });
    }
  }, []);

  const isFormValid = useCallback(() => {
    if (form.name.trim() === '') {
      const msg = 'Category name is required.';
      setFormError(msg);
      Toaster.warning("Validation Error", { description: msg });
      return false;
    }
    setFormError(null);
    return true;
  }, [form]);

  const resetFormAndCloseDialog = useCallback(() => {
    setForm({ name: '', description: '', imageUri: '' });
    setDialogOpen(false);
    setFormMode('add');
    setSelectedCategory(null);
    setSelectedImage(null); // Reset selected image preview
    setFormError(null);
    clearError();
  }, [clearError]);

  const handleAddCategory = useCallback(async () => {
    if (!isFormValid()) return;
    const categoryName = form.name;
    try {
      console.log('Adding category with data:', { ...form, imageUri: form.imageUri || undefined });
      await addCategory({
        name: form.name,
        description: form.description || undefined,
        imageUri: form.imageUri || undefined,
      });
      await fetchCategories();
      resetFormAndCloseDialog();
      Toaster.success("Category Added", { description: `"${categoryName}" has been added successfully.` });
    } catch (error: any) {
      console.error('Add category error:', error);
      const message = error.message || 'Failed to add category. Please try again.';
      setFormError(message);
      Toaster.error("Add Failed", { description: message });
    }
  }, [form, addCategory, isFormValid, resetFormAndCloseDialog, fetchCategories]);

  const handleEditClick = useCallback((category: Category) => {
    console.log('Editing category:', category);
    setSelectedCategory(category);
    setForm({
      name: category.name,
      description: category.description || '',
      imageUri: category.imageUri || '',
    });
    setSelectedImage(category.imageUri || null); // Set image for preview
    setFormMode('edit');
    clearError();
    setFormError(null);
    setDialogOpen(true);
  }, [clearError]);

  const handleEditSubmit = useCallback(async () => {
    if (!isFormValid() || !selectedCategory) return;
    const categoryName = form.name;
    try {
      console.log('Updating category with data:', { ...form, imageUri: form.imageUri || undefined });
      await updateCategory(selectedCategory.id, {
        name: form.name,
        description: form.description || undefined,
        imageUri: form.imageUri || undefined,
      });
      await fetchCategories();
      resetFormAndCloseDialog();
      Toaster.success("Category Updated", { description: `"${categoryName}" has been updated successfully.` });
    } catch (error: any) {
      console.error('Update category error:', error);
      const message = error.message || 'Failed to update category. Please try again.';
      setFormError(message);
      Toaster.error("Update Failed", { description: message });
    }
  }, [form, updateCategory, selectedCategory, isFormValid, resetFormAndCloseDialog, fetchCategories]);

  const handleDeleteClick = useCallback((category: Category) => {
    setSelectedCategory(category);
    clearError();
    setFormError(null); // Clear any previous form error for the delete dialog
    setDeleteConfirmDialogOpen(true);
  }, [clearError]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedCategory) return;
    const categoryName = selectedCategory.name;
    try {
      await deleteCategory(selectedCategory.id);
      await fetchCategories();
      setDeleteConfirmDialogOpen(false);
      setSelectedCategory(null);
      Toaster.success("Category Deleted", { description: `"${categoryName}" has been deleted successfully.` });
    } catch (error: any) {
      console.error('Delete category error:', error);
      const message = storeError || error.message || 'Failed to delete category. Please try again.';
      // storeError will be set by the store, and might be displayed in the dialog if it's still open by some logic.
      Toaster.error("Delete Failed", { description: message });
    }
  }, [selectedCategory, deleteCategory, storeError, fetchCategories]);

  const filteredAndSortedCategories = useMemo(() => {
    let processedCategories = [...categories];
    if (searchQuery.trim() !== '') {
      const lowercasedQuery = searchQuery.toLowerCase();
      processedCategories = processedCategories.filter((category) =>
        category.name.toLowerCase().includes(lowercasedQuery)
      );
    }
    if (sortByName !== 'none') {
      processedCategories.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return sortByName === 'asc'
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
    }
    console.log('Filtered and sorted categories:', processedCategories);
    return processedCategories;
  }, [categories, searchQuery, sortByName]);

  const toggleSortOrder = () => {
    if (sortByName === 'none') setSortByName('asc');
    else if (sortByName === 'asc') setSortByName('desc');
    else setSortByName('none');
  };

  const clearSearchAndSort = () => {
    setSearchQuery('');
    setSortByName('none');
  };

  if (initialLoading) {
    return (
      <LinearGradient
        colors={[COLORS.white, COLORS.yellow]}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="mt-4 text-muted-foreground">Loading categories...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[COLORS.white, COLORS.yellow]}
      style={{ flex: 1 }}
    >
      <View className="flex-1">
        <View className="p-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-2xl font-bold text-foreground">Manage Categories</Text>
            <Button
              onPress={() => {
                resetFormAndCloseDialog(); // Resets form and selectedImage
                setFormMode('add');
                setDialogOpen(true);
              }}
              disabled={storeIsLoading}
              size="icon"
              variant="ghost"
            >
              <View className="flex-row items-center ">
                <PlusIcon size={20} color="#3B82F6" className="mr-2" />
                <Tag size={20} color="#3B82F6" className="mr-2" />
              </View>
            </Button>
          </View>

          <View className="flex-row items-center mb-4 gap-2">
            <View className="flex-1 flex-row items-center bg-muted rounded-lg px-3">
              <Search size={20} className="text-muted-foreground" />
              <Input
                placeholder="Search Category Name..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 h-11 border-0 bg-transparent ml-2 text-base text-foreground"
                placeholderTextColor="hsl(var(--muted-foreground))"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                  <XCircle size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
            <Button variant="ghost" onPress={toggleSortOrder} size="icon" className="p-2.5">
              <ArrowDownUp size={18} color="#3B82F6" />
            </Button>
          </View>
          {(searchQuery || sortByName !== 'none') && (
            <TouchableOpacity onPress={clearSearchAndSort} className="mb-3 self-start">
              <Text className="text-sm text-primary">Clear Search & Sort</Text>
            </TouchableOpacity>
          )}

          {/* Display general storeError if no dialog is open */}
          {storeError && !dialogOpen && !deleteConfirmDialogOpen && (
            <Text className="text-destructive text-center mb-4">{storeError}</Text>
          )}
        </View>

        <FlatList
          data={filteredAndSortedCategories}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={() => (
            <View className="items-center justify-center py-10 px-4">
              <Text className="text-muted-foreground text-center mb-4">
                {searchQuery || sortByName !== 'none' ? 'No categories match your search.' : 'No categories added yet.'}
              </Text>
              <Button
                onPress={() => {
                  resetFormAndCloseDialog();
                  setFormMode('add');
                  setDialogOpen(true);
                }}
                variant="ghost"
              >
                <Tag size={20} color="#3B82F6" className="mr-2" />
                <Text className="text-primary">Add Category</Text>
              </Button>
            </View>
          )}
          renderItem={({ item }) => (
            <Card className="mb-2 mx-4 bg-card">
              <CardContent className="pt-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-center flex-1 mr-2">
                    {item.imageUri ? (
                      <Image
                        source={{ uri: item.imageUri, cache: 'reload' }}
                        style={{ width: 40, height: 40 }}
                        className="rounded-md mr-2"
                        onError={(e) => console.log('Image load error:', e.nativeEvent.error, 'URI:', item.imageUri)}
                      />
                    ) : (
                      <View className="w-[40px] h-[40px] rounded-md mr-2 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                         <Tag size={20} className="text-gray-400 dark:text-gray-500" />
                      </View>
                    )}
                    <View>
                      <Text className="text-foreground font-semibold text-lg">{item.name}</Text>
                      {item.description && (
                        <Text className="text-sm text-muted-foreground" numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View className="flex-row gap-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onPress={() => handleEditClick(item)}
                      disabled={storeIsLoading}
                    >
                      <Pencil size={20} color="#3B82F6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onPress={() => handleDeleteClick(item)}
                      disabled={storeIsLoading}
                    >
                      <Trash2 size={20} color="#EF4444" />
                    </Button>
                  </View>
                </View>
              </CardContent>
            </Card>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) resetFormAndCloseDialog();
            else setDialogOpen(open);
          }}
        >
          <DialogContent className="p-0 bg-background rounded-lg shadow-lg max-w-md w-80 mx-auto">
            <DialogHeader className="p-4 border-b border-border">
              <DialogTitle className="text-xl font-bold text-foreground">
                {formMode === 'edit' ? 'Edit Category' : 'Add New Category'}
              </DialogTitle>
            </DialogHeader>
            <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              <View className="space-y-4">
                {formError && <Text className="text-destructive text-center">{formError}</Text>}
                <View>
                  <Text className="mb-1 text-sm font-medium text-muted-foreground">
                    Category Name <Text className="text-destructive">*</Text>
                  </Text>
                  <Input
                    placeholder="Enter category name"
                    value={form.name}
                    onChangeText={(text) => setForm({ ...form, name: text })}
                    className="h-12 text-base"
                    editable={!storeIsLoading}
                  />
                </View>
                <View>
                  <Text className="mb-1 text-sm font-medium text-muted-foreground">Description</Text>
                  <Input
                    placeholder="Enter description (optional)"
                    value={form.description}
                    onChangeText={(text) => setForm({ ...form, description: text })}
                    className="h-12 text-base" // Standard height for single line
                    style={{ height: Platform.OS === 'ios' ? 80 : undefined, textAlignVertical: 'top' }} // For multiline
                    multiline
                    numberOfLines={3}
                    editable={!storeIsLoading}
                  />
                </View>
                <ImageSection
                  imageUri={form.imageUri} // Pass current form imageUri (might be empty if new or cleared)
                  selectedImage={selectedImage} // Pass selectedImage for preview
                  pickImage={pickImage}
                  isLoading={storeIsLoading}
                />
              </View>
            </ScrollView>
            <DialogFooter className="p-4 flex-row justify-end gap-x-2 border-t border-border">
              <Button
                variant="outline"
                onPress={resetFormAndCloseDialog}
                disabled={storeIsLoading}
              >
                <Text>Cancel</Text>
              </Button>
              <Button
                className='bg-[#a855f7] dark:bg-[#00b9f1]' // Matched style from product screen
                onPress={formMode === 'edit' ? handleEditSubmit : handleAddCategory}
                disabled={storeIsLoading || (formError !== null && formError !== storeError && form.name.trim() === '')} // Disable if specific form validation (name empty) fails
              >
                <Text className="text-white dark:text-white"> {/* Matched style */}
                  {storeIsLoading ? (
                    <ActivityIndicator size="small" color="hsl(var(--primary-foreground))" />
                  ) : formMode === 'edit' ? (
                    'Save Changes'
                  ) : (
                    'Add Category'
                  )}
                </Text>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={deleteConfirmDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteConfirmDialogOpen(false);
              setSelectedCategory(null);
              clearError(); // Clear error when closing dialog
            } else {
              setDeleteConfirmDialogOpen(open);
            }
          }}
        >
          <DialogContent className="p-6 bg-background rounded-lg shadow-lg max-w-md w-[95%] mx-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">Confirm Deletion</DialogTitle>
            </DialogHeader>
            <Text className="text-muted-foreground my-4">
              Are you sure you want to delete the category "{selectedCategory?.name}"? This action cannot be undone.
            </Text>
            {/* Display storeError specifically for the delete dialog if it's set */}
            {storeError && <Text className="text-destructive text-center mb-2">{storeError}</Text>}
            <DialogFooter className="flex-row justify-end gap-x-3">
              <Button
                variant="outline"
                onPress={() => {
                  setDeleteConfirmDialogOpen(false);
                  setSelectedCategory(null);
                  clearError();
                }}
                disabled={storeIsLoading}
              >
                <Text>Cancel</Text>
              </Button>
              <Button
                variant="destructive"
                onPress={handleDeleteConfirm}
                disabled={storeIsLoading}
              >
                <Text className="text-destructive-foreground">
                  {storeIsLoading ? (
                    <ActivityIndicator size="small" color="hsl(var(--destructive-foreground))" />
                  ) : (
                    'Delete'
                  )}
                </Text>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </View>
    </LinearGradient>
  );
};

export default CategoryManagementScreen;