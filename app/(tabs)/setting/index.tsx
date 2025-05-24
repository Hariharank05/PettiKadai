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
    Image,
    Modal,
    useColorScheme as rnColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '~/components/ui/text';
import { useIsFocused } from '@react-navigation/native';
import { useAuthStore } from '~/lib/stores/authStore';
import { getDatabase } from '~/lib/db/database';
import * as FileSystem from 'expo-file-system';
import {
    UserCircle,
    LogOut,
    Lock,
    Building,
    ChevronRight,
    FileText,
    Moon,
    Sun,
    Info,
    DatabaseZap,
} from 'lucide-react-native';
import { useColorScheme } from '~/lib/useColorScheme';
import { ChangePasswordModal } from '~/components/screens/settings-components/ChangePasswordModal';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '~/components/ui/button';
import { X } from 'lucide-react-native';

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

interface FormState {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    storeEmail: string;
    currencySymbol: string;
    taxRate: number;
    darkModeForSave?: boolean;
    language?: string;
}

// DisplayField component adapted from AppPreferencesScreen
const DisplayField = ({
    icon: Icon,
    label,
    value,
    placeholder,
    iconColor,
    onPress,
    customRightContent,
    showChevron = true,
}: {
    icon: any;
    label: string;
    value?: string | number;
    placeholder?: string;
    iconColor: string;
    onPress?: () => void;
    customRightContent?: React.ReactNode;
    showChevron?: boolean;
}) => {
    const { isDarkColorScheme } = useColorScheme();
    return (
        <TouchableOpacity onPress={onPress} disabled={!onPress && !customRightContent}>
            <View className={`${isDarkColorScheme ? 'bg-gray-900' : 'bg-white'} rounded-xl p-4 mb-3 border ${isDarkColorScheme ? 'border-gray-800' : 'border-gray-200'}`}>
                <View className="flex-row items-center">
                    <Icon size={20} color={iconColor} />
                    <View className="ml-3 flex-1">
                        <Text className={`text-sm ${isDarkColorScheme ? 'text-gray-400' : 'text-gray-600'}`}>{label}</Text>
                        {value && (
                            <Text className={`text-base font-medium ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>
                                {typeof value === 'number' ? value.toString() : (value || placeholder)}
                            </Text>
                        )}
                    </View>
                    {customRightContent}
                    {showChevron && !customRightContent && (
                        <ChevronRight size={20} color={isDarkColorScheme ? '#5A5A5E' : '#C7C7CC'} />
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function SettingsScreen() {
    const { userName, userId, logout, isLoading: authIsLoading, updateAuthStoreUserName, changeUserPassword } = useAuthStore();
    const { setColorScheme, isDarkColorScheme } = useColorScheme();
    const currentRNColorScheme = rnColorScheme();
    const COLORS = getColors(currentRNColorScheme || 'light');

    const router = useRouter();
    const db = getDatabase();
    const isFocused = useIsFocused();

    const [formState, setFormState] = useState<FormState>({
        storeName: 'My Store',
        storeAddress: '',
        storePhone: '',
        storeEmail: '',
        currencySymbol: '₹',
        taxRate: 0,
        darkModeForSave: undefined,
        language: 'en',
    });

    const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [initialDbFetchComplete, setInitialDbFetchComplete] = useState(false);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [isChangePasswordModalVisible, setIsChangePasswordModalVisible] = useState(false);
    const [changePasswordLoading, setChangePasswordLoading] = useState(false);

    const fetchUserSettingsFromDb = useCallback(async (currentUserId: string): Promise<Partial<FormState>> => {
        try {
            const settingsFromDb = await db.getFirstAsync<any>(
                'SELECT storeName, storeAddress, storePhone, storeEmail, currencySymbol, taxRate, darkMode, language FROM Settings WHERE userId = ? AND id = ?',
                [currentUserId, currentUserId]
            );

            if (settingsFromDb) {
                return {
                    storeName: settingsFromDb.storeName || 'My Store',
                    storeAddress: settingsFromDb.storeAddress || '',
                    storePhone: settingsFromDb.storePhone || '',
                    storeEmail: settingsFromDb.storeEmail || '',
                    currencySymbol: settingsFromDb.currencySymbol || '₹',
                    taxRate: settingsFromDb.taxRate ?? 0,
                    darkModeForSave: settingsFromDb.darkMode === 1 ? true : (settingsFromDb.darkMode === 0 ? false : undefined),
                    language: settingsFromDb.language || 'en',
                };
            } else {
                return { darkModeForSave: undefined };
            }
        } catch (error) {
            console.error('[SettingsScreen] Failed to load user settings:', error);
            return { darkModeForSave: undefined };
        }
    }, [db]);

    const fetchProfileImageForUser = useCallback(async (currentUserId: string): Promise<string | null> => {
        if (!currentUserId) return null;
        try {
            const user = await db.getFirstAsync<{ profileImage: string | null }>(
                'SELECT profileImage FROM Users WHERE id = ?',
                [currentUserId]
            );
            if (user && user.profileImage) {
                const fileInfo = await FileSystem.getInfoAsync(user.profileImage);
                if (fileInfo.exists) {
                    return user.profileImage;
                } else {
                    console.warn('[SettingsScreen] Profile image file not found:', user.profileImage);
                    return null;
                }
            }
            return null;
        } catch (error) {
            console.error('[SettingsScreen] Failed to load profile image:', error);
            return null;
        }
    }, [db]);

    useEffect(() => {
        if (userId) {
            setDataLoading(true);
            setInitialDbFetchComplete(false);
            Promise.all([
                fetchUserSettingsFromDb(userId),
                fetchProfileImageForUser(userId)
            ]).then(([fetchedSettings, imageUri]) => {
                setFormState(prev => ({ ...prev, ...fetchedSettings }));
                setUserProfileImage(imageUri);
                setInitialDbFetchComplete(true);
            }).catch(error => {
                console.error("[SettingsScreen] Error fetching initial user data:", error);
                setUserProfileImage(null);
                setFormState(prev => ({
                    ...prev,
                    storeName: 'My Store', storeAddress: '', storePhone: '',
                    storeEmail: '', currencySymbol: '₹', taxRate: 0,
                    darkModeForSave: prev.darkModeForSave === undefined ? isDarkColorScheme : prev.darkModeForSave,
                    language: 'en'
                }));
            }).finally(() => {
                setDataLoading(false);
            });
        } else {
            setFormState({
                storeName: 'My Store', storeAddress: '', storePhone: '',
                storeEmail: '', currencySymbol: '₹', taxRate: 0,
                darkModeForSave: undefined, language: 'en',
            });
            setUserProfileImage(null);
            setInitialDbFetchComplete(false);
            setDataLoading(false);
        }
    }, [userId, fetchUserSettingsFromDb, fetchProfileImageForUser, isDarkColorScheme]);

    useEffect(() => {
        if (isFocused && userId && initialDbFetchComplete) {
            fetchProfileImageForUser(userId).then(imageUri => {
                setUserProfileImage(imageUri);
            });
        }
    }, [isFocused, userId, initialDbFetchComplete, fetchProfileImageForUser]);

    useEffect(() => {
        if (initialDbFetchComplete && userId) {
            if (formState.darkModeForSave !== undefined && formState.darkModeForSave !== isDarkColorScheme) {
                setColorScheme(formState.darkModeForSave ? 'dark' : 'light');
            } else if (formState.darkModeForSave === undefined) {
                setFormState(prev => ({ ...prev, darkModeForSave: isDarkColorScheme }));
            }
        }
    }, [initialDbFetchComplete, userId, formState.darkModeForSave, isDarkColorScheme, setColorScheme]);

    const saveDarkModePreference = async (newThemeIsDark: boolean) => {
        if (!userId) return;
        try {
            const darkModeDbValue = newThemeIsDark ? 1 : 0;
            const now = new Date().toISOString();
            const existingSettings = await db.getFirstAsync('SELECT id FROM Settings WHERE userId = ? AND id = ?', [userId, userId]);

            if (existingSettings) {
                await db.runAsync('UPDATE Settings SET darkMode = ?, updatedAt = ? WHERE userId = ? AND id = ?',
                    [darkModeDbValue, now, userId, userId]
                );
            } else {
                await db.runAsync(
                    `INSERT INTO Settings (
                        id, userId, storeName, storeAddress, storePhone, storeEmail,
                        currencySymbol, taxRate, defaultDiscountRate, darkMode, language,
                        receiptFooter, backupFrequency, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?}`,
                    [
                        userId, userId, formState.storeName, formState.storeAddress,
                        formState.storePhone, formState.storeEmail, formState.currencySymbol,
                        formState.taxRate, 0,
                        darkModeDbValue, formState.language || 'en',
                        '', 'WEEKLY',
                        now
                    ]
                );
            }
            console.log('[SettingsScreen] Dark mode preference saved.');
        } catch (error) {
            console.error('[SettingsScreen] Failed to save dark mode preference:', error);
            Alert.alert('Error', 'Could not save dark mode preference.');
        }
    };

    // const handleToggleDarkModeSwitch = () => {
    //     const newThemeIsDark = !isDarkColorScheme;
    //     setColorScheme(newThemeIsDark ? 'dark' : 'light');
    //     setFormState(prev => ({ ...prev, darkModeForSave: newThemeIsDark }));
    //     saveDarkModePreference(newThemeIsDark);
    // };
    const handleToggleDarkModeSwitch = () => {
        Alert.alert('Info', 'Dark mode will be implemented in the next version.');
    };

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
            Alert.alert("Error", "User not identified. Cannot reset data!");
            return;
        }
        setDataLoading(true);
        try {
            await db.withTransactionSync(() => {
                const tablesToClearForUser = [
                    'products', 'Categories', 'Suppliers', 'StockAdjustments',
                    'ProductBatches', 'Sales', 'DraftSales', 'Reports',
                    'ReportMetrics', 'AppUsage', 'Customers', 'SaleItems',
                    'Receipts',
                ];
                for (const table of tablesToClearForUser) {
                    try {
                        const tableInfoPragma = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table});`);
                        const hasUserIdColumn = tableInfoPragma.some(col => col.name === 'userId');
                        if (hasUserIdColumn) {
                            db.runSync(`DELETE FROM ${table} WHERE userId = ?`, [userId]);
                        } else if (table === 'SaleItems') {
                            db.runSync(`DELETE FROM SaleItems WHERE saleId IN (SELECT id FROM Sales WHERE userId = ?)`, [userId]);
                        } else if (table === 'Receipts') {
                            db.runSync(`DELETE FROM Receipts WHERE saleId IN (SELECT id FROM Sales WHERE userId = ?)`, [userId]);
                        }
                    } catch (e: any) {
                        console.warn(`Could not clear table ${table}: ${e.message}.`);
                    }
                }
                db.runSync(`DELETE FROM Settings WHERE userId = ? AND id = ?`, [userId, userId]);
            });
            Alert.alert('Success', 'Your application data has been reset. You will now be logged out.');
            await handleConfirmLogout();
        } catch (error) {
            console.error('Failed to reset data:', error);
            Alert.alert('Error', 'Failed to reset your data.');
        } finally {
            setDataLoading(false);
        }
    };

    const handleChangePasswordSubmit = async (currentPass: string, newPass: string) => {
        setChangePasswordLoading(true);
        const result = await changeUserPassword(currentPass, newPass);
        setChangePasswordLoading(false);
        if (result.success) {
            Alert.alert('Success', result.message || 'Password changed successfully!');
            setIsChangePasswordModalVisible(false);
        } else {
            Alert.alert('Error', result.message || 'Failed to change password.');
        }
        return result;
    };

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: 'transparent' },
        profileSection: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            backgroundColor: isDarkColorScheme ? '#1C1C1E' : '#FFFFFF',
            marginTop: Platform.OS === 'android' ? 10 : 0,
            marginHorizontal: Platform.OS === 'ios' ? 15 : 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDarkColorScheme ? '#374151' : '#e5e7eb',
        },
        profileAvatar: {
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: isDarkColorScheme ? '#3A3A3C' : '#E5E5EA',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 15,
            overflow: 'hidden',
        },
        profileAvatarImage: {
            width: '100%',
            height: '100%',
        },
        profileTextContainer: { flex: 1 },
        profileName: {
            fontSize: 20,
            fontWeight: '600',
            color: isDarkColorScheme ? '#FFFFFF' : '#000000',
        },
        profileSubtitle: {
            fontSize: 14,
            color: isDarkColorScheme ? '#8E8E93' : '#666666',
            marginTop: 2,
        },
    });

    const iconColor = isDarkColorScheme ? '#0A84FF' : '#007AFF';
    const destructiveIconColor = isDarkColorScheme ? '#FF453A' : '#FF3B30';

    if (dataLoading && !initialDbFetchComplete) {
        return (
            <LinearGradient colors={[COLORS.white, COLORS.yellow]} style={{ flex: 1 }}>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={iconColor} />
                    <Text className={`mt-4 text-lg font-medium ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-600'}`}>
                        Loading...
                    </Text>
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={[COLORS.white, COLORS.yellow]} style={{ flex: 1 }}>
            <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
             <View className="mb-4 flex-row items-center mt-2">
                    <View style={styles.profileAvatar}>
                        {userProfileImage ? (
                            <Image source={{ uri: userProfileImage }} style={styles.profileAvatarImage} />
                        ) : (
                            <UserCircle size={36} color={isDarkColorScheme ? '#8E8E93' : '#666666'} />
                        )}
                    </View>
                    <View style={styles.profileTextContainer}>
                        <Text style={styles.profileName}>{userName || 'Store Owner'}</Text>
                        <Text style={styles.profileSubtitle}>Show profile</Text>
                    </View>
                   
                </View>

                {/* General Section */}
                <View className="mb-6">
                    <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>General</Text>
                    <DisplayField
                        icon={UserCircle}
                        label="Personal Information"
                        iconColor={iconColor}
                        onPress={() => router.push('/(tabs)/setting/profile')}
                    />
                    <DisplayField
                        icon={Building}
                        label="Store Settings"
                        iconColor={iconColor}
                        onPress={() => router.push('/(tabs)/setting/store-settings')}
                    />
                    <DisplayField
                        icon={FileText}
                        label="Application Preferences"
                        iconColor={iconColor}
                        onPress={() => router.push('/(tabs)/setting/app-preferences')}
                    />
                </View>

                {/* Appearance & Security Section */}
                <View className="mb-6">
                    <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Appearance & Security</Text>
                    <View className={`${isDarkColorScheme ? 'bg-gray-900' : 'bg-white'} rounded-xl p-4 mb-3 border ${isDarkColorScheme ? 'border-gray-800' : 'border-gray-200'}`}>
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center flex-1">
                                {isDarkColorScheme ? <Moon size={20} color={iconColor} /> : <Sun size={20} color={iconColor} />}
                                <View className="ml-3">
                                    <Text className={`text-sm ${isDarkColorScheme ? 'text-gray-400' : 'text-gray-600'}`}>Dark Mode</Text>
                                    <Text className={`text-base font-medium ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>
                                        {isDarkColorScheme ? 'Enabled' : 'Disabled'}
                                    </Text>
                                </View>
                            </View>
                            <RNSwitch
                                value={isDarkColorScheme}
                                onValueChange={handleToggleDarkModeSwitch}
                                trackColor={{ false: "#767577", true: isDarkColorScheme ? "#0060C0" : "#007AFF" }}
                                thumbColor="#FFFFFF"
                                ios_backgroundColor="#3e3e3e"
                            />
                        </View>
                    </View>
                    <DisplayField
                        icon={Lock}
                        label="Change Password"
                        iconColor={iconColor}
                        onPress={() => setIsChangePasswordModalVisible(true)}
                        showChevron={false}
                    />
                </View>

                {/* Data & Information Section */}
                <View className="mb-6">
                    <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Data & Information</Text>
                    <DisplayField
                        icon={DatabaseZap}
                        label="Reset My Data"
                        iconColor={destructiveIconColor}
                        onPress={handleAttemptResetData}
                        showChevron={false}
                    />
                    <DisplayField
                        icon={Info}
                        label="About Petti Kadai"
                        iconColor={iconColor}
                        onPress={() => Alert.alert('Petti Kadai v1.0.2', 'Simple Inventory for Small Shops')}
                        showChevron={false}
                    />
                </View>

                {/* Logout Section */}
                <View className="mb-6">
                    <DisplayField
                        icon={LogOut}
                        label="Logout"
                        iconColor={destructiveIconColor}
                        onPress={handleAttemptLogout}
                        showChevron={false}
                    />
                </View>

                {/* Logout Modal */}
                <Modal
                    visible={showLogoutDialog}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowLogoutDialog(false)}
                >
                    <View className="flex-1 bg-black/50 justify-center items-center px-4">
                        <View className={`w-[85%] ${isDarkColorScheme ? 'bg-gray-800' : 'bg-white'} rounded-2xl overflow-hidden`}>
                            <View className={`flex-row items-center justify-between p-6 border-b ${isDarkColorScheme ? 'border-gray-700' : 'border-gray-200'}`}>
                                <Text className={`text-xl font-bold ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Confirm Logout</Text>
                                <TouchableOpacity onPress={() => setShowLogoutDialog(false)}>
                                    <X size={24} color={isDarkColorScheme ? '#9CA3AF' : '#6B7280'} />
                                </TouchableOpacity>
                            </View>
                            <View className="p-6">
                                <Text className={`text-base ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-600'}`}>Are you sure you want to log out?</Text>
                            </View>
                            <View className={`flex-row gap-3 p-6 border-t ${isDarkColorScheme ? 'border-gray-700' : 'border-gray-200'}`}>
                                <Button
                                    onPress={() => setShowLogoutDialog(false)}
                                    className={`flex-1 py-3 rounded-xl ${isDarkColorScheme ? 'bg-gray-600' : 'bg-gray-200'}`}
                                >
                                    <Text className={`font-semibold text-center ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</Text>
                                </Button>
                                <Button
                                    onPress={handleConfirmLogout}
                                    className="flex-1 py-3 rounded-xl bg-red-500"
                                >
                                    <Text className="font-semibold text-white text-center">Logout</Text>
                                </Button>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Reset Data Modal */}
                <Modal
                    visible={showResetDialog}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowResetDialog(false)}
                >
                    <View className="flex-1 bg-black/50 justify-center items-center px-4">
                        <View className={`w-[85%] ${isDarkColorScheme ? 'bg-gray-800' : 'bg-white'} rounded-2xl overflow-hidden`}>
                            <View className={`flex-row items-center justify-between p-6 border-b ${isDarkColorScheme ? 'border-gray-700' : 'border-gray-200'}`}>
                                <Text className={`text-xl font-bold ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Reset All Your Data?</Text>
                                <TouchableOpacity onPress={() => setShowResetDialog(false)}>
                                    <X size={24} color={isDarkColorScheme ? '#9CA3AF' : '#6B7280'} />
                                </TouchableOpacity>
                            </View>
                            <View className="p-6">
                                <Text className={`text-base ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-600'}`}>
                                    This will permanently delete all your application data associated with your account ({userName || 'current user'}). This action cannot be undone.
                                </Text>
                            </View>
                            <View className={`flex-row gap-3 p-6 border-t ${isDarkColorScheme ? 'border-gray-700' : 'border-gray-200'}`}>
                                <Button
                                    onPress={() => setShowResetDialog(false)}
                                    className={`flex-1 py-3 rounded-xl ${isDarkColorScheme ? 'bg-gray-600' : 'bg-gray-200'}`}
                                >
                                    <Text className={`font-semibold text-center ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</Text>
                                </Button>
                                <Button
                                    onPress={handleConfirmResetData}
                                    className="flex-1 py-3 rounded-xl bg-red-500"
                                >
                                    <Text className="font-semibold text-white text-center">Yes, Reset Data</Text>
                                </Button>
                            </View>
                        </View>
                    </View>
                </Modal>

                <ChangePasswordModal
                    visible={isChangePasswordModalVisible}
                    onClose={() => setIsChangePasswordModalVisible(false)}
                    onSubmit={handleChangePasswordSubmit}
                    isLoading={changePasswordLoading || authIsLoading}
                />
            </ScrollView>
        </LinearGradient>
    );
}