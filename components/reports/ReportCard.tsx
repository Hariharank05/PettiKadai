import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { getDatabase } from '~/lib/db/database'; // Adjust path to your database file
import { Text } from '~/components/ui/text';
import { Download, Trash } from 'lucide-react-native';

// Get the database instance
const db: SQLite.SQLiteDatabase = getDatabase();

interface Report {
  id: string;
  reportType: 'SALES' | 'INVENTORY' | 'PRODUCT_PERFORMANCE';
  name: string;
  generatedAt?: string;
  format?: string;
  fileSize?: number;
  filePath?: string;
}

interface ReportCardProps {
  report: Report;
  onExport: () => void;
  onDelete: () => void;
  extraContent?: React.ReactNode; // New prop for additional content (e.g., ExportButton components)
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, onExport, onDelete, extraContent }) => {
  const handleDelete = () => {
    Alert.alert(
      'Delete Report',
      `Are you sure you want to delete "${report.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete file if it exists
              if (report.filePath) {
                try {
                  await FileSystem.deleteAsync(report.filePath, { idempotent: true });
                  console.log(`File deleted: ${report.filePath}`);
                } catch (fileError) {
                  console.warn(`Failed to delete file: ${report.filePath}`, fileError);
                }
              }

              // Delete database entries
              db.withTransactionSync(() => {
                // Delete from SavedReports
                db.runSync('DELETE FROM SavedReports WHERE id = ?', [report.id]);
                console.log(`Deleted SavedReports entry: ${report.id}`);

                // Delete from Reports (assuming id is shared or directly linked)
                db.runSync('DELETE FROM Reports WHERE id = ?', [report.id]);
                console.log(`Deleted Reports entry: ${report.id}`);
              });

              // Trigger parent refresh
              onDelete();
              Alert.alert('Success', 'Report deleted successfully');
            } catch (error) {
              console.error('Error deleting report:', error);
              Alert.alert('Error', `Failed to delete report: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="p-4 border-b border-gray-200">
      <View className="flex-col">
        {/* Report Details */}
        <View>
          <Text className="text-lg font-semibold">{report.name}</Text>
          <Text className="text-sm text-muted-foreground">
            Type: {report.reportType}
          </Text>
          {report.generatedAt && (
            <Text className="text-sm text-muted-foreground">
              Generated: {report.generatedAt}
            </Text>
          )}
          {report.format && (
            <Text className="text-sm text-muted-foreground">
              Format: {report.format}
            </Text>
          )}
          {report.fileSize && (
            <Text className="text-sm text-muted-foreground">
              Size: {report.fileSize} bytes
            </Text>
          )}
          {report.reportType === 'PRODUCT_PERFORMANCE' && (
            <TouchableOpacity
              onPress={handleDelete}
              className="bg-muted p-2 rounded-md flex-row items-center mt-2 w-32"
            >
              <Trash size={16} className="text-red-500 mr-2" />
              <Text className="text-red-500 text-sm">Delete Report</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Buttons Below Content */}
        <View className="flex-row justify-end  gap-2 mt-4">
          <TouchableOpacity
            onPress={onExport}
            className="bg-muted p-2 rounded-md flex-row items-center justify-center"
          >
            <Download size={16} className="text-primary mr-2" />
            <Text className="text-primary text-sm ">Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            className="bg-muted p-2 rounded-md flex-row items-center justify-center"
          >
            <Trash size={16} className="text-red-500 mr-2" />
            <Text className="text-red-500 text-sm ">Delete</Text>
          </TouchableOpacity>
        </View>
        {/* Triggered ExportButton Components */}
        {extraContent && (
          <View className="mt-2">
            {extraContent}
          </View>
        )}
      </View>
    </View>
  );
};