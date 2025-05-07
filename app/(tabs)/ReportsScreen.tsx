// ~/screens/ReportsScreen.tsx (or wherever this file is located)

import React, { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Text } from '~/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { BarChart4, Download, Trash } from 'lucide-react-native'; // Added Trash for ReportCard
import { format } from 'date-fns';
import { useReportStore } from '~/lib/stores/reportStore';
import { getSalesData, getInventoryData } from '~/lib/db/reportQueries';
import { ReportFilters } from '~/components/reports/ReportFilters';
import { ReportCard } from '~/components/reports/ReportCard';
// ExportButton is no longer used directly for CSV here
// import { ExportButton } from '~/components/reports/ExportButton'; 
import { generatePDFReport } from '~/lib/utils/pdfUtils';

const {
  VictoryChart,
  VictoryBar,
  VictoryTheme,
} = require('victory-native');

export default function ReportsScreen() {
  const router = useRouter();
  const {
    reports,
    metrics,
    productPerformance,
    filters,
    isLoading,
    fetchReports,
    fetchMetrics,
    fetchProductPerformance,
  } = useReportStore();
  const currencySymbol = '₹';

  // State to manage export triggers (now only for PDF if used this way)
  const [exportTrigger, setExportTrigger] = useState<{
    reportId: string | null;
    // format: 'CSV' | 'PDF' | null; // Format is implicitly PDF now for this trigger
    data: any[] | null;
    fileName: string | null;
  }>({ reportId: null, data: null, fileName: null });

  useEffect(() => {
    fetchReports();
    fetchMetrics();
    fetchProductPerformance();
  }, [filters, fetchReports, fetchMetrics, fetchProductPerformance]);

  const salesData = getSalesData(
    filters.dateRange && /^\d+$/.test(filters.dateRange) && !filters.dateRange.includes(',')
      ? new Date(Date.now() - parseInt(filters.dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : filters.dateRange && filters.dateRange.includes(',') 
        ? filters.dateRange.split(',')[0] 
        : filters.dateRange || new Date().toISOString().split('T')[0],
    filters.paymentType,
    filters.productId
  );

  const inventoryData = getInventoryData(filters.productId);

  const handlePDFExport = async (rawData: any[], reportType: 'SALES' | 'INVENTORY' | 'PRODUCT_PERFORMANCE', fileName: string) => {
    console.log(`[Screen] handlePDFExport for ${reportType}, data items: ${rawData.length}`);
    try {
      let processedData = rawData;
      if (reportType === 'INVENTORY') {
        processedData = rawData.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
        }));
      }

      const filePath = await generatePDFReport({ data: processedData, reportType, fileName });
      // const fileInfo = await FileSystem.getInfoAsync(filePath); // Already checked in generatePDFReport

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${fileName}`,
          UTI: 'com.adobe.pdf',
        });
         Alert.alert(
           'Export Prepared',
           `The report "${fileName}.pdf" is ready. You can share or save it.`,
           [{ text: 'OK' }]
         );
      } else {
        Alert.alert(
          'Export Successful',
          `File saved to:\n${filePath}\n\nSharing is not available. Access it via a file manager.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error(`[Screen] Error exporting PDF for ${reportType}:`, error);
      Alert.alert('Error', `Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const PDFExportButton = ({ data, reportType, fileName }: {
    data: any[];
    reportType: 'SALES' | 'INVENTORY' | 'PRODUCT_PERFORMANCE';
    fileName: string;
  }) => (
    <TouchableOpacity
      onPress={() => handlePDFExport(data, reportType, fileName)}
      className="bg-muted p-2 rounded-md flex-row items-center"
    >
      <Download size={16} className="text-primary mr-2" />
      <Text className="text-primary text-sm">Export PDF</Text>
    </TouchableOpacity>
  );

  useEffect(() => {
    if (exportTrigger.reportId) {
      setExportTrigger({ reportId: null, data: null, fileName: null });
    }
  }, [exportTrigger.reportId]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="hsl(var(--primary))" />
        <Text className="mt-4 text-muted-foreground">Loading reports...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center mt-4 mb-2">
          <View>
            <Text className="text-2xl font-bold text-foreground mt-4 p-2 ">Reports</Text>
            <Text className="text-lg text-muted-foreground p-2 mt-0">
              View and export your store's performance
            </Text>
          </View>
        </View>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ReportFilters />
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {metrics.length > 0 ? (
              metrics.map((metric) => (
                <View key={metric.id} className="flex-row items-center py-2">
                  <View className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 justify-center items-center mr-3">
                    <BarChart4 size={16} className="text-green-500 dark:text-green-300" />
                  </View>
                  <View>
                    <Text className="text-foreground">{metric.metricName}</Text>
                    <Text className="text-muted-foreground">
                      {currencySymbol}
                      {metric.metricValue.toFixed(2)} ({format(new Date(metric.calculationDate), 'yyyy-MM-dd')})
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text className="text-muted-foreground py-2">
                No metrics available for the selected period
              </Text>
            )}
          </CardContent>
        </Card>

        {/* Sales Visualization */}
        {(filters.reportType === 'SALES' || filters.reportType === 'ALL') && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Sales Trends</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {salesData.length > 0 ? (
                <VictoryChart theme={VictoryTheme.material} height={200}>
                  <VictoryBar
                    data={salesData.map((item, index) => ({
                      x: item.date ? format(new Date(item.date), 'MM/dd') : index + 1,
                      y: item.subtotal,
                    }))}
                    style={{ data: { fill: 'hsl(var(--primary))' } }}
                  />
                </VictoryChart>
              ) : (
                <Text className="text-muted-foreground py-2">No sales data available</Text>
              )}
              <View className="flex-row justify-end mt-2 gap-2">
                {/* CSV ExportButton removed */}
                <PDFExportButton
                  data={salesData}
                  reportType="SALES"
                  fileName={`Sales_Report_${format(new Date(), 'yyyyMMdd')}`}
                />
              </View>
            </CardContent>
          </Card>
        )}

        {/* Inventory Visualization */}
        {(filters.reportType === 'INVENTORY' || filters.reportType === 'ALL') && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Inventory Levels</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {inventoryData.length > 0 ? (
                <VictoryChart theme={VictoryTheme.material} height={200}>
                  <VictoryBar
                    data={inventoryData.map((item, index) => ({
                      x: item.name || index + 1,
                      y: item.quantity,
                    }))}
                    style={{ data: { fill: 'hsl(var(--primary))' } }}
                  />
                </VictoryChart>
              ) : (
                <Text className="text-muted-foreground py-2">No inventory data available</Text>
              )}
              <View className="flex-row justify-end mt-2 gap-2">
                {/* CSV ExportButton removed */}
                <PDFExportButton
                  data={inventoryData}
                  reportType="INVENTORY"
                  fileName={`Inventory_Report_${format(new Date(), 'yyyyMMdd')}`}
                />
              </View>
            </CardContent>
          </Card>
        )}

        {/* Product Performance */}
        {(filters.reportType === 'PRODUCT_PERFORMANCE' || filters.reportType === 'ALL') && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Product Performance</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {productPerformance.length > 0 ? (
                productPerformance.map((perf) => (
                  <View
                    key={perf.id}
                    className="flex-row justify-between items-center py-2 border-b border-muted"
                  >
                    <View>
                      <Text className="text-foreground">Product {perf.productId}</Text>
                      <Text className="text-sm text-muted-foreground">
                        Period: {perf.period} • Revenue: {currencySymbol}
                        {perf.revenue.toFixed(2)}
                      </Text>
                    </View>
                    <Text className="text-foreground font-medium">
                      {perf.margin.toFixed(2)}% Margin
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="text-muted-foreground py-2">
                  No product performance data available
                </Text>
              )}
              <View className="flex-row justify-end mt-2 gap-2">
                {/* CSV ExportButton removed */}
                <PDFExportButton
                  data={productPerformance}
                  reportType="PRODUCT_PERFORMANCE"
                  fileName={`Product_Performance_${format(new Date(), 'yyyyMMdd')}`}
                />
              </View>
            </CardContent>
          </Card>
        )}

        {/* Available Reports (ReportCard section) */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Available Reports</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0 justify-start">
            {reports.length > 0 ? (
              reports.map((report) => (
                <View key={report.id}>
                  <ReportCard
                    report={report}
                    onExport={() => { // This onExport is for the "Export" button on ReportCard
                      let reportData;
                      if (report.reportType === 'SALES') reportData = salesData;
                      else if (report.reportType === 'INVENTORY') reportData = inventoryData;
                      else reportData = productPerformance;
                      
                      // Directly call PDF export or use the trigger for PDFExportButton rendering
                      // If using the trigger mechanism:
                      setExportTrigger({
                        reportId: report.id,
                        data: reportData,
                        fileName: `${report.name}_${format(new Date(), 'yyyyMMdd')}`,
                      });
                      // Alternatively, call handlePDFExport directly if extraContent is not used for PDF
                      // handlePDFExport(reportData, report.reportType, `${report.name}_${format(new Date(), 'yyyyMMdd')}`);
                    }}
                    onDelete={() => { fetchReports(); }}
                    extraContent={ // This is where the dynamically rendered PDFExportButton appears
                      <>
                        {exportTrigger.reportId === report.id && (
                          <PDFExportButton
                            data={exportTrigger.data || []}
                            reportType={report.reportType as any}
                            fileName={exportTrigger.fileName!}
                          />
                        )}
                      </>
                    }
                  />
                </View>
              ))
            ) : (
              <Text className="text-muted-foreground py-2">No reports available</Text>
            )}
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}