import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '~/lib/stores/authStore';
import { Home, ShoppingBag, User, Settings, ShoppingCart, HistoryIcon } from 'lucide-react-native';
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
          headerRight: () => <ThemeToggle />,
          headerStyle: {
            backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF',
          },
          headerTintColor: isDarkColorScheme ? '#FFFFFF' : '#1F2937',
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Invenrtry',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
          headerRight: () => <ThemeToggle />,
          headerStyle: {
            backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF',
          },
          headerTintColor: isDarkColorScheme ? '#FFFFFF' : '#1F2937',
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
          headerStyle: {
            backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF',
          },
          headerTintColor: isDarkColorScheme ? '#FFFFFF' : '#1F2937',
        }}
      />
      <Tabs.Screen
        name="receipts"
        options={{
          title: 'Receipts',
          tabBarIcon: ({ color, size }) => <HistoryIcon color={color} size={size} />,
          headerRight: () => <ThemeToggle />,
          headerStyle: {
            backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF',
          },
          headerTintColor: isDarkColorScheme ? '#FFFFFF' : '#1F2937',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          headerRight: () => <ThemeToggle />,
          headerStyle: {
            backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF',
          },
          headerTintColor: isDarkColorScheme ? '#FFFFFF' : '#1F2937',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
          headerRight: () => <ThemeToggle />,
          headerStyle: {
            backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF',
          },
          headerTintColor: isDarkColorScheme ? '#FFFFFF' : '#1F2937',
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          // tabBarIcon: ({ color, size }) => <UsersIcon color={color} size={size} />, // We can define an icon
          href: null,
          headerStyle: {
            backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF',
          },
          headerTintColor: isDarkColorScheme ? '#FFFFFF' : '#1F2937',
        }}
      />
      <Tabs.Screen
        name="ReportsScreen"
        options={{
          title: 'Reports',
          href: null,
          headerRight: () => <ThemeToggle />,
        }}
      />
      <Tabs.Screen
        name="category"
        options={{
          title: 'Categories',
          // tabBarIcon: ({ color, size }) => <UsersIcon color={color} size={size} />, // We can define an icon
          href: null,
          headerRight: () => <ThemeToggle />,
          headerStyle: {
            backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF',
          },
          headerTintColor: isDarkColorScheme ? '#FFFFFF' : '#1F2937',
        }}
      />
    </Tabs>
  );
}