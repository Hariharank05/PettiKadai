import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
    Switch as RNSwitch,
    ActivityIndicator,
    StyleSheet,
    Platform,
    TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '~/components/ui/text';
import { Separator } from '~/components/ui/separator';
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
    ChevronRight,
    CheckCircle
} from 'lucide-react-native';
import { useColorScheme } from '~/lib/useColorScheme';

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

const ListItem: React.FC<{
    icon: React.ReactElement;
    label: string;
    onPress?: () => void;
    showChevron?: boolean;
    customRightContent?: React.ReactNode;
    isFirst?: boolean;
    isLast?: boolean;
    subtitle?: string;
}> = ({ icon, label, onPress, showChevron = true, customRightContent, isFirst, isLast, subtitle }) => (
    <TouchableOpacity
        onPress={onPress}
        className={`bg-card active:opacity-70 px-4 py-3
                    ${isFirst && isLast ? 'rounded-lg' : ''} 
                    ${isFirst && !isLast ? 'rounded-t-lg' : ''} 
                    ${!isFirst && isLast ? 'rounded-b-lg' : ''}`}
        disabled={!onPress && !customRightContent}
    >
        <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-md items-center justify-center mr-3"
                style={{ backgroundColor: icon.props.color ? `${icon.props.color}20` : 'transparent' }}>
                {React.cloneElement(icon, { size: 20 })}
            </View>
            <View className="flex-1 ml-1">
                <Text className="text-base text-foreground">{label}</Text>
                {subtitle && <Text className="text-sm text-muted-foreground mt-1">{subtitle}</Text>}
            </View>
            {customRightContent}
            {showChevron && !customRightContent && <ChevronRight size={20} className="text-muted-foreground opacity-50" />}
        </View>
    </TouchableOpacity>
);

const InputItem: React.FC<{
    icon: React.ReactElement;
    label: string;
    value: string | number;
    onChangeText: (text: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'numeric' | 'decimal-pad';
    isFirst?: boolean;
    isLast?: boolean;
    suffix?: string;
}> = ({ icon, label, value, onChangeText, placeholder, keyboardType = 'default', isFirst, isLast, suffix }) => {
    const { isDarkColorScheme } = useColorScheme();

    return (
        <View className={`bg-card px-4 py-3
                        ${isFirst && isLast ? 'rounded-lg' : ''} 
                        ${isFirst && !isLast ? 'rounded-t-lg' : ''} 
                        ${!isFirst && isLast ? 'rounded-b-lg' : ''}`}>
            <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-md items-center justify-center mr-3"
                    style={{ backgroundColor: icon.props.color ? `${icon.props.color}20` : 'transparent' }}>
                    {React.cloneElement(icon, { size: 20 })}
                </View>
                <View className="flex-1 ml-1">
                    <Text className="text-base text-foreground mb-2">{label}</Text>
                    <View className="flex-row items-center">
                        <TextInput
                            value={String(value)}
                            onChangeText={onChangeText}
                            placeholder={placeholder}
                            keyboardType={keyboardType}
                            className="flex-1 text-base border border-border rounded-md px-3 py-2"
                            style={{
                                color: isDarkColorScheme ? '#FFFFFF' : '#000000',
                                backgroundColor: isDarkColorScheme ? '#2C2C2E' : '#F2F2F7'
                            }}
                            placeholderTextColor={isDarkColorScheme ? '#8E8E93' : '#8E8E93'}
                        />
                        {suffix && <Text className="text-base text-muted-foreground ml-2">{suffix}</Text>}
                    </View>
                </View>
            </View>
        </View>
    );
};

const SelectionModal: React.FC<{
    visible: boolean;
    title: string;
    options: Array<{ value: string; label: string; name?: string }>;
    selectedValue: string;
    onSelect: (value: string) => void;
    onClose: () => void;
}> = ({ visible, title, options, selectedValue, onSelect, onClose }) => {
    const { isDarkColorScheme } = useColorScheme();

    if (!visible) return null;

    return (
        <View style={{
            position: 'absolute',
            top: 0, bottom: 0, left: 0, right: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
            zIndex: 1000
        }}>
            <View style={{
                backgroundColor: isDarkColorScheme ? '#252525' : '#fff',
                borderRadius: 10,
                width: '100%',
                maxWidth: 360,
                maxHeight: '70%',
                elevation: 5
            }}>
                <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: isDarkColorScheme ? '#333' : '#eee' }}>
                    <Text style={{
                        fontSize: 20,
                        fontWeight: 'bold',
                        color: isDarkColorScheme ? '#e0e0e0' : '#222',
                        textAlign: 'center'
                    }}>
                        {title}
                    </Text>
                </View>
                <ScrollView style={{ maxHeight: 300 }}>
                    {options.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            onPress={() => {
                                onSelect(option.value);
                                onClose();
                            }}
                            style={{
                                padding: 15,
                                borderBottomWidth: 1,
                                borderBottomColor: isDarkColorScheme ? '#333' : '#eee',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <Text style={{
                                fontSize: 16,
                                color: isDarkColorScheme ? '#e0e0e0' : '#222'
                            }}>
                                {option.name || option.label}
                            </Text>
                            {selectedValue === option.value && (
                                <CheckCircle size={20} color={isDarkColorScheme ? '#0A84FF' : '#007AFF'} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <TouchableOpacity
                    onPress={onClose}
                    style={{
                        padding: 15,
                        alignItems: 'center',
                        borderTopWidth: 1,
                        borderTopColor: isDarkColorScheme ? '#333' : '#eee'
                    }}
                >
                    <Text style={{
                        fontSize: 16,
                        color: isDarkColorScheme ? '#0A84FF' : '#007AFF',
                        fontWeight: '600'
                    }}>
                        Cancel
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function AppPreferencesScreen() {
    const { userId } = useAuthStore();
    const { isDarkColorScheme } = useColorScheme();
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

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [showBackupModal, setShowBackupModal] = useState(false);

    const fetchPreferences = useCallback(async () => {
        if (!userId) return;

        try {
            const settings = await db.getFirstAsync<any>(
                `SELECT language, currencySymbol, taxRate, defaultDiscountRate, 
                        receiptFooter, backupFrequency FROM Settings 
                 WHERE userId = ? AND id = ?`,
                [userId, userId]
            );

            if (settings) {
                setPreferences(prev => ({
                    ...prev,
                    language: settings.language || 'en',
                    currencySymbol: settings.currencySymbol || '₹',
                    taxRate: settings.taxRate ?? 0,
                    defaultDiscountRate: settings.defaultDiscountRate ?? 0,
                    receiptFooter: settings.receiptFooter || '',
                    backupFrequency: settings.backupFrequency || 'WEEKLY'
                }));
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

    const savePreferences = async (updatedPreferences?: Partial<AppPreferencesState>) => {
        if (!userId) return;

        const prefsToSave = updatedPreferences ? { ...preferences, ...updatedPreferences } : preferences;
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
                        prefsToSave.language,
                        prefsToSave.currencySymbol,
                        prefsToSave.taxRate,
                        prefsToSave.defaultDiscountRate,
                        prefsToSave.receiptFooter,
                        prefsToSave.backupFrequency,
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
                        prefsToSave.currencySymbol,
                        prefsToSave.taxRate,
                        prefsToSave.defaultDiscountRate,
                        null,
                        prefsToSave.language,
                        prefsToSave.receiptFooter,
                        prefsToSave.backupFrequency,
                        now
                    ]
                );
            }

            if (updatedPreferences) {
                setPreferences(prev => ({ ...prev, ...updatedPreferences }));
            }
        } catch (error) {
            console.error('[AppPreferences] Failed to save preferences:', error);
            Alert.alert('Error', 'Could not save preferences.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLanguageChange = (language: string) => {
        const updatedPrefs = { language };
        setPreferences(prev => ({ ...prev, ...updatedPrefs }));
        savePreferences(updatedPrefs);
    };

    const handleCurrencyChange = (currencySymbol: string) => {
        const updatedPrefs = { currencySymbol };
        setPreferences(prev => ({ ...prev, ...updatedPrefs }));
        savePreferences(updatedPrefs);
    };

    const handleBackupFrequencyChange = (value: string) => {
        const backupFrequency = value as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'NEVER';
        const updatedPrefs = { backupFrequency };
        setPreferences(prev => ({ ...prev, ...updatedPrefs }));
        savePreferences(updatedPrefs);
    };

    const handleTaxRateChange = (text: string) => {
        const taxRate = parseFloat(text) || 0;
        setPreferences(prev => ({ ...prev, taxRate }));
    };

    const handleDiscountRateChange = (text: string) => {
        const defaultDiscountRate = parseFloat(text) || 0;
        setPreferences(prev => ({ ...prev, defaultDiscountRate }));
    };

    const handleReceiptFooterChange = (receiptFooter: string) => {
        setPreferences(prev => ({ ...prev, receiptFooter }));
    };

    const handleToggleNotifications = () => {
        const enableNotifications = !preferences.enableNotifications;
        const updatedPrefs = { enableNotifications };
        setPreferences(prev => ({ ...prev, ...updatedPrefs }));
        // Note: Notifications settings might need additional platform-specific handling
    };

    const handleToggleAutoBackup = () => {
        const autoBackup = !preferences.autoBackup;
        const updatedPrefs = { autoBackup };
        setPreferences(prev => ({ ...prev, ...updatedPrefs }));
    };

    const handleSaveAll = () => {
        savePreferences();
        Alert.alert('Success', 'Preferences saved successfully!');
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
            borderBottomWidth: 1,
            borderBottomColor: isDarkColorScheme ? '#333' : '#E5E5E5'
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: isDarkColorScheme ? '#FFFFFF' : '#000000',
            marginLeft: 15
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
        settingsGroup: {
            backgroundColor: isDarkColorScheme ? '#1C1C1E' : '#FFFFFF',
            borderRadius: Platform.OS === 'ios' ? 10 : 0,
            marginHorizontal: Platform.OS === 'ios' ? 15 : 0,
            marginBottom: 20,
            overflow: 'hidden',
        },
        saveButton: {
            backgroundColor: isDarkColorScheme ? '#0A84FF' : '#007AFF',
            margin: 15,
            paddingVertical: 15,
            borderRadius: 10,
            alignItems: 'center'
        },
        saveButtonText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: '600'
        }
    });

    const iconColor = isDarkColorScheme ? '#0A84FF' : '#007AFF';

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={iconColor} />
                <Text className="mt-2" style={{ color: isDarkColorScheme ? '#aaa' : '#555' }}>
                    Loading preferences...
                </Text>
            </View>
        );
    }

    const selectedLanguage = LANGUAGE_OPTIONS.find(lang => lang.code === preferences.language);
    const selectedCurrency = CURRENCY_OPTIONS.find(curr => curr.symbol === preferences.currencySymbol);
    const selectedBackupFreq = BACKUP_FREQUENCY_OPTIONS.find(freq => freq.value === preferences.backupFrequency);

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Localization</Text>
                <View style={styles.settingsGroup}>
                    <ListItem
                        icon={<Globe color={iconColor} />}
                        label="Language"
                        subtitle={selectedLanguage?.name || 'English'}
                        onPress={() => setShowLanguageModal(true)}
                        isFirst
                    />
                    <Separator className="bg-separator" style={{ marginLeft: 60 }} />
                    <ListItem
                        icon={<DollarSign color={iconColor} />}
                        label="Currency"
                        subtitle={selectedCurrency?.name || 'Indian Rupee (₹)'}
                        onPress={() => setShowCurrencyModal(true)}
                        isLast
                    />
                </View>

                <Text style={styles.sectionTitle}>Business Settings</Text>
                <View style={styles.settingsGroup}>
                    <InputItem
                        icon={<Percent color={iconColor} />}
                        label="Default Tax Rate"
                        value={preferences.taxRate}
                        onChangeText={handleTaxRateChange}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        suffix="%"
                        isFirst
                    />
                    <Separator className="bg-separator" style={{ marginLeft: 60 }} />
                    <InputItem
                        icon={<Percent color={iconColor} />}
                        label="Default Discount Rate"
                        value={preferences.defaultDiscountRate}
                        onChangeText={handleDiscountRateChange}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        suffix="%"
                        isLast
                    />
                </View>

                <Text style={styles.sectionTitle}>Receipt Settings</Text>
                <View style={styles.settingsGroup}>
                    <InputItem
                        icon={<Receipt color={iconColor} />}
                        label="Receipt Footer Text"
                        value={preferences.receiptFooter}
                        onChangeText={handleReceiptFooterChange}
                        placeholder="Thank you for your business!"
                        isFirst
                        isLast
                    />
                </View>

                <Text style={styles.sectionTitle}>Data & Backup</Text>
                <View style={styles.settingsGroup}>
                    <ListItem
                        icon={<Archive color={iconColor} />}
                        label="Auto Backup Frequency"
                        subtitle={selectedBackupFreq?.label || 'Weekly'}
                        onPress={() => setShowBackupModal(true)}
                        isFirst
                    />
                    <Separator className="bg-separator" style={{ marginLeft: 60 }} />
                    <ListItem
                        icon={<Smartphone color={iconColor} />}
                        label="Enable Auto Backup"
                        showChevron={false}
                        customRightContent={
                            <RNSwitch
                                value={preferences.autoBackup}
                                onValueChange={handleToggleAutoBackup}
                                trackColor={{ false: "#767577", true: isDarkColorScheme ? "#0060C0" : "#007AFF" }}
                                thumbColor="#FFFFFF"
                                ios_backgroundColor="#3e3e3e"
                            />
                        }
                        isLast
                    />
                </View>

                <Text style={styles.sectionTitle}>Notifications</Text>
                <View style={styles.settingsGroup}>
                    <ListItem
                        icon={<Bell color={iconColor} />}
                        label="Enable Notifications"
                        subtitle="Get notified about low stock and important updates"
                        showChevron={false}
                        customRightContent={
                            <RNSwitch
                                value={preferences.enableNotifications}
                                onValueChange={handleToggleNotifications}
                                trackColor={{ false: "#767577", true: isDarkColorScheme ? "#0060C0" : "#007AFF" }}
                                thumbColor="#FFFFFF"
                                ios_backgroundColor="#3e3e3e"
                            />
                        }
                        isFirst
                        isLast
                    />
                </View>

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveAll}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save All Preferences</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <SelectionModal
                visible={showLanguageModal}
                title="Select Language"
                options={LANGUAGE_OPTIONS.map(lang => ({ value: lang.code, label: lang.name, name: lang.name }))}
                selectedValue={preferences.language}
                onSelect={handleLanguageChange}
                onClose={() => setShowLanguageModal(false)}
            />

            <SelectionModal
                visible={showCurrencyModal}
                title="Select Currency"
                options={CURRENCY_OPTIONS.map(curr => ({ value: curr.symbol, label: curr.name, name: curr.name }))}
                selectedValue={preferences.currencySymbol}
                onSelect={handleCurrencyChange}
                onClose={() => setShowCurrencyModal(false)}
            />

            <SelectionModal
                visible={showBackupModal}
                title="Backup Frequency"
                options={BACKUP_FREQUENCY_OPTIONS.map(freq => ({ value: freq.value, label: freq.label }))}
                selectedValue={preferences.backupFrequency}
                onSelect={handleBackupFrequencyChange}
                onClose={() => setShowBackupModal(false)}
            />
        </View>
    );
}