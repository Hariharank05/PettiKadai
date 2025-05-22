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
import { ChangePasswordModal } from '~/components/screens/settings-components/ChangePasswordModal';

// Shape of data fetched from DB and used for form state
interface FormState {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    storeEmail: string;
    currencySymbol: string;
    taxRate: number;
    // darkModeForSave stores the preference that will be written to DB.
    // It's initialized from DB, then updated by switch toggles.
    darkModeForSave?: boolean; // Can be undefined if no DB preference yet
    language?: string;
}


export default function SettingsScreen() {
    const { userName, userId, logout, isLoading: authIsLoading, updateAuthStoreUserName, changeUserPassword } = useAuthStore(); // Added updateAuthStoreUserName
    const { setColorScheme, isDarkColorScheme } = useColorScheme(); // Global theme state
    const router = useRouter();
    const db = getDatabase();
    const [changePasswordLoading, setChangePasswordLoading] = useState(false);
    const [isChangePasswordModalVisible, setIsChangePasswordModalVisible] = useState(false);

    const [formState, setFormState] = useState<FormState>({
        storeName: 'My Store',
        storeAddress: '',
        storePhone: '',
        storeEmail: '',
        currencySymbol: '₹',
        taxRate: 0,
        darkModeForSave: undefined, // Initialize as undefined
        language: 'en',
    });

    const [isLoading, setIsLoading] = useState(true);
    const [initialDbFetchComplete, setInitialDbFetchComplete] = useState(false);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [savedMessage, setSavedMessage] = useState('');

    // Fetches settings from DB. Should be stable.
    const fetchUserSettingsFromDb = useCallback(async (currentUserId: string): Promise<Partial<FormState>> => {
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
                    taxRate: settingsFromDb.taxRate ?? 0,
                    // darkModeForSave is the direct preference from DB
                    darkModeForSave: settingsFromDb.darkMode === 1 ? true : (settingsFromDb.darkMode === 0 ? false : undefined),
                    language: settingsFromDb.language || 'en',
                };
            } else {
                console.log(`[SettingsScreen] No settings found for user ${currentUserId}.`);
                // Return minimal object, defaults will be applied by formState initializer or later logic
                return { darkModeForSave: undefined };
            }
        } catch (error) {
            console.error('[SettingsScreen] Failed to load user settings:', error);
            Alert.alert('Error', 'Could not load your settings.');
            return { darkModeForSave: undefined };
        }
    }, [db]);

    // Effect 1: Fetch settings on userId change / initial mount.
    useEffect(() => {
        if (userId) {
            setIsLoading(true);
            setInitialDbFetchComplete(false); // Reset flag before fetch
            fetchUserSettingsFromDb(userId)
                .then(fetchedSettings => {
                    // Update formState with fetched data, or keep defaults if nothing specific was fetched.
                    // Crucially, set darkModeForSave from the fetched data.
                    setFormState(prev => ({
                        ...prev, // keep existing defaults for non-fetched items
                        ...fetchedSettings, // overwrite with fetched values
                    }));
                    setInitialDbFetchComplete(true); // Mark fetch as complete
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            // Reset to complete defaults if no user
            setFormState({
                storeName: 'My Store', storeAddress: '', storePhone: '',
                storeEmail: '', currencySymbol: '₹', taxRate: 0,
                darkModeForSave: undefined, // No user, no preference
                language: 'en',
            });
            setInitialDbFetchComplete(false);
            setIsLoading(false);
        }
    }, [userId, fetchUserSettingsFromDb]);

    // Effect 2: Synchronize global theme with DB preference ONCE after initial fetch.
    useEffect(() => {
        // Only run if initial fetch is done and we have a user
        if (initialDbFetchComplete && userId) {
            // If DB has a preference and it's different from current global theme
            if (formState.darkModeForSave !== undefined && formState.darkModeForSave !== isDarkColorScheme) {
                console.log(`[SettingsScreen] Initial DB Sync: DB preference (${formState.darkModeForSave}) differs from app theme (${isDarkColorScheme}). Syncing app theme.`);
                setColorScheme(formState.darkModeForSave ? 'dark' : 'light');
            }
            // If DB has no preference, the global theme (isDarkColorScheme) remains as is (e.g., system or previous session).
            // Then, ensure `darkModeForSave` (what will be saved) is initialized to match the *effective* global theme.
            else if (formState.darkModeForSave === undefined) {
                console.log(`[SettingsScreen] Initial DB Sync: No DB preference. Initializing darkModeForSave (${isDarkColorScheme}) from current app theme.`);
                setFormState(prev => ({ ...prev, darkModeForSave: isDarkColorScheme }));
            }
        }
    }, [initialDbFetchComplete, userId, formState.darkModeForSave /* Rerun if this changes from fetch */, isDarkColorScheme, setColorScheme]);


    const saveUserSettings = async () => {
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

            // Value to save to DB is formState.darkModeForSave
            // It's explicitly set to 'undefined' if no preference, so handle that.
            const darkModeDbValue = formState.darkModeForSave === true ? 1 : (formState.darkModeForSave === false ? 0 : null);
            const languageToSave = formState.language || 'en';

            if (existingSettings) {
                console.log('[SettingsScreen] Updating existing settings. darkMode to save:', darkModeDbValue);
                await db.runAsync(
                    `UPDATE Settings SET
                        storeName = ?, storeAddress = ?, storePhone = ?, storeEmail = ?,
                        currencySymbol = ?, taxRate = ?, darkMode = ?, language = ?, updatedAt = ?
                    WHERE userId = ? AND id = ?`,
                    [
                        formState.storeName, formState.storeAddress, formState.storePhone,
                        formState.storeEmail, formState.currencySymbol, formState.taxRate,
                        darkModeDbValue, languageToSave, now,
                        userId, userId
                    ]
                );
            } else {
                console.log('[SettingsScreen] Inserting new settings. darkMode to save:', darkModeDbValue);
                await db.runAsync(
                    `INSERT INTO Settings (
                        id, userId, storeName, storeAddress, storePhone, storeEmail,
                        currencySymbol, taxRate, defaultDiscountRate, darkMode, language, receiptFooter, backupFrequency, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId, userId, formState.storeName, formState.storeAddress,
                        formState.storePhone, formState.storeEmail, formState.currencySymbol,
                        formState.taxRate, 0, darkModeDbValue, languageToSave,
                        '', 'WEEKLY', now
                    ]
                );
            }

            // If storeName was changed, update it in AuthStore so it reflects elsewhere (e.g. _layout welcome message)
            if (userName !== formState.storeName) {
                updateAuthStoreUserName(formState.storeName, userId); // Pass userId to ensure correct update
            }

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
        const newThemeIsDark = !isDarkColorScheme; // Toggle based on current global theme
        // 1. Update global app theme
        setColorScheme(newThemeIsDark ? 'dark' : 'light');
        // 2. Update formState.darkModeForSave to reflect this new choice, ready for DB.
        setFormState(prev => ({ ...prev, darkModeForSave: newThemeIsDark }));
    };

    // --- Other Handlers (Logout, Reset Data) ---
    const handleAttemptLogout = () => setShowLogoutDialog(true);
    const handleConfirmLogout = async () => {
        setShowLogoutDialog(false);
        await logout();
        router.replace('/(auth)/login');
    };
    const handleAttemptResetData = () => setShowResetDialog(true);
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
                    'ReportMetrics', 'AppUsage', 'Customers', 'SaleItems', // Added SaleItems
                    'Receipts', // Added Receipts
                    // Note: Add other dependent tables like ReceiptSharing, ReceiptQRCodes etc. if they exist and need clearing.
                ];
                for (const table of tablesToClearForUser) {
                    try {
                        const tableInfoPragma = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table});`);
                        const hasUserIdColumn = tableInfoPragma.some(col => col.name === 'userId');

                        if (hasUserIdColumn) {
                            db.runSync(`DELETE FROM ${table} WHERE userId = ?`, [userId]);
                            console.log(`Cleared ${table} for user ${userId}`);
                        } else {
                            // For tables without direct userId, check for cascades or handle specific parent tables
                            // Example for SaleItems: Delete where saleId is from a Sale belonging to the user
                            if (table === 'SaleItems') {
                                db.runSync(`DELETE FROM SaleItems WHERE saleId IN (SELECT id FROM Sales WHERE userId = ?)`, [userId]);
                                console.log(`Cleared SaleItems for user ${userId} (via Sales table)`);
                            } else if (table === 'Receipts') {
                                db.runSync(`DELETE FROM Receipts WHERE saleId IN (SELECT id FROM Sales WHERE userId = ?)`, [userId]);
                                console.log(`Cleared Receipts for user ${userId} (via Sales table)`);
                            }
                            // Add more else if blocks for other dependent tables as needed
                            else {
                                console.warn(`Table ${table} does not have a direct userId column and no specific clearing logic defined. Skipping direct delete. (Cascading deletes might apply if PRAGMA foreign_keys=ON and schema supports it)`);
                            }
                        }
                    } catch (e: any) {
                        console.warn(`Could not clear table ${table} for user ${userId}: ${e.message}. It might not exist or issue with PRAGMA.`);
                    }
                }
                // Delete the user-specific settings row
                db.runSync(`DELETE FROM Settings WHERE userId = ? AND id = ?`, [userId, userId]);
                console.log(`Cleared Settings for user ${userId}`);
            });
            Alert.alert('Success', 'Your application data has been reset. You will now be logged out.');
            await handleConfirmLogout();
        } catch (error) {
            console.error('Failed to reset data:', error);
            Alert.alert('Error', 'Failed to reset your data.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePasswordSubmit = async (currentPass: string, newPass: string) => {
        setChangePasswordLoading(true);
        const result = await changeUserPassword(currentPass, newPass);
        setChangePasswordLoading(false);
        if (result.success) {
            Alert.alert('Success', result.message || 'Password changed successfully!');
            setIsChangePasswordModalVisible(false); // Close modal on success
        } else {
            // Error will be shown within the modal, but you could also Alert here
            Alert.alert('Error', result.message || 'Failed to change password.');
        }
        return result; // Return result so modal can also act on it
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
        buttonComponent: { marginTop: 16, height: 50, borderRadius: 8 },
        settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDarkColorScheme ? '#2a2a2a' : '#f0f0f0' },
        settingItemText: { fontSize: 16, color: isDarkColorScheme ? '#c0c0c0' : '#34495e' },
        icon: { marginRight: 12 },
        successMessage: { color: '#27ae60', textAlign: 'center', marginVertical: 12, fontSize: 14, fontWeight: '500' },
        dialogOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, zIndex: 1000 },
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

    if (isLoading && !initialDbFetchComplete) {
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
                    <Button variant="outline" onPress={() => router.push('/(tabs)/setting/profile')} style={styles.buttonComponent} className="mb-3">
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <User size={18} color={isDarkColorScheme ? '#CBD5E0' : '#4A5568'} style={styles.icon} />
                            <Text className="font-semibold" style={{ color: isDarkColorScheme ? '#CBD5E0' : '#4A5568' }}>View/Edit Profile</Text>
                        </View>
                    </Button>
                    <Button
                        variant="outline"
                        onPress={() => setIsChangePasswordModalVisible(true)} // Open the modal
                        style={styles.buttonComponent}
                    >
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
                        <Text style={styles.label}>Store Name (shown in app)</Text>
                        <Input
                            value={formState.storeName}
                            onChangeText={(text) => setFormState(prev => ({ ...prev, storeName: text }))}
                            placeholder="Your Store Name"
                            className="h-12 text-base"
                        />
                    </View>
                    <View style={styles.inputComponent}>
                        <Text style={styles.label}>Store Address (for receipts)</Text>
                        <Input
                            value={formState.storeAddress}
                            onChangeText={(text) => setFormState(prev => ({ ...prev, storeAddress: text }))}
                            placeholder="123 Main St, City"
                            className="h-12 text-base"
                        />
                    </View>
                    <View style={styles.inputComponent}>
                        <Text style={styles.label}>Phone (for receipts)</Text>
                        <Input
                            value={formState.storePhone}
                            onChangeText={(text) => setFormState(prev => ({ ...prev, storePhone: text }))}
                            placeholder="+1234567890"
                            keyboardType="phone-pad"
                            className="h-12 text-base"
                        />
                    </View>
                    <View style={styles.inputComponent}>
                        <Text style={styles.label}>Email (for receipts)</Text>
                        <Input
                            value={formState.storeEmail}
                            onChangeText={(text) => setFormState(prev => ({ ...prev, storeEmail: text }))}
                            placeholder="store@example.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            className="h-12 text-base"
                        />
                    </View>
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
                            {isDarkColorScheme ? <Moon size={20} color={isDarkColorScheme ? '#CBD5E0' : '#4A5568'} style={styles.icon} /> : <Sun size={20} color={isDarkColorScheme ? '#CBD5E0' : '#4A5568'} style={styles.icon} />}
                            <Text style={styles.settingItemText}>Dark Mode</Text>
                        </View>
                        <RNSwitch
                            value={isDarkColorScheme} // Switch reflects global theme
                            onValueChange={handleToggleDarkModeSwitch}
                            trackColor={{ false: "#767577", true: isDarkColorScheme ? "#0060C0" : "#007AFF" }}
                            thumbColor={isDarkColorScheme ? (isDarkColorScheme ? "#00AEEF" : "#f4f3f4") : (isDarkColorScheme ? "#007AFF" : "#f4f3f4")}
                        />
                    </View>
                    <Separator style={{ marginVertical: 8, backgroundColor: isDarkColorScheme ? '#2a2a2a' : '#f0f0f0' }} />
                    <View style={styles.inputComponent}>
                        <Text style={styles.label}>Currency Symbol</Text>
                        <Input
                            value={formState.currencySymbol}
                            onChangeText={(text) => setFormState(prev => ({ ...prev, currencySymbol: text }))}
                            placeholder="₹"
                            className="h-12 text-base"
                        />
                    </View>
                    <View style={styles.inputComponent}>
                        <Text style={styles.label}>Default Tax Rate (%)</Text>
                        <Input
                            value={String(formState.taxRate)}
                            onChangeText={(text) => {
                                const rate = parseFloat(text);
                                setFormState(prev => ({ ...prev, taxRate: isNaN(rate) ? 0 : rate }));
                            }}
                            placeholder="0"
                            keyboardType="numeric"
                            className="h-12 text-base"
                        />
                    </View>
                    {savedMessage ? <Text style={styles.successMessage}>{savedMessage}</Text> : null}
                    <Button onPress={saveUserSettings} disabled={isLoading || authIsLoading} style={styles.buttonComponent}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Save size={18} color="#fff" style={styles.icon} />
                            <Text style={{ fontWeight: '600', fontSize: 16, color: '#fff' }}>{(isLoading || authIsLoading) ? 'Saving...' : 'Save All Settings'}</Text>
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
                        disabled={authIsLoading || isLoading}
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
                    <Text style={styles.settingItemText}>Version: 1.0.2</Text>
                    <Text style={[styles.settingItemText, { fontSize: 14, marginTop: 4, color: isDarkColorScheme ? '#9CA3AF' : '#6B7280' }]}>Simple Inventory for Small Shops</Text>
                </CardContent>
            </Card>

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
                            This will permanently delete all your application data (products, sales, etc.) associated with your account ({userName || 'current user'}). This action cannot be undone.
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

            {/* Change Password Modal */}
            <ChangePasswordModal
                visible={isChangePasswordModalVisible}
                onClose={() => setIsChangePasswordModalVisible(false)}
                onSubmit={handleChangePasswordSubmit}
                isLoading={changePasswordLoading}
            />
        </ScrollView>
    );
}