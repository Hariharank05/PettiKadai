import React, { useCallback, useState } from 'react';
import { View, FlatList, TouchableOpacity, Alert } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { getDatabase } from '~/lib/db/database'; // Adjust path to your database file
import { Text } from '~/components/ui/text';
import { useFocusEffect } from '@react-navigation/native';

// Get the database instance
const db: SQLite.SQLiteDatabase = getDatabase();

interface SavedReport {
  id: string;
  reportId: string;
  name: string;
  format: string;
  filePath: string;
  generatedAt: string;
  fileSize: number;
}

export const SavedReportsScreen: React.FC = () => {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(() => {
    try {
      console.log('Fetching reports from SavedReports table');
      db.withTransactionSync(() => {
        const result = db.getAllSync<SavedReport>(
          'SELECT id, reportId, name, format, filePath, generatedAt, fileSize FROM SavedReports ORDER BY generatedAt DESC'
        );
        console.log('Query result:', JSON.stringify(result, null, 2));
        setReports(result);
        setError(null);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error fetching reports:', err);
      setError(`Failed to load reports: ${errorMessage}`);
      setReports([]);
    }
  }, []);

  // Refresh reports when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused, refreshing reports');
      fetchReports();
    }, [fetchReports])
  );

  // Log database path for debugging
  React.useEffect(() => {
    console.log('Database instance initialized in SavedReportsScreen');
    // Note: expo-sqlite doesn't expose the database file path directly
  }, []);

  const renderReport = ({ item }: { item: SavedReport }) => (
    <TouchableOpacity
      onPress={() =>
        Alert.alert(
          'Report Details',
          `Name: ${item.name}\nFormat: ${item.format}\nSize: ${item.fileSize} bytes\nPath: ${item.filePath}\nGenerated: ${item.generatedAt}`,
          [{ text: 'OK' }]
        )
      }
      className="p-4 border-b border-gray-200"
    >
      <Text className="text-lg">{item.name}</Text>
      <Text className="text-sm text-gray-500">{item.format} - {item.generatedAt}</Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 p-4">
      <Text className="text-2xl font-bold mb-4">Saved Reports</Text>
      {error ? (
        <Text className="text-red-500">{error}</Text>
      ) : reports.length === 0 ? (
        <Text>No saved reports found.</Text>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReport}
          keyExtractor={(item) => item.id}
        />
      )}
    </View>
  );
};