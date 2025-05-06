import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '~/lib/stores/authStore';
import { Home, ShoppingBag, User, Settings, ShoppingCart } from 'lucide-react-native';
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
        tabBarActiveTintColor: isDarkColorScheme ? '#E5E7EB' : '#1F2937', // gray-200 for dark, gray-900 for light
        tabBarInactiveTintColor: isDarkColorScheme ? '#6B7280' : '#9CA3AF', // gray-500 for dark, gray-400 for light
        tabBarStyle: {
          backgroundColor: isDarkColorScheme ? '#1F2937' : '#FFFFFF', // gray-900 for dark, white for light
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
            backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF', // gray-900 for dark, gray-800 for light
          },
          headerTintColor: isDarkColorScheme ? '#FFFFFF' : '#1F2937', // White text for contrast
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
          headerRight: () => <ThemeToggle />,
          headerStyle: {
            backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF', // gray-900 for dark, gray-800 for light
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
            backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF', // gray-900 for dark, gray-800 for light
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
            backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF', // gray-900 for dark, gray-800 for light
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
            backgroundColor: isDarkColorScheme ? '#111827' : '#FFFFFF', // gray-900 for dark, gray-800 for light
          },
          headerTintColor: isDarkColorScheme ? '#FFFFFF' : '#1F2937',
        }}
      />
    </Tabs>
  );
}