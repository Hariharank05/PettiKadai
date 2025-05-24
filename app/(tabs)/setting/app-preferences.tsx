import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
    Switch as RNSwitch,
    ActivityIndicator,
    TextInput,
    useColorScheme as rnColorScheme,
    Modal,
    Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { useAuthStore } from '~/lib/stores/authStore';
import { getDatabase } from '~/lib/db/database';
import {
    ArrowLeft,
    Globe,
    Percent,
    DollarSign,
    Receipt,
    Archive,
    Bell,
    Smartphone,
    CheckCircle,
    X,
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

interface AppPreferencesState {
    language: string;
    currencySymbol: string;
    taxRate: number;
    defaultDiscountRate: number;
    receiptFooter: string;
    backupFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'NEVER';
    enableNotifications: boolean;
    autoBackup: boolean;
}

const LANGUAGE_OPTIONS = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी (Hindi)' },
    { code: 'ta', name: 'தமிழ் (Tamil)' },
    { code: 'te', name: 'తెలుగు (Telugu)' },
    { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
    { code: 'ml', name: 'മലയാളം (Malayalam)' }
];

const BACKUP_FREQUENCY_OPTIONS = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'NEVER', label: 'Never' }
];

const CURRENCY_OPTIONS = [
    { symbol: '₹', name: 'Indian Rupee (₹)' },
    { symbol: '$', name: 'US Dollar ($)' },
    { symbol: '€', name: 'Euro (€)' },
    { symbol: '£', name: 'British Pound (£)' },
    { symbol: '¥', name: 'Japanese Yen (¥)' }
];

// DisplayField component adapted from StoreSettingsScreen
const DisplayField = ({ icon: Icon, label, value, placeholder, iconColor, onPress }: {
    icon: any;
    label: string;
    value: string | number;
    placeholder: string;
    iconColor: string;
    onPress?: () => void;
}) => {
    const { isDarkColorScheme } = useColorScheme();
    return (
        <TouchableOpacity onPress={onPress} disabled={!onPress}>
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
        </TouchableOpacity>
    );
};

export default function AppPreferencesScreen() {
    const { userId } = useAuthStore();
    const { isDarkColorScheme } = useColorScheme();
    const currentRNColorScheme = rnColorScheme();
    const COLORS = getColors(currentRNColorScheme || 'light');

    const router = useRouter();
    const db = getDatabase();

    const [preferences, setPreferences] = useState<AppPreferencesState>({
        language: 'en',
        currencySymbol: '₹',
        taxRate: 0,
        defaultDiscountRate: 0,
        receiptFooter: '',
        backupFrequency: 'WEEKLY',
        enableNotifications: true,
        autoBackup: true
    });

    const [editPreferences, setEditPreferences] = useState<AppPreferencesState>({ ...preferences });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const fetchPreferences = useCallback(async () => {
        if (!userId) return;

        try {
            setIsLoading(true);
            const settings = await db.getFirstAsync<any>(
                `SELECT language, currencySymbol, taxRate, defaultDiscountRate, 
                        receiptFooter, backupFrequency FROM Settings 
                 WHERE userId = ? AND id = ?`,
                [userId, userId]
            );

            if (settings) {
                const newPreferences = {
                    language: settings.language || 'en',
                    currencySymbol: settings.currencySymbol || '₹',
                    taxRate: settings.taxRate ?? 0,
                    defaultDiscountRate: settings.defaultDiscountRate ?? 0,
                    receiptFooter: settings.receiptFooter || '',
                    backupFrequency: settings.backupFrequency || 'WEEKLY',
                    enableNotifications: true, // Default, not stored in DB
                    autoBackup: true // Default, not stored in DB
                };
                setPreferences(newPreferences);
                setEditPreferences(newPreferences);
            }
        } catch (error) {
            console.error('[AppPreferences] Failed to load preferences:', error);
            Alert.alert('Error', 'Could not load preferences.');
        } finally {
            setIsLoading(false);
        }
    }, [userId, db]);

    useEffect(() => {
        fetchPreferences();
    }, [fetchPreferences]);

    const validateForm = (data: AppPreferencesState) => {
        const errors: Record<string, string> = {};

        if (data.taxRate < 0 || data.taxRate > 100) {
            errors.taxRate = 'Tax rate must be between 0-100%';
        }

        if (data.defaultDiscountRate < 0 || data.defaultDiscountRate > 100) {
            errors.defaultDiscountRate = 'Discount rate must be between 0-100%';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInputChange = (field: keyof AppPreferencesState, value: string | number | boolean) => {
        setEditPreferences(prev => ({ ...prev, [field]: value }));
        if (validationErrors[field]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleOpenModal = () => {
        setEditPreferences({ ...preferences });
        setValidationErrors({});
        setIsModalVisible(true);
    };

    const handleCloseModal = () => {
        const hasChanges = JSON.stringify(editPreferences) !== JSON.stringify(preferences);

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
                            setEditPreferences({ ...preferences });
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

    const savePreferences = async () => {
        if (!validateForm(editPreferences)) return;
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
                    `UPDATE Settings SET 
                     language = ?, currencySymbol = ?, taxRate = ?, defaultDiscountRate = ?,
                     receiptFooter = ?, backupFrequency = ?, updatedAt = ?
                     WHERE userId = ? AND id = ?`,
                    [
                        editPreferences.language,
                        editPreferences.currencySymbol,
                        editPreferences.taxRate,
                        editPreferences.defaultDiscountRate,
                        editPreferences.receiptFooter,
                        editPreferences.backupFrequency,
                        now,
                        userId,
                        userId
                    ]
                );
            } else {
                await db.runAsync(
                    `INSERT INTO Settings (
                        id, userId, storeName, storeAddress, storePhone, storeEmail,
                        currencySymbol, taxRate, defaultDiscountRate, darkMode, language, 
                        receiptFooter, backupFrequency, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId, userId, 'My Store', '', '', '',
                        editPreferences.currencySymbol,
                        editPreferences.taxRate,
                        editPreferences.defaultDiscountRate,
                        null,
                        editPreferences.language,
                        editPreferences.receiptFooter,
                        editPreferences.backupFrequency,
                        now
                    ]
                );
            }

            setPreferences({ ...editPreferences });
            setValidationErrors({});
            setIsModalVisible(false);
            Alert.alert('Success', 'Preferences saved successfully!');
        } catch (error) {
            console.error('[AppPreferences] Failed to save preferences:', error);
            Alert.alert('Error', 'Could not save preferences.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLanguageChange = (language: string) => {
        handleInputChange('language', language);
        setShowLanguageModal(false);
    };

    const handleCurrencyChange = (currencySymbol: string) => {
        handleInputChange('currencySymbol', currencySymbol);
        setShowCurrencyModal(false);
    };

    const handleBackupFrequencyChange = (value: string) => {
        handleInputChange('backupFrequency', value as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'NEVER');
        setShowBackupModal(false);
    };

    const handleToggleNotifications = () => {
        handleInputChange('enableNotifications', !editPreferences.enableNotifications);
    };

    const handleToggleAutoBackup = () => {
        handleInputChange('autoBackup', !editPreferences.autoBackup);
    };

    if (isLoading) {
        return (
            <LinearGradient colors={[COLORS.white, COLORS.yellow]} style={{ flex: 1 }}>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text className={`mt-4 text-lg font-medium ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-600'}`}>
                        Loading preferences...
                    </Text>
                </View>
            </LinearGradient>
        );
    }

    const selectedLanguage = LANGUAGE_OPTIONS.find(lang => lang.code === preferences.language);
    const selectedCurrency = CURRENCY_OPTIONS.find(curr => curr.symbol === preferences.currencySymbol);
    const selectedBackupFreq = BACKUP_FREQUENCY_OPTIONS.find(freq => freq.value === preferences.backupFrequency);

    return (
        <LinearGradient colors={[COLORS.white, COLORS.yellow]} style={{ flex: 1 }}>
            <View className="flex-1 bg-transparent">
                <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                    {/* Localization */}
                    <View className="mb-6">
                        <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Localization</Text>
                        <TouchableOpacity onPress={() => setShowLanguageModal(true)}>
                            <DisplayField
                                icon={Globe}
                                label="Language"
                                value={selectedLanguage?.name || 'English'}
                                placeholder="Select language"
                                iconColor="#4F46E5"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowCurrencyModal(true)}>
                            <DisplayField
                                icon={DollarSign}
                                label="Currency"
                                value={selectedCurrency?.name || 'Indian Rupee (₹)'}
                                placeholder="Select currency"
                                iconColor="#D97706"
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Business Settings */}
                    <View className="mb-6">
                        <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Business Settings</Text>
                        <DisplayField
                            icon={Percent}
                            label="Default Tax Rate"
                            value={`${preferences.taxRate}%`}
                            placeholder="0%"
                            iconColor="#0891B2"
                        />
                        <DisplayField
                            icon={Percent}
                            label="Default Discount Rate"
                            value={`${preferences.defaultDiscountRate}%`}
                            placeholder="0%"
                            iconColor="#0891B2"
                        />
                    </View>

                    {/* Receipt Settings */}
                    <View className="mb-6">
                        <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Receipt Settings</Text>
                        <DisplayField
                            icon={Receipt}
                            label="Receipt Footer Text"
                            value={preferences.receiptFooter}
                            placeholder="Thank you for your business!"
                            iconColor="#EA580C"
                        />
                    </View>

                    {/* Data & Backup */}
                    <View className="mb-6">
                        <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Data & Backup</Text>
                        <TouchableOpacity onPress={() => setShowBackupModal(true)}>
                            <DisplayField
                                icon={Archive}
                                label="Auto Backup Frequency"
                                value={selectedBackupFreq?.label || 'Weekly'}
                                placeholder="Select frequency"
                                iconColor="#059669"
                            />
                        </TouchableOpacity>
                        <View className={`${isDarkColorScheme ? 'bg-gray-900' : 'bg-white'} rounded-xl p-4 mb-3 border ${isDarkColorScheme ? 'border-gray-800' : 'border-gray-200'}`}>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1">
                                    <Smartphone size={20} color="#059669" />
                                    <View className="ml-3">
                                        <Text className={`text-sm ${isDarkColorScheme ? 'text-gray-400' : 'text-gray-600'}`}>Enable Auto Backup</Text>
                                        <Text className={`text-base font-medium ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>
                                            {preferences.autoBackup ? 'Enabled' : 'Disabled'}
                                        </Text>
                                    </View>
                                </View>
                                <RNSwitch
                                    value={preferences.autoBackup}
                                    onValueChange={handleToggleAutoBackup}
                                    trackColor={{ false: "#767577", true: isDarkColorScheme ? "#0060C0" : "#007AFF" }}
                                    thumbColor="#FFFFFF"
                                    ios_backgroundColor="#3e3e3e"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Notifications */}
                    <View className="mb-6">
                        <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Notifications</Text>
                        <View className={`${isDarkColorScheme ? 'bg-gray-900' : 'bg-white'} rounded-xl p-4 mb-3 border ${isDarkColorScheme ? 'border-gray-800' : 'border-gray-200'}`}>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1">
                                    <Bell size={20} color="#DC2626" />
                                    <View className="ml-3">
                                        <Text className={`text-sm ${isDarkColorScheme ? 'text-gray-400' : 'text-gray-600'}`}>Enable Notifications</Text>
                                        <Text className={`text-base font-medium ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>
                                            {preferences.enableNotifications ? 'Enabled' : 'Disabled'}
                                        </Text>
                                    </View>
                                </View>
                                <RNSwitch
                                    value={preferences.enableNotifications}
                                    onValueChange={handleToggleNotifications}
                                    trackColor={{ false: "#767577", true: isDarkColorScheme ? "#0060C0" : "#007AFF" }}
                                    thumbColor="#FFFFFF"
                                    ios_backgroundColor="#3e3e3e"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Edit Button */}
                    <View className="mb-6">
                        <Button
                            onPress={handleOpenModal}
                            className="flex-row justify-center items-center py-4 rounded-xl"
                            style={{ backgroundColor: COLORS.primary }}
                        >
                            <CheckCircle size={20} color="white" />
                            <Text className="ml-2 font-semibold text-white">Edit Preferences</Text>
                        </Button>
                    </View>
                </ScrollView>

                {/* Edit Modal */}
                <Modal visible={isModalVisible} animationType="slide" transparent={true}>
                    <View className="flex-1 bg-black/50 justify-center items-center px-4">
                        <View className={`w-[85%] h-[80%] ${isDarkColorScheme ? 'bg-gray-800' : 'bg-white'} rounded-2xl overflow-hidden`}>
                            <View className={`flex-row items-center justify-between p-6 border-b ${isDarkColorScheme ? 'border-gray-700' : 'border-gray-200'}`}>
                                <Text className={`text-xl font-bold ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Edit Preferences</Text>
                                <TouchableOpacity onPress={handleCloseModal}>
                                    <X size={24} color={isDarkColorScheme ? '#9CA3AF' : '#6B7280'} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                                <View className="py-4">
                                    <View className="mb-4">
                                        <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Language</Text>
                                        <TouchableOpacity
                                            className={`flex-row items-center ${isDarkColorScheme ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'} border rounded-lg px-4 py-3`}
                                            onPress={() => setShowLanguageModal(true)}
                                        >
                                            <Globe size={20} color="#4F46E5" />
                                            <Text className={`ml-3 text-base ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>
                                                {LANGUAGE_OPTIONS.find(lang => lang.code === editPreferences.language)?.name || 'English'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View className="mb-4">
                                        <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Currency</Text>
                                        <TouchableOpacity
                                            className={`flex-row items-center ${isDarkColorScheme ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'} border rounded-lg px-4 py-3`}
                                            onPress={() => setShowCurrencyModal(true)}
                                        >
                                            <DollarSign size={20} color="#D97706" />
                                            <Text className={`ml-3 text-base ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>
                                                {CURRENCY_OPTIONS.find(curr => curr.symbol === editPreferences.currencySymbol)?.name || 'Indian Rupee (₹)'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View className="mb-4">
                                        <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Default Tax Rate (%)</Text>
                                        <View className="flex-row items-center">
                                            <Percent size={20} color="#0891B2" />
                                            <TextInput
                                                className={`flex-1 ml-3 ${isDarkColorScheme ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border rounded-lg px-4 py-3 text-base`}
                                                value={editPreferences.taxRate.toString()}
                                                onChangeText={(text) => {
                                                    const rate = parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
                                                    handleInputChange('taxRate', rate);
                                                }}
                                                placeholder="0"
                                                placeholderTextColor={isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        {validationErrors.taxRate && (
                                            <Text className="text-red-500 text-sm mt-1">{validationErrors.taxRate}</Text>
                                        )}
                                    </View>
                                    <View className="mb-4">
                                        <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Default Discount Rate (%)</Text>
                                        <View className="flex-row items-center">
                                            <Percent size={20} color="#0891B2" />
                                            <TextInput
                                                className={`flex-1 ml-3 ${isDarkColorScheme ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border rounded-lg px-4 py-3 text-base`}
                                                value={editPreferences.defaultDiscountRate.toString()}
                                                onChangeText={(text) => {
                                                    const rate = parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
                                                    handleInputChange('defaultDiscountRate', rate);
                                                }}
                                                placeholder="0"
                                                placeholderTextColor={isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        {validationErrors.defaultDiscountRate && (
                                            <Text className="text-red-500 text-sm mt-1">{validationErrors.defaultDiscountRate}</Text>
                                        )}
                                    </View>
                                    <View className="mb-4">
                                        <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Receipt Footer Text</Text>
                                        <View className="flex-row items-center">
                                            <Receipt size={20} color="#EA580C" />
                                            <TextInput
                                                className={`flex-1 ml-3 ${isDarkColorScheme ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border rounded-lg px-4 py-3 text-base`}
                                                value={editPreferences.receiptFooter}
                                                onChangeText={(text) => handleInputChange('receiptFooter', text)}
                                                placeholder="Thank you for your business!"
                                                placeholderTextColor={isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
                                                multiline
                                                numberOfLines={2}
                                            />
                                        </View>
                                    </View>
                                    <View className="mb-4">
                                        <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Auto Backup Frequency</Text>
                                        <TouchableOpacity
                                            className={`flex-row items-center ${isDarkColorScheme ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'} border rounded-lg px-4 py-3`}
                                            onPress={() => setShowBackupModal(true)}
                                        >
                                            <Archive size={20} color="#059669" />
                                            <Text className={`ml-3 text-base ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>
                                                {BACKUP_FREQUENCY_OPTIONS.find(freq => freq.value === editPreferences.backupFrequency)?.label || 'Weekly'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View className="mb-4">
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-row items-center flex-1">
                                                <Smartphone size={20} color="#059669" />
                                                <View className="ml-3">
                                                    <Text className={`text-sm ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Enable Auto Backup</Text>
                                                    <Text className={`text-base font-medium ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>
                                                        {editPreferences.autoBackup ? 'Enabled' : 'Disabled'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <RNSwitch
                                                value={editPreferences.autoBackup}
                                                onValueChange={handleToggleAutoBackup}
                                                trackColor={{ false: "#767577", true: isDarkColorScheme ? "#0060C0" : "#007AFF" }}
                                                thumbColor="#FFFFFF"
                                                ios_backgroundColor="#3e3e3e"
                                            />
                                        </View>
                                    </View>
                                    <View className="mb-4">
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-row items-center flex-1">
                                                <Bell size={20} color="#DC2626" />
                                                <View className="ml-3">
                                                    <Text className={`text-sm ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Enable Notifications</Text>
                                                    <Text className={`text-base font-medium ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>
                                                        {editPreferences.enableNotifications ? 'Enabled' : 'Disabled'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <RNSwitch
                                                value={editPreferences.enableNotifications}
                                                onValueChange={handleToggleNotifications}
                                                trackColor={{ false: "#767577", true: isDarkColorScheme ? "#0060C0" : "#007AFF" }}
                                                thumbColor="#FFFFFF"
                                                ios_backgroundColor="#3e3e3e"
                                            />
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>
                            <View className={`flex-row gap-3 p-6 border-t ${isDarkColorScheme ? 'border-gray-700' : 'border-gray-200'}`}>
                                <Button
                                    onPress={handleCloseModal}
                                    className={`flex-1 py-3 rounded-xl ${isDarkColorScheme ? 'bg-gray-600' : 'bg-gray-200'}`}
                                >
                                    <Text className={`font-semibold text-center ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</Text>
                                </Button>
                                <Button
                                    onPress={savePreferences}
                                    disabled={isSaving || JSON.stringify(editPreferences) === JSON.stringify(preferences)}
                                    className={`flex-1 py-3 rounded-xl flex-row justify-center items-center ${isSaving || JSON.stringify(editPreferences) === JSON.stringify(preferences)
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

                {/* Selection Modals */}
                <Modal visible={showLanguageModal} animationType="fade" transparent={true}>
                    <View className="flex-1 bg-black/50 justify-center items-center px-4">
                        <View className={`w-[85%] ${isDarkColorScheme ? 'bg-gray-800' : 'bg-white'} rounded-2xl overflow-hidden`}>
                            <View className={`flex-row items-center justify-between p-6 border-b ${isDarkColorScheme ? 'border-gray-700' : 'border-gray-200'}`}>
                                <Text className={`text-xl font-bold ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Select Language</Text>
                                <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                                    <X size={24} color={isDarkColorScheme ? '#9CA3AF' : '#6B7280'} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView className="max-h-[300px]">
                                {LANGUAGE_OPTIONS.map((option) => (
                                    <TouchableOpacity
                                        key={option.code}
                                        className={`flex-row items-center p-4 ${isDarkColorScheme ? 'bg-gray-700' : 'bg-gray-50'} m-3 rounded-lg`}
                                        onPress={() => handleLanguageChange(option.code)}
                                    >
                                        <Text className={`text-base ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>{option.name}</Text>
                                        {editPreferences.language === option.code && (
                                            <CheckCircle size={20} color={COLORS.primary} className="ml-auto" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <View className="p-6">
                                <Button
                                    onPress={() => setShowLanguageModal(false)}
                                    className={`py-3 rounded-xl ${isDarkColorScheme ? 'bg-gray-600' : 'bg-gray-200'}`}
                                >
                                    <Text className={`font-semibold text-center ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</Text>
                                </Button>
                            </View>
                        </View>
                    </View>
                </Modal>

                <Modal visible={showCurrencyModal} animationType="fade" transparent={true}>
                    <View className="flex-1 bg-black/50 justify-center items-center px-4">
                        <View className={`w-[85%] ${isDarkColorScheme ? 'bg-gray-800' : 'bg-white'} rounded-2xl overflow-hidden`}>
                            <View className={`flex-row items-center justify-between p-6 border-b ${isDarkColorScheme ? 'border-gray-700' : 'border-gray-200'}`}>
                                <Text className={`text-xl font-bold ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Select Currency</Text>
                                <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                                    <X size={24} color={isDarkColorScheme ? '#9CA3AF' : '#6B7280'} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView className="max-h-[300px]">
                                {CURRENCY_OPTIONS.map((option) => (
                                    <TouchableOpacity
                                        key={option.symbol}
                                        className={`flex-row items-center p-4 ${isDarkColorScheme ? 'bg-gray-700' : 'bg-gray-50'} m-3 rounded-lg`}
                                        onPress={() => handleCurrencyChange(option.symbol)}
                                    >
                                        <Text className={`text-base ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>{option.name}</Text>
                                        {editPreferences.currencySymbol === option.symbol && (
                                            <CheckCircle size={20} color={COLORS.primary} className="ml-auto" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <View className="p-6">
                                <Button
                                    onPress={() => setShowCurrencyModal(false)}
                                    className={`py-3 rounded-xl ${isDarkColorScheme ? 'bg-gray-600' : 'bg-gray-200'}`}
                                >
                                    <Text className={`font-semibold text-center ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</Text>
                                </Button>
                            </View>
                        </View>
                    </View>
                </Modal>

                <Modal visible={showBackupModal} animationType="fade" transparent={true}>
                    <View className="flex-1 bg-black/50 justify-center items-center px-4">
                        <View className={`w-[85%] ${isDarkColorScheme ? 'bg-gray-800' : 'bg-white'} rounded-2xl overflow-hidden`}>
                            <View className={`flex-row items-center justify-between p-6 border-b ${isDarkColorScheme ? 'border-gray-700' : 'border-gray-200'}`}>
                                <Text className={`text-xl font-bold ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Backup Frequency</Text>
                                <TouchableOpacity onPress={() => setShowBackupModal(false)}>
                                    <X size={24} color={isDarkColorScheme ? '#9CA3AF' : '#6B7280'} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView className="max-h-[300px]">
                                {BACKUP_FREQUENCY_OPTIONS.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        className={`flex-row items-center p-4 ${isDarkColorScheme ? 'bg-gray-700' : 'bg-gray-50'} m-3 rounded-lg`}
                                        onPress={() => handleBackupFrequencyChange(option.value)}
                                    >
                                        <Text className={`text-base ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>{option.label}</Text>
                                        {editPreferences.backupFrequency === option.value && (
                                            <CheckCircle size={20} color={COLORS.primary} className="ml-auto" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <View className="p-6">
                                <Button
                                    onPress={() => setShowBackupModal(false)}
                                    className={`py-3 rounded-xl ${isDarkColorScheme ? 'bg-gray-600' : 'bg-gray-200'}`}
                                >
                                    <Text className={`font-semibold text-center ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</Text>
                                </Button>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </LinearGradient>
    );
}