// app/(tabs)/inventory/_layout.tsx
import { Stack } from 'expo-router';
// import { ThemeToggle } from '~/components/ThemeToggle'; // Not used
import { UserProfileHeaderIcon } from '~/components/UserProfileHeaderIcon';
// import { useColorScheme } from '~/lib/useColorScheme'; // Not directly needed if colors are hardcoded

const VIBRANT_HEADER_COLOR = '#f9c00c';
const HEADER_TEXT_ICON_COLOR = '#FFFFFF';

export default function InventoryStackLayout() {
    // const { isDarkColorScheme } = useColorScheme(); // Not needed if colors are fixed

    const commonHeaderOptions = {
        headerRight: () => <UserProfileHeaderIcon />,
        headerStyle: {
            backgroundColor: VIBRANT_HEADER_COLOR,
        },
        headerTintColor: HEADER_TEXT_ICON_COLOR,
        headerTitleStyle: {
            color: HEADER_TEXT_ICON_COLOR,
            fontWeight: '600' as '600',
        },
        headerBackTitleVisible: false,
        headerShadowVisible: false,
    };

    return (
        <Stack screenOptions={commonHeaderOptions}>
            <Stack.Screen
                name="index" 
                options={{
                    title: 'Inventory Hub',
                }}
            />
            <Stack.Screen
                name="products"
                options={{
                    title: 'Manage Products',
                }}
            />
            <Stack.Screen
                name="category"
                options={{
                    title: 'Categories',
                }}
            />
            <Stack.Screen
                name="customers"
                options={{
                    title: 'Customers',
                }}
            />
        </Stack>
    );
}