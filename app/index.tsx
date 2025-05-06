import { Image, View, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '~/lib/stores/authStore';
import { Text } from '~/components/ui/text';
import { initDatabase } from '~/lib/db/database';
import { testDatabaseConnection } from '~/lib/utils/dbTestUtil';

export default function SplashScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, initialize } = useAuthStore();
  const [dbInitialized, setDbInitialized] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize database and auth state
  useEffect(() => {
    const setup = async () => {
      try {
        // First, initialize the database
        await initDatabase();
        setDbInitialized(true);
        
        // Test database connection
        const testResult = await testDatabaseConnection();
        setDbStatus(testResult);
        
        if (!testResult.success) {
          setError(`Database error: ${testResult.message}`);
          console.error('Database test failed:', testResult);
          setIsLoading(false);
          return;
        }
        
        // Initialize auth state
        await initialize();
        
        // Set loading to false after some delay for a better splash experience
        setTimeout(() => {
          setIsLoading(false);
        }, 2000);
      } catch (error) {
        console.error('Setup error:', error);
        setError(`Setup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };
    
    setup();
  }, [initialize]);
  
  // Handle navigation based on auth state
  useEffect(() => {
    if (!isLoading && !error) {
      if (isAuthenticated) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isLoading, isAuthenticated, router, error]);
  
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <View className="items-center">
        <Image
          source={require('../assets/images/petti-kadai-icon.png')}
          style={{ width: 120, height: 120 }}
          resizeMode="contain"
        />
        <Text className="text-2xl font-bold mt-4 text-foreground">Petti Kadai</Text>
        <Text className="text-sm text-muted-foreground mt-2">Simple Inventory Management</Text>
        
        <View className="mt-8">
          <ActivityIndicator size="large" color="hsl(var(--primary))" />
          <Text className="text-sm text-muted-foreground mt-2 text-center">
            {!dbInitialized ? 'Initializing database...' : 
             error ? 'Error encountered' : 'Loading your store...'}
          </Text>
          
          {dbStatus && (
            <Text className="text-xs text-muted-foreground mt-1">
              {dbStatus.success ? '✓ Database connected' : '✗ Database error'}
            </Text>
          )}
          
          {error && (
            <View className="mt-4 p-3 bg-destructive/10 rounded-md max-w-xs">
              <Text className="text-destructive text-center text-sm">{error}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}