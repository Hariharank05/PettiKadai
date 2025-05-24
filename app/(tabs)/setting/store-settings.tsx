import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    ActivityIndicator,
    Keyboard,
    useColorScheme as rnColorScheme,
    Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { useAuthStore } from '~/lib/stores/authStore';
import { getDatabase } from '~/lib/db/database';
import {
    Store,
    MapPin,
    Phone,
    Mail,
    DollarSign,
    Percent,
    Save,
    Building2,
    CreditCard,
    ArrowLeft,
    Edit3,
    X
} from 'lucide-react-native';
import { useColorScheme } from '~/lib/useColorScheme';
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
    const currentRNColorScheme = rnColorScheme();
    const COLORS = getColors(currentRNColorScheme || 'light');

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

    const [editFormData, setEditFormData] = useState<StoreSettings>({ ...formData });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const fetchStoreSettings = useCallback(async () => {
        if (!userId) return;

        try {
            setIsLoading(true);
            const settings = await db.getFirstAsync<any>(
                'SELECT storeName, storeAddress, storePhone, storeEmail, currencySymbol, taxRate FROM Settings WHERE userId = ? AND id = ?',
                [userId, userId]
            );

            const defaultSettings = {
                storeName: settings?.storeName || '',
                storeAddress: settings?.storeAddress || '',
                storePhone: settings?.storePhone || '',
                storeEmail: settings?.storeEmail || '',
                currencySymbol: settings?.currencySymbol || '₹',
                taxRate: settings?.taxRate || 0,
            };

            setFormData(defaultSettings);
            setEditFormData(defaultSettings);
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

    const validateForm = (data: StoreSettings) => {
        const errors: Record<string, string> = {};

        if (!data.storeName.trim()) {
            errors.storeName = 'Store name is required';
        }

        if (data.storeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.storeEmail)) {
            errors.storeEmail = 'Please enter a valid email';
        }

        if (data.storePhone && !/^[\+]?[\d\s\-\(\)]{6,}$/.test(data.storePhone)) {
            errors.storePhone = 'Please enter a valid phone number';
        }

        if (data.taxRate < 0 || data.taxRate > 100) {
            errors.taxRate = 'Tax rate must be between 0-100%';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInputChange = (field: keyof StoreSettings, value: string | number) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
        if (validationErrors[field]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleOpenModal = () => {
        setEditFormData({ ...formData });
        setValidationErrors({});
        setIsModalVisible(true);
    };

    const handleCloseModal = () => {
        const hasChanges = JSON.stringify(editFormData) !== JSON.stringify(formData);

        if (hasChanges) {
            Alert.alert(
                'Unsaved Changes',
                'You have unsaved changes. Do you want to discard them?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => {
                            setEditFormData({ ...formData });
                            setValidationErrors({});
                            setIsModalVisible(false);
                            Keyboard.dismiss();
                        },
                    },
                ]
            );
        } else {
            setIsModalVisible(false);
            Keyboard.dismiss();
        }
    };

    const handleSave = async () => {
        if (!validateForm(editFormData)) return;
        if (!userId) {
            Alert.alert('Error', 'User not identified.');
            return;
        }

        setIsSaving(true);
        try {
            const now = new Date().toISOString();
            const existingSettings = await db.getFirstAsync(
                'SELECT id FROM Settings WHERE userId = ? AND id = ?',
                [userId, userId]
            );

            if (existingSettings) {
                await db.runAsync(
                    'UPDATE Settings SET storeName = ?, storeAddress = ?, storePhone = ?, storeEmail = ?, currencySymbol = ?, taxRate = ?, updatedAt = ? WHERE userId = ? AND id = ?',
                    [editFormData.storeName, editFormData.storeAddress, editFormData.storePhone, editFormData.storeEmail, editFormData.currencySymbol, editFormData.taxRate, now, userId, userId]
                );
            } else {
                await db.runAsync(
                    `INSERT INTO Settings (
                        id, userId, storeName, storeAddress, storePhone, storeEmail,
                        currencySymbol, taxRate, defaultDiscountRate, darkMode, language,
                        receiptFooter, backupFrequency, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId, userId, editFormData.storeName, editFormData.storeAddress,
                        editFormData.storePhone, editFormData.storeEmail, editFormData.currencySymbol,
                        editFormData.taxRate, 0, null, 'en', '', 'WEEKLY', now
                    ]
                );
            }

            setFormData({ ...editFormData });
            setValidationErrors({});
            setIsModalVisible(false);

            Alert.alert('Success', 'Store settings saved successfully!');
        } catch (error) {
            console.error('Failed to save store settings:', error);
            Alert.alert('Error', 'Failed to save store settings.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <LinearGradient colors={[COLORS.white, COLORS.yellow]} style={{ flex: 1 }}>
                <View className="flex-1 justify-center items-center">
                    <Text className={`mt-4 text-lg font-medium ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-600'}`}>
                        Loading your store settings...
                    </Text>
                </View>
            </LinearGradient>
        );
    }

    // Simple Display Field Component
    const DisplayField = ({ icon: Icon, label, value, placeholder, iconColor }: {
        icon: any;
        label: string;
        value: string | number;
        placeholder: string;
        iconColor: string;
    }) => (
        <View className={`${isDarkColorScheme ? 'bg-gray-900' : 'bg-white'} rounded-xl p-4 mb-3 border ${isDarkColorScheme ? 'border-gray-800' : 'border-gray-200'}`}>
            <View className="flex-row items-center">
                <Icon size={20} color={iconColor} />
                <View className="ml-3 flex-1">
                    <Text className={`text-sm ${isDarkColorScheme ? 'text-gray-400' : 'text-gray-600'}`}>{label}</Text>
                    <Text className={`text-base font-medium ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>
                        {typeof value === 'number' ? value.toString() : (value || placeholder)}
                    </Text>
                </View>
            </View>
        </View>
    );

    const hasChanges = JSON.stringify(editFormData) !== JSON.stringify(formData);

    return (
        <LinearGradient colors={[COLORS.white, COLORS.yellow]} style={{ flex: 1 }}>
            <View className="flex-1 bg-transparent">
                {/* Main Content - Readonly View */}
                <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}>
                    {/* Store Information */}
                    <View className="mb-6">
                        <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Store Information</Text>
                        <DisplayField icon={Store} label="Store Name" value={formData.storeName} placeholder="No store name set" iconColor="#4F46E5" />
                        <DisplayField icon={MapPin} label="Address" value={formData.storeAddress} placeholder="No address set" iconColor="#059669" />
                        <DisplayField icon={Phone} label="Phone Number" value={formData.storePhone} placeholder="No phone number set" iconColor="#EA580C" />
                        <DisplayField icon={Mail} label="Email Address" value={formData.storeEmail} placeholder="No email set" iconColor="#DC2626" />
                    </View>

                    {/* Financial Settings */}
                    <View className="mb-6">
                        <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Financial Settings</Text>
                        <DisplayField icon={DollarSign} label="Currency Symbol" value={formData.currencySymbol} placeholder="₹" iconColor="#D97706" />
                        <DisplayField icon={Percent} label="Tax Rate (%)" value={formData.taxRate} placeholder="0" iconColor="#0891B2" />
                    </View>

                    {/* Edit Button */}
                    <View className="mb-6">
                        {/* style={{ color: COLORS.white }} className="text-base font-medium" */}
                        <Button
                            onPress={handleOpenModal}
                            className="flex-row justify-center items-center py-4 rounded-xl"
                            style={{ backgroundColor: COLORS.primary }}
                        >
                            <Edit3 size={20} color="white" />
                            <Text className="ml-2 font-semibold text-white">Edit Settings</Text>
                        </Button>
                    </View>
                </ScrollView>

                {/* Simple Modal */}
                <Modal visible={isModalVisible} animationType="slide" transparent={true}>
                    <View className="flex-1 bg-black/50 justify-center items-center px-4">
                        <View className={`w-[85%] h-[80%] ${isDarkColorScheme ? 'bg-gray-800' : 'bg-white'} rounded-2xl overflow-hidden`}>
                            {/* Modal Header */}
                            <View className={`flex-row items-center justify-between p-6 border-b ${isDarkColorScheme ? 'border-gray-700' : 'border-gray-200'}`}>
                                <Text className={`text-xl font-bold ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Edit Store Settings</Text>
                                <TouchableOpacity onPress={handleCloseModal}>
                                    <X size={24} color={isDarkColorScheme ? '#9CA3AF' : '#6B7280'} />
                                </TouchableOpacity>
                            </View>

                            {/* Modal Content */}
                            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                                <View className="py-4">
                                    {/* Store Name */}
                                    <View className="mb-4">
                                        <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Store Name *</Text>
                                        <TextInput
                                            className={`${isDarkColorScheme ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border rounded-lg px-4 py-3 text-base`}
                                            value={editFormData.storeName}
                                            onChangeText={(text) => handleInputChange('storeName', text)}
                                            placeholder="Enter your store name"
                                            placeholderTextColor={isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
                                        />
                                        {validationErrors.storeName && (
                                            <Text className="text-red-500 text-sm mt-1">{validationErrors.storeName}</Text>
                                        )}
                                    </View>

                                    {/* Store Address */}
                                    <View className="mb-4">
                                        <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Address</Text>
                                        <TextInput
                                            className={`${isDarkColorScheme ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border rounded-lg px-4 py-3 text-base`}
                                            value={editFormData.storeAddress}
                                            onChangeText={(text) => handleInputChange('storeAddress', text)}
                                            placeholder="Enter store address"
                                            placeholderTextColor={isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
                                            multiline
                                            numberOfLines={2}
                                        />
                                    </View>

                                    {/* Phone Number */}
                                    <View className="mb-4">
                                        <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Phone Number</Text>
                                        <TextInput
                                            className={`${isDarkColorScheme ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border rounded-lg px-4 py-3 text-base`}
                                            value={editFormData.storePhone}
                                            onChangeText={(text) => handleInputChange('storePhone', text)}
                                            placeholder="Enter phone number"
                                            placeholderTextColor={isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
                                            keyboardType="phone-pad"
                                        />
                                        {validationErrors.storePhone && (
                                            <Text className="text-red-500 text-sm mt-1">{validationErrors.storePhone}</Text>
                                        )}
                                    </View>

                                    {/* Email */}
                                    <View className="mb-4">
                                        <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Email Address</Text>
                                        <TextInput
                                            className={`${isDarkColorScheme ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border rounded-lg px-4 py-3 text-base`}
                                            value={editFormData.storeEmail}
                                            onChangeText={(text) => handleInputChange('storeEmail', text)}
                                            placeholder="Enter email address"
                                            placeholderTextColor={isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                        {validationErrors.storeEmail && (
                                            <Text className="text-red-500 text-sm mt-1">{validationErrors.storeEmail}</Text>
                                        )}
                                    </View>

                                    {/* Currency Symbol */}
                                    <View className="mb-4">
                                        <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Currency Symbol</Text>
                                        <TextInput
                                            className={`${isDarkColorScheme ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border rounded-lg px-4 py-3 text-base`}
                                            value={editFormData.currencySymbol}
                                            onChangeText={(text) => handleInputChange('currencySymbol', text)}
                                            placeholder="₹"
                                            placeholderTextColor={isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
                                        />
                                    </View>

                                    {/* Tax Rate */}
                                    <View className="mb-4">
                                        <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Tax Rate (%)</Text>
                                        <TextInput
                                            className={`${isDarkColorScheme ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border rounded-lg px-4 py-3 text-base`}
                                            value={editFormData.taxRate.toString()}
                                            onChangeText={(text) => {
                                                const rate = parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
                                                handleInputChange('taxRate', rate);
                                            }}
                                            placeholder="0"
                                            placeholderTextColor={isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
                                            keyboardType="numeric"
                                        />
                                        {validationErrors.taxRate && (
                                            <Text className="text-red-500 text-sm mt-1">{validationErrors.taxRate}</Text>
                                        )}
                                    </View>
                                </View>
                            </ScrollView>

                            {/* Modal Footer */}
                            <View className={`flex-row gap-3 p-6 border-t ${isDarkColorScheme ? 'border-gray-700' : 'border-gray-200'}`}>
                                <Button
                                    onPress={handleCloseModal}
                                    className={`flex-1 py-3 rounded-xl ${isDarkColorScheme ? 'bg-gray-600' : 'bg-gray-200'}`}
                                >
                                    <Text className={`font-semibold text-center ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</Text>
                                </Button>
                                <Button
                                    onPress={handleSave}
                                    disabled={isSaving || !hasChanges}
                                    className={`flex-1 py-3 rounded-xl flex-row justify-center items-center ${isSaving || !hasChanges
                                        ? (isDarkColorScheme ? 'bg-gray-600' : 'bg-gray-300')
                                        : (isDarkColorScheme ? 'bg-blue-600' : 'bg-blue-500')
                                        }`}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="font-semibold text-white text-center">Save Changes</Text>
                                    )}
                                </Button>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </LinearGradient>
    );
}