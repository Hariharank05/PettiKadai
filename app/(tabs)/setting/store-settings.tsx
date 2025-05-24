import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    ActivityIndicator,
    Animated,
    Keyboard,
    useColorScheme as rnColorScheme,
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
    ArrowLeft
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
    const { isDarkColorScheme } = useColorScheme(); // Your custom hook
    const currentRNColorScheme = rnColorScheme(); // From react-native
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

    const [originalData, setOriginalData] = useState<StoreSettings>({ ...formData });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const saveButtonScale = useRef(new Animated.Value(1)).current;

    // Refs for TextInputs
    const inputRefs = useRef<Record<keyof StoreSettings, React.RefObject<TextInput>>>({
        storeName: React.createRef(),
        storeAddress: React.createRef(),
        storePhone: React.createRef(),
        storeEmail: React.createRef(),
        currencySymbol: React.createRef(),
        taxRate: React.createRef(),
    }).current;

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
            setOriginalData(defaultSettings);
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

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!formData.storeName.trim()) {
            errors.storeName = 'Store name is required';
        }

        if (formData.storeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.storeEmail)) {
            errors.storeEmail = 'Please enter a valid email';
        }

        if (formData.storePhone && !/^[\+]?[\d\s\-\(\)]{6,}$/.test(formData.storePhone)) {
            errors.storePhone = 'Please enter a valid phone number';
        }

        if (formData.taxRate < 0 || formData.taxRate > 100) {
            errors.taxRate = 'Tax rate must be between 0-100%';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Debounced input change handler
    const handleInputChange = useCallback((field: keyof StoreSettings, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        if (validationErrors[field]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    }, [validationErrors]);

    const handleButtonPress = async () => {
        if (isEditing) {
            if (!validateForm()) return;
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

                setOriginalData(formData);
                setValidationErrors({});
                setFocusedField(null);
                setIsEditing(false);

                Animated.sequence([
                    Animated.timing(saveButtonScale, { toValue: 1.1, duration: 200, useNativeDriver: true }),
                    Animated.timing(saveButtonScale, { toValue: 1, duration: 200, useNativeDriver: true }),
                ]).start();

                Alert.alert('Success', 'Store settings saved successfully!');
            } catch (error) {
                console.error('Failed to save store settings:', error);
                Alert.alert('Error', 'Failed to save store settings.');
            } finally {
                setIsSaving(false);
            }
        } else {
            setIsEditing(true);
        }
    };

    const handleCancelEdit = () => {
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
                            setFormData(originalData);
                            setValidationErrors({});
                            setFocusedField(null);
                            setIsEditing(false);
                            Keyboard.dismiss();
                        },
                    },
                ]
            );
        } else {
            setIsEditing(false);
            Keyboard.dismiss();
        }
    };

    const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

    if (isLoading) {
        return (
            <LinearGradient colors={[COLORS.white, COLORS.yellow]} style={{ flex: 1 }}>
                <View className={`flex-1 bg-transparent`}>
                    <View className="flex-row items-center px-5 py-4 bg-background border-b border-border">
                        <TouchableOpacity onPress={() => router.back()}>
                            <ArrowLeft size={24} color={isDarkColorScheme ? '#0A84FF' : '#007AFF'} />
                        </TouchableOpacity>
                        <Text className="text-lg font-semibold ml-4 text-foreground">Store Settings</Text>
                    </View>
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color={isDarkColorScheme ? '#3B82F6' : '#2563EB'} />
                        <Text className={`mt-4 text-lg font-medium ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-600'}`}>
                            Loading your store settings...
                        </Text>
                    </View>
                </View>
            </LinearGradient>
        );
    }

    const InputField = ({
        icon: Icon,
        label,
        value,
        field,
        placeholder,
        keyboardType = 'default',
        multiline = false,
        autoCapitalize = 'sentences',
        iconBg = 'bg-blue-100',
        iconColor = '#2563EB'
    }: {
        icon: any;
        label: string;
        value: string | number;
        field: keyof StoreSettings;
        placeholder: string;
        keyboardType?: any;
        multiline?: boolean;
        autoCapitalize?: any;
        iconBg?: string;
        iconColor?: string;
    }) => {
        const isFocused = focusedField === field;
        const hasError = validationErrors[field];
        const inputRef = inputRefs[field];

        const handleFocus = () => {
            setFocusedField(field);
            inputRef.current?.focus();
        };

        const handleBlur = () => {
            setFocusedField(null);
        };

        return (
            <View className="mb-6">
                <TouchableOpacity
                    onPress={isEditing ? handleFocus : undefined}
                    activeOpacity={1}
                    disabled={!isEditing}
                >
                    <View className={`
                        ${isDarkColorScheme ? 'bg-gray-900' : 'bg-white'}
                        rounded-2xl p-4 shadow-sm
                        ${isFocused && isEditing ? `border-2 ${isDarkColorScheme ? 'border-blue-500' : 'border-blue-400'} shadow-lg` : `border ${isDarkColorScheme ? 'border-gray-800' : 'border-gray-200'}`}
                        ${hasError ? `border-2 ${isDarkColorScheme ? 'border-red-500' : 'border-red-400'}` : ''}
                    `}>
                        <View className="flex-row items-center">
                            <View className={`w-10 h-10 rounded-xl ${isDarkColorScheme ? 'bg-blue-900/30' : iconBg} justify-center items-center mr-4`}>
                                <Icon size={20} color={isDarkColorScheme ? '#60A5FA' : iconColor} />
                            </View>
                            <View className="flex-1">
                                <Text className={`text-sm font-medium mb-1 ${isDarkColorScheme ? 'text-gray-400' : 'text-gray-600'}`}>{label}</Text>
                                {isEditing ? (
                                    <TextInput
                                        ref={inputRef}
                                        className={`text-base ${isDarkColorScheme ? 'text-white' : 'text-gray-900'} font-medium`}
                                        value={typeof value === 'number' ? value.toString() : value}
                                        onChangeText={(text) => {
                                            const processedValue = field === 'taxRate'
                                                ? (parseFloat(text.replace(/[^0-9.]/g, '')) || 0)
                                                : text;
                                            handleInputChange(field, processedValue);
                                        }}
                                        placeholder={placeholder}
                                        placeholderTextColor={isDarkColorScheme ? '#6B7280' : '#9CA3AF'}
                                        keyboardType={keyboardType}
                                        multiline={multiline}
                                        autoCapitalize={autoCapitalize}
                                        onFocus={handleFocus}
                                        onBlur={handleBlur}
                                        editable={isEditing}
                                        selectTextOnFocus={true}
                                        returnKeyType="next"
                                        onSubmitEditing={() => {
                                            const fields: (keyof StoreSettings)[] = [
                                                'storeName',
                                                'storeAddress',
                                                'storePhone',
                                                'storeEmail',
                                                'currencySymbol',
                                                'taxRate'
                                            ];
                                            const currentIndex = fields.indexOf(field);
                                            const nextField = fields[currentIndex + 1];
                                            if (nextField) {
                                                inputRefs[nextField].current?.focus();
                                            } else {
                                                Keyboard.dismiss();
                                            }
                                        }}
                                    />
                                ) : (
                                    <Text className={`text-base ${isDarkColorScheme ? 'text-gray-400' : 'text-gray-600'} font-medium`}>
                                        {typeof value === 'number' ? value.toString() : (value || placeholder)}
                                    </Text>
                                )}
                            </View>
                            {hasChanges && formData[field] !== originalData[field] && (
                                <View className="w-2 h-2 bg-blue-500 rounded-full ml-2" />
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
                {hasError && (
                    <Text className="text-red-500 text-sm mt-2 ml-4 font-medium">
                        {hasError}
                    </Text>
                )}
            </View>
        );
    };

    return (
        <LinearGradient colors={[COLORS.white, COLORS.yellow]} style={{ flex: 1 }}>
            <View className={`flex-1 bg-transparent`}>
                <View className="flex-row items-center px-5 py-4 bg-card border-b border-border">
                    <TouchableOpacity onPress={() => router.back()}>
                        <ArrowLeft size={24} color={isDarkColorScheme ? '#0A84FF' : '#007AFF'} />
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold ml-4 text-foreground">Store Settings</Text>
                </View>
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="px-6 pt-8 pb-4">
                        <View className="flex-row items-center mb-6">
                            <View className={`w-12 h-12 rounded-2xl ${isDarkColorScheme ? 'bg-purple-900/30' : 'bg-purple-100'} justify-center items-center mr-4`}>
                                <Building2 size={24} color={isDarkColorScheme ? '#A78BFA' : '#7C3AED'} />
                            </View>
                            <View>
                                <Text className={`text-lg font-bold ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Store Information</Text>
                                <Text className={`text-sm ${isDarkColorScheme ? 'text-gray-400' : 'text-gray-600'}`}>Basic details about your store</Text>
                            </View>
                        </View>

                        <InputField icon={Store} label="Store Name" value={formData.storeName} field="storeName" placeholder="Enter your store name" iconBg="bg-indigo-100" iconColor="#4F46E5" />
                        <InputField icon={MapPin} label="Address" value={formData.storeAddress} field="storeAddress" placeholder="Enter store address" multiline iconBg="bg-green-100" iconColor="#059669" />
                        <InputField icon={Phone} label="Phone Number" value={formData.storePhone} field="storePhone" placeholder="Enter phone number" keyboardType="phone-pad" iconBg="bg-orange-100" iconColor="#EA580C" />
                        <InputField icon={Mail} label="Email Address" value={formData.storeEmail} field="storeEmail" placeholder="Enter email address" keyboardType="email-address" autoCapitalize="none" iconBg="bg-red-100" iconColor="#DC2626" />
                    </View>

                    <View className="px-6 pb-8">
                        <View className="flex-row items-center mb-6">
                            <View className={`w-12 h-12 rounded-2xl ${isDarkColorScheme ? 'bg-emerald-900/30' : 'bg-emerald-100'} justify-center items-center mr-4`}>
                                <CreditCard size={24} color={isDarkColorScheme ? '#6EE7B7' : '#059669'} />
                            </View>
                            <View>
                                <Text className={`text-lg font-bold ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Financial Settings</Text>
                                <Text className={`text-sm ${isDarkColorScheme ? 'text-gray-400' : 'text-gray-600'}`}>Currency and tax configuration</Text>
                            </View>
                        </View>

                        <InputField icon={DollarSign} label="Currency Symbol" value={formData.currencySymbol} field="currencySymbol" placeholder="₹" iconBg="bg-yellow-100" iconColor="#D97706" />
                        <InputField icon={Percent} label="Tax Rate (%)" value={formData.taxRate} field="taxRate" placeholder="0" keyboardType="numeric" iconBg="bg-cyan-100" iconColor="#0891B2" />
                    </View>
                </ScrollView>

                <View className={`absolute bottom-0 left-0 right-0 ${isDarkColorScheme ? 'bg-gray-900' : 'bg-white'} border-t ${isDarkColorScheme ? 'border-gray-800' : 'border-gray-200'} px-6 py-4 flex-row justify-between`}>
                    <Animated.View style={{ transform: [{ scale: saveButtonScale }], flex: 1, marginRight: isEditing ? 8 : 0 }}>
                        <Button
                            onPress={handleButtonPress}
                            disabled={isSaving || (isEditing && !hasChanges)}
                            className={`flex-row justify-center items-center py-4 rounded-2xl ${
                                isSaving || (isEditing && !hasChanges)
                                    ? (isDarkColorScheme ? 'bg-gray-700' : 'bg-gray-300')
                                    : isEditing
                                    ? (isDarkColorScheme ? 'bg-blue-600' : 'bg-blue-500')
                                    : (isDarkColorScheme ? 'bg-green-600' : 'bg-green-500')
                            }`}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Save size={20} color="white" />
                                    <Text className={`ml-2 font-semibold ${isSaving || (isEditing && !hasChanges) ? (isDarkColorScheme ? 'text-gray-500' : 'text-gray-400') : 'text-white'}`}>
                                        {isEditing ? 'Save Changes' : 'Edit Settings'}
                                    </Text>
                                </>
                            )}
                        </Button>
                    </Animated.View>
                    {isEditing && (
                        <Button
                            onPress={handleCancelEdit}
                            className={`flex-row justify-center items-center py-4 rounded-2xl ${isDarkColorScheme ? 'bg-red-600' : 'bg-red-500'}`}
                            style={{ flex: 1 }}
                        >
                            <Text className="font-semibold text-white">Cancel</Text>
                        </Button>
                    )}
                </View>
            </View>
        </LinearGradient>
    );
}