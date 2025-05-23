// components/DynamicHeaderTitle.tsx
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Text } from '~/components/ui/text';
import { useAuthStore } from '~/lib/stores/authStore';
import { getDatabase } from '~/lib/db/database';
import { format } from 'date-fns';

const DynamicHeaderTitle: React.FC = () => {
  const { userName, userId } = useAuthStore();
  const [title, setTitle] = useState<string>(`Welcome, ${userName || 'User'}!`);
  const [storeName, setStoreName] = useState<string>('Petti Kadai'); // Default store name

  useEffect(() => {
    const fetchStoreName = async () => {
      if (userId) {
        try {
          const db = getDatabase();
          // Try user-specific settings first
          let settings = await db.getFirstAsync<{ storeName: string }>(
            'SELECT storeName FROM Settings WHERE userId = ? AND id = ?', // id should be userId for user-specific
            [userId, userId]
          );
          if (!settings?.storeName) {
            // Fallback to global app_settings
            settings = await db.getFirstAsync<{ storeName: string }>(
              'SELECT storeName FROM Settings WHERE id = "app_settings"'
            );
          }
          if (settings?.storeName) {
            setStoreName(settings.storeName);
          }
        } catch (error) {
          console.error("Failed to fetch store name for header:", error);
          // Keep default storeName
        }
      }
    };

    fetchStoreName();
  }, [userId]);

  useEffect(() => {
    // Initial welcome message
    setTitle(`Welcome, ${userName || 'User'}!`);

    const timer = setTimeout(() => {
      const currentDate = format(new Date(), 'MMMM d, yyyy');
      setTitle(`${storeName} - ${currentDate}`);
    }, 4000); // Display welcome for 4 seconds

    return () => clearTimeout(timer);
  }, [userName, storeName]);

  return (
    <View>
      <Text className="text-lg font-semibold" style={{ color: '#FFFFFF' }} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
    </View>
  );
};

export default DynamicHeaderTitle;