// app/(tabs)/settings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Switch as RNSwitch, ActivityIndicator, StyleSheet, TextInput as RNTextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';

import { useAuthStore } from '~/lib/stores/authStore';
import { getDatabase } from '~/lib/db/database';
import {
    User,
    LogOut,
    Lock,
    Building,
    Phone,
    Mail,
    Save,
    Trash,
    RefreshCw,
    Settings as SettingsIcon,
    Key,
    Shield,
    Info,
    Moon,
    Sun
} from 'lucide-react-native';
import { useColorScheme } from '~/lib/useColorScheme';

interface UserStoreSettings {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    storeEmail: string;
    currencySymbol: string;
    taxRate: number;
    darkMode?: boolean; // This will hold the value from DB or user's UI interaction
    language?: string;
    // Flag to indicate if settings have been loaded from DB for this user
    // This helps in deciding whether to apply DB theme to global theme
    dbSettingsLoaded?: boolean;
}

export default function SettingsScreen() {
    const { userName, userId, logout, isLoading: authIsLoading } = useAuthStore();
    const { setColorScheme, isDarkColorScheme } = useColorScheme();
    const router = useRouter();
    const db = getDatabase();

    const [userSettings, setUserSettings] = useState<UserStoreSettings>({
        storeName: 'My Store',
        storeAddress: '',
        storePhone: '',
        storeEmail: '',
        currencySymbol: '₹',
        taxRate: 0,
        darkMode: isDarkColorScheme, // Initialize with current app theme
        language: 'en',
        dbSettingsLoaded: false,
    });

    const [isLoading, setIsLoading] = useState(true);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [savedMessage, setSavedMessage] = useState('');

    // Step 1: Fetch user settings from DB. This function should be stable.
    const fetchUserSettingsFromDb = useCallback(async (currentUserId: string) => {
        console.log('[SettingsScreen] Fetching user settings for:', currentUserId);
        try {
            const settingsFromDb = await db.getFirstAsync<any>(
                'SELECT storeName, storeAddress, storePhone, storeEmail, currencySymbol, taxRate, darkMode, language FROM Settings WHERE userId = ? AND id = ?',
                [currentUserId, currentUserId]
            );

            if (settingsFromDb) {
                console.log('[SettingsScreen] Found settings in DB:', settingsFromDb);
                return {
                    storeName: settingsFromDb.storeName || 'My Store',
                    storeAddress: settingsFromDb.storeAddress || '',
                    storePhone: settingsFromDb.storePhone || '',
                    storeEmail: settingsFromDb.storeEmail || '',
                    currencySymbol: settingsFromDb.currencySymbol || '₹',
                    taxRate: settingsFromDb.taxRate || 0,
                    darkMode: settingsFromDb.darkMode === 1,
                    language: settingsFromDb.language || 'en',
                    dbSettingsLoaded: true, // Mark that DB settings were loaded
                };
            } else {
                console.log(`[SettingsScreen] No settings found for user ${currentUserId}. Will use defaults.`);
                return {
                    storeName: 'My Store',
                    storeAddress: '',
                    storePhone: '',
                    storeEmail: '',
                    currencySymbol: '₹',
                    taxRate: 0,
                    darkMode: isDarkColorScheme, // Use current app theme as default for UI
                    language: 'en',
                    dbSettingsLoaded: true, // Mark as "loaded" even if defaults are used
                };
            }
        } catch (error) {
            console.error('[SettingsScreen] Failed to load user settings:', error);
            Alert.alert('Error', 'Could not load your settings.');
            return { // Fallback
                storeName: 'My Store', storeAddress: '', storePhone: '',
                storeEmail: '', currencySymbol: '₹', taxRate: 0,
                darkMode: isDarkColorScheme, language: 'en', dbSettingsLoaded: true,
            };
        }
    }, [db, isDarkColorScheme]); // Depends on db and isDarkColorScheme (for default if no DB settings)

    // Effect for fetching data when userId changes
    useEffect(() => {
        if (userId) {
            setIsLoading(true);
            fetchUserSettingsFromDb(userId)
                .then(fetchedSettings => {
                    setUserSettings(fetchedSettings);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            // Reset to defaults if no user or user logs out
            setUserSettings({
                storeName: 'My Store', storeAddress: '', storePhone: '',
                storeEmail: '', currencySymbol: '₹', taxRate: 0,
                darkMode: isDarkColorScheme, language: 'en', dbSettingsLoaded: false,
            });
            setIsLoading(false);
        }
    }, [userId, fetchUserSettingsFromDb]); // fetchUserSettingsFromDb is now stable if db and isDarkColorScheme are stable

    // Effect to synchronize DB darkMode to global theme ONCE after settings are loaded
    useEffect(() => {
        if (userSettings.dbSettingsLoaded && userSettings.darkMode !== undefined && userSettings.darkMode !== isDarkColorScheme) {
            console.log(`[SettingsScreen] DB settings loaded. DB darkMode (${userSettings.darkMode}) differs from app theme (${isDarkColorScheme}). Syncing app theme.`);
            setColorScheme(userSettings.darkMode ? 'dark' : 'light');
            // Once synced, we might not want this to run again unless dbSettingsLoaded changes
            // Or, ensure this only happens if there's a genuine difference
        }
    }, [userSettings.dbSettingsLoaded, userSettings.darkMode, isDarkColorScheme, setColorScheme]);

    // Effect to synchronize the Switch UI with the global isDarkColorScheme
    // This ensures the switch reflects the theme even if it's changed elsewhere
    useEffect(() => {
        console.log("[SettingsScreen] Global isDarkColorScheme changed to:", isDarkColorScheme, ". Updating UI switch state.");
        setUserSettings(prev => ({ ...prev, darkMode: isDarkColorScheme }));
    }, [isDarkColorScheme]);


    const saveUserSettings = async () => {
        // ... (saveUserSettings logic remains largely the same as your last version)
        // Just ensure it uses `userSettings.darkMode` when saving to the DB
        if (!userId) {
            Alert.alert("Error", "User not identified. Cannot save settings.");
            return;
        }
        setIsLoading(true);
        try {
            const now = new Date().toISOString();
            const existingSettings = await db.getFirstAsync(
                'SELECT id FROM Settings WHERE userId = ? AND id = ?', [userId, userId]
            );

            const languageToSave = userSettings.language || 'en';
            const darkModeToSave = userSettings.darkMode ? 1 : 0; // Ensure this uses the local userSettings

            if (existingSettings) {
                console.log('[SettingsScreen] Updating existing settings for user:', userId, "DarkMode to save:", darkModeToSave);
                await db.runAsync(
                    `UPDATE Settings SET
                        storeName = ?, storeAddress = ?, storePhone = ?, storeEmail = ?,
                        currencySymbol = ?, taxRate = ?, darkMode = ?, language = ?, updatedAt = ?
                    WHERE userId = ? AND id = ?`,
                    [
                        userSettings.storeName, userSettings.storeAddress, userSettings.storePhone,
                        userSettings.storeEmail, userSettings.currencySymbol, userSettings.taxRate,
                        darkModeToSave, languageToSave, now,
                        userId, userId
                    ]
                );
            } else {
                console.log('[SettingsScreen] Inserting new settings for user:', userId, "DarkMode to save:", darkModeToSave);
                await db.runAsync(
                    `INSERT INTO Settings (
                        id, userId, storeName, storeAddress, storePhone, storeEmail,
                        currencySymbol, taxRate, defaultDiscountRate, darkMode, language, receiptFooter, backupFrequency, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId, userId, userSettings.storeName, userSettings.storeAddress,
                        userSettings.storePhone, userSettings.storeEmail, userSettings.currencySymbol,
                        userSettings.taxRate, 0, darkModeToSave, languageToSave,
                        '', 'WEEKLY', now
                    ]
                );
            }
            // After saving, refetch to ensure state is consistent with DB, especially if defaults were applied.
            // And mark dbSettingsLoaded as true, because now they ARE loaded (or just created).
            const updatedSettingsFromDb = await fetchUserSettingsFromDb(userId);
            setUserSettings(updatedSettingsFromDb);


            setSavedMessage('Settings saved successfully!');
            setTimeout(() => setSavedMessage(''), 3000);
        } catch (error) {
            console.error('Failed to save user settings:', error);
            Alert.alert('Error', `Failed to save settings: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleDarkModeSwitch = () => {
        const newDarkModeState = !userSettings.darkMode;
        // 1. Update local UI state for the switch immediately
        setUserSettings(prev => ({ ...prev, darkMode: newDarkModeState }));
        // 2. Update global app theme
        setColorScheme(newDarkModeState ? 'dark' : 'light');
        // The change will be persisted to DB when the user clicks "Save Preferences"
    };

    // ... (handleAttemptLogout, handleConfirmLogout, handleAttemptResetData, handleConfirmResetData remain the same)
    const handleAttemptLogout = () => {
        setShowLogoutDialog(true);
    };

    const handleConfirmLogout = async () => {
        setShowLogoutDialog(false);
        await logout();
        router.replace('/(auth)/login');
    };

    const handleAttemptResetData = () => {
        setShowResetDialog(true);
    };

    const handleConfirmResetData = async () => {
        setShowResetDialog(false);
        if (!userId) {
            Alert.alert("Error", "User not identified. Cannot reset data.");
            return;
        }
        setIsLoading(true);
        try {
            await db.withTransactionSync(() => {
                const tablesToClearForUser = [
                    'products', 'Categories', 'Suppliers', 'StockAdjustments',
                    'ProductBatches', 'Sales', 'DraftSales', 'Reports',
                    'ReportMetrics', 'AppUsage', 'Customers'
                ];
                for (const table of tablesToClearForUser) {
                    try {
                        const tableInfo = db.getAllSync(`PRAGMA table_info(${table});`);
                        const hasUserIdColumn = tableInfo.some((col: any) => col.name === 'userId');
                        if (hasUserIdColumn) {
                            db.runSync(`DELETE FROM ${table} WHERE userId = ?`, [userId]);
                            console.log(`Cleared ${table} for user ${userId}`);
                        } else {
                            console.warn(`Table ${table} does not have a userId column, not attempting user-specific delete.`);
                        }
                    } catch (e: any) {
                        console.warn(`Could not clear table ${table} for user ${userId}: ${e.message}.`);
                    }
                }
                db.runSync(`DELETE FROM Settings WHERE userId = ? AND id = ?`, [userId, userId]);
                console.log(`Cleared Settings for user ${userId}`);
            });
            Alert.alert('Success', 'Your data has been reset. You will now be logged out.');
            await handleConfirmLogout();
        } catch (error) {
            console.error('Failed to reset data:', error);
            Alert.alert('Error', 'Failed to reset your data.');
        } finally {
            setIsLoading(false);
        }
    };

    const styles = StyleSheet.create({
        container: { flex: 1, paddingVertical: 16, paddingHorizontal: 12, backgroundColor: isDarkColorScheme ? '#121212' : '#f0f2f5' },
        titleText: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, color: isDarkColorScheme ? '#e0e0e0' : '#111', textAlign: 'center' },
        card: {
            backgroundColor: isDarkColorScheme ? '#1e1e1e' : '#ffffff',
            borderRadius: 12,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDarkColorScheme ? 0.25 : 0.08,
            shadowRadius: 4,
            elevation: 4,
        },
        cardHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: isDarkColorScheme ? '#2a2a2a' : '#f0f0f0' },
        cardTitleContainer: { flexDirection: 'row', alignItems: 'center' },
        cardTitle: { fontSize: 18, fontWeight: '600', color: isDarkColorScheme ? '#dadada' : '#2c3e50', marginLeft: 10 },
        cardContent: { padding: 16 },
        label: { fontSize: 14, color: isDarkColorScheme ? '#909090' : '#555555', marginBottom: 6, marginTop: 10, fontWeight: '500' },
        inputComponent: {
            marginBottom: 12,
        },
        rnInput: { // Styles for RNTextInput if you use it directly
            backgroundColor: isDarkColorScheme ? '#2c2c2c' : '#f8f8f8',
            color: isDarkColorScheme ? '#e0e0e0' : '#333',
            paddingHorizontal: 14,
            paddingVertical: Platform.OS === 'ios' ? 14 : 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: isDarkColorScheme ? '#3c3c3c' : '#ddd',
            fontSize: 16,
            height: 50,
        },
        buttonComponent: { marginTop: 16, height: 50, borderRadius: 8 },
        buttonTextComponent: { fontWeight: '600', fontSize: 16 },
        settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDarkColorScheme ? '#2a2a2a' : '#f0f0f0' },
        settingItemText: { fontSize: 16, color: isDarkColorScheme ? '#c0c0c0' : '#34495e' },
        icon: { marginRight: 12 },
        successMessage: { color: '#27ae60', textAlign: 'center', marginVertical: 12, fontSize: 14, fontWeight: '500' },
        dialogOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
        dialogViewContent: { backgroundColor: isDarkColorScheme ? '#252525' : '#fff', borderRadius: 10, padding: 20, width: '100%', maxWidth: 360, elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
        dialogTitleText: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: isDarkColorScheme ? '#e0e0e0' : '#222' },
        dialogMessageText: { fontSize: 16, marginBottom: 24, color: isDarkColorScheme ? '#b0b0b0' : '#555', lineHeight: 23 },
        dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
        dialogButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 6 },
        dialogCancelButtonText: { color: isDarkColorScheme ? '#9CA3AF' : '#6B7280', fontSize: 16, fontWeight: '500' },
        dialogConfirmButton: { backgroundColor: isDarkColorScheme ? '#00AEEF' : '#007AFF' },
        dialogDestructiveButton: { backgroundColor: '#EF4444' },
        dialogConfirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    });

    if (isLoading && !userSettings.dbSettingsLoaded && !userId) { // More precise initial loading condition
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={isDarkColorScheme ? '#00AEEF' : '#007AFF'} />
                <Text style={{ marginTop: 10, color: isDarkColorScheme ? '#aaa' : '#555' }}>Loading Settings...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.titleText}>Settings</Text>

            <Card style={styles.card}>
                <CardHeader style={styles.cardHeader}>
                    <View style={styles.cardTitleContainer}>
                        <User size={20} color={isDarkColorScheme ? '#00AEEF' : '#007AFF'} style={styles.icon} />
                        <Text style={styles.cardTitle}>User Profile</Text>
                    </View>
                </CardHeader>
                <CardContent style={styles.cardContent}>
                    <Text style={[styles.settingItemText, { marginBottom: 16 }]}>Logged in as: {userName || 'Store Owner'}</Text>
                    <Button variant="outline" onPress={() => Alert.alert("Coming Soon", "Password change feature will be available in a future update.")} style={styles.buttonComponent}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Lock size={18} color={isDarkColorScheme ? '#CBD5E0' : '#4A5568'} style={styles.icon} />
                            <Text className="font-semibold" style={{ color: isDarkColorScheme ? '#CBD5E0' : '#4A5568' }}>Change Password</Text>
                        </View>
                    </Button>
                </CardContent>
            </Card>

            <Card style={styles.card}>
                <CardHeader style={styles.cardHeader}>
                    <View style={styles.cardTitleContainer}>
                        <Building size={20} color={isDarkColorScheme ? '#00AEEF' : '#007AFF'} style={styles.icon} />
                        <Text style={styles.cardTitle}>Store Information</Text>
                    </View>
                </CardHeader>
                <CardContent style={styles.cardContent}>
                    <View style={styles.inputComponent}>
                        <Text style={styles.label}>Store Name</Text>
                        <Input
                            value={userSettings.storeName}
                            onChangeText={(text) => setUserSettings(prev => ({ ...prev, storeName: text }))}
                            placeholder="Your Store Name"
                            className="h-12 text-base" // Using Tailwind for shadcn Input
                        />
                    </View>
                    <View style={styles.inputComponent}>
                        <Text style={styles.label}>Store Address</Text>
                        <Input
                            value={userSettings.storeAddress}
                            onChangeText={(text) => setUserSettings(prev => ({ ...prev, storeAddress: text }))}
                            placeholder="123 Main St, City"
                            className="h-12 text-base"
                        />
                    </View>
                    <View style={styles.inputComponent}>
                        <Text style={styles.label}>Phone</Text>
                        <Input
                            value={userSettings.storePhone}
                            onChangeText={(text) => setUserSettings(prev => ({ ...prev, storePhone: text }))}
                            placeholder="+1234567890"
                            keyboardType="phone-pad"
                            className="h-12 text-base"
                        />
                    </View>
                    <View style={styles.inputComponent}>
                        <Text style={styles.label}>Email</Text>
                        <Input
                            value={userSettings.storeEmail}
                            onChangeText={(text) => setUserSettings(prev => ({ ...prev, storeEmail: text }))}
                            placeholder="store@example.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            className="h-12 text-base"
                        />
                    </View>
                    {savedMessage ? <Text style={styles.successMessage}>{savedMessage}</Text> : null}
                    <Button onPress={saveUserSettings} disabled={isLoading || authIsLoading} style={styles.buttonComponent}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Save size={18} color="#fff" style={styles.icon} />
                            <Text style={[styles.buttonTextComponent, { color: '#fff' }]}>{isLoading ? 'Saving...' : 'Save Store Info'}</Text>
                        </View>
                    </Button>
                </CardContent>
            </Card>

            <Card style={styles.card}>
                <CardHeader style={styles.cardHeader}>
                    <View style={styles.cardTitleContainer}>
                        <SettingsIcon size={20} color={isDarkColorScheme ? '#00AEEF' : '#007AFF'} style={styles.icon} />
                        <Text style={styles.cardTitle}>App Preferences</Text>
                    </View>
                </CardHeader>
                <CardContent style={styles.cardContent}>
                    <View style={styles.settingItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {userSettings.darkMode ? <Moon size={20} color={isDarkColorScheme ? '#CBD5E0' : '#4A5568'} style={styles.icon} /> : <Sun size={20} color={isDarkColorScheme ? '#CBD5E0' : '#4A5568'} style={styles.icon} />}
                            <Text style={styles.settingItemText}>Dark Mode</Text>
                        </View>
                        <RNSwitch
                            value={userSettings.darkMode ?? false} // Ensure value is boolean
                            onValueChange={handleToggleDarkModeSwitch}
                            trackColor={{ false: "#767577", true: isDarkColorScheme ? "#0060C0" : "#007AFF" }}
                            thumbColor={isDarkColorScheme ? (userSettings.darkMode ? "#00AEEF" : "#f4f3f4") : (userSettings.darkMode ? "#007AFF" : "#f4f3f4")}
                        />
                    </View>
                    <Separator style={{ marginVertical: 8, backgroundColor: isDarkColorScheme ? '#2a2a2a' : '#f0f0f0' }} />
                    <View style={styles.inputComponent}>
                        <Text style={styles.label}>Currency Symbol</Text>
                        <Input
                            value={userSettings.currencySymbol}
                            onChangeText={(text) => setUserSettings(prev => ({ ...prev, currencySymbol: text }))}
                            placeholder="₹"
                            className="h-12 text-base"
                        />
                    </View>
                    <View style={styles.inputComponent}>
                        <Text style={styles.label}>Default Tax Rate (%)</Text>
                        <Input
                            value={String(userSettings.taxRate)}
                            onChangeText={(text) => setUserSettings(prev => ({ ...prev, taxRate: parseFloat(text) || 0 }))}
                            placeholder="0"
                            keyboardType="numeric"
                            className="h-12 text-base"
                        />
                    </View>
                    <Button onPress={saveUserSettings} disabled={isLoading || authIsLoading} style={styles.buttonComponent}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Save size={18} color="#fff" style={styles.icon} />
                            <Text style={[styles.buttonTextComponent, { color: '#fff' }]}>{isLoading ? 'Saving...' : 'Save Preferences'}</Text>
                        </View>
                    </Button>
                </CardContent>
            </Card>

            <Card style={styles.card}>
                <CardHeader style={styles.cardHeader}>
                    <View style={styles.cardTitleContainer}>
                        <Shield size={20} color={isDarkColorScheme ? '#00AEEF' : '#007AFF'} style={styles.icon} />
                        <Text style={styles.cardTitle}>Data Management</Text>
                    </View>
                </CardHeader>
                <CardContent style={styles.cardContent}>
                    <Button
                        variant="outline"
                        onPress={() => Alert.alert('Backup Data', 'Manual backup feature coming soon!')}
                        style={styles.buttonComponent}
                        className="mb-3"
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <RefreshCw size={18} color={isDarkColorScheme ? '#CBD5E0' : '#4A5568'} style={styles.icon} />
                            <Text className="font-semibold" style={{ color: isDarkColorScheme ? '#CBD5E0' : '#4A5568' }}>Backup My Data</Text>
                        </View>
                    </Button>
                    <Button
                        variant="destructive"
                        onPress={handleAttemptResetData}
                        disabled={authIsLoading || isLoading} // Consider both loading states
                        style={styles.buttonComponent}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Trash size={18} color="#fff" style={styles.icon} />
                            <Text className="font-semibold" style={{ color: '#fff' }}>
                                {(authIsLoading || isLoading) ? 'Processing...' : 'Reset My Data'}
                            </Text>
                        </View>
                    </Button>
                </CardContent>
            </Card>

            <Card style={styles.card}>
                <CardContent style={[styles.cardContent, { paddingTop: 16 }]}>
                    <Button
                        variant="destructive"
                        onPress={handleAttemptLogout}
                        disabled={authIsLoading}
                        style={styles.buttonComponent}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <LogOut size={18} color="#fff" style={styles.icon} />
                            <Text className="font-semibold" style={{ color: '#fff' }}>
                                {authIsLoading ? 'Logging out...' : 'Logout'}
                            </Text>
                        </View>
                    </Button>
                </CardContent>
            </Card>


            <Card style={styles.card}>
                <CardHeader style={styles.cardHeader}>
                    <View style={styles.cardTitleContainer}>
                        <Info size={20} color={isDarkColorScheme ? '#00AEEF' : '#007AFF'} style={styles.icon} />
                        <Text style={styles.cardTitle}>About Petti Kadai</Text>
                    </View>
                </CardHeader>
                <CardContent style={styles.cardContent}>
                    <Text style={styles.settingItemText}>Version: 1.0.1</Text>
                    <Text style={[styles.settingItemText, { fontSize: 14, marginTop: 4, color: isDarkColorScheme ? '#9CA3AF' : '#6B7280' }]}>Simple Inventory for Small Shops</Text>
                </CardContent>
            </Card>

            {/* Dialogs using custom styled Views */}
            {showLogoutDialog && (
                <View style={styles.dialogOverlay}>
                    <View style={styles.dialogViewContent}>
                        <Text style={styles.dialogTitleText}>Confirm Logout</Text>
                        <Text style={styles.dialogMessageText}>Are you sure you want to log out?</Text>
                        <View style={styles.dialogActions}>
                            <TouchableOpacity style={styles.dialogButton} onPress={() => setShowLogoutDialog(false)}>
                                <Text style={styles.dialogCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.dialogButton, styles.dialogDestructiveButton]} onPress={handleConfirmLogout}>
                                <Text style={styles.dialogConfirmButtonText}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {showResetDialog && (
                <View style={styles.dialogOverlay}>
                    <View style={styles.dialogViewContent}>
                        <Text style={styles.dialogTitleText}>Reset All Your Data?</Text>
                        <Text style={styles.dialogMessageText}>
                            This will permanently delete all products, sales, and other data associated with your account ({userName || 'current user'}). This action cannot be undone.
                        </Text>
                        <View style={styles.dialogActions}>
                            <TouchableOpacity style={styles.dialogButton} onPress={() => setShowResetDialog(false)}>
                                <Text style={styles.dialogCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.dialogButton, styles.dialogDestructiveButton]} onPress={handleConfirmResetData}>
                                <Text style={styles.dialogConfirmButtonText}>Yes, Reset Data</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}