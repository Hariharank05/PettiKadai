// app/(tabs)/sale/_layout.tsx
import { Stack } from 'expo-router';
// import { ThemeToggle } from '~/components/ThemeToggle'; // Not used
import { UserProfileHeaderIcon } from '~/components/UserProfileHeaderIcon';
// import { useColorScheme } from '~/lib/useColorScheme'; // Not directly needed if colors are hardcoded

const VIBRANT_HEADER_COLOR = '#f9c00c';
const HEADER_TEXT_ICON_COLOR = '#FFFFFF';

export default function SalesStackLayout() {
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
                    title: 'Sales Hub',
                }}
            />
            <Stack.Screen
                name="sales-management"
                options={{
                    title: 'Sales Management',
                }}
            />
            <Stack.Screen
                name="receipts"
                options={{
                    title: 'Receipts History',
                }}
            />
        </Stack>
    );
}