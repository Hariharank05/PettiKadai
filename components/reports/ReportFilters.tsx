// components/reports/ReportFilters.tsx
import React, { useEffect } from 'react';
import { View, TextInput, Button } from 'react-native'; // Using Button for simplicity
import { Picker } from '@react-native-picker/picker';
import { useReportStore, ReportFilterState } from '~/lib/stores/reportStore';
import { Text } from '~/components/ui/text'; // Your custom Text component

export const ReportFilters: React.FC = () => {
  const { filters, setFilters, categories, fetchCategories } = useReportStore();

  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [fetchCategories, categories.length]);

  const handleFilterChange = <K extends keyof ReportFilterState>(
    key: K,
    value: ReportFilterState[K]
  ) => {
    setFilters({ [key]: value });
  };

  return (
    <View className="space-y-3">
      <View>
        <Text className="text-sm font-medium text-muted-foreground mb-1">Report Type</Text>
        <Picker
          selectedValue={filters.reportType}
          onValueChange={(itemValue) => handleFilterChange('reportType', itemValue as ReportFilterState['reportType'])}
          style={{ backgroundColor: 'hsl(var(--input))', color: 'hsl(var(--foreground))' }} // Basic styling
        >
          <Picker.Item label="All Reports" value="ALL" />
          <Picker.Item label="Sales" value="SALES" />
          <Picker.Item label="Inventory" value="INVENTORY" />
          <Picker.Item label="Product Performance" value="PRODUCT_PERFORMANCE" />
        </Picker>
      </View>

      <View>
        <Text className="text-sm font-medium text-muted-foreground mb-1">Date Range</Text>
        {/* For simplicity, using a text input. Consider a DateRangePicker component */}
        <TextInput
          className="border border-input bg-background p-2 rounded-md text-foreground"
          placeholder="e.g., 7 (days), 2023-01-01,2023-01-31"
          value={filters.dateRange || ''}
          onChangeText={(text) => handleFilterChange('dateRange', text)}
          placeholderTextColor="hsl(var(--muted-foreground))"
        />
         <Text className="text-xs text-muted-foreground mt-1">
            Enter days (e.g., 7, 30) or YYYY-MM-DD,YYYY-MM-DD
          </Text>
      </View>

      <View>
        <Text className="text-sm font-medium text-muted-foreground mb-1">Category</Text>
        <Picker
          selectedValue={filters.category}
          onValueChange={(itemValue) => handleFilterChange('category', itemValue === "all" ? null : itemValue)}
          style={{ backgroundColor: 'hsl(var(--input))', color: 'hsl(var(--foreground))' }}
        >
          <Picker.Item label="All Categories" value="all" />
          {categories.map(cat => (
            <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
          ))}
        </Picker>
      </View>

      <View>
        <Text className="text-sm font-medium text-muted-foreground mb-1">Payment Type</Text>
        <Picker
          selectedValue={filters.paymentType}
          onValueChange={(itemValue) => handleFilterChange('paymentType', itemValue === "all" ? null : itemValue as ReportFilterState['paymentType'])}
          style={{ backgroundColor: 'hsl(var(--input))', color: 'hsl(var(--foreground))' }}
        >
          <Picker.Item label="All Payment Types" value="all" />
          <Picker.Item label="Cash" value="CASH" />
          <Picker.Item label="Card" value="CARD" />
          <Picker.Item label="UPI" value="UPI" />
        </Picker>
      </View>

       {/* Simple Apply Button to trigger fetches - good practice */}
      {/* <Button 
        title="Apply Filters & Fetch Data" 
        onPress={() => {
            // This will trigger the useEffect in ReportsScreen or you can call fetch methods directly
            // Forcing a slight change to ensure filters object reference changes if needed
            setFilters({...filters}); 
        }} 
        color="hsl(var(primary))"
      /> */}
    </View>
  );
};