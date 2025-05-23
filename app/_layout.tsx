import '~/global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform, View, Text, ActivityIndicator } from 'react-native';
import { useColorScheme } from '~/lib/useColorScheme';
import { PortalHost } from '@rn-primitives/portal';
import { setAndroidNavigationBar } from '~/lib/android-navigation-bar';
import { NAV_THEME } from '~/lib/constants';
import { useAuthStore } from '~/lib/stores/authStore';
import { initDatabase } from '~/lib/db/database';
// Uncomment for development testing (don't use in production)
// import { seedDatabase, loginWithTestUser } from '~/lib/utils/dbSeeder';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Ensure the splash screen is displayed first
export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(splash)',
};

const useIsomorphicLayoutEffect =
  Platform.OS === 'web' && typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

export default function RootLayout() {
  const hasMounted = React.useRef(false);
  const { colorScheme, isDarkColorScheme, setColorScheme } = useColorScheme(); // Added setColorScheme
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);
  const [isDbInitialized, setIsDbInitialized] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(true);
  const initializeAuth = useAuthStore(state => state.initialize); // Renamed to avoid conflict

  // Initialize database and auth state
  React.useEffect(() => {
    const setupApp = async () => {
      try {
        // Initialize database
        await initDatabase();
        setIsDbInitialized(true);
        
        // For development testing (uncomment to seed database with test data)
        // await seedDatabase();
        // await loginWithTestUser();
        
        // Initialize auth state
        await initializeAuth();
        
        setIsInitializing(false);
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsInitializing(false);
      }
    };
    
    setupApp();
  }, [initializeAuth]);

  useIsomorphicLayoutEffect(() => {
    // Only run logic on initial mount
    if (hasMounted.current) {
      setAndroidNavigationBar(colorScheme);
      return;
    }

    if (Platform.OS === 'web') {
      // Adds the background color to the html element to prevent white background on overscroll.
      document.documentElement.classList.add('bg-background');
    }
    setColorScheme('light'); 
    setAndroidNavigationBar('light'); // Set nav bar for light theme initially

    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
    
  }, [colorScheme, setColorScheme]); // Depend on colorScheme and setColorScheme

  if (isInitializing || !isColorSchemeLoaded) {
    // Initial loading screen
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="hsl(var(--primary))" />
        <Text className="mt-4 text-foreground">
          {isDbInitialized ? 'Starting app...' : 'Initializing database...'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <PortalHost />
    </>
  );
}