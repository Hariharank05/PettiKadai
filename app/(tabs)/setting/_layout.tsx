import { Stack } from 'expo-router';
import { Platform } from 'react-native';
// import { ThemeToggle } from '~/components/ThemeToggle'; // Not used
import { UserProfileHeaderIcon } from '~/components/UserProfileHeaderIcon';
// import { useColorScheme } from '~/lib/useColorScheme'; // Not needed if colors fixed for header
// import { Alert, TouchableOpacity } from 'react-native'; // Bell icon related
// import { Bell } from 'lucide-react-native'; // Bell icon related

const VIBRANT_HEADER_COLOR = '#f9c00c';
const HEADER_TEXT_ICON_COLOR = '#FFFFFF';

export default function SettingsStackLayout() {
    // const { isDarkColorScheme } = useColorScheme(); // Not needed for fixed header colors

    const commonHeaderOptions = {
        headerRight: () => <UserProfileHeaderIcon />, // Standard user profile icon
        headerStyle: {
            backgroundColor: VIBRANT_HEADER_COLOR,
        },
        headerTintColor: HEADER_TEXT_ICON_COLOR,
        headerTitleStyle: {
            color: HEADER_TEXT_ICON_COLOR,
            fontWeight: 'bold' as 'bold',
        },
        headerShadowVisible: false,
        headerBackTitleVisible: false, // Ensure back title is not visible on iOS
    };

    return (
        <Stack screenOptions={commonHeaderOptions}>
            <Stack.Screen
                name="index" // Corresponds to app/(tabs)/setting/index.tsx
                options={{
                    title: 'Settings',
                    headerLargeTitle: Platform.OS === 'ios' ? true : false, // iOS specific large title
                    // headerRight is now handled by commonHeaderOptions, Bell icon removed
                }}
            />
            <Stack.Screen
                name="profile"
                options={{
                    title: 'Edit Profile',
                }}
            />
            <Stack.Screen
                name="store-settings"
                options={{
                    title: 'Store Settings',
                }}
            />
            <Stack.Screen
                name="app-preferences"
                options={{
                    title: 'Application Preferences',
                }}
            />
        </Stack>
    );
}