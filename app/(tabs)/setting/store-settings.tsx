import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, TextInput, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '~/components/ui/text';
import { Separator } from '~/components/ui/separator';
import { useAuthStore } from '~/lib/stores/authStore';
import { getDatabase } from '~/lib/db/database';
import { ArrowLeft, Store, MapPin, Phone, Mail, DollarSign, Percent } from 'lucide-react-native';
import { useColorScheme } from '~/lib/useColorScheme';

interface StoreSettings {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    storeEmail: string;
    currencySymbol: string;
    taxRate: number;
}

export default function StoreSettingsScreen() {
    const { userId } = useAuthStore();
    const { isDarkColorScheme } = useColorScheme();
    const router = useRouter();
    const db = getDatabase();

    const [formData, setFormData] = useState<StoreSettings>({
        storeName: '',
        storeAddress: '',
        storePhone: '',
        storeEmail: '',
        currencySymbol: '₹',
        taxRate: 0,
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const fetchStoreSettings = useCallback(async () => {
        if (!userId) return;

        try {
            setIsLoading(true);
            const settings = await db.getFirstAsync<any>(
                'SELECT storeName, storeAddress, storePhone, storeEmail, currencySymbol, taxRate FROM Settings WHERE userId = ? AND id = ?',
                [userId, userId]
            );

            if (settings) {
                setFormData({
                    storeName: settings.storeName || '',
                    storeAddress: settings.storeAddress || '',
                    storePhone: settings.storePhone || '',
                    storeEmail: settings.storeEmail || '',
                    currencySymbol: settings.currencySymbol || '₹',
                    taxRate: settings.taxRate || 0,
                });
            }
        } catch (error) {
            console.error('Failed to fetch store settings:', error);
            Alert.alert('Error', 'Failed to load store settings.');
        } finally {
            setIsLoading(false);
        }
    }, [userId, db]);

    useEffect(() => {
        fetchStoreSettings();
    }, [fetchStoreSettings]);

    const handleInputChange = (field: keyof StoreSettings, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!userId) {
            Alert.alert('Error', 'User not identified.');
            return;
        }

        setIsSaving(true);
        try {
            const now = new Date().toISOString();
            const existingSettings = await db.getFirstAsync('SELECT id FROM Settings WHERE userId = ? AND id = ?', [userId, userId]);

            if (existingSettings) {
                await db.runAsync(
                    'UPDATE Settings SET storeName = ?, storeAddress = ?, storePhone = ?, storeEmail = ?, currencySymbol = ?, taxRate = ?, updatedAt = ? WHERE userId = ? AND id = ?',
                    [formData.storeName, formData.storeAddress, formData.storePhone, formData.storeEmail, formData.currencySymbol, formData.taxRate, now, userId, userId]
                );
            } else {
                await db.runAsync(
                    `INSERT INTO Settings (
                        id, userId, storeName, storeAddress, storePhone, storeEmail,
                        currencySymbol, taxRate, defaultDiscountRate, darkMode, language, 
                        receiptFooter, backupFrequency, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId, userId, formData.storeName, formData.storeAddress,
                        formData.storePhone, formData.storeEmail, formData.currencySymbol,
                        formData.taxRate, 0, null, 'en', '', 'WEEKLY', now
                    ]
                );
            }

            setHasChanges(false);
            Alert.alert('Success', 'Store settings saved successfully!');
        } catch (error) {
            console.error('Failed to save store settings:', error);
            Alert.alert('Error', 'Failed to save store settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: isDarkColorScheme ? 'black' : '#F0F2F5'
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 15,
            backgroundColor: isDarkColorScheme ? '#1C1C1E' : '#FFFFFF',
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: isDarkColorScheme ? '#2C2C2E' : '#E5E5EA',
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: isDarkColorScheme ? '#FFFFFF' : '#000000',
            marginLeft: 15,
        },
        sectionTitle: {
            fontSize: 13,
            fontWeight: 'normal',
            color: isDarkColorScheme ? '#8E8E93' : '#6D6D72',
            textTransform: 'uppercase',
            paddingHorizontal: Platform.OS === 'ios' ? 30 : 15,
            paddingTop: 25,
            paddingBottom: 8,
        },
        formGroup: {
            backgroundColor: isDarkColorScheme ? '#1C1C1E' : '#FFFFFF',
            borderRadius: Platform.OS === 'ios' ? 10 : 0,
            marginHorizontal: Platform.OS === 'ios' ? 15 : 0,
            marginBottom: 20,
            overflow: 'hidden',
        },
        inputRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 15,
            paddingVertical: 12,
            minHeight: 50,
        },
        iconContainer: {
            width: 30,
            height: 30,
            borderRadius: 6,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
        },
        inputLabel: {
            fontSize: 16,
            color: isDarkColorScheme ? '#FFFFFF' : '#000000',
            minWidth: 80,
            marginRight: 12,
        },
        textInput: {
            flex: 1,
            fontSize: 16,
            color: isDarkColorScheme ? '#FFFFFF' : '#000000',
            padding: 0,
            textAlign: 'right',
        },
        saveButton: {
            backgroundColor: isDarkColorScheme ? '#0A84FF' : '#007AFF',
            marginHorizontal: Platform.OS === 'ios' ? 15 : 20,
            marginVertical: 20,
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: 'center',
        },
        saveButtonDisabled: {
            backgroundColor: isDarkColorScheme ? '#2C2C2E' : '#E5E5EA',
        },
        saveButtonText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: '600',
        },
        saveButtonTextDisabled: {
            color: isDarkColorScheme ? '#8E8E93' : '#C7C7CC',
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
    });

    const iconColor = isDarkColorScheme ? '#0A84FF' : '#007AFF';

    if (isLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <ArrowLeft size={24} color={isDarkColorScheme ? '#0A84FF' : '#007AFF'} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Store Settings</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={iconColor} />
                    <Text className="mt-2" style={{ color: isDarkColorScheme ? '#aaa' : '#555' }}>Loading...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Store Information</Text>
                <View style={styles.formGroup}>
                    <View style={styles.inputRow}>
                        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                            <Store size={18} color={iconColor} />
                        </View>
                        <Text style={styles.inputLabel}>Name</Text>
                        <TextInput
                            style={styles.textInput}
                            value={formData.storeName}
                            onChangeText={(text) => handleInputChange('storeName', text)}
                            placeholder="Enter store name"
                            placeholderTextColor={isDarkColorScheme ? '#8E8E93' : '#C7C7CC'}
                        />
                    </View>
                    <Separator className="bg-separator" style={{ marginLeft: 57 }} />

                    <View style={styles.inputRow}>
                        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                            <MapPin size={18} color={iconColor} />
                        </View>
                        <Text style={styles.inputLabel}>Address</Text>
                        <TextInput
                            style={styles.textInput}
                            value={formData.storeAddress}
                            onChangeText={(text) => handleInputChange('storeAddress', text)}
                            placeholder="Enter store address"
                            placeholderTextColor={isDarkColorScheme ? '#8E8E93' : '#C7C7CC'}
                            multiline
                        />
                    </View>
                    <Separator className="bg-separator" style={{ marginLeft: 57 }} />

                    <View style={styles.inputRow}>
                        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                            <Phone size={18} color={iconColor} />
                        </View>
                        <Text style={styles.inputLabel}>Phone</Text>
                        <TextInput
                            style={styles.textInput}
                            value={formData.storePhone}
                            onChangeText={(text) => handleInputChange('storePhone', text)}
                            placeholder="Enter phone number"
                            placeholderTextColor={isDarkColorScheme ? '#8E8E93' : '#C7C7CC'}
                            keyboardType="phone-pad"
                        />
                    </View>
                    <Separator className="bg-separator" style={{ marginLeft: 57 }} />

                    <View style={styles.inputRow}>
                        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                            <Mail size={18} color={iconColor} />
                        </View>
                        <Text style={styles.inputLabel}>Email</Text>
                        <TextInput
                            style={styles.textInput}
                            value={formData.storeEmail}
                            onChangeText={(text) => handleInputChange('storeEmail', text)}
                            placeholder="Enter email address"
                            placeholderTextColor={isDarkColorScheme ? '#8E8E93' : '#C7C7CC'}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Financial Settings</Text>
                <View style={styles.formGroup}>
                    <View style={styles.inputRow}>
                        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                            <DollarSign size={18} color={iconColor} />
                        </View>
                        <Text style={styles.inputLabel}>Currency</Text>
                        <TextInput
                            style={styles.textInput}
                            value={formData.currencySymbol}
                            onChangeText={(text) => handleInputChange('currencySymbol', text)}
                            placeholder="₹"
                            placeholderTextColor={isDarkColorScheme ? '#8E8E93' : '#C7C7CC'}
                        />
                    </View>
                    <Separator className="bg-separator" style={{ marginLeft: 57 }} />

                    <View style={styles.inputRow}>
                        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                            <Percent size={18} color={iconColor} />
                        </View>
                        <Text style={styles.inputLabel}>Tax Rate</Text>
                        <TextInput
                            style={styles.textInput}
                            value={formData.taxRate.toString()}
                            onChangeText={(text) => handleInputChange('taxRate', parseFloat(text) || 0)}
                            placeholder="0"
                            placeholderTextColor={isDarkColorScheme ? '#8E8E93' : '#C7C7CC'}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        (!hasChanges || isSaving) && styles.saveButtonDisabled
                    ]}
                    onPress={handleSave}
                    disabled={!hasChanges || isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={[
                            styles.saveButtonText,
                            (!hasChanges || isSaving) && styles.saveButtonTextDisabled
                        ]}>
                            Save Changes
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}