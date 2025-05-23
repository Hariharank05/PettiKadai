import { Stack } from 'expo-router';
import { ThemeToggle } from '~/components/ThemeToggle';
import { UserProfileHeaderIcon } from '~/components/UserProfileHeaderIcon';
import { useColorScheme } from '~/lib/useColorScheme';
import { Alert, TouchableOpacity } from 'react-native';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Bell } from 'lucide-react-native';

export default function SettingsStackLayout() {
    const { isDarkColorScheme } = useColorScheme();

    const commonHeaderOptions = {
        headerRight: () => <UserProfileHeaderIcon />,
        headerStyle: {
            backgroundColor: isDarkColorScheme ? '#000000' : '#FFFFFF',
        },
        headerTintColor: isDarkColorScheme ? '#FFFFFF' : '#000000',
        headerTitleStyle: {
            color: isDarkColorScheme ? '#FFFFFF' : '#000000',
            fontWeight: 'bold' as 'bold',
        },
        headerShadowVisible: false,
    };

    return (
        <Stack screenOptions={commonHeaderOptions}>
            <Stack.Screen
                name="index" // Corresponds to app/(tabs)/settings/index.tsx
                options={{
                    title: 'Settings',
                    headerLargeTitle: true,
                    headerStyle: {
                        backgroundColor: isDarkColorScheme ? '#000000' : '#F0F2F5',
                    },
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => Alert.alert('Notifications', 'No new notifications.')}
                            style={{ marginRight: 15 }}
                        >
                            <Bell size={24} color={isDarkColorScheme ? '#FFFFFF' : '#000000'} />
                        </TouchableOpacity>
                    ),
                }}
            />
            <Stack.Screen
                name="profile"
                options={{
                    title: 'Edit Profile',
                    headerStyle: {
                        backgroundColor: isDarkColorScheme ? '#1C1C1E' : '#FFFFFF',
                    },
                }}
            />
            <Stack.Screen
                name="store-settings"
                options={{
                    title: 'Store Settings',
                    headerStyle: {
                        backgroundColor: isDarkColorScheme ? '#1C1C1E' : '#FFFFFF',
                    },
                }}
            />
            <Stack.Screen
                name="app-preferences"
                options={{
                    title: 'Application Preferences',
                    headerStyle: {
                        backgroundColor: isDarkColorScheme ? '#1C1C1E' : '#FFFFFF',
                    },
                }}
            />
            {/* Add other settings-related screens here if needed in the future */}
        </Stack>
    );
}