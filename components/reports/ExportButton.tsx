import React from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Text } from '~/components/ui/text';
import { Download } from 'lucide-react-native';

interface ExportButtonProps {
  data: any[];
  reportType: 'SALES' | 'INVENTORY' | 'PRODUCT_PERFORMANCE';
  format: 'CSV' | 'PDF';
  fileName: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ data, reportType, format, fileName }) => {
  const handleExport = async () => {
    try {
      // Generate file content
      let fileContent: string;
      if (format === 'CSV') {
        // Simple CSV generation
        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map((item) => Object.values(item).join(',')).join('\n');
        fileContent = `${headers}\n${rows}`;
      } else {
        // Placeholder for PDF (requires a library like react-native-pdf-lib)
        fileContent = JSON.stringify(data, null, 2); // Fallback: save as text
        Alert.alert('Warning', 'PDF export is not fully implemented. Saving as text file.');
      }

      // Save to FileSystem.documentDirectory
      const filePath = `${FileSystem.documentDirectory}${fileName}.${format.toLowerCase()}`;
      await FileSystem.writeAsStringAsync(filePath, fileContent);
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        console.log(`File saved: ${filePath}, size: ${fileInfo.size ?? 'unknown'} bytes`);
      } else {
        console.log(`File saved: ${filePath}, but size information is unavailable.`);
      }

      // Inform user of file location
      Alert.alert(
        'Export Successful',
        `File saved to:\n${filePath}\n\nAccess it using a file manager or enable file sharing.`,
        [{ text: 'OK' }]
      );

      // Commented-out expo-sharing code for future use
      /*
      import * as Sharing from 'expo-sharing';
      await Sharing.shareAsync(filePath, {
        mimeType: format === 'PDF' ? 'application/pdf' : 'text/csv',
        dialogTitle: `Share ${fileName}`,
      });
      console.log(`Shared file: ${filePath}`);
      */
    } catch (error) {
      console.error('Error exporting file:', error);
      Alert.alert('Error', `Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleExport}
      className="bg-muted p-2 rounded-md flex-row items-center"
    >
      <Download size={16} className="text-primary mr-2" />
      <Text className="text-primary text-sm">Export {format}</Text>
    </TouchableOpacity>
  );
};