import { Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuthStore } from '~/lib/stores/authStore';
import { useColorScheme } from '~/lib/useColorScheme';
import CustomTabBar from '~/components/CustomTabBar';
import { UserProfileHeaderIcon } from '~/components/UserProfileHeaderIcon';
import DynamicHeaderTitle from '~/components/DynamicHeaderTitle';
import CartDialog from '~/components/screens/sales/CartDialog';

const VIBRANT_HEADER_COLOR = '#f9c00c';
const HEADER_TEXT_ICON_COLOR = '#FFFFFF';

export default function TabsLayout() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
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

  const tabHeaderOptions = {
    headerRight: () => <UserProfileHeaderIcon />,
    headerStyle: {
      backgroundColor: VIBRANT_HEADER_COLOR,
    },
    headerTintColor: HEADER_TEXT_ICON_COLOR,
    headerTitleStyle: {
      color: HEADER_TEXT_ICON_COLOR,
      fontWeight: '600' as '600',
    },
    headerShadowVisible: false,
  };

  return (
    <>
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
            headerTitle: () => <DynamicHeaderTitle />,
            ...tabHeaderOptions,
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: 'Inventory',
            headerShown: false,
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
      </Tabs>
      <CartDialog />
    </>
  );
}