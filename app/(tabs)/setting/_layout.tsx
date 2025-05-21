// app/(tabs)/settings/_layout.tsx
import { Stack } from 'expo-router';
import { ThemeToggle } from '~/components/ThemeToggle';
import { useColorScheme } from '~/lib/useColorScheme';

export default function SettingsStackLayout() {
    const { isDarkColorScheme } = useColorScheme();

    const commonHeaderOptions = {
        headerRight: () => <ThemeToggle />,
        headerStyle: {
            backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF',
        },
        headerTintColor: isDarkColorScheme ? '#FFFFFF' : '#1F2937',
        headerTitleStyle: {
            color: isDarkColorScheme ? '#FFFFFF' : '#1F2937',
        },
        headerBackTitleVisible: false,
    };

    return (
        <Stack screenOptions={commonHeaderOptions}>
            <Stack.Screen
                name="index" // Corresponds to app/(tabs)/settings/index.tsx
                options={{
                    title: 'Settings',
                }}
            />
            <Stack.Screen
                name="profile" // Corresponds to app/(tabs)/settings/profile.tsx
                options={{
                    title: 'Profile',
                }}
            />
            {/* Add other settings-related screens here if needed in the future */}
        </Stack>
    );
}