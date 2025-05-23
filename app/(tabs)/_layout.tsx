// app/(tabs)/_layout.tsx
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuthStore } from '~/lib/stores/authStore';
// import { ThemeToggle } from '~/components/ThemeToggle';
import { useColorScheme } from '~/lib/useColorScheme';
import CustomTabBar from '~/components/CustomTabBar';
import { UserProfileHeaderIcon } from '~/components/UserProfileHeaderIcon';
export default function TabsLayout() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const { isDarkColorScheme } = useColorScheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChecking(false);
      if (!isAuthenticated && !isLoading) {
        router.replace('/(auth)/login');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, router]);

  if (isChecking || isLoading) {
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
      backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF',
    },
    headerTintColor: isDarkColorScheme ? '#FFFFFF' : '#1F2937',
    headerTitleStyle: {
      color: isDarkColorScheme ? '#FFFFFF' : '#1F2937',
    },
  };

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />} 
      screenOptions={{
        tabBarActiveTintColor: isDarkColorScheme ? '#E5E7EB' : '#1F2937',
        tabBarInactiveTintColor: isDarkColorScheme ? '#6B7280' : '#9CA3AF',
        tabBarStyle: {
          backgroundColor: isDarkColorScheme ? '#1F2937' : '#FFFFFF',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Dashboard', // Title for header
          ...tabHeaderOptions,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory', // Title for header (if stack header is used)
          headerShown: false, // Assuming inventory stack has its own header
        }}
      />
      <Tabs.Screen
        name="sale"
        options={{
          title: 'Sales',
          headerShown: false,
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
          title: 'Settings',
          headerShown: false,
        }}
      />

      {/* Hidden screens (not direct tabs) */}
      <Tabs.Screen name="products" options={{ href: null }} />
      <Tabs.Screen name="category" options={{ href: null }} />
      <Tabs.Screen name="customers" options={{ href: null }} />
      <Tabs.Screen name="sales-management" options={{ href: null }} />
      <Tabs.Screen name="receipts" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}