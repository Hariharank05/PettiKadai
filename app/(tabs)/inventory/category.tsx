import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Alert, Image, useColorScheme as rnColorScheme } from 'react-native';
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
          <Text className="text-base text-gray-900 dark:text-gray-100">{imageUri ? 'Change Image' : 'Select Image'}</Text>
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
      await fetchCategories();
      setInitialLoading(false);
    };
    loadData();
  }, [fetchCategories]);

  useEffect(() => {
    if (!dialogOpen || storeError) {
      setFormError(null);
    }
    if (storeError && dialogOpen) {
      setFormError(storeError);
    }
  }, [dialogOpen, storeError]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      console.log('Selected image URI:', uri); // Debug log
      setSelectedImage(uri);
      setForm((prev) => ({ ...prev, imageUri: uri }));
    }
  }, []);

  const isFormValid = useCallback(() => {
    if (form.name.trim() === '') {
      setFormError('Category name is required.');
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
    setSelectedImage(null);
    setFormError(null);
    clearError();
  }, [clearError]);

  const handleAddCategory = useCallback(async () => {
    if (!isFormValid()) return;
    try {
      console.log('Adding category with data:', { ...form, imageUri: form.imageUri || undefined }); // Debug log
      await addCategory({
        name: form.name,
        description: form.description || undefined,
        imageUri: form.imageUri || undefined,
      });
      await fetchCategories(); // Force re-fetch to ensure latest data
      resetFormAndCloseDialog();
    } catch (error: any) {
      console.error('Add category error:', error);
      // Error is set in store, formError will update via useEffect
    }
  }, [form, addCategory, isFormValid, resetFormAndCloseDialog, fetchCategories]);

  const handleEditClick = useCallback((category: Category) => {
    console.log('Editing category:', category); // Debug log
    setSelectedCategory(category);
    setForm({
      name: category.name,
      description: category.description || '',
      imageUri: category.imageUri || '',
    });
    setSelectedImage(category.imageUri || null);
    setFormMode('edit');
    clearError();
    setFormError(null);
    setDialogOpen(true);
  }, [clearError]);

  const handleEditSubmit = useCallback(async () => {
    if (!isFormValid() || !selectedCategory) return;
    try {
      console.log('Updating category with data:', { ...form, imageUri: form.imageUri || undefined }); // Debug log
      await updateCategory(selectedCategory.id, {
        name: form.name,
        description: form.description || undefined,
        imageUri: form.imageUri || undefined,
      });
      await fetchCategories(); // Force re-fetch to ensure latest data
      resetFormAndCloseDialog();
    } catch (error: any) {
      console.error('Update category error:', error);
      // Error is set in store
    }
  }, [form, updateCategory, selectedCategory, isFormValid, resetFormAndCloseDialog, fetchCategories]);

  const handleDeleteClick = useCallback((category: Category) => {
    setSelectedCategory(category);
    clearError();
    setDeleteConfirmDialogOpen(true);
  }, [clearError]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedCategory) return;
    try {
      await deleteCategory(selectedCategory.id);
      await fetchCategories(); // Force re-fetch to ensure latest data
      setDeleteConfirmDialogOpen(false);
      setSelectedCategory(null);
    } catch (error: any) {
      console.error('Delete category error:', error);
      Alert.alert('Delete Error', storeError || 'Failed to delete category.');
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
    console.log('Filtered and sorted categories:', processedCategories); // Debug log
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
                resetFormAndCloseDialog();
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
                        onError={(e) => console.log('Image load error:', e.nativeEvent.error, 'URI:', item.imageUri)} // Debug log
                      />
                    ) : (
                      <View className="w-[40px] h-[40px] rounded-md mr-2 bg-gray-200 dark:bg-gray-700" />
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
          <DialogContent className="p-0 bg-background rounded-lg shadow-lg max-w-md w-[95%] mx-auto">
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
                    className="h-12 text-base"
                    multiline
                    numberOfLines={3}
                    editable={!storeIsLoading}
                  />
                </View>
                <ImageSection
                  imageUri={form.imageUri}
                  selectedImage={selectedImage}
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
              className='bg-[#a855f7]'
                onPress={formMode === 'edit' ? handleEditSubmit : handleAddCategory}
                disabled={storeIsLoading || (dialogOpen && formError !== null && formError !== storeError)}
              >
                <Text className="text-primary-foreground">
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
              clearError();
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