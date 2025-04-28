// app/home.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { Plus, Package, AlertTriangle } from 'lucide-react-native';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { useProductStore } from '~/lib/stores/productStore';
import { initDatabase } from '~/lib/db';
import { Product, ProductInput } from '~/lib/models/product';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '~/components/ui/select';
import { Picker } from '@react-native-picker/picker';

export default function HomeScreen() {
  const { products, loading, error, fetchProducts, addProduct, updateProduct, deleteProduct } = useProductStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductInput>({
    name: '',
    costPrice: 0,
    sellingPrice: 0,
    quantity: 0,
    unit: 'piece', // Add default unit
    category: '',
    imageUri: '',  // Add empty image URI
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Initialize database and fetch products on component mount
  useEffect(() => {
    const setUp = async () => {
      try {
        await initDatabase();
        await fetchProducts();
      } catch (error) {
        console.error('Setup error:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    setUp();
  }, [fetchProducts]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setProductForm({
        ...productForm,
        imageUri: result.assets[0].uri
      });
    }
  };
  // Open add product dialog
  const handleAddClick = () => {
    resetForm();
    setIsEditing(false);
    setDialogOpen(true);
  };

  // Open edit product dialog
  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      name: '',
      costPrice: 0,
      sellingPrice: 0,
      quantity: 0,
      unit: 'piece',
      category: '',
      imageUri: '',
    });
    setIsEditing(true);
    setDialogOpen(true);
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  // Handle form submission (add or edit)
  const handleSubmit = async () => {
    try {
      if (isEditing && selectedProduct) {
        await updateProduct(selectedProduct.id, productForm);
      } else {
        await addProduct(productForm);
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  // Handle product deletion
  const handleDelete = async () => {
    if (selectedProduct) {
      try {
        await deleteProduct(selectedProduct.id);
        setDeleteDialogOpen(false);
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  // Reset the form
  const resetForm = () => {
    setProductForm({
      name: '',
      costPrice: 0,
      sellingPrice: 0,
      quantity: 0,
      unit: 'piece',
      category: '',
      imageUri: '',
    });
    setSelectedImage(null);
    setSelectedProduct(null);
  };

  if (isInitializing) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="mt-4">Initializing app...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4 bg-background">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold">Inventory</Text>
        <Button onPress={handleAddClick}>
          <Plus className="mr-2" size={16} color="white" />
          <Text >Add Product</Text>
        </Button>
      </View>

      {loading && <ActivityIndicator className="my-4" />}

      {error && (
        <Card className="mb-4 bg-destructive/10">
          <CardContent className="py-4">
            <Text className="text-destructive">{error}</Text>
          </CardContent>
        </Card>
      )}

      {!loading && products.length === 0 ? (
        <Card className="items-center p-8">
          <Package size={64} className="mb-4 text-muted-foreground" />
          <Text className="text-xl font-semibold mb-2">No products yet</Text>
          <Text className="text-center text-muted-foreground mb-6">
            Add your first product to start managing your inventory
          </Text>
          <Button onPress={handleAddClick}>
            <Plus className="mr-2" size={16} color="white" />
            <Text className="text-white">Add Your First Product</Text>
          </Button>
        </Card>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card className="mb-3">
              <CardHeader>
                <View className="flex-row">
                  {item.imageUri && (
                    <Image
                      source={{ uri: item.imageUri }}
                      style={{ width: 60, height: 60 }}
                      className="rounded-md mr-3"
                    />
                  )}
                  <View className="flex-1">
                    <CardTitle>{item.name}</CardTitle>
                  </View>
                </View>
              </CardHeader>
              <CardContent className="py-0">
                <View className="flex-row flex-wrap">
                  <View className="w-1/2 mb-2">
                    <Text className="text-muted-foreground">Cost</Text>
                    <Text>₹{item.costPrice.toFixed(2)}</Text>
                  </View>
                  <View className="w-1/2 mb-2">
                    <Text className="text-muted-foreground">Price</Text>
                    <Text>₹{item.sellingPrice.toFixed(2)}</Text>
                  </View>
                  <View className="w-1/2 mb-2">
                    <Text className="text-muted-foreground">Stock</Text>
                    <View className="flex-row items-center">
                      <Text>{item.quantity} {item.unit}</Text>
                      {item.quantity < 5 && (
                        <AlertTriangle size={16} className="ml-2 text-orange-500" />
                      )}
                    </View>
                  </View>
                  {item.category && (
                    <View className="w-1/2 mb-2">
                      <Text className="text-muted-foreground">Category</Text>
                      <Text>{item.category}</Text>
                    </View>
                  )}
                </View>
              </CardContent>
              <CardFooter className="flex-row justify-end pt-2">
                <Button variant="outline" size="sm" className="mr-2" onPress={() => handleEditClick(item)}>
                 <Text>Edit</Text> 
                </Button>
                <Button variant="destructive" size="sm" onPress={() => handleDeleteClick(item)}>
                <Text>Delete</Text>
                </Button>
              </CardFooter>
            </Card>
          )}
        />
      )}

      {/* Add/Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <View className="space-y-4 mt-4">
            <View>
              <Text className="mb-2 font-medium">TextProduct Name</Text>
              <Input
                placeholder="Enter product name"
                value={productForm.name}
                onChangeText={(text) => setProductForm({ ...productForm, name: text })}
              />
            </View>

            <View>
              <Text className="mb-2 font-medium">Cost Price (₹)</Text>
              <Input
                placeholder="0.00"
                keyboardType="numeric"
                value={productForm.costPrice.toString()}
                onChangeText={(text) => setProductForm({ ...productForm, costPrice: parseFloat(text) || 0 })}
              />
            </View>

            <View>
              <Text className="mb-2 font-medium">Selling Price (₹)</Text>
              <Input
                placeholder="0.00"
                keyboardType="numeric"
                value={productForm.sellingPrice.toString()}
                onChangeText={(text) => setProductForm({ ...productForm, sellingPrice: parseFloat(text) || 0 })}
              />
            </View>

            <View>
              <Text className="mb-2 font-medium">Quantity</Text>
              <Input
                placeholder="0"
                keyboardType="numeric"
                value={productForm.quantity.toString()}
                onChangeText={(text) => setProductForm({ ...productForm, quantity: parseInt(text) || 0 })}
              />
            </View>

            <View>
              <Text className="mb-2 font-medium">Unit</Text>
              <View className="border border-input rounded-md">
                <Picker
                  selectedValue={productForm.unit || 'piece'}
                  onValueChange={(value) => setProductForm({ ...productForm, unit: value.toString() })}
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

            <View>
              <Text className="mb-2 font-medium">Product Image</Text>
              <Button variant="outline" onPress={pickImage}>
                <Text>Select Image</Text>
              </Button>

              {selectedImage && (
                <View className="mt-2 items-center">
                  <Image
                    source={{ uri: selectedImage }}
                    style={{ width: 100, height: 100 }}
                    className="rounded-md"
                  />
                </View>
              )}
            </View>

            <View>
              <Text className="mb-2 font-medium">Category (Optional)</Text>
              <Input
                placeholder="Enter category"
                value={productForm.category}
                onChangeText={(text) => setProductForm({ ...productForm, category: text })}
              />
            </View>

            <View className="flex-row justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                onPress={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
              >
                <Text>Cancel</Text>
              </Button>
              <Button
                onPress={handleSubmit}
                disabled={!productForm.name || productForm.costPrice <= 0 || productForm.sellingPrice <= 0}
              >
                <Text>{isEditing ? 'Save Changes' : 'Add Product'}</Text>
              </Button>
            </View>


          </View>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle><Text>Are you sure?</Text></AlertDialogTitle>
            <AlertDialogDescription>
              <Text>This will permanently delete the product "{selectedProduct?.name}". This action cannot be undone.</Text>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setDeleteDialogOpen(false)}>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={handleDelete}>
              <Text>Delete</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}