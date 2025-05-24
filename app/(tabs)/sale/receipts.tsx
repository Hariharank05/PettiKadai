// app/(tabs)/receipts.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, Alert, useColorScheme as rnColorScheme } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router'; // Added useLocalSearchParams
import { getDatabase } from '~/lib/db/database';
import * as Sharing from 'expo-sharing';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Card, CardContent } from '~/components/ui/card';
import { Search, FileText, Share2, Eye, UserCircle } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { useColorScheme } from '~/lib/useColorScheme'; 
import { previewExistingReceipt } from '~/lib/utils/receiptUtils';
import { LinearGradient } from 'expo-linear-gradient';

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

interface ReceiptHistoryItem {
    id: string;
    saleId: string;
    receiptNumber: string;
    format: string;
    filePath: string | null;
    generatedAt: string;
    totalAmount: number;
    customerName?: string | null; // From Sales table (denormalized) or joined Customers table
    customerPhone?: string | null; // From Sales table or joined
    paymentType?: string | null; // From Sales table
}

const db = getDatabase();

export default function ReceiptsScreen() {
    const router = useRouter();
    const { highlightSaleId } = useLocalSearchParams<{ highlightSaleId?: string }>(); // Get highlightSaleId
    const { isDarkColorScheme } = useColorScheme(); // Your custom hook
    const currentRNColorScheme = rnColorScheme(); // From react-native
    const COLORS = getColors(currentRNColorScheme || 'light');
    
    const [receipts, setReceipts] = useState<ReceiptHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const iconColorEye = isDarkColorScheme ? '#60A5FA' : '#3B82F6'; 
    const iconColorShare = isDarkColorScheme ? '#34D399' : '#10B981'; 
    const iconColorDisabled = isDarkColorScheme ? '#4B5563' : '#9CA3AF'; 
    const iconColorSearch = isDarkColorScheme ? '#9CA3AF' : '#6B7280';
    const iconColorFileText = isDarkColorScheme ? '#6B7280' : '#9CA3AF';
    const activityIndicatorColor = isDarkColorScheme ? '#FFFFFF' : COLORS.primary;


    const fetchReceipts = useCallback(async (currentSearchQuery: string = searchQuery) => {
        setIsLoading(true);
        try {
            // Query updated to join Sales and potentially Customers
            // And select customerName, customerPhone, paymentType from Sales table
            let sqlQuery = `
                SELECT
                  r.id,
                  r.saleId,
                  r.receiptNumber,
                  r.format,
                  r.filePath,
                  r.generatedAt,
                  s.totalAmount,
                  s.customerName, 
                  s.customerPhone,
                  s.paymentType 
                FROM Receipts r
                JOIN Sales s ON r.saleId = s.id
            `;
            // To join with Customers table (if Sales.customerId exists and is populated):
            // LEFT JOIN Customers c ON s.customerId = c.id 
            // Then select c.name as customerNameFromTable, c.phone as customerPhoneFromTable


            const params: any[] = [];
            const trimmedQuery = currentSearchQuery.trim();

            if (trimmedQuery !== '') {
                // Adjust search to include customer name/phone from Sales table
                sqlQuery += ` WHERE (r.receiptNumber LIKE ? OR s.customerName LIKE ? OR s.customerPhone LIKE ? OR s.totalAmount LIKE ?)`;
                params.push(`%${trimmedQuery}%`, `%${trimmedQuery}%`, `%${trimmedQuery}%`, `%${trimmedQuery}%`);
            }
            sqlQuery += ` ORDER BY r.generatedAt DESC`;

            const result = await db.getAllAsync<ReceiptHistoryItem>(sqlQuery, params);
            const formattedResult: ReceiptHistoryItem[] = result.map(item => ({
                id: item.id,
                saleId: item.saleId,
                receiptNumber: item.receiptNumber,
                format: item.format,
                filePath: item.filePath,
                generatedAt: item.generatedAt,
                totalAmount: Number(item.totalAmount) || 0,
                customerName: item.customerName,
                customerPhone: item.customerPhone,
                paymentType: item.paymentType,
            }));
            setReceipts(formattedResult);
        } catch (error) {
            console.error("Error fetching receipts:", error);
            Alert.alert("Error", "Failed to load receipt history.");
            setReceipts([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [searchQuery]); // searchQuery is a dependency

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchReceipts(searchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery, fetchReceipts]);

    useFocusEffect(
        useCallback(() => {
            fetchReceipts(searchQuery);
        }, [fetchReceipts, searchQuery])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchReceipts(searchQuery);
    };

    const handleShareReceipt = async (filePath: string | null, receiptNumber: string) => {
        if (!filePath) {
            Alert.alert("Error", "Receipt file path is missing.");
            return;
        }
        if (await Sharing.isAvailableAsync()) {
            try {
                await Sharing.shareAsync(filePath, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Share Receipt ${receiptNumber}`,
                });
            } catch (error) {
                console.error("Error sharing receipt:", error);
                Alert.alert("Error", "Could not share receipt.");
            }
        } else {
            Alert.alert("Sharing Not Available", "Sharing is not available on this device.");
        }
    };

    const handlePreviewReceipt = async (filePath: string | null, receiptNumber: string) => {
        if (!filePath) {
            Alert.alert("Error", "Receipt file path is missing.");
            return;
        }
        await previewExistingReceipt(filePath, receiptNumber);
    };
    
    const flatListRef = React.useRef<FlatList>(null);

    useEffect(() => {
        if (highlightSaleId && receipts.length > 0) {
            const index = receipts.findIndex(r => r.saleId === highlightSaleId);
            if (index !== -1 && flatListRef.current) {
                flatListRef.current.scrollToIndex({ animated: true, index, viewPosition: 0.5 });
            }
        }
    }, [highlightSaleId, receipts]);


    const renderReceiptItem = ({ item }: { item: ReceiptHistoryItem }) => {
        const amount = typeof item.totalAmount === 'number' ? item.totalAmount : 0;
        const isHighlighted = item.saleId === highlightSaleId;

        return (
            <Card 
                className={`mb-3 mx-1 bg-card border ${isHighlighted ? 'border-primary' : 'border-border'}`}
                style={isHighlighted ? { borderWidth: 2 } : {}} // Example highlight style
            >
                <CardContent className="p-4">
                    <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                            <Text className="text-base font-semibold text-foreground native:text-black">{item.receiptNumber}</Text>
                            <Text className="text-sm text-muted-foreground native:text-gray-600">
                                Date: {format(parseISO(item.generatedAt), 'dd MMM yyyy, hh:mm a')}
                            </Text>
                            <Text className="text-sm text-muted-foreground native:text-gray-600">
                                Amount: ₹{amount.toFixed(2)}
                            </Text>
                            {item.customerName && (
                                <View className="flex-row items-center mt-1">
                                    <UserCircle size={14} color={iconColorSearch} className="mr-1 opacity-70" />
                                    <Text className="text-xs text-muted-foreground native:text-gray-600">
                                        {item.customerName} {item.customerPhone ? `(${item.customerPhone})` : ''}
                                    </Text>
                                </View>
                            )}
                            {item.paymentType && (
                                <Text className="text-xs text-muted-foreground native:text-gray-600 mt-0.5">
                                    Paid via: {item.paymentType}
                                </Text>
                            )}
                        </View>
                        <View className="flex-col items-end space-y-2">
                            <TouchableOpacity
                                onPress={() => handlePreviewReceipt(item.filePath, item.receiptNumber)}
                                className="p-2 bg-muted rounded-md"
                                disabled={!item.filePath}
                            >
                                <Eye size={20} color={item.filePath ? iconColorEye : iconColorDisabled} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleShareReceipt(item.filePath, item.receiptNumber)}
                                className="p-2 bg-muted rounded-md"
                                disabled={!item.filePath}
                            >
                                <Share2 size={20} color={item.filePath ? iconColorShare : iconColorDisabled} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {!item.filePath && (
                        <Text className="text-xs text-red-500 mt-2">Receipt file not found. Cannot preview or share.</Text>
                    )}
                </CardContent>
            </Card>
        );
    };

    if (isLoading && !refreshing && receipts.length === 0) {
        return (
            <LinearGradient colors={[COLORS.white, COLORS.yellow]} style={{ flex: 1 }}>
                <View className="flex-1 justify-center items-center bg-transparent">
                    <ActivityIndicator size="large" color={activityIndicatorColor} />
                    <Text className="mt-2 text-muted-foreground native:text-gray-500">Loading Receipts...</Text>
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={[COLORS.white, COLORS.yellow]} style={{ flex: 1 }}>
            <View className="flex-1 p-4 bg-transparent">
                <Text className="text-2xl font-bold text-foreground mb-4 native:text-black">Receipts History</Text>
                <View className="mb-4 flex-row items-center bg-card border border-border rounded-lg px-3">
                    <Search size={20} color={iconColorSearch} />
                    <Input
                        placeholder="Search by Receipt No, Amount, Customer..."
                        className="flex-1 h-12 border-0 bg-transparent ml-2 text-base text-foreground"
                        placeholderTextColor={isDarkColorScheme ? '#6B7280' : '#9CA3AF'}
                        value={searchQuery}
                        onChangeText={(text) => setSearchQuery(text)}
                    />
                </View>

                {receipts.length === 0 && !isLoading ? (
                    <View className="flex-1 justify-center items-center">
                        <FileText size={48} color={iconColorFileText} className="opacity-50" />
                        <Text className="mt-4 text-lg text-muted-foreground native:text-gray-500">No Receipts Found</Text>
                        {searchQuery ? (
                            <Text className="text-sm text-muted-foreground native:text-gray-500">Try a different search term.</Text>
                        ) : (
                            <Text className="text-sm text-muted-foreground native:text-gray-500">Complete a sale to see receipts here.</Text>
                        )}
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={receipts}
                        renderItem={renderReceiptItem}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        getItemLayout={(data, index) => (
                            // Estimate item height for performance, adjust if necessary
                            { length: 120, offset: 120 * index, index } 
                        )}
                    />
                )}
            </View>
        </LinearGradient>
    );
}