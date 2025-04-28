import '~/global.css';

import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform } from 'react-native';
import { NAV_THEME } from '~/lib/constants';
import { useColorScheme } from '~/lib/useColorScheme';
import { PortalHost } from '@rn-primitives/portal';
import { ThemeToggle } from '~/components/ThemeToggle';
import { setAndroidNavigationBar } from '~/lib/android-navigation-bar';
import { Home, Settings, User } from 'lucide-react-native'; 

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Expo Router uses this export to configure the root layout.
export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'home', // Make 'home' the default tab
};


const useIsomorphicLayoutEffect =
  Platform.OS === 'web' && typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

export default function RootLayout() {
  const hasMounted = React.useRef(false);
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);

  useIsomorphicLayoutEffect(() => {
    // Only run logic on initial mount
    if (hasMounted.current) {
      return;
    }

    if (Platform.OS === 'web') {
      // Adds the background color to the html element to prevent white background on overscroll.
      document.documentElement.classList.add('bg-background');
    }
    // Set Android nav bar color based on the detected scheme
    setAndroidNavigationBar(colorScheme);
    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorScheme]); // Depend on colorScheme to re-run if it changes *before* mount


  if (!isColorSchemeLoaded) {
    // Prevent rendering until color scheme is determined
    // You could return a loading indicator here if needed
    return null;
  }

  return (
    <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
      <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          // You can add global tab options here if needed
        }}
      >
        <Tabs.Screen
          name="home" // This now refers to app/home.tsx
          options={{
            title: 'Home', // Changed title
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
            headerRight: () => <ThemeToggle />, // Added ThemeToggle here
            // headerShown: false, // Remove this if you want the header with title/toggle
          }}
        />
        <Tabs.Screen
          name="profile" // This now refers to app/profile.tsx
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="settings" // This now refers to app/settings.tsx
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
          }}
        />
      </Tabs>
      <PortalHost />
    </ThemeProvider>
  );
}