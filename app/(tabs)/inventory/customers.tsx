// ~/app/(tabs)/customers.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, useColorScheme as rnColorScheme, KeyboardTypeOptions } from 'react-native'; // Removed Alert
import { Text } from '~/components/ui/text';
import { Card, CardContent } from '~/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input'; // Original Input, used by DebouncedInput
import { Button } from '~/components/ui/button';
import { UserPlus, Pencil, Trash2, Search, ArrowDownUp, XCircle } from 'lucide-react-native';
import { useCustomerStore } from '~/lib/stores/customerStore';
import { Customer } from '~/lib/stores/types';
import { LinearGradient } from 'expo-linear-gradient';
import GlobalToaster, { Toaster } from '~/components/toaster/Toaster'; 
import debounce from 'lodash/debounce'; // Added for DebouncedInput

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

// Copied and slightly modified DebouncedInput component
interface DebouncedInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions; // Using react-native's KeyboardTypeOptions for broader compatibility
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  className?: string;
  placeholderTextColor?: string;
  style?: any;
  editable?: boolean; // Added for form input disabling
}

const DebouncedInput = React.memo(
  ({
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    className = '',
    placeholderTextColor,
    style,
    editable, // Destructured
  }: DebouncedInputProps) => {
    const [localValue, setLocalValue] = useState(value);

    const debouncedUpdate = useMemo(
      () => debounce(onChangeText, 300),
      [onChangeText]
    );

    useEffect(() => {
      if (localValue !== value) {
        setLocalValue(value);
      }
    }, [value]);

    const handleTextChange = (text: string) => {
      setLocalValue(text);
      debouncedUpdate(text);
    };

    return (
      <Input // Using the original Input component from '~/components/ui/input'
        value={localValue}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        className={`h-11 border border-gray-300 dark:border-gray-600 ${className}`} // Base style + appended prop className
        style={style}
        placeholderTextColor={placeholderTextColor}
        editable={editable} // Passed to underlying Input
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.placeholder === nextProps.placeholder &&
      prevProps.keyboardType === nextProps.keyboardType &&
      prevProps.autoCapitalize === nextProps.autoCapitalize &&
      prevProps.className === nextProps.className &&
      prevProps.placeholderTextColor === nextProps.placeholderTextColor &&
      prevProps.style === nextProps.style &&
      prevProps.editable === nextProps.editable // Added to comparison
    );
  }
);
DebouncedInput.displayName = 'DebouncedInput';

const CustomerManagementScreen = () => {
  const {
    customers,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    isLoading: storeIsLoading,
    error: storeError,
    clearError
  } = useCustomerStore();

  const currentRNColorScheme = rnColorScheme();
  const COLORS = getColors(currentRNColorScheme || 'light');

  const [initialLoading, setInitialLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortByCreditLimit, setSortByCreditLimit] = useState<SortOrder>('none');

  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      try {
        await fetchCustomers();
      } catch (e: any) {
        const message = e.message || "Failed to load customers.";
        Toaster.error("Load Error", { description: message });
      } finally {
        setInitialLoading(false);
      }
    };
    loadData();
  }, [fetchCustomers]);

  useEffect(() => {
    if (storeError) {
        if (dialogOpen || deleteConfirmDialogOpen) {
            setFormError(storeError);
        }
    } else {
        setFormError(null);
    }
  }, [storeError, dialogOpen, deleteConfirmDialogOpen]);


  const isFormValid = useCallback(() => {
    let msg = '';
    if (form.name.trim() === '') {
      msg = 'Name is required.';
    } else if (form.phone.trim() === '') {
      msg = 'Phone number is required.';
    } else if (form.phone.trim().length < 10) {
      msg = 'Phone number seems too short. Please enter a valid number.';
    } else if (form.creditLimit !== '' && (isNaN(parseFloat(form.creditLimit)) || parseFloat(form.creditLimit) < 0)) {
      msg = 'Credit limit must be a valid non-negative number.';
    }

    if (msg) {
      setFormError(msg);
      Toaster.warning("Validation Error", { description: msg });
      return false;
    }
    setFormError(null);
    return true;
  }, [form]);

  const resetFormAndCloseDialog = useCallback(() => {
    setForm({ name: '', phone: '', email: '', address: '', creditLimit: '' });
    setDialogOpen(false);
    setFormMode('add');
    setSelectedCustomer(null);
    setFormError(null);
    clearError();
  }, [clearError]);

  const handleAddCustomer = useCallback(async () => {
    if (!isFormValid()) return;
    const customerName = form.name;
    try {
      await addCustomer({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        address: form.address || undefined,
        creditLimit: parseFloat(form.creditLimit) || 0,
      });
      resetFormAndCloseDialog();
      Toaster.success("Customer Added", { description: `"${customerName}" has been added successfully.` });
    } catch (error: any) {
      const message = storeError || error.message || 'Failed to add customer. Please try again.';
      setFormError(message);
      Toaster.error("Add Failed", { description: message });
    }
  }, [form, addCustomer, isFormValid, resetFormAndCloseDialog, storeError]);

  const handleEditClick = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      creditLimit: customer.creditLimit?.toString() || '0',
    });
    setFormMode('edit');
    clearError();
    setFormError(null);
    setDialogOpen(true);
  }, [clearError]);

  const handleEditSubmit = useCallback(async () => {
    if (!isFormValid() || !selectedCustomer) return;
    const customerName = form.name;
    try {
      await updateCustomer(selectedCustomer.id, {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        address: form.address || undefined,
        creditLimit: parseFloat(form.creditLimit) || 0,
      });
      resetFormAndCloseDialog();
      Toaster.success("Customer Updated", { description: `"${customerName}" has been updated successfully.` });
    } catch (error: any) {
      const message = storeError || error.message || 'Failed to update customer. Please try again.';
      setFormError(message);
      Toaster.error("Update Failed", { description: message });
    }
  }, [form, updateCustomer, selectedCustomer, isFormValid, resetFormAndCloseDialog, storeError]);

  const handleDeleteClick = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    clearError();
    setFormError(null);
    setDeleteConfirmDialogOpen(true);
  }, [clearError]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedCustomer) return;
    const customerName = selectedCustomer.name;
    try {
      await deleteCustomer(selectedCustomer.id);
      setDeleteConfirmDialogOpen(false);
      setSelectedCustomer(null);
      Toaster.success("Customer Deleted", { description: `"${customerName}" has been deleted successfully.` });
    } catch (error: any) {
      const message = storeError || error.message || "Failed to delete customer.";
      Toaster.error("Delete Failed", { description: message });
    }
  }, [selectedCustomer, deleteCustomer, storeError]);

  const filteredAndSortedCustomers = useMemo(() => {
    let processedCustomers = [...customers];
    if (searchQuery.trim() !== '') {
      const lowercasedQuery = searchQuery.toLowerCase();
      processedCustomers = processedCustomers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(lowercasedQuery) ||
          customer.phone.includes(lowercasedQuery)
      );
    }
    if (sortByCreditLimit !== 'none') {
      processedCustomers.sort((a, b) => {
        const limitA = a.creditLimit || 0;
        const limitB = b.creditLimit || 0;
        return sortByCreditLimit === 'asc' ? limitA - limitB : limitB - limitA;
      });
    }
    return processedCustomers;
  }, [customers, searchQuery, sortByCreditLimit]);

  const toggleSortOrder = () => {
    if (sortByCreditLimit === 'none') setSortByCreditLimit('asc');
    else if (sortByCreditLimit === 'asc') setSortByCreditLimit('desc');
    else setSortByCreditLimit('none');
  };

  const clearSearchAndSort = () => {
    setSearchQuery('');
    setSortByCreditLimit('none');
  };

  if (initialLoading) {
    return (
      <LinearGradient
        colors={[COLORS.white, COLORS.yellow]}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-center items-center bg-transparent">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="mt-4 text-muted-foreground">Loading customers...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[COLORS.white, COLORS.yellow]}
      style={{ flex: 1 }}
    >
      <View className="flex-1 bg-transparent">
        <View className="p-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-2xl font-bold text-foreground">Manage Customers</Text>
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
              <UserPlus size={20} color="#3B82F6" className="mr-2" />
            </Button>
          </View>

          <View className="flex-row items-center mb-4 gap-2">
            <View className="flex-1 flex-row items-center bg-muted rounded-lg px-3">
              <Search size={20} className="text-muted-foreground" />
              <DebouncedInput
                placeholder="Search Name or Phone..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 h-11 border-0 bg-transparent ml-2 text-base text-foreground" // custom styles for search
                placeholderTextColor="hsl(var(--muted-foreground))"
                editable={!storeIsLoading} // Search should also be disabled if needed
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
          {(searchQuery || sortByCreditLimit !== 'none') && (
            <TouchableOpacity onPress={clearSearchAndSort} className="mb-3 self-start">
              <Text className="text-sm text-primary">Clear Search & Sort</Text>
            </TouchableOpacity>
          )}

          {storeError && !dialogOpen && !deleteConfirmDialogOpen && (
            <Text className="text-destructive text-center mb-4">{storeError}</Text>
          )}
        </View>

        <FlatList
          data={filteredAndSortedCustomers}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={() => (
            <View className="items-center justify-center py-10 px-4">
              <Text className="text-muted-foreground text-center mb-4">
                {searchQuery || sortByCreditLimit !== 'none' ? 'No customers match your search.' : 'No customers added yet.'}
              </Text>
              <Button
                onPress={() => {
                  resetFormAndCloseDialog();
                  setFormMode('add');
                  setDialogOpen(true);
                }}
                variant="ghost"
              >
                <UserPlus size={20} color="#3B82F6" className="mr-2" />
                <Text className="text-primary">Add Customer</Text>
              </Button>
            </View>
          )}
          renderItem={({ item }) => (
            <Card className="mb-2 mx-4 bg-card">
              <CardContent className="pt-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-2">
                    <Text className="text-foreground font-semibold text-lg">{item.name}</Text>
                    <Text className="text-sm text-muted-foreground">{item.phone}</Text>
                    {item.email && <Text className="text-xs text-muted-foreground" numberOfLines={1}>{item.email}</Text>}
                    {item.address && <Text className="text-xs text-muted-foreground" numberOfLines={1}>{item.address}</Text>}
                    <Text className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      Credit Limit: ₹{(item.creditLimit || 0).toFixed(2)}
                    </Text>
                    {item.outstandingBalance != null && item.outstandingBalance > 0 && (
                      <Text className="text-sm text-destructive mt-1">
                        Outstanding: ₹{(item.outstandingBalance || 0).toFixed(2)}
                      </Text>
                    )}
                  </View>
                  <View className="flex-row gap-x-1">
                    <Button variant="ghost" size="icon" onPress={() => handleEditClick(item)} disabled={storeIsLoading}>
                      <Pencil size={20} color="#3B82F6" />
                    </Button>
                    <Button variant="ghost" size="icon" onPress={() => handleDeleteClick(item)} disabled={storeIsLoading}>
                      <Trash2 size={20} color="#EF4444" />
                    </Button>
                  </View>
                </View>
              </CardContent>
            </Card>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!open) resetFormAndCloseDialog();
          else setDialogOpen(open);
        }}>
          <DialogContent className="p-0 bg-background rounded-lg shadow-lg max-w-md w-96 mx-auto">
            <DialogHeader className="p-4 border-b border-border">
              <DialogTitle className="text-xl font-bold text-foreground">
                {formMode === 'edit' ? 'Edit Customer' : 'Add New Customer'}
              </DialogTitle>
            </DialogHeader>
            <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              <View className="space-y-4">
                {formError && (
                  <Text className="text-destructive text-center">{formError}</Text>
                )}
                <View>
                  <Text className="mb-1 text-sm font-medium text-muted-foreground">
                    Name <Text className="text-destructive">*</Text>
                  </Text>
                  <DebouncedInput
                    placeholder="Enter customer name"
                    value={form.name}
                    onChangeText={(text) => setForm({ ...form, name: text })}
                    className="h-12 text-base" // This h-12 should override DebouncedInput's h-11
                    editable={!storeIsLoading}
                  />
                </View>
                <View>
                  <Text className="mb-1 text-sm font-medium text-muted-foreground">
                    Phone <Text className="text-destructive">*</Text>
                  </Text>
                  <DebouncedInput
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    value={form.phone}
                    onChangeText={(text) => setForm({ ...form, phone: text })}
                    className="h-12 text-base"
                    editable={!storeIsLoading}
                  />
                </View>
                <View>
                  <Text className="mb-1 text-sm font-medium text-muted-foreground">Email</Text>
                  <DebouncedInput
                    placeholder="Enter email (optional)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.email}
                    onChangeText={(text) => setForm({ ...form, email: text })}
                    className="h-12 text-base"
                    editable={!storeIsLoading}
                  />
                </View>
                <View>
                  <Text className="mb-1 text-sm font-medium text-muted-foreground">Address</Text>
                  <DebouncedInput
                    placeholder="Enter address (optional)"
                    value={form.address}
                    onChangeText={(text) => setForm({ ...form, address: text })}
                    className="h-12 text-base"
                    editable={!storeIsLoading}
                  />
                </View>
                <View>
                  <Text className="mb-1 text-sm font-medium text-muted-foreground">Credit Limit (₹)</Text>
                  <DebouncedInput
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={form.creditLimit}
                    onChangeText={(text) => setForm({ ...form, creditLimit: text })}
                    className="h-12 text-base"
                    editable={!storeIsLoading}
                  />
                </View>
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
                 className='bg-[#a855f7] dark:bg-[#00b9f1]'
                onPress={formMode === 'edit' ? handleEditSubmit : handleAddCustomer}
                disabled={storeIsLoading || (formError !== null && formError !== storeError && (form.name.trim() === '' || form.phone.trim() === '' || form.phone.trim().length < 10))}
              >
                <Text className="text-white dark:text-white">
                  {storeIsLoading ? <ActivityIndicator size="small" color="hsl(var(--primary-foreground))" /> : (formMode === 'edit' ? 'Save Changes' : 'Add Customer')}
                </Text>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteConfirmDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmDialogOpen(false);
            setSelectedCustomer(null);
            clearError();
          } else {
            setDeleteConfirmDialogOpen(open);
          }
        }}>
          <DialogContent className="p-6 bg-background rounded-lg shadow-lg max-w-md w-96 mx-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">Confirm Deletion</DialogTitle>
            </DialogHeader>
            <Text className="text-muted-foreground my-4">
              Are you sure you want to delete "{selectedCustomer?.name}"? This action cannot be undone.
            </Text>
            {storeError && <Text className="text-destructive text-center mb-2">{storeError}</Text>}
            <DialogFooter className="flex-row justify-end gap-x-3">
              <Button
                variant="outline"
                onPress={() => {
                  setDeleteConfirmDialogOpen(false);
                  setSelectedCustomer(null);
                  clearError();
                }}
                disabled={storeIsLoading}
              >
                <Text>Cancel</Text>
              </Button>
              <Button variant="destructive" onPress={handleDeleteConfirm} disabled={storeIsLoading}>
                <Text className="text-destructive-foreground">
                  {storeIsLoading ? <ActivityIndicator size="small" color="hsl(var(--destructive-foreground))" /> : 'Delete'}
                </Text>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </View>
    </LinearGradient>
  );
};

export default CustomerManagementScreen;