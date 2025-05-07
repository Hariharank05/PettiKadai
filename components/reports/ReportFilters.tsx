import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useReportStore } from '~/lib/stores/reportStore';
import { useProductStore } from '~/lib/stores/productStore';
import { Filter } from 'lucide-react-native';
import DatePicker from 'react-native-date-picker';
import { format } from 'date-fns';

export const ReportFilters: React.FC = () => {
  const { filters, setFilters } = useReportStore();
  const { products } = useProductStore();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    filters.dateRange && !/^\d+$/.test(filters.dateRange) && !filters.dateRange.includes(',')
      ? new Date(filters.dateRange)
      : undefined
  );
  const [pickerValue, setPickerValue] = useState<string>(
    filters.dateRange && !/^\d+$/.test(filters.dateRange)
      ? 'CUSTOM'
      : filters.dateRange || '7'
  );
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogFromDate, setDialogFromDate] = useState<Date | undefined>(
    filters.dateRange && filters.dateRange.includes(',')
      ? new Date(filters.dateRange.split(',')[0])
      : undefined
  );
  const [dialogToDate, setDialogToDate] = useState<Date | undefined>(
    filters.dateRange && filters.dateRange.includes(',')
      ? new Date(filters.dateRange.split(',')[1])
      : undefined
  );
  const [dialogFromPickerOpen, setDialogFromPickerOpen] = useState(false);
  const [dialogToPickerOpen, setDialogToPickerOpen] = useState(false);

  // Handle Picker value changes
  const handlePickerChange = (value: string) => {
    setPickerValue(value);
    if (value === 'CUSTOM') {
      setDatePickerOpen(true); // Open date picker for single custom date
    } else {
      setSelectedDate(undefined); // Clear single custom date
      setDialogFromDate(undefined); // Clear From date
      setDialogToDate(undefined); // Clear To date
      setFilters({
        ...filters,
        dateRange: value as '7' | '30' | '90' | '365', // Set as number string
      });
    }
  };

  // Handle single date picker confirmation
  const handleDateConfirm = (date: Date) => {
    setSelectedDate(date);
    setDatePickerOpen(false);
    const dateString = format(date, 'yyyy-MM-dd');
    setPickerValue('CUSTOM');
    setDialogFromDate(undefined); // Clear From date
    setDialogToDate(undefined); // Clear To date
    setFilters({
      ...filters,
      // dateRange: dateString, // Set as YYYY-MM-DD
    });
  };

  // Handle single date picker cancellation
  const handleDateCancel = () => {
    setDatePickerOpen(false);
    if (!selectedDate && !dialogFromDate && !dialogToDate) {
      setPickerValue('7'); // Revert to default
      setFilters({
        ...filters,
        dateRange: '7',
      });
    }
  };

  // Handle dialog open
  const handleDialogOpen = () => {
    setDialogFromDate(dialogFromDate);
    setDialogToDate(dialogToDate);
    setDialogVisible(true);
  };

  // Handle dialog confirm
  const handleDialogConfirm = () => {
    if (dialogFromDate && dialogToDate) {
      const fromString = format(dialogFromDate, 'yyyy-MM-dd');
      const toString = format(dialogToDate, 'yyyy-MM-dd');
      setPickerValue('CUSTOM');
      setSelectedDate(undefined); // Clear single custom date
      setFilters({
        ...filters,
        // dateRange: `${fromString},${toString}`, // Set as YYYY-MM-DD,YYYY-MM-DD
      });
    }
    setDialogVisible(false);
  };

  // Handle dialog cancel
  const handleDialogCancel = () => {
    setDialogVisible(false);
    if (!selectedDate && !dialogFromDate && !dialogToDate) {
      setPickerValue('7');
      setFilters({
        ...filters,
        dateRange: '7',
      });
    }
  };

  // Sync pickerValue and dates with filters.dateRange changes
  useEffect(() => {
    if (filters.dateRange) {
      if (filters.dateRange.includes(',')) {
        // From/To date range
        const [from, to] = filters.dateRange.split(',');
        setPickerValue('CUSTOM');
        setDialogFromDate(new Date(from));
        setDialogToDate(new Date(to));
        setSelectedDate(undefined);
      } else if (!/^\d+$/.test(filters.dateRange)) {
        // Single custom date
        setPickerValue('CUSTOM');
        setSelectedDate(new Date(filters.dateRange));
        setDialogFromDate(undefined);
        setDialogToDate(undefined);
      } else {
        // Predefined range
        setPickerValue(filters.dateRange);
        setSelectedDate(undefined);
        setDialogFromDate(undefined);
        setDialogToDate(undefined);
      }
    } else {
      setPickerValue('7');
      setSelectedDate(undefined);
      setDialogFromDate(undefined);
      setDialogToDate(undefined);
    }
  }, [filters.dateRange]);

  return (
    <View className="mb-6">
      <View className="flex-row items-center mb-4">
        <View className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 justify-center items-center mr-3">
          <Filter size={16} className="text-blue-500 dark:text-blue-300" />
        </View>
        <Text className="text-foreground">Refine your reports</Text>
      </View>

      <View className="mb-4">
        <Text className="text-sm text-muted-foreground mb-2">Report Type</Text>
        <View className="bg-muted rounded-md">
          <Picker
            selectedValue={filters.reportType}
            onValueChange={(value) => setFilters({ reportType: value })}
            style={{
              color: 'hsl(var(--foreground))',
              backgroundColor: 'hsl(var(--muted))',
            }}
          >
            <Picker.Item label="All Reports" value="ALL" />
            <Picker.Item label="Sales" value="SALES" />
            <Picker.Item label="Inventory" value="INVENTORY" />
            <Picker.Item label="Product Performance" value="PRODUCT_PERFORMANCE" />
          </Picker>
        </View>
      </View>

      <View className="mb-4">
        <Text className="text-sm text-muted-foreground mb-2">Date Range</Text>
        <View className="flex-row items-center">
          <View className="flex-1 bg-muted rounded-md">
            <Picker
              selectedValue={pickerValue}
              onValueChange={handlePickerChange}
              style={{
                color: 'hsl(var(--foreground))',
                backgroundColor: 'hsl(var(--muted))',
              }}
            >
              <Picker.Item label="Last 7 Days" value="7" />
              <Picker.Item label="Last 30 Days" value="30" />
              <Picker.Item label="Last 90 Days" value="90" />
              <Picker.Item label="Last Year" value="365" />
              <Picker.Item
                label={
                  dialogFromDate && dialogToDate
                    ? `From: ${format(dialogFromDate, 'yyyy-MM-dd')} To: ${format(dialogToDate, 'yyyy-MM-dd')}`
                    : selectedDate
                    ? `Selected Date: ${format(selectedDate, 'yyyy-MM-dd')}`
                    : 'Select Date To'
                }
                value="CUSTOM"
              />
            </Picker>
          </View>
          <TouchableOpacity
            onPress={handleDialogOpen}
            className="ml-4 bg-blue-500 p-2 rounded-md"
          >
            <Text className="text-white text-sm">Select Date</Text>
          </TouchableOpacity>
        </View>
        <DatePicker
          modal
          open={datePickerOpen}
          date={selectedDate || new Date()}
          onConfirm={handleDateConfirm}
          onCancel={handleDateCancel}
          mode="date"
          theme="auto"
        />
        {/* Dialog for From and To Date Selection */}
        <Modal
          visible={dialogVisible}
          transparent
          animationType="fade"
          onRequestClose={handleDialogCancel}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-background p-6 rounded-lg w-11/12 max-w-md">
              <Text className="text-foreground text-lg font-bold mb-4">Select Date Range</Text>
              <View className="mb-4">
                <Text className="text-sm text-muted-foreground mb-2">From Date</Text>
                <TouchableOpacity
                  onPress={() => setDialogFromPickerOpen(true)}
                  className="bg-muted p-3 rounded-md"
                >
                  <Text className="text-foreground">
                    {dialogFromDate ? format(dialogFromDate, 'yyyy-MM-dd') : 'Select From Date'}
                  </Text>
                </TouchableOpacity>
                <DatePicker
                  modal
                  open={dialogFromPickerOpen}
                  date={dialogFromDate || new Date()}
                  onConfirm={(date) => {
                    setDialogFromDate(date);
                    setDialogFromPickerOpen(false);
                  }}
                  onCancel={() => setDialogFromPickerOpen(false)}
                  mode="date"
                  theme="auto"
                  maximumDate={dialogToDate || new Date()}
                />
              </View>
              <View className="mb-4">
                <Text className="text-sm text-muted-foreground mb-2">To Date</Text>
                <TouchableOpacity
                  onPress={() => setDialogToPickerOpen(true)}
                  className="bg-muted p-3 rounded-md"
                >
                  <Text className="text-foreground">
                    {dialogToDate ? format(dialogToDate, 'yyyy-MM-dd') : 'Select To Date'}
                  </Text>
                </TouchableOpacity>
                <DatePicker
                  modal
                  open={dialogToPickerOpen}
                  date={dialogToDate || new Date()}
                  onConfirm={(date) => {
                    setDialogToDate(date);
                    setDialogToPickerOpen(false);
                  }}
                  onCancel={() => setDialogToPickerOpen(false)}
                  mode="date"
                  theme="auto"
                  minimumDate={dialogFromDate}
                  maximumDate={new Date()}
                />
              </View>
              <View className="flex-row justify-end">
                <TouchableOpacity
                  onPress={handleDialogCancel}
                  className="mr-4 p-2"
                >
                  <Text className="text-muted-foreground">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDialogConfirm}
                  className="bg-blue-500 p-2 rounded-md"
                >
                  <Text className="text-white">Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>

      <View className="mb-4">
        <Text className="text-sm text-muted-foreground mb-2">Payment Type</Text>
        <View className="bg-muted rounded-md">
          <Picker
            selectedValue={filters.paymentType}
            onValueChange={(value) => setFilters({ paymentType: value })}
            style={{
              color: 'hsl(var(--foreground))',
              backgroundColor: 'hsl(var(--muted))',
            }}
          >
            <Picker.Item label="All Payments" value="ALL" />
            <Picker.Item label="Cash" value="CASH" />
            <Picker.Item label="UPI" value="UPI" />
            <Picker.Item label="Credit" value="CREDIT" />
          </Picker>
        </View>
      </View>

      <View>
        <Text className="text-sm text-muted-foreground mb-2">Product</Text>
        <View className="bg-muted rounded-md">
          <Picker
            selectedValue={filters.productId || 'ALL'}
            onValueChange={(value) => setFilters({ productId: value === 'ALL' ? null : value })}
            style={{
              color: 'hsl(var(--foreground))',
              backgroundColor: 'hsl(var(--muted))',
            }}
          >
            <Picker.Item label="All Products" value="ALL" />
            {products.map((product) => (
              <Picker.Item key={product.id} label={product.name} value={product.id} />
            ))}
          </Picker>
        </View>
      </View>
    </View>
  );
};