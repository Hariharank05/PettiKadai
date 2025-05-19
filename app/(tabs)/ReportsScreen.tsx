import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Platform, Dimensions } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Text } from '~/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { BarChart4, Download, Trash2 } from 'lucide-react-native';
import { format } from 'date-fns';
import { useReportStore } from '~/lib/stores/reportStore';
import { ReportFilters } from '~/components/reports/ReportFilters';
import { ReportCard } from '~/components/reports/ReportCard';
import { generatePDFReport } from '~/lib/utils/pdfUtils';
import { getCategoryName, getProductName } from '~/lib/db/reportQueries';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useProductStore } from '~/lib/stores/productStore';

// Utility to generate random colors for PieChart
const generateColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

export default function ReportsScreen() {
  const {
    reports,
    metrics,
    productPerformance,
    salesData,
    filters,
    isLoading,
    fetchReports,
    fetchMetrics,
    fetchProductPerformance,
    fetchSalesData,
    deleteReport,
  } = useReportStore();

  const { products, fetchProducts } = useProductStore();
  const currencySymbol = '₹';
  const [isExporting, setIsExporting] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  // Map products to InventoryDataItem format
  const validatedInventoryData = useMemo(() => {
    return products
      .filter((item) => {
        const isValid = item.quantity != null && typeof item.quantity === 'number' && !isNaN(item.quantity) && typeof item.name === 'string';
        if (!isValid) {
          console.warn('Invalid inventoryData item:', item);
        }
        return isValid;
      })
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        categoryId: item.category || '',
        categoryName: item.category ? getCategoryName(item.category) ?? item.category : item.category ?? '',
      }));
  }, [products]);

  // Validate salesData
  const validatedSalesData = useMemo(() => {
    return salesData.filter((item) => {
      const isValid = item.subtotal != null && typeof item.subtotal === 'number' && !isNaN(item.subtotal);
      if (!isValid) {
        console.warn('Invalid salesData item:', item);
      }
      return isValid;
    });
  }, [salesData]);

  // Transform inventoryData for PieChart
  const inventoryPieData = useMemo(() => {
    return validatedInventoryData.map((item) => ({
      name: item.name.length > 10 ? item.name.substring(0, 10) + '...' : item.name,
      value: item.quantity,
      color: generateColor(),
      legendFontColor: '#1F2937',
      legendFontSize: 8,
    }));
  }, [validatedInventoryData]);

  useEffect(() => {
    console.log('[Screen] Filters changed, fetching data:', filters);
    fetchMetrics();
    fetchProductPerformance();
    fetchSalesData();
    fetchProducts(); // Fetch products for inventory
    fetchReports();
  }, [filters, fetchMetrics, fetchProductPerformance, fetchSalesData, fetchProducts, fetchReports]);

  // Filter summary for PDF export
  const getCurrentFilterSummary = (): Record<string, string | null> => {
    const summary: Record<string, string | null> = {};
    if (filters.dateRange) {
      if (/^\d+$/.test(filters.dateRange) && !filters.dateRange.includes(',')) {
        summary.DateRange = `Last ${filters.dateRange} days`;
      } else if (filters.dateRange.includes(',')) {
        const [start, end] = filters.dateRange.split(',');
        summary.DateRange = `${format(new Date(start), 'MMM d')} - ${format(new Date(end), 'MMM d, yyyy')}`;
      } else {
        summary.DateRange = format(new Date(filters.dateRange), 'MMM d, yyyy');
      }
    } else {
      summary.DateRange = 'All Time';
    }
    if (filters.paymentType) summary.PaymentType = filters.paymentType;
    if (filters.productId) summary.Product = getProductName(filters, filters.productId) || filters.productId;
    if (filters.category) summary.Category = getCategoryName(filters.category) ?? filters.category;
    else summary.Category = null;
    return summary;
  };

  // Handle PDF export and save to file system
  const handlePDFExport = useCallback(
    async (
      rawData: any[],
      reportType: 'SALES' | 'INVENTORY' | 'PRODUCT_PERFORMANCE' | 'METRICS',
      baseFileName: string
    ) => {
      if (isExporting) {
        Alert.alert('Export in Progress', 'Another export is already in progress. Please wait.');
        return;
      }
      if (!rawData || rawData.length === 0) {
        Alert.alert('No Data', `No data available to export for ${reportType}.`);
        return;
      }
      setIsExporting(true);
      console.log(`[Screen] Initiating PDF Export for ${reportType}, items: ${rawData.length}`);
      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      const fileName = `${baseFileName.replace(/ /g, '_')}_${timestamp}.pdf`;
      const filtersAppliedSummary = getCurrentFilterSummary();

      try {
        const filePath = await generatePDFReport({
          data: rawData,
          reportType,
          fileName,
          filtersApplied: filtersAppliedSummary,
        });

        // Save to device file system
        if (Platform.OS === 'android') {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            try {
              const pdfBase64 = await FileSystem.readAsStringAsync(filePath, {
                encoding: FileSystem.EncodingType.Base64,
              });
              const savedFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                fileName,
                'application/pdf'
              );
              await FileSystem.writeAsStringAsync(savedFileUri, pdfBase64, {
                encoding: FileSystem.EncodingType.Base64,
              });
              Alert.alert('Success', `PDF saved to selected directory: ${fileName}`);
            } catch (saveError) {
              console.error('[Screen] Error saving PDF to file system:', saveError);
              Alert.alert('Save Error', `Failed to save PDF: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
            }
          } else {
            console.warn('[Screen] Directory permissions denied');
            Alert.alert('Permission Denied', 'Cannot save PDF without directory access. You can still share the file.');
          }
        }

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'application/pdf',
            dialogTitle: `Share ${fileName}`,
            UTI: Platform.OS === 'ios' ? 'com.adobe.pdf' : undefined,
          });
        } else {
          Alert.alert(
            'Export Successful',
            `File saved to temporary location:\n${filePath}\n\nSharing is not available on this device.`,
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error(`[Screen] Error exporting PDF for ${reportType}:`, error);
        Alert.alert('Export Error', `Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting]
  );

  // Handle report deletion
  const handleDeleteReport = useCallback(
    (reportId: string, reportName: string) => {
      Alert.alert('Confirm Delete', `Are you sure you want to delete the report "${reportName}"? This action cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log(`[Screen] Deleting report: ${reportId}`);
            await deleteReport(reportId);
            Alert.alert('Report Deleted', `"${reportName}" has been deleted.`);
          },
        },
      ]);
    },
    [deleteReport]
  );

  // PDF Export Button component
  const PDFExportButton = ({
    data,
    reportType,
    fileNamePrefix,
    disabled,
  }: {
    data: any[];
    reportType: 'SALES' | 'INVENTORY' | 'PRODUCT_PERFORMANCE' | 'METRICS';
    fileNamePrefix: string;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      onPress={() => handlePDFExport(data, reportType, fileNamePrefix)}
      disabled={disabled || isExporting || data.length === 0}
      className={`bg-[#3B82F6] p-2 rounded-md flex-row items-center ${disabled || isExporting || data.length === 0 ? 'opacity-50' : ''}`}
    >
      <Download size={16} color="#FFFFFF" className="mr-2" />
      <Text className="text-[#FFFFFF] text-sm">{isExporting && !disabled ? 'Exporting...' : 'Export PDF'}</Text>
    </TouchableOpacity>
  );

  // Loading state
  if (isLoading && validatedSalesData.length === 0 && metrics.length === 0 && validatedInventoryData.length === 0 && productPerformance.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F9FAFB]">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-[#6B7280]">Loading initial report data...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#F9FAFB]" contentContainerStyle={{ paddingBottom: 20 }}>
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center mt-4 mb-2">
          <View>
            <Text className="text-2xl font-bold text-[#1F2937] mt-4 p-2">Reports Dashboard</Text>
            <Text className="text-lg text-[#6B7280] p-2 mt-0">Analyze and export your store's performance.</Text>
          </View>
        </View>

        {/* Filters */}
        <Card className="mb-6 bg-[#FFFFFF] border border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#1F2937]">Filters</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ReportFilters />
          </CardContent>
        </Card>

        {/* Key Metrics */}
        {isLoading && metrics.length === 0 && (
          <View className="items-center py-4">
            <ActivityIndicator color="#3B82F6" />
          </View>
        )}
        <Card className="mb-6 bg-[#FFFFFF] border border-[#E5E7EB]">
          <CardHeader className="pb-2 flex-row justify-between items-center">
            <CardTitle className="text-lg text-[#1F2937]">Key Metrics</CardTitle>
            <PDFExportButton data={metrics} reportType="METRICS" fileNamePrefix="Key_Metrics" disabled={metrics.length === 0} />
          </CardHeader>
          <CardContent className="pt-0">
            {metrics.length > 0 ? (
              metrics.map((metric) => (
                <View key={metric.id} className="flex-row items-center py-3 border-b border-[#E5E7EB] last:border-b-0">
                  <View className="h-10 w-10 rounded-full bg-[#3B82F6]/10 justify-center items-center mr-3">
                    <BarChart4 size={20} color="#3B82F6" />
                  </View>
                  <View>
                    <Text className="text-base text-[#1F2937]">{metric.metricName}</Text>
                    <Text className="text-sm text-[#6B7280]">
                      {currencySymbol}
                      {metric.metricValue.toFixed(2)} (as of {format(new Date(metric.calculationDate), 'MMM d, yyyy')})
                    </Text>
                  </View>
                </View>
              ))
            ) : !isLoading ? (
              <Text className="text-[#6B7280] py-4 text-center">No metrics available for the selected criteria.</Text>
            ) : null}
          </CardContent>
        </Card>

        {/* Sales Visualization */}
        {(filters.reportType === 'SALES' || filters.reportType === 'ALL') && (
          <Card className="mb-6 bg-[#FFFFFF] border border-[#E5E7EB]">
            <CardHeader className="pb-2 flex-row justify-between items-center">
              <CardTitle className="text-lg text-[#1F2937]">Sales Trends</CardTitle>
              <PDFExportButton
                data={validatedSalesData}
                reportType="SALES"
                fileNamePrefix="Sales_Report"
                disabled={validatedSalesData.length === 0}
              />
            </CardHeader>
            <CardContent className="pt-2">
              {isLoading && validatedSalesData.length === 0 && (
                <View className="items-center py-4">
                  <ActivityIndicator color="#3B82F6" />
                </View>
              )}
              {validatedSalesData.length > 0 ? (
                <BarChart
                  data={{
                    labels: validatedSalesData.map((item, index) =>
                      item.date ? format(new Date(item.date), 'MM/dd') : `Item ${index + 1}`
                    ),
                    datasets: [{ data: validatedSalesData.map((item) => item.subtotal / 1000) }],
                  }}
                  width={screenWidth - 32}
                  height={250}
                  yAxisLabel={currencySymbol}
                  yAxisSuffix="k"
                  yAxisInterval={1}
                  fromZero={true}
                  chartConfig={{
                    backgroundColor: '#FFFFFF',
                    decimalPlaces: 0,
                    color: () => '#3B82F6',
                    labelColor: () => '#1F2937',
                    style: { borderRadius: 16 },
                    propsForLabels: { fontSize: 10, rotation: -45, translateY: 20 },
                  }}
                  style={{ marginVertical: 8, borderRadius: 16 }}
                />
              ) : !isLoading ? (
                <Text className="text-[#6B7280] py-4 text-center">No sales data for the selected criteria.</Text>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Inventory Visualization */}
        {(filters.reportType === 'INVENTORY' || filters.reportType === 'ALL') && (
          <Card className="mb-6 bg-[#FFFFFF] border border-[#E5E7EB]">
            <CardHeader className="pb-2 flex-row justify-between items-center">
              <CardTitle className="text-lg text-[#1F2937]">Inventory Levels</CardTitle>
              <PDFExportButton
                data={validatedInventoryData}
                reportType="INVENTORY"
                fileNamePrefix="Inventory_Report"
                disabled={validatedInventoryData.length === 0}
              />
            </CardHeader>
            <CardContent className="pt-2">
              {isLoading && validatedInventoryData.length === 0 && (
                <View className="items-center py-4">
                  <ActivityIndicator color="#3B82F6" />
                </View>
              )}
              {inventoryPieData.length > 0 ? (
                <PieChart
                  data={inventoryPieData}
                  width={screenWidth - 32}
                  height={250}
                  chartConfig={{
                    color: () => '#3B82F6',
                    labelColor: () => '#1F2937',
                  }}
                  accessor="value"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  center={[10, 0]}
                  absolute
                  style={{ marginVertical: 8 }}
                />
              ) : !isLoading ? (
                <Text className="text-[#6B7280] py-4 text-center">No inventory data for the selected criteria.</Text>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Product Performance */}
        {(filters.reportType === 'PRODUCT_PERFORMANCE' || filters.reportType === 'ALL') && (
          <Card className="mb-6 bg-[#FFFFFF] border border-[#E5E7EB]">
            <CardHeader className="pb-2 flex-row justify-between items-center">
              <CardTitle className="text-lg text-[#1F2937]">Product Performance</CardTitle>
              <PDFExportButton
                data={productPerformance}
                reportType="PRODUCT_PERFORMANCE"
                fileNamePrefix="Product_Performance"
                disabled={productPerformance.length === 0}
              />
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading && productPerformance.length === 0 && (
                <View className="items-center py-4">
                  <ActivityIndicator color="#3B82F6" />
                </View>
              )}
              {productPerformance.length > 0 ? (
                productPerformance.map((perf) => (
                  <View
                    key={perf.id}
                    className="flex-row justify-between items-center py-3 border-b border-[#E5E7EB] last:border-b-0"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-base text-[#1F2937]">{perf.productName}</Text>
                      <Text className="text-xs text-[#6B7280]">{perf.period}</Text>
                      <Text className="text-xs text-[#6B7280]">
                        Units: {perf.unitsSold} • Revenue: {currencySymbol}
                        {perf.revenue.toFixed(2)}
                      </Text>
                    </View>
                    <Text className="text-[#1F2937] font-medium text-right">{perf.margin.toFixed(2)}% Margin</Text>
                  </View>
                ))
              ) : !isLoading ? (
                <Text className="text-[#6B7280] py-4 text-center">No product performance data for the selected criteria.</Text>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Generated Reports Log */}
        <Card className="mb-6 bg-[#FFFFFF] border border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#1F2937]">Generated Reports Log</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoading &&
              reports.length === 0 &&
              !validatedSalesData.length &&
              !validatedInventoryData.length &&
              !productPerformance.length && (
                <View className="items-center py-4">
                  <ActivityIndicator color="#3B82F6" />
                </View>
              )}
            {reports.length > 0 ? (
              reports.map((report) => {
                let dataForThisReport: any[] = [];
                if (report.reportType === 'SALES') dataForThisReport = validatedSalesData;
                else if (report.reportType === 'INVENTORY') dataForThisReport = validatedInventoryData;
                else if (report.reportType === 'PRODUCT_PERFORMANCE') dataForThisReport = productPerformance;
                else if (report.reportType === 'METRICS') dataForThisReport = metrics;

                return (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onExportPress={() => handlePDFExport(dataForThisReport, report.reportType, report.name)}
                    onDeletePress={() => handleDeleteReport(report.id, report.name)}
                  />
                );
              })
            ) : !isLoading ? (
              <Text className="text-[#6B7280] py-4 text-center">No previously generated reports found.</Text>
            ) : null}
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}