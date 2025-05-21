// app/(tabs)/sales/_layout.tsx
import { Stack } from 'expo-router';
import { ThemeToggle } from '~/components/ThemeToggle';
import { useColorScheme } from '~/lib/useColorScheme';

export default function SalesStackLayout() {
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
                name="index" // Corresponds to app/(tabs)/sales/index.tsx
                options={{
                    title: 'Sales Hub',
                }}
            />
            <Stack.Screen
                name="sales-management" // Corresponds to app/(tabs)/sales/point-of-sale.tsx
                options={{
                    title: 'Sales Management',
                }}
            />
            <Stack.Screen
                name="receipts" // Corresponds to app/(tabs)/sales/receipts.tsx
                options={{
                    title: 'Receipts History',
                }}
            />
        </Stack>
    );
}