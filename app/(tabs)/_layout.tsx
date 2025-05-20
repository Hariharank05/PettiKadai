// app/(tabs)/_layout.tsx
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuthStore } from '~/lib/stores/authStore';
import { Home, ShoppingBag, User, Settings, ShoppingCart, HistoryIcon, Archive } from 'lucide-react-native'; // Removed UsersIcon, Tag, ClipboardList for now
import { ThemeToggle } from '~/components/ThemeToggle';
import { useColorScheme } from '~/lib/useColorScheme';

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
    headerRight: () => <ThemeToggle />,
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
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          ...tabHeaderOptions,
        }}
      />
      <Tabs.Screen
        name="inventory" // This now points to the inventory stack's _layout
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => <Archive color={color} size={size} />,
          headerShown: false, // The header will be managed by the nested Stack
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
          ...tabHeaderOptions,
        }}
      />
      <Tabs.Screen
        name="receipts"
        options={{
          title: 'Receipts',
          tabBarIcon: ({ color, size }) => <HistoryIcon color={color} size={size} />,
          ...tabHeaderOptions,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          ...tabHeaderOptions,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
          ...tabHeaderOptions,
        }}
      />

      {/* These screens are NOT direct tabs anymore if they are to be part of the inventory stack.
          They will be defined in app/(tabs)/inventory/_layout.tsx
          If they still need to be accessible from *other* tabs directly,
          their `href: null` setup was fine, but they won't get back buttons to the inventory hub then.
          For a clean inventory stack, they should be conceptually moved.
      */}
      <Tabs.Screen name="products" options={{ href: null }} />
      <Tabs.Screen name="category" options={{ href: null }} />
      <Tabs.Screen name="customers" options={{ href: null }} />
      <Tabs.Screen name="ReportsScreen" options={{ href: null }} />
    </Tabs>
  );
}