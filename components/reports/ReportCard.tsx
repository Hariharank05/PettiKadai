// components/reports/ReportCard.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '~/components/ui/text'; // Your custom Text
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'; // Your custom Card
import { Download, Trash2, FileText } from 'lucide-react-native'; // Use Trash2 for consistency
import { format } from 'date-fns';
import { ReportListItem } from '~/lib/stores/reportStore'; // Import type

interface ReportCardProps {
  report: ReportListItem;
  onExportPress: () => void;
  onDeletePress: () => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, onExportPress, onDeletePress }) => {
  return (
    <Card className="mb-4 bg-card border border-border">
      <CardHeader className="pb-2 flex-row justify-between items-center">
        <View className="flex-1">
          <CardTitle className="text-md text-card-foreground">{report.name}</CardTitle>
          <Text className="text-xs text-muted-foreground">
            Type: {report.reportType}
          </Text>
        </View>
        <FileText size={20} className="text-primary" />
      </CardHeader>
      <CardContent className="pt-1 pb-3">
        <Text className="text-sm text-muted-foreground">
          Created: {format(new Date(report.createdAt), 'MMM dd, yyyy p')}
        </Text>
        {report.filterSummary && (
            <Text className="text-xs text-muted-foreground mt-1">
                Filters: {report.filterSummary}
            </Text>
        )}
      </CardContent>
      <CardFooter className="flex-row justify-end space-x-2 pt-0 pb-3 px-4">
        <TouchableOpacity
          onPress={onExportPress}
          className="bg-primary p-2 rounded-md flex-row items-center"
        >
          <Download size={16} color="white" className="mr-1" />
          <Text className="text-primary-foreground text-xs">Export PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDeletePress}
          className="bg-destructive p-2 rounded-md flex-row items-center"
        >
          <Trash2 size={16} color="white" className="mr-1" />
          <Text className="text-destructive-foreground text-xs">Delete</Text>
        </TouchableOpacity>
      </CardFooter>
    </Card>
  );
};