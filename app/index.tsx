import { Image, View, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '~/lib/stores/authStore';
import { Text } from '~/components/ui/text';
import { initDatabase } from '~/lib/db/database';

export default function SplashScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, initialize } = useAuthStore();
  const [dbInitialized, setDbInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize database and auth state
  useEffect(() => {
    const setup = async () => {
      try {
        // First, initialize the database
        await initDatabase();
        setDbInitialized(true);
        
        // Then, initialize auth state
        await initialize();
        
        // Set loading to false after some delay for a better splash experience
        setTimeout(() => {
          setIsLoading(false);
        }, 2000);
      } catch (error) {
        console.error('Setup error:', error);
        setIsLoading(false);
      }
    };
    
    setup();
  }, [initialize]);
  
  // Handle navigation based on auth state
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isLoading, isAuthenticated, router]);
  
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <View className="items-center">
        <Image
          source={require('../assets/images/splash.png')}
          style={{ width: 200, height: 200 }}
          resizeMode="contain"
        />
        <Text className="text-2xl font-bold mt-4 text-foreground">Petti Kadai</Text>
        <Text className="text-sm text-muted-foreground mt-2">Simple Inventory Management</Text>
        
        <View className="mt-8">
          <ActivityIndicator size="large" color="hsl(var(--primary))" />
          <Text className="text-sm text-muted-foreground mt-2">
            {!dbInitialized ? 'Initializing...' : 'Loading your store...'}
          </Text>
        </View>
      </View>
    </View>
  );
}
