// app/(tabs)/_layout.tsx
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuthStore } from '~/lib/stores/authStore';
// import { ThemeToggle } from '~/components/ThemeToggle';
import { useColorScheme } from '~/lib/useColorScheme';
import CustomTabBar from '~/components/CustomTabBar';
import { UserProfileHeaderIcon } from '~/components/UserProfileHeaderIcon';
import DynamicHeaderTitle from '~/components/DynamicHeaderTitle'; // Import the new component

const VIBRANT_HEADER_COLOR = '#f9c00c'; // Tab bar color
const HEADER_TEXT_ICON_COLOR = '#FFFFFF'; // White for text and icons on yellow header

export default function TabsLayout() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore(); // Renamed isLoading to authLoading
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // Renamed isLoading to isCheckingAuth
  const { isDarkColorScheme } = useColorScheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCheckingAuth(false);
      if (!isAuthenticated && !authLoading) {
        router.replace('/(auth)/login');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, authLoading, router]);

  if (isCheckingAuth || authLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="hsl(var(--primary))" />
        <Text className="mt-4 text-muted-foreground">Loading your account...</Text>
      </View>
    );
  }

  // Common header options for top-level tabs
  const tabHeaderOptions = {
    headerRight: () => <UserProfileHeaderIcon />,
    headerStyle: {
      backgroundColor: VIBRANT_HEADER_COLOR,
    },
    headerTintColor: HEADER_TEXT_ICON_COLOR, // For back arrow and default title color
    headerTitleStyle: {
      color: HEADER_TEXT_ICON_COLOR, // For title text
      fontWeight: '600' as '600',
    },
    headerShadowVisible: false, // Optional: remove shadow if desired for flat look
  };

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />} 
      screenOptions={{
        // Tab bar specific styling, not header
        tabBarActiveTintColor: isDarkColorScheme ? '#E5E7EB' : '#1F2937',
        tabBarInactiveTintColor: isDarkColorScheme ? '#6B7280' : '#9CA3AF',
        tabBarStyle: {
          backgroundColor: isDarkColorScheme ? '#1F2937' : '#FFFFFF', // This is for the tab bar itself, not the header
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          // title: 'Dashboard', // Replaced by DynamicHeaderTitle
          headerTitle: () => <DynamicHeaderTitle />,
          ...tabHeaderOptions,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory', // Title for header (if stack header is used)
          headerShown: false, // Inventory stack has its own header
        }}
      />
      <Tabs.Screen
        name="sale"
        options={{
          title: 'Sales', // Default title for the stack
          headerShown: false, // Sales stack has its own header
        }}
      />
      <Tabs.Screen
        name="ReportsScreen"
        options={{
          title: 'Reports',
          ...tabHeaderOptions,
        }}
      />
      <Tabs.Screen
        name="setting"
        options={{
          title: 'Settings', // Default title for the stack
          headerShown: false, // Settings stack has its own header
        }}
      />

      {/* Hidden screens (not direct tabs) */}
      {/* <Tabs.Screen name="products" options={{ href: null }} />
      <Tabs.Screen name="category" options={{ href: null }} />
      <Tabs.Screen name="customers" options={{ href: null }} />
      <Tabs.Screen name="sales-management" options={{ href: null }} />
      <Tabs.Screen name="receipts" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} /> */}
    </Tabs>
  );
}