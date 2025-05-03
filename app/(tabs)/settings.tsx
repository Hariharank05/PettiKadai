import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Switch, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import { Separator } from '~/components/ui/separator';
import { useAuthStore } from '~/lib/stores/authStore';
import { getDatabase } from '~/lib/db/database';
import {
    User,
    Settings,
    LogOut,
    Lock,
    Building,
    Phone,
    Mail,
    Save,
    Trash,
    RefreshCw
} from 'lucide-react-native';
import { useColorScheme } from '~/lib/useColorScheme';

// Interface for store settings
interface StoreSettings {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    storeEmail: string;
    currencySymbol: string;
    taxRate: number;
    discountRate?: number; // Make this optional since it might not exist
}

export default function SettingsScreen() {
    const { userName, logout } = useAuthStore();
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const router = useRouter();
    const db = getDatabase();

    const [storeSettings, setStoreSettings] = useState<StoreSettings>({
        storeName: '',
        storeAddress: '',
        storePhone: '',
        storeEmail: '',
        currencySymbol: '₹',
        taxRate: 0,
        discountRate: 0
    });

    const [isLoading, setIsLoading] = useState(false);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
    const [savedMessage, setSavedMessage] = useState('');

    // Load store settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                // First check if the Settings table exists and create it if not
                await db.execAsync(`
          CREATE TABLE IF NOT EXISTS Settings (
            id TEXT PRIMARY KEY DEFAULT 'app_settings',
            storeName TEXT DEFAULT '',
            storeAddress TEXT DEFAULT '',
            storePhone TEXT DEFAULT '',
            storeEmail TEXT DEFAULT '',
            currencySymbol TEXT DEFAULT '₹',
            taxRate REAL DEFAULT 0,
            updatedAt TEXT DEFAULT (datetime('now'))
          );
        `);

                // Then check for existing settings
                const checkSettings = await db.getFirstAsync<{ count: number }>(
                    'SELECT COUNT(*) as count FROM Settings WHERE id = "app_settings"'
                );

                // Create default settings if none exist
                if (!checkSettings || checkSettings.count === 0) {
                    await db.runAsync(
                        `INSERT INTO Settings (
              id, storeName, storeAddress, storePhone, storeEmail, 
              currencySymbol, taxRate, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            'app_settings',
                            'My Store',
                            '',
                            '',
                            '',
                            '₹',
                            0,
                            new Date().toISOString()
                        ]
                    );
                }

                // Now get the settings
                const settings = await db.getFirstAsync<StoreSettings>(
                    'SELECT storeName, storeAddress, storePhone, storeEmail, currencySymbol, taxRate FROM Settings WHERE id = "app_settings"'
                );

                if (settings) {
                    setStoreSettings({
                        ...settings,
                        discountRate: 0 // Default value - not stored in DB
                    });
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
                // Initialize with defaults even if there's an error
                setStoreSettings({
                    storeName: 'My Store',
                    storeAddress: '',
                    storePhone: '',
                    storeEmail: '',
                    currencySymbol: '₹',
                    taxRate: 0,
                    discountRate: 0
                });
            }
        };

        loadSettings();
    }, []);

    // Save store settings
    const saveSettings = async () => {
        setIsLoading(true);
        try {
            const now = new Date().toISOString();

            await db.runAsync(
                `UPDATE Settings SET 
          storeName = ?, storeAddress = ?, storePhone = ?, storeEmail = ?,
          currencySymbol = ?, taxRate = ?, updatedAt = ?
        WHERE id = "app_settings"`,
                [
                    storeSettings.storeName,
                    storeSettings.storeAddress,
                    storeSettings.storePhone,
                    storeSettings.storeEmail,
                    storeSettings.currencySymbol,
                    storeSettings.taxRate,
                    now
                ]
            );

            setSavedMessage('Settings saved successfully!');
            setTimeout(() => setSavedMessage(''), 3000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            Alert.alert('Error', 'Failed to save settings');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle app data reset
    const handleResetData = async () => {
        setIsLoading(true);
        try {
            // Delete all app data except auth
            await db.withTransactionSync(() => {
                // Clear products
                db.execSync('DELETE FROM Products');

                // Clear sales if the table exists
                try {
                    db.execSync('DELETE FROM Sales');
                } catch (e) {
                    // Table might not exist, which is fine
                }

                // Clear other tables if they exist
                const safeClearTable = (tableName: string) => {
                    try {
                        db.execSync(`DELETE FROM ${tableName}`);
                    } catch (e) {
                        // Table might not exist, which is fine
                    }
                };

                safeClearTable('SaleItems');
                safeClearTable('Categories');
                safeClearTable('StockAdjustments');
            });

            Alert.alert('Success', 'All app data has been reset. The app will now logout.');

            // Logout after reset
            handleLogout();
        } catch (error) {
            console.error('Failed to reset data:', error);
            Alert.alert('Error', 'Failed to reset app data');
        } finally {
            setIsLoading(false);
            setShowResetDialog(false);
        }
    };

    // Handle logout
    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await logout();
            router.replace('/(auth)/login');
        } catch (error) {
            console.error('Failed to logout:', error);
            Alert.alert('Error', 'Failed to logout');
        } finally {
            setIsLoading(false);
            setShowLogoutDialog(false);
        }
    };

    // Custom styles for proper appearance
    const styles = StyleSheet.create({
        cardStyle: {
            backgroundColor: colorScheme === 'dark' ? '#1c1c1c' : '#ffffff',
            borderColor: colorScheme === 'dark' ? '#333' : '#e5e5e5',
            borderWidth: 1,
            borderRadius: 8,
            marginBottom: 16,
        },
        headerStyle: {
            paddingVertical: 12,
            paddingHorizontal: 16,
        },
        cardContentStyle: {
            padding: 16,
        },
        primaryButton: {
            backgroundColor: colorScheme === 'dark' ? '#0070f3' : '#0070f3',
            padding: 10,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 8,
        },
        primaryButtonText: {
            color: '#ffffff',
            fontWeight: '600',
        },
        outlineButton: {
            backgroundColor: 'transparent',
            padding: 10,
            borderRadius: 8,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colorScheme === 'dark' ? '#333' : '#e5e5e5',
            marginTop: 8,
        },
        outlineButtonText: {
            color: colorScheme === 'dark' ? '#ffffff' : '#000000',
        },
        destructiveButton: {
            backgroundColor: '#ff4d4f',
            padding: 10,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 8,
        },
        destructiveButtonText: {
            color: '#ffffff',
            fontWeight: '600',
        },
        input: {
            backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
            borderColor: colorScheme === 'dark' ? '#444' : '#e5e5e5',
            borderWidth: 1,
            borderRadius: 8,
            padding: 10,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            marginTop: 4,
        },
        title: {
            fontSize: 20,
            fontWeight: 'bold',
            color: colorScheme === 'dark' ? '#fff' : '#000',
            marginBottom: 16,
        },
        cardTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: colorScheme === 'dark' ? '#fff' : '#000',
        },
        label: {
            fontSize: 14,
            marginBottom: 4,
            color: colorScheme === 'dark' ? '#aaa' : '#666',
        },
        text: {
            color: colorScheme === 'dark' ? '#fff' : '#000',
        },
        mutedText: {
            color: colorScheme === 'dark' ? '#aaa' : '#666',
            fontSize: 14,
        },
        separator: {
            height: 1,
            backgroundColor: colorScheme === 'dark' ? '#333' : '#e5e5e5',
            marginVertical: 16,
        },
        iconContainer: {
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: colorScheme === 'dark' ? '#333' : '#f0f0f0',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        userProfileContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
        },
        inputContainer: {
            marginBottom: 16,
        },
        inputRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        switchContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
        },
        successMessage: {
            color: '#52c41a',
            textAlign: 'center',
            marginTop: 8,
        }
    });

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#121212' : '#f5f5f5' }}>
            <View style={{ padding: 16 }}>
                <Text style={styles.title}>Settings</Text>

                {/* User Profile */}
                <View style={styles.cardStyle}>
                    <View style={styles.headerStyle}>
                        <Text style={styles.cardTitle}>User Profile</Text>
                    </View>
                    <View style={styles.cardContentStyle}>
                        <View style={styles.userProfileContainer}>
                            <View style={[styles.iconContainer, { backgroundColor: colorScheme === 'dark' ? '#0070f3' : '#e6f7ff' }]}>
                                <User size={24} color={colorScheme === 'dark' ? '#fff' : '#0070f3'} />
                            </View>
                            <View>
                                <Text style={styles.text}>{userName || 'User'}</Text>
                                <Text style={styles.mutedText}>Logged in</Text>
                            </View>
                        </View>

                        <View>
                            <TouchableOpacity
                                style={styles.outlineButton}
                                onPress={() => setShowChangePasswordDialog(true)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Lock size={18} color={colorScheme === 'dark' ? '#fff' : '#000'} style={{ marginRight: 8 }} />
                                    <Text style={styles.outlineButtonText}>Change Password</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.outlineButton}
                                onPress={() => setShowLogoutDialog(true)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <LogOut size={18} color={colorScheme === 'dark' ? '#fff' : '#000'} style={{ marginRight: 8 }} />
                                    <Text style={styles.outlineButtonText}>Logout</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Store Information */}
                <View style={styles.cardStyle}>
                    <View style={styles.headerStyle}>
                        <Text style={styles.cardTitle}>Store Information</Text>
                    </View>
                    <View style={styles.cardContentStyle}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Store Name</Text>
                            <View style={styles.inputRow}>
                                <Building size={18} color={colorScheme === 'dark' ? '#aaa' : '#666'} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={styles.input}
                                    value={storeSettings.storeName}
                                    onChangeText={(text) => setStoreSettings({ ...storeSettings, storeName: text })}
                                    placeholder="Your Store Name"
                                    placeholderTextColor={colorScheme === 'dark' ? '#666' : '#aaa'}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Store Address</Text>
                            <View style={styles.inputRow}>
                                <Building size={18} color={colorScheme === 'dark' ? '#aaa' : '#666'} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={styles.input}
                                    value={storeSettings.storeAddress}
                                    onChangeText={(text) => setStoreSettings({ ...storeSettings, storeAddress: text })}
                                    placeholder="Store Address"
                                    placeholderTextColor={colorScheme === 'dark' ? '#666' : '#aaa'}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={styles.inputRow}>
                                <Phone size={18} color={colorScheme === 'dark' ? '#aaa' : '#666'} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={styles.input}
                                    value={storeSettings.storePhone}
                                    onChangeText={(text) => setStoreSettings({ ...storeSettings, storePhone: text })}
                                    placeholder="Phone Number"
                                    placeholderTextColor={colorScheme === 'dark' ? '#666' : '#aaa'}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputRow}>
                                <Mail size={18} color={colorScheme === 'dark' ? '#aaa' : '#666'} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={styles.input}
                                    value={storeSettings.storeEmail}
                                    onChangeText={(text) => setStoreSettings({ ...storeSettings, storeEmail: text })}
                                    placeholder="Email Address"
                                    placeholderTextColor={colorScheme === 'dark' ? '#666' : '#aaa'}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={saveSettings}
                            disabled={isLoading}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Save size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.primaryButtonText}>
                                    {isLoading ? 'Saving...' : 'Save Information'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {savedMessage ? (
                            <Text style={styles.successMessage}>{savedMessage}</Text>
                        ) : null}
                    </View>
                </View>

                {/* App Preferences */}
                <View style={styles.cardStyle}>
                    <View style={styles.headerStyle}>
                        <Text style={styles.cardTitle}>App Preferences</Text>
                    </View>
                    <View style={styles.cardContentStyle}>
                        <View style={styles.switchContainer}>
                            <Text style={styles.text}>Dark Mode</Text>
                            <Switch
                                value={colorScheme === 'dark'}
                                onValueChange={toggleColorScheme}
                                trackColor={{ false: "#767577", true: "#0070f3" }}
                                thumbColor="#f5f5f5"
                            />
                        </View>

                        <View style={styles.separator} />

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Currency Symbol</Text>
                            <TextInput
                                style={styles.input}
                                value={storeSettings.currencySymbol}
                                onChangeText={(text) => setStoreSettings({ ...storeSettings, currencySymbol: text })}
                                placeholder="₹"
                                placeholderTextColor={colorScheme === 'dark' ? '#666' : '#aaa'}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Default Tax Rate (%)</Text>
                            <TextInput
                                style={styles.input}
                                value={storeSettings.taxRate.toString()}
                                onChangeText={(text) => {
                                    const value = parseFloat(text) || 0;
                                    setStoreSettings({ ...storeSettings, taxRate: value });
                                }}
                                placeholder="0"
                                placeholderTextColor={colorScheme === 'dark' ? '#666' : '#aaa'}
                                keyboardType="numeric"
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.outlineButton}
                            onPress={saveSettings}
                            disabled={isLoading}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Save size={18} color={colorScheme === 'dark' ? '#fff' : '#000'} style={{ marginRight: 8 }} />
                                <Text style={styles.outlineButtonText}>Save Preferences</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Data Management */}
                <View style={styles.cardStyle}>
                    <View style={styles.headerStyle}>
                        <Text style={styles.cardTitle}>Data Management</Text>
                    </View>
                    <View style={styles.cardContentStyle}>
                        <View>
                            <TouchableOpacity
                                style={styles.outlineButton}
                                onPress={() => Alert.alert('Backup', 'Backup functionality will be implemented in a future version.')}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <RefreshCw size={18} color={colorScheme === 'dark' ? '#fff' : '#000'} style={{ marginRight: 8 }} />
                                    <Text style={styles.outlineButtonText}>Backup Data</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.outlineButton}
                                onPress={() => Alert.alert('Restore', 'Restore functionality will be implemented in a future version.')}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <RefreshCw size={18} color={colorScheme === 'dark' ? '#fff' : '#000'} style={{ marginRight: 8 }} />
                                    <Text style={styles.outlineButtonText}>Restore Data</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.destructiveButton}
                                onPress={() => setShowResetDialog(true)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Trash size={18} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.destructiveButtonText}>Reset All Data</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* About */}
                <View style={styles.cardStyle}>
                    <View style={styles.headerStyle}>
                        <Text style={styles.cardTitle}>About</Text>
                    </View>
                    <View style={styles.cardContentStyle}>
                        <Text style={styles.text}>Petti Kadai v1.0.0</Text>
                        <Text style={styles.mutedText}>A simple inventory management app for small stores</Text>
                    </View>
                </View>
            </View>

            {/* Logout Confirmation Dialog */}
            {showLogoutDialog && (
                <View style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20,
                }}>
                    <View style={{
                        backgroundColor: colorScheme === 'dark' ? '#1c1c1c' : '#ffffff',
                        borderRadius: 8,
                        padding: 20,
                        width: '100%',
                        maxWidth: 400,
                    }}>
                        <Text style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            marginBottom: 8,
                            color: colorScheme === 'dark' ? '#fff' : '#000',
                        }}>Logout</Text>
                        <Text style={{
                            marginBottom: 16,
                            color: colorScheme === 'dark' ? '#aaa' : '#666',
                        }}>Are you sure you want to logout from your account?</Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                            <TouchableOpacity
                                style={{
                                    padding: 8,
                                    marginRight: 8,
                                }}
                                onPress={() => setShowLogoutDialog(false)}
                            >
                                <Text style={{ color: colorScheme === 'dark' ? '#aaa' : '#666' }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    padding: 8,
                                    backgroundColor: '#ff4d4f',
                                    borderRadius: 4,
                                }}
                                onPress={handleLogout}
                            >
                                <Text style={{ color: '#fff' }}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Reset Data Confirmation Dialog */}
            {showResetDialog && (
                <View style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20,
                }}>
                    <View style={{
                        backgroundColor: colorScheme === 'dark' ? '#1c1c1c' : '#ffffff',
                        borderRadius: 8,
                        padding: 20,
                        width: '100%',
                        maxWidth: 400,
                    }}>
                        <Text style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            marginBottom: 8,
                            color: colorScheme === 'dark' ? '#fff' : '#000',
                        }}>Reset All Data</Text>
                        <Text style={{
                            marginBottom: 16,
                            color: colorScheme === 'dark' ? '#aaa' : '#666',
                        }}>This will permanently delete all your products, sales, and other data. This action cannot be undone.</Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                            <TouchableOpacity
                                style={{
                                    padding: 8,
                                    marginRight: 8,
                                }}
                                onPress={() => setShowResetDialog(false)}
                            >
                                <Text style={{ color: colorScheme === 'dark' ? '#aaa' : '#666' }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    padding: 8,
                                    backgroundColor: '#ff4d4f',
                                    borderRadius: 4,
                                }}
                                onPress={handleResetData}
                            >
                                <Text style={{ color: '#fff' }}>Reset Data</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Change Password Dialog */}
            {showChangePasswordDialog && (
                <View style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20,
                }}>
                    <View style={{
                        backgroundColor: colorScheme === 'dark' ? '#1c1c1c' : '#ffffff',
                        borderRadius: 8,
                        padding: 20,
                        width: '100%',
                        maxWidth: 400,
                    }}>
                        <Text style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            marginBottom: 16,
                            color: colorScheme === 'dark' ? '#fff' : '#000',
                        }}>Change Password</Text>

                        <View style={{ marginBottom: 12 }}>
                            <TextInput
                                style={{
                                    backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
                                    borderColor: colorScheme === 'dark' ? '#444' : '#e5e5e5',
                                    borderWidth: 1,
                                    borderRadius: 8,
                                    padding: 10,
                                    marginBottom: 8,
                                    color: colorScheme === 'dark' ? '#fff' : '#000',
                                }}
                                secureTextEntry
                                placeholder="Current Password"
                                placeholderTextColor={colorScheme === 'dark' ? '#666' : '#aaa'}
                            />

                            <TextInput
                                style={{
                                    backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
                                    borderColor: colorScheme === 'dark' ? '#444' : '#e5e5e5',
                                    borderWidth: 1,
                                    borderRadius: 8,
                                    padding: 10,
                                    marginBottom: 8,
                                    color: colorScheme === 'dark' ? '#fff' : '#000',
                                }}
                                secureTextEntry
                                placeholder="New Password"
                                placeholderTextColor={colorScheme === 'dark' ? '#666' : '#aaa'}
                            />

                            <TextInput
                                style={{
                                    backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
                                    borderColor: colorScheme === 'dark' ? '#444' : '#e5e5e5',
                                    borderWidth: 1,
                                    borderRadius: 8,
                                    padding: 10,
                                    color: colorScheme === 'dark' ? '#fff' : '#000',
                                }}
                                secureTextEntry
                                placeholder="Confirm New Password"
                                placeholderTextColor={colorScheme === 'dark' ? '#666' : '#aaa'}
                            />
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                            <TouchableOpacity
                                style={{
                                    padding: 8,
                                    marginRight: 8,
                                }}
                                onPress={() => setShowChangePasswordDialog(false)}
                            >
                                <Text style={{ color: colorScheme === 'dark' ? '#aaa' : '#666' }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    padding: 8,
                                    backgroundColor: '#0070f3',
                                    borderRadius: 4,
                                }}
                                onPress={() => {
                                    Alert.alert('Password Change', 'Password change functionality will be implemented in a future version.');
                                    setShowChangePasswordDialog(false);
                                }}
                            >
                                <Text style={{ color: '#fff' }}>Change Password</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}