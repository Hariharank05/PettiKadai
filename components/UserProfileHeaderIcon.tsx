// components/UserProfileHeaderIcon.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Pressable, View, Image, ActivityIndicator } from 'react-native';
import { User as UserIcon, LogIn } from 'lucide-react-native'; // Using UserIcon alias
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useAuthStore } from '~/lib/stores/authStore';
import { useColorScheme } from '~/lib/useColorScheme';
import { cn } from '~/lib/utils';
import { Text } from '~/components/ui/text'; // Using your custom Text component
import { getDatabase } from '~/lib/db/database';
import * as FileSystem from 'expo-file-system';

export function UserProfileHeaderIcon() {
  const router = useRouter();
  const { isAuthenticated, userName, userId } = useAuthStore();
  const { isDarkColorScheme } = useColorScheme(); // Though header is now always yellow, this might be useful for future logic
  const isFocused = useIsFocused();

  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const iconColor = '#FFFFFF'; // Always white for yellow header
  const initialsBgColor = 'bg-purple-600'; // Purple background for initials
  const initialsTextColor = 'text-white';

  const fetchProfileImage = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setProfileImageUri(null);
      return;
    }
    setImageLoading(true);
    try {
      const db = getDatabase();
      const user = await db.getFirstAsync<{ profileImage: string | null }>(
        'SELECT profileImage FROM Users WHERE id = ?',
        [userId]
      );
      if (user?.profileImage) {
        const fileInfo = await FileSystem.getInfoAsync(user.profileImage);
        if (fileInfo.exists) {
          setProfileImageUri(user.profileImage);
        } else {
          console.warn('Profile image file not found in UserProfileHeaderIcon:', user.profileImage);
          setProfileImageUri(null);
          // Optionally clear from DB if file is missing
          await db.runAsync('UPDATE Users SET profileImage = NULL WHERE id = ?', [userId]);
        }
      } else {
        setProfileImageUri(null);
      }
    } catch (error) {
      console.error('Failed to fetch profile image for header icon:', error);
      setProfileImageUri(null);
    } finally {
      setImageLoading(false);
    }
  }, [userId, isAuthenticated]);

  useEffect(() => {
    if (isFocused) {
      fetchProfileImage();
    }
  }, [isFocused, fetchProfileImage]);

  const handlePress = () => {
    if (isAuthenticated) {
      router.push('/(tabs)/setting/profile');
    } else {
      router.push('/(auth)/login');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '';
    const words = name.split(' ').filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(userName);

  return (
    <Pressable
      onPress={handlePress}
      className='mr-4 p-0.5 web:ring-offset-background web:transition-colors web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2'
      testID="user-profile-header-icon"
    >
      {({ pressed }) => (
        <View
          className={cn(
            'h-14 w-14 rounded-full justify-center items-center overflow-hidden',
            isAuthenticated && profileImageUri ? '' : initialsBgColor, // Apply purple bg only if no image
            pressed && 'opacity-70'
          )}
        >
          {isAuthenticated ? (
            imageLoading ? (
              <ActivityIndicator size="small" color={iconColor} />
            ) : profileImageUri ? (
              <View className="h-full w-full rounded-full bg-white p-1">
                <Image
                  source={{ uri: profileImageUri }}
                  className="h-full w-full rounded-full"
                  resizeMode="cover"
                />
              </View>
            ) : initials ? (
              <Text className={`text-sm font-semibold ${initialsTextColor}`}>{initials}</Text>
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