// app/(tabs)/receipts.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getDatabase } from '~/lib/db/database';
import * as Sharing from 'expo-sharing';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Card, CardContent } from '~/components/ui/card';
import { Search, FileText, Share2, Eye } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { useColorScheme } from '~/lib/useColorScheme'; // Import useColorScheme
import { previewExistingReceipt } from '~/lib/utils/receiptUtils';

interface ReceiptHistoryItem {
    id: string;
    saleId: string;
    receiptNumber: string;
    format: string;
    filePath: string | null;
    generatedAt: string;
    totalAmount: number;
    customerName?: string | null;
}

const db = getDatabase();

export default function ReceiptsScreen() {
    const router = useRouter();
    const { isDarkColorScheme } = useColorScheme(); // Get current color scheme
    const [receipts, setReceipts] = useState<ReceiptHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Define colors based on the theme
    const iconColorEye = isDarkColorScheme ? '#60A5FA' : '#3B82F6'; // Lighter blue for dark, standard for light
    const iconColorShare = isDarkColorScheme ? '#34D399' : '#10B981'; // Lighter green for dark, standard for light
    const iconColorDisabled = isDarkColorScheme ? '#4B5563' : '#9CA3AF'; // Darker gray for dark, lighter for light
    const iconColorSearch = isDarkColorScheme ? '#9CA3AF' : '#6B7280';
    const iconColorFileText = isDarkColorScheme ? '#6B7280' : '#9CA3AF';
    const activityIndicatorColor = isDarkColorScheme ? '#FFFFFF' : '#3B82F6';


    const fetchReceipts = useCallback(async (currentSearchQuery: string = searchQuery) => {
        setIsLoading(true);
        try {
            let sqlQuery = `
        SELECT
          r.id,
          r.saleId,
          r.receiptNumber,
          r.format,
          r.filePath,
          r.generatedAt,
          s.totalAmount,
          s.customerName
        FROM Receipts r
        JOIN Sales s ON r.saleId = s.id
      `;
            const params: any[] = [];

            const trimmedQuery = currentSearchQuery.trim();
            if (trimmedQuery !== '') {
                sqlQuery += ` WHERE r.receiptNumber LIKE ? OR s.customerName LIKE ? OR s.totalAmount LIKE ?`;
                params.push(`%${trimmedQuery}%`, `%${trimmedQuery}%`, `%${trimmedQuery}%`);
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
                totalAmount: Number(item.totalAmount) || 0, // Explicitly cast to number here
                customerName: item.customerName,
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

    const handlePreviewReceipt = async (filePath: string | null, receiptNumber: string) => { // Add receiptNumber
        if (!filePath) {
            Alert.alert("Error", "Receipt file path is missing.");
            return;
        }
        // Use the new utility function
        await previewExistingReceipt(filePath, receiptNumber);
    };

    // useFocusEffect(
    //     useCallback(() => {
    //         fetchReceipts(searchQuery);

    //         // 🔧 DEV PATCH: Log all sales with incorrect totals
    //         (async () => {
    //             const brokenSales = await db.getAllAsync<{ id: string, totalAmount: number, subtotal: number }>(
    //                 `SELECT id, totalAmount, subtotal FROM Sales WHERE totalAmount IS NULL OR totalAmount = 0`
    //             );

    //             console.log("[DEV PATCH] Broken Sales Found:", brokenSales.length);

    //             for (const sale of brokenSales) {
    //                 console.log(`[FIX] Sale ID: ${sale.id}, totalAmount: ${sale.totalAmount}, fixing to subtotal: ${sale.subtotal}`);
    //                 await db.runAsync(
    //                     `UPDATE Sales SET totalAmount = ? WHERE id = ?`,
    //                     [sale.subtotal, sale.id]
    //                 );
    //             }
    //         })();

    //     }, [fetchReceipts, searchQuery])
    // );

    const renderReceiptItem = ({ item }: { item: ReceiptHistoryItem }) => {
        console.log(`Rendering receipt: ${item.receiptNumber}, total: ${item.totalAmount}`);

        // Ensure totalAmount is handled correctly
        const amount = typeof item.totalAmount === 'number' ? item.totalAmount : 0;

        return (
            <Card className="mb-3 mx-1 bg-card border border-border">
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
                                <Text className="text-sm text-muted-foreground native:text-gray-600">
                                    Customer: {item.customerName}
                                </Text>
                            )}
                        </View>
                        <View className="flex-col items-end space-y-2">
                            <TouchableOpacity
                                onPress={() => handlePreviewReceipt(item.filePath, item.receiptNumber)} // Pass receiptNumber
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
            <View className="flex-1 justify-center items-center bg-background">
                <ActivityIndicator size="large" color={activityIndicatorColor} />
                <Text className="mt-2 text-muted-foreground native:text-gray-500">Loading Receipts...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background p-4">
            <Text className="text-2xl font-bold text-foreground mb-4 native:text-black">Receipts History</Text>
            <View className="mb-4 flex-row items-center bg-card border border-border rounded-lg px-3">
                <Search size={20} color={iconColorSearch} />
                <Input
                    placeholder="Search by Receipt Number/Amount..."
                    className="flex-1 h-12 border-0 bg-transparent ml-2 text-base text-foreground" // Tailwind for Input styling
                    placeholderTextColor={isDarkColorScheme ? '#6B7280' : '#9CA3AF'} // Dynamic placeholder color
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
                    data={receipts}
                    renderItem={renderReceiptItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            )}
        </View>
    );
}