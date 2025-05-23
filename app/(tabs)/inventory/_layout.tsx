// app/(tabs)/inventory/_layout.tsx
import { Stack } from 'expo-router';
import { ThemeToggle } from '~/components/ThemeToggle';
import { UserProfileHeaderIcon } from '~/components/UserProfileHeaderIcon';
import { useColorScheme } from '~/lib/useColorScheme';

export default function InventoryStackLayout() {
    const { isDarkColorScheme } = useColorScheme();

    const commonHeaderOptions = {
        headerRight: () => <UserProfileHeaderIcon />,
        headerStyle: {
            backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF',
        },
        headerTintColor: isDarkColorScheme ? '#FFFFFF' : '#1F2937', // For back arrow and title if not overridden
        headerTitleStyle: {
            color: isDarkColorScheme ? '#FFFFFF' : '#1F2937',
        },
        headerBackTitleVisible: false,
    };

    return (
        <Stack screenOptions={commonHeaderOptions}>
            <Stack.Screen
                name="index" // This will correspond to app/(tabs)/inventory/index.tsx
                options={{
                    title: 'Inventory Hub', // Or just 'Inventory'
                    // No headerRight here if you want it consistent with other stack screens
                    // or you can override commonHeaderOptions if needed.
                }}
            />
            <Stack.Screen
                name="products" // Corresponds to app/(tabs)/inventory/products.tsx (if moved)
                // OR if you keep products.tsx at app/(tabs)/products.tsx,
                // Expo Router might still pick it up due to file-based routing,
                // but it's cleaner to co-locate.
                // For this example, I'll assume we're referencing the existing top-level one.
                options={{
                    title: 'Manage Products',
                }}
            />
            <Stack.Screen
                name="category" // Corresponds to app/(tabs)/inventory/category.tsx (if moved)
                options={{
                    title: 'Categories',
                }}
            />
            <Stack.Screen
                name="customers" // Corresponds to app/(tabs)/inventory/customers.tsx (if moved)
                options={{
                    title: 'Customers',
                }}
            />
        </Stack>
    );
}