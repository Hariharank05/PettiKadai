// components/UserProfileHeaderIcon.tsx
import React from 'react';
import { Pressable, View } from 'react-native';
import { User as UserIcon, LogIn } from 'lucide-react-native'; // Using UserIcon alias
import { useRouter } from 'expo-router';
import { useAuthStore } from '~/lib/stores/authStore';
import { useColorScheme } from '~/lib/useColorScheme';
import { cn } from '~/lib/utils';
import { Text } from '~/components/ui/text'; // Using your custom Text component

export function UserProfileHeaderIcon() {
  const router = useRouter();
  const { isAuthenticated, userName } = useAuthStore();
  const { isDarkColorScheme } = useColorScheme();

  // Determine colors based on theme, similar to headerTintColor
  const iconColor = isDarkColorScheme ? '#FFFFFF' : '#1F2937'; 
  const initialsBgColor = isDarkColorScheme ? 'bg-purple-600' : 'bg-purple-500'; // Example: purple for initials
  const initialsTextColor = 'text-white';

  const handlePress = () => {
    if (isAuthenticated) {
      router.push('/(tabs)/setting/profile'); // Navigate to profile screen under setting tab
    } else {
      router.push('/(auth)/login');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '';
    const words = name.split(' ').filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    // Take first char of first word and first char of last word
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(userName);

  return (
    <Pressable
      onPress={handlePress}
      className='mr-4 p-1.5 web:ring-offset-background web:transition-colors web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2'
      testID="user-profile-header-icon"
    >
      {({ pressed }) => (
        <View
          className={cn(
            'h-7 w-7 rounded-full justify-center items-center', // Container for icon/initials
            isAuthenticated && initials && initialsBgColor, // Background if showing initials
            pressed && 'opacity-70'
          )}
        >
          {isAuthenticated ? (
            initials ? (
              <Text className={`text-xs font-semibold ${initialsTextColor}`}>{initials}</Text>
            ) : (
              <UserIcon color={iconColor} size={20} strokeWidth={1.75} />
            )
          ) : (
            <LogIn color={iconColor} size={20} strokeWidth={1.75} />
          )}
        </View>
      )}
    </Pressable>
  );
}