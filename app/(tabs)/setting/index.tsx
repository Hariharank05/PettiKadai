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
import { Separator } from '~/components/ui/separator';
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

interface CustomListItemProps {
    icon: React.ReactElement<{ color?: string;[key: string]: any }>;
    label: string;
    onPress?: () => void;
    showChevron?: boolean;
    customRightContent?: React.ReactNode;
    isFirst?: boolean;
    isLast?: boolean;
}

const ListItem: React.FC<CustomListItemProps> = ({
    icon,
    label,
    onPress,
    showChevron = true,
    customRightContent,
    isFirst,
    isLast,
}) => {
    const iconColorFromProps = icon.props.color;

    return (
        <TouchableOpacity
            onPress={onPress}
            className={`flex-row items-center bg-card active:opacity-70 h-[50px] px-4 
                        ${isFirst && isLast ? 'rounded-lg' : ''} 
                        ${isFirst && !isLast ? 'rounded-t-lg' : ''} 
                        ${!isFirst && isLast ? 'rounded-b-lg' : ''}`}
            disabled={!onPress && !customRightContent}
        >
            <View
                className="w-8 h-8 rounded-full items-center justify-center mr-3"
                style={{
                    backgroundColor: iconColorFromProps
                        ? `${iconColorFromProps}20`
                        : 'transparent',
                }}
            >
                {React.cloneElement(icon, { size: 20 })}
            </View>
            <Text className="text-base text-foreground ml-1 flex-1">{label}</Text>
            {customRightContent}
            {showChevron && !customRightContent && (
                <ChevronRight size={20} className="text-muted-foreground opacity-50" />
            )}
        </TouchableOpacity>
    );
};

export default function SettingsScreen() {
    const { userName, userId, logout, isLoading: authIsLoading, updateAuthStoreUserName, changeUserPassword } = useAuthStore();
    const { setColorScheme, isDarkColorScheme } = useColorScheme(); // Your custom hook
    const currentRNColorScheme = rnColorScheme(); // From react-native
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
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    const handleToggleDarkModeSwitch = () => {
        const newThemeIsDark = !isDarkColorScheme;
        setColorScheme(newThemeIsDark ? 'dark' : 'light');
        setFormState(prev => ({ ...prev, darkModeForSave: newThemeIsDark }));
        saveDarkModePreference(newThemeIsDark);
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
            Alert.alert("Error", "User not identified. Cannot reset data.!");
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
        container: { flex: 1, backgroundColor: 'transparent' }, // Made transparent
        profileSection: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 15,
            backgroundColor: isDarkColorScheme ? '#1C1C1E' : '#FFFFFF',
            marginTop: Platform.OS === 'android' ? 10 : 0,
            marginHorizontal: Platform.OS === 'ios' ? 15 : 0,
            borderRadius: Platform.OS === 'ios' ? 10 : 0,
        },
        profileAvatar: {
            width: 60, height: 60, borderRadius: 30,
            backgroundColor: isDarkColorScheme ? '#3A3A3C' : '#E5E5EA',
            justifyContent: 'center', alignItems: 'center', marginRight: 15,
            overflow: 'hidden',
        },
        profileAvatarImage: {
            width: '100%',
            height: '100%',
        },
        profileTextContainer: { flex: 1 },
        profileName: { fontSize: 20, fontWeight: '600', color: isDarkColorScheme ? '#FFFFFF' : '#000000' },
        profileSubtitle: { fontSize: 14, color: isDarkColorScheme ? '#8E8E93' : '#666666', marginTop: 2 },
        settingsSectionTitle: {
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
        dialogOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
        },
        dialogViewContent: {
            backgroundColor: isDarkColorScheme ? '#252525' : '#fff',
            borderRadius: 10,
            padding: 20,
            width: '100%',
            maxWidth: 360,
            elevation: 5,
        },
        dialogTitleText: {
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 12,
            color: isDarkColorScheme ? '#e0e0e0' : '#222',
        },
        dialogMessageText: {
            fontSize: 16,
            marginBottom: 24,
            color: isDarkColorScheme ? '#b0b0b0' : '#555',
            lineHeight: 23,
        },
        dialogActions: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 12,
        },
        dialogButton: {
            paddingVertical: 10,
            paddingHorizontal: 18,
            borderRadius: 6,
        },
        dialogCancelButtonText: {
            color: isDarkColorScheme ? '#9CA3AF' : '#6B7280',
            fontSize: 16,
            fontWeight: '500',
        },
        dialogConfirmButton: {
            backgroundColor: isDarkColorScheme ? '#00AEEF' : '#007AFF',
        },
        dialogDestructiveButton: {
            backgroundColor: '#EF4444',
        },
        dialogConfirmButtonText: {
            color: '#fff',
            fontSize: 16,
            fontWeight: '600',
        },
    });

    const iconColor = isDarkColorScheme ? '#0A84FF' : '#007AFF';
    const destructiveIconColor = isDarkColorScheme ? '#FF453A' : '#FF3B30';

    if (dataLoading && !initialDbFetchComplete) {
        return (
            <LinearGradient colors={[COLORS.white, COLORS.yellow]} style={{ flex: 1 }}>
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={iconColor} />
                    <Text className="mt-2" style={{ color: isDarkColorScheme ? '#aaa' : '#555' }}>Loading...</Text>
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={[COLORS.white, COLORS.yellow]} style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={styles.profileSection} onPress={() => router.push('/(tabs)/setting/profile')}>
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
                    <ChevronRight size={22} color={isDarkColorScheme ? '#5A5A5E' : '#C7C7CC'} />
                </TouchableOpacity>

                <Text style={styles.settingsSectionTitle}>General</Text>
                <View style={styles.settingsGroup}>
                    <ListItem
                        icon={<UserCircle color={iconColor} />}
                        label="Personal Information"
                        onPress={() => router.push('/(tabs)/setting/profile')}
                        isFirst
                    />
                    <Separator className="bg-separator" style={{ marginLeft: 60 }} />
                    <ListItem
                        icon={<Building color={iconColor} />}
                        label="Store Settings"
                        onPress={() => router.push('/(tabs)/setting/store-settings')}
                    />
                    <Separator className="bg-separator" style={{ marginLeft: 60 }} />
                    <ListItem
                        icon={<FileText color={iconColor} />}
                        label="Application Preferences"
                        onPress={() => router.push('/(tabs)/setting/app-preferences')}
                        isLast
                    />
                </View>

                <Text style={styles.settingsSectionTitle}>Appearance & Security</Text>
                <View style={styles.settingsGroup}>
                    <ListItem
                        icon={isDarkColorScheme ? <Moon color={iconColor} /> : <Sun color={iconColor} />}
                        label="Dark Mode"
                        showChevron={false}
                        customRightContent={
                            <RNSwitch
                                value={isDarkColorScheme}
                                onValueChange={handleToggleDarkModeSwitch}
                                trackColor={{ false: "#767577", true: isDarkColorScheme ? "#0060C0" : "#007AFF" }}
                                thumbColor={"#FFFFFF"}
                                ios_backgroundColor="#3e3e3e"
                            />
                        }
                        isFirst
                    />
                    <Separator className="bg-separator" style={{ marginLeft: 60 }} />
                    <ListItem
                        icon={<Lock color={iconColor} />}
                        label="Change Password"
                        onPress={() => setIsChangePasswordModalVisible(true)}
                        showChevron={false}
                        isLast
                    />
                </View>

                <Text style={styles.settingsSectionTitle}>Data & Information</Text>
                <View style={styles.settingsGroup}>
                    <ListItem
                        icon={<DatabaseZap color={destructiveIconColor} />}
                        label="Reset My Data"
                        onPress={handleAttemptResetData}
                        showChevron={false}
                        isFirst
                    />
                    <Separator className="bg-separator" style={{ marginLeft: 60 }} />
                    <ListItem
                        icon={<Info color={iconColor} />}
                        label="About Petti Kadai"
                        onPress={() => Alert.alert('Petti Kadai v1.0.2', 'Simple Inventory for Small Shops')}
                        showChevron={false}
                        isLast
                    />
                </View>

                <View style={[styles.settingsGroup, { marginTop: 30 }]}>
                    <ListItem
                        icon={<LogOut color={destructiveIconColor} />}
                        label="Logout"
                        onPress={handleAttemptLogout}
                        showChevron={false}
                        isFirst
                        isLast
                    />
                </View>

                <Modal
                    visible={showLogoutDialog}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowLogoutDialog(false)}
                >
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
                </Modal>

                <Modal
                    visible={showResetDialog}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowResetDialog(false)}
                >
                    <View style={styles.dialogOverlay}>
                        <View style={styles.dialogViewContent}>
                            <Text style={styles.dialogTitleText}>Reset All Your Data?</Text>
                            <Text style={styles.dialogMessageText}>
                                This will permanently delete all your application data associated with your account ({userName || 'current user'}). This action cannot be undone.
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
