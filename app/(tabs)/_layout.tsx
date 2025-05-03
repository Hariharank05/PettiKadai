import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '~/lib/stores/authStore';
import { Home, ShoppingBag, User, Settings } from 'lucide-react-native';
import { ThemeToggle } from '~/components/ThemeToggle';

export default function TabsLayout() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  
  // Auth protection - redirect to login if not authenticated
  useEffect(() => {
    // Short timeout to allow auth state to be loaded
    const timer = setTimeout(() => {
      setIsChecking(false);
      if (!isAuthenticated && !isLoading) {
        router.replace('/(auth)/login');
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, router]);
  
  // Show loading indicator while checking auth
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
        tabBarActiveTintColor: 'hsl(var(--primary))',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          headerRight: () => <ThemeToggle />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
          headerRight: () => <ThemeToggle />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          headerRight: () => <ThemeToggle />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
          headerRight: () => <ThemeToggle />,
        }}
      />
    </Tabs>
  );
}