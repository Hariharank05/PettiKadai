import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Platform, Image, ActivityIndicator, Alert, Modal, useColorScheme as rnColorScheme } from 'react-native';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { useAuthStore } from '~/lib/stores/authStore';
import { UserCircle, Mail, Phone, Key, Shield, RefreshCcw, Info, EditIcon, Image as GalleryIcon, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getDatabase } from '~/lib/db/database';
import { useColorScheme } from '~/lib/useColorScheme';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChangePasswordModal } from '~/components/screens/settings-components/ChangePasswordModal';
import { LinearGradient } from 'expo-linear-gradient';

// Define the color palette based on theme
export const getColors = (colorScheme: 'light' | 'dark') => ({
  primary: colorScheme === 'dark' ? '#a855f7' : '#7200da',
  secondary: colorScheme === 'dark' ? '#22d3ee' : '#00b9f1',
  accent: '#f9c00c',
  danger: colorScheme === 'dark' ? '#ff4d4d' : '#f9320c',
  lightPurple: colorScheme === 'dark' ? '#4b2e83' : '#e9d5ff',
  lightBlue: colorScheme === 'dark' ? '#164e63' : '#d0f0ff',
  lightYellow: colorScheme === 'dark' ? '#854d0e' : '#fff3d0',
  lightRed: colorScheme === 'dark' ? '#7f1d1d' : '#ffe5e0',
  white: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
  dark: colorScheme === 'dark' ? '#e5e7eb' : '#1a1a1a',
  gray: colorScheme === 'dark' ? '#9ca3af' : '#666',
  border: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
  yellow: colorScheme === 'dark' ? '#f9c00c' : '#f9c00c',
});

type RootStackParamList = {
  Profile: undefined;
  ChangePassword: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

interface UserProfileData {
  name: string;
  email: string | null;
  phone: string | null;
  profileImage?: string | null;
}

// DisplayField component
const DisplayField = ({ icon: Icon, label, value, placeholder, iconColor }: {
  icon: any;
  label: string;
  value: string | number;
  placeholder: string;
  iconColor: string;
}) => {
  const { isDarkColorScheme } = useColorScheme();
  return (
    <View className={`${isDarkColorScheme ? 'bg-gray-900' : 'bg-white'} rounded-xl p-4 mb-3 border ${isDarkColorScheme ? 'border-gray-800' : 'border-gray-200'}`}>
      <View className="flex-row items-center">
        <Icon size={20} color={iconColor} />
        <View className="ml-3 flex-1">
          <Text className={`text-sm ${isDarkColorScheme ? 'text-gray-400' : 'text-gray-600'}`}>{label}</Text>
          <Text className={`text-base font-medium ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>
            {typeof value === 'number' ? value.toString() : (value || placeholder)}
          </Text>
        </View>
      </View>
    </View>
  );
};

// New EditProfileModal component
const EditProfileModal = ({
  visible,
  onClose,
  onSubmit,
  isLoading,
  formData,
  setFormData,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  formData: UserProfileData;
  setFormData: React.Dispatch<React.SetStateAction<UserProfileData>>;
}) => {
  const { isDarkColorScheme } = useColorScheme();
  const currentRNColorScheme = rnColorScheme();
  const COLORS = getColors(currentRNColorScheme || 'light');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-4">
        <View className={`w-[85%] ${isDarkColorScheme ? 'bg-gray-800' : 'bg-white'} rounded-2xl overflow-hidden`}>
          <View className={`flex-row items-center justify-between p-6 border-b ${isDarkColorScheme ? 'border-gray-700' : 'border-gray-200'}`}>
            <Text className={`text-xl font-bold ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Trash2 size={24} color={isDarkColorScheme ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          </View>
          <View className="p-6">
            <View className="mb-4">
              <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Full Name *</Text>
              <View className="flex-row items-center">
                <UserCircle size={20} color="#4F46E5" />
                <Input
                  className={`flex-1 ml-3 ${isDarkColorScheme ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border rounded-lg px-4 py-3 text-base`}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Your Full Name"
                  placeholderTextColor={isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
                />
              </View>
            </View>
            <View className="mb-4">
              <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Email</Text>
              <View className="flex-row items-center">
                <Mail size={20} color="#DC2626" />
                <Input
                  className={`flex-1 ml-3 ${isDarkColorScheme ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border rounded-lg px-4 py-3 text-base`}
                  value={formData.email || ''}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="Your Email"
                  placeholderTextColor={isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
            <View className="mb-4">
              <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Phone</Text>
              <View className="flex-row items-center">
                <Phone size={20} color="#EA580C" />
                <Input
                  className={`flex-1 ml-3 ${isDarkColorScheme ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border rounded-lg px-4 py-3 text-base`}
                  value={formData.phone || ''}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Your Phone Number"
                  placeholderTextColor={isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <View className="flex-row gap-3 mt-2">
              {/* Cancel Button */}
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-600"
              >
                <Text className="font-semibold text-center text-gray-700 dark:text-gray-300">Cancel</Text>
              </TouchableOpacity>

              {/* Save Button */}
              <TouchableOpacity
                onPress={onSubmit}
                disabled={isLoading}
                className={`flex-1 py-3 rounded-xl flex-row justify-center items-center ${isLoading ? 'bg-purple-800' : 'bg-purple-900'}`}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="font-semibold text-white text-center">Save</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function ProfileScreen({ navigation }: Props) {
  const { userName, userId, changeUserPassword } = useAuthStore();
  const { isDarkColorScheme } = useColorScheme();
  const currentRNColorScheme = rnColorScheme();
  const COLORS = getColors(currentRNColorScheme || 'light');

  const isFocused = useIsFocused();
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showImageActionModal, setShowImageActionModal] = useState(false);
  const [isChangePasswordModalVisible, setIsChangePasswordModalVisible] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [formData, setFormData] = useState<UserProfileData>({
    name: userName || 'Store Owner',
    email: null,
    phone: null,
    profileImage: null,
  });

  const fetchUserData = useCallback(async () => {
    if (!userId) {
      console.log('No userId found, skipping fetchUserData');
      setFormData({ name: userName || 'Store Owner', email: null, phone: null, profileImage: null });
      setProfileImage(null);
      return;
    }

    setIsLoading(true);
    try {
      const db = getDatabase();
      console.log('Fetching user data for userId:', userId);
      const user = await db.getFirstAsync<{ name: string; email: string | null; phone: string | null; profileImage: string | null }>(
        'SELECT name, email, phone, profileImage FROM Users WHERE id = ?',
        [userId]
      );

      if (user) {
        console.log('User data fetched:', user);
        setFormData({
          name: user.name || userName || 'Store Owner',
          email: user.email,
          phone: user.phone,
          profileImage: user.profileImage,
        });
        setProfileImage(user.profileImage);

        if (user.profileImage) {
          const fileInfo = await FileSystem.getInfoAsync(user.profileImage);
          if (!fileInfo.exists) {
            console.warn('Profile image file does not exist at path from DB:', user.profileImage);
            setProfileImage(null);
            setFormData(prev => ({ ...prev, profileImage: null }));
            await db.runAsync(
              'UPDATE Users SET profileImage = NULL, updatedAt = ? WHERE id = ?',
              [new Date().toISOString(), userId as string]
            );
            console.log('Cleared missing profile image from database');
          }
        }
      } else {
        console.log('No user found for userId:', userId, 'Setting default form data.');
        setFormData({ name: userName || 'Store Owner', email: null, phone: null, profileImage: null });
        setProfileImage(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load user data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, userName]);

  useEffect(() => {
    if (isFocused) {
      console.log('ProfileScreen focused, fetching user data');
      fetchUserData();
    }
  }, [isFocused, fetchUserData]);

  const pickImage = async () => {
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Cannot save image.');
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "You've refused to allow this app to access your photos!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const tempUri = result.assets[0].uri;
        console.log('Image picked, temporary URI:', tempUri);

        const fileName = `profileImage_${userId}_${Date.now()}.jpg`;
        const permanentUri = `${FileSystem.documentDirectory}${fileName}`;

        const docDir = FileSystem.documentDirectory;
        if (docDir) {
          const dirInfo = await FileSystem.getInfoAsync(docDir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(docDir, { intermediates: true });
          }
        } else {
          Alert.alert("Storage Error", "Document directory not found.");
          return;
        }

        await FileSystem.copyAsync({
          from: tempUri,
          to: permanentUri,
        });
        console.log('Image copied to permanent URI:', permanentUri);

        if (profileImage && profileImage !== permanentUri) {
          try {
            const oldFileInfo = await FileSystem.getInfoAsync(profileImage);
            if (oldFileInfo.exists) {
              await FileSystem.deleteAsync(profileImage, { idempotent: true });
              console.log('Old image file deleted:', profileImage);
            }
          } catch (deleteError) {
            console.error('Error deleting old image file:', deleteError);
          }
        }

        setProfileImage(permanentUri);
        setFormData(prev => ({ ...prev, profileImage: permanentUri }));

        try {
          const db = getDatabase();
          await db.runAsync(
            'UPDATE Users SET profileImage = ?, updatedAt = ? WHERE id = ?',
            [permanentUri, new Date().toISOString(), userId]
          );
          console.log('Profile image updated in database immediately.');
        } catch (dbError) {
          console.error('Error saving profile image to database:', dbError);
          Alert.alert('Error', 'Failed to save profile image. It might not persist.');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please ensure you have granted permissions.');
    } finally {
      setShowImageActionModal(false);
    }
  };

  const deleteImage = async () => {
    const currentImageToDelete = profileImage;

    setProfileImage(null);
    setFormData(prev => ({ ...prev, profileImage: null }));

    if (currentImageToDelete) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(currentImageToDelete);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(currentImageToDelete, { idempotent: true });
          console.log('Image file deleted:', currentImageToDelete);
        } else {
          console.log('Image file to delete does not exist:', currentImageToDelete);
        }
      } catch (error: any) {
        console.error('Error deleting image file:', error);
      }
    }

    if (!userId) {
      console.log('No userId found, cannot remove profile image from database');
      Alert.alert('Error', 'User not identified.');
      return;
    }

    try {
      const db = getDatabase();
      await db.runAsync(
        'UPDATE Users SET profileImage = NULL, updatedAt = ? WHERE id = ?',
        [new Date().toISOString(), userId as string]
      );
      console.log('Profile image removed from database');
    } catch (error) {
      console.error('Error removing profile image from database:', error);
      Alert.alert('Error', 'Failed to remove profile image from database.');
    } finally {
      setShowImageActionModal(false);
    }
  };

  const handleProfileImagePress = () => {
    setShowImageActionModal(true);
  };

  const handleUpdateProfile = async () => {
    if (!userId) {
      Alert.alert('Error', 'No user ID found. Cannot update profile.');
      return;
    }

    setIsLoading(true);
    try {
      const db = getDatabase();
      const profileImageToSave = formData.profileImage ?? null;

      console.log('Updating user profile with data:', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        profileImage: profileImageToSave,
        userId,
      });

      await db.runAsync(
        'UPDATE Users SET name = ?, email = ?, phone = ?, profileImage = ?, updatedAt = ? WHERE id = ?',
        [
          formData.name,
          formData.email || null,
          formData.phone || null,
          profileImageToSave,
          new Date().toISOString(),
          userId as string,
        ]
      );

      if (userName !== formData.name) {
        useAuthStore.getState().updateAuthStoreUserName(formData.name, userId);
      }

      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (currentPass: string, newPass: string) => {
    setChangePasswordLoading(true);
    const result = await changeUserPassword(currentPass, newPass);
    setChangePasswordLoading(false);
    if (result.success) {
      Alert.alert('Success', result.message || 'Password changed successfully!');
      setIsChangePasswordModalVisible(false);
    } else {
      Alert.alert('Error', result.message || 'Failed to change password.');
    }
    return result;
  };

  if (isLoading && !profileImage && !formData.email) {
    return (
      <LinearGradient colors={[COLORS.white, COLORS.yellow]} style={{ flex: 1 }}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className={`mt-4 text-lg font-medium ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-600'}`}>
            Loading Profile...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.white, COLORS.yellow]} style={{ flex: 1 }}>
      <View className="flex-1 bg-transparent">
        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Profile Section */}
          <View className="mb-6">
            <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Profile</Text>

            <View className="flex-row items-center">
              {/* Profile Image */}
              <TouchableOpacity onPress={handleProfileImagePress} className="relative w-20 h-20 mr-4">
                <View className="w-full h-full rounded-full overflow-hidden justify-center items-center bg-gray-200 dark:bg-gray-800">
                  {isLoading && !profileImage ? (
                    <ActivityIndicator size="small" color={isDarkColorScheme ? '#8E8E93' : '#666666'} />
                  ) : profileImage ? (
                    <Image
                      source={{ uri: profileImage }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <UserCircle size={80} color={isDarkColorScheme ? '#8E8E93' : '#666666'} />
                  )}
                </View>

                {/* Edit Icon */}
                <View
                  className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-white justify-center items-center border-2"
                  style={{ borderColor: isDarkColorScheme ? '#000000' : '#FFFFFF' }}
                >
                  <EditIcon size={12} color="purple" />
                </View>
              </TouchableOpacity>

              {/* Name and Account Info */}
              <View className="flex-1">
                <Text className={`text-xl font-semibold ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>
                  {formData.name}
                </Text>
                <Text className={`text-sm ${isDarkColorScheme ? 'text-gray-400' : 'text-gray-600'}`}>
                  Account ID: {userId ? userId.substring(0, 8).toUpperCase() : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Personal Information */}
          <View className="mb-6">
            <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Personal Information</Text>
            <DisplayField
              icon={UserCircle}
              label="Full Name"
              value={formData.name}
              placeholder="Not provided"
              iconColor="#4F46E5"
            />
            <DisplayField
              icon={Mail}
              label="Email"
              value={formData.email || ''}
              placeholder="Not provided"
              iconColor="#DC2626"
            />
            <DisplayField
              icon={Phone}
              label="Phone"
              value={formData.phone || ''}
              placeholder="Not provided"
              iconColor="#EA580C"
            />
            <Button
              onPress={() => setIsEditingProfile(true)}
              className="flex-row justify-center items-center py-4 rounded-xl mt-4"
              style={{ backgroundColor: COLORS.primary }}
            >
              <EditIcon size={20} color="white" />
              <Text className="ml-2 font-semibold text-white">Edit Profile</Text>
            </Button>
          </View>

          {/* Security */}
          <View className="mb-6">
            <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Security</Text>
            <TouchableOpacity onPress={() => setIsChangePasswordModalVisible(true)}>
              <DisplayField
                icon={Key}
                label="Change Password"
                value=""
                placeholder="Tap to change"
                iconColor="#0891B2"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Security Question', 'This feature will be available in a future update.')}>
              <DisplayField
                icon={Shield}
                label="Security Question"
                value=""
                placeholder="Tap to set"
                iconColor="#0891B2"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Account Recovery', 'This feature will be available in a future update.')}>
              <DisplayField
                icon={RefreshCcw}
                label="Account Recovery"
                value=""
                placeholder="Tap to configure"
                iconColor="#0891B2"
              />
            </TouchableOpacity>
          </View>

          {/* App Information */}
          <View className="mb-6">
            <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>App Information</Text>
            <DisplayField
              icon={Info}
              label="Version"
              value="1.0.0"
              placeholder="N/A"
              iconColor="#D97706"
            />
            <DisplayField
              icon={Info}
              label="Build"
              value={`${new Date().getFullYear()}.${new Date().getMonth() + 1}.${new Date().getDate()}`}
              placeholder="N/A"
              iconColor="#D97706"
            />
            <TouchableOpacity onPress={() => Alert.alert('About', 'Petti Kadai is a simple inventory management app for small stores.')}>
              <DisplayField
                icon={Info}
                label="About Petti Kadai"
                value=""
                placeholder="Tap for details"
                iconColor="#D97706"
              />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal
          visible={showImageActionModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowImageActionModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center px-4">
            <View className={`w-[85%] ${isDarkColorScheme ? 'bg-gray-800' : 'bg-white'} rounded-2xl overflow-hidden`}>
              <View className={`flex-row items-center justify-between p-6 border-b ${isDarkColorScheme ? 'border-gray-700' : 'border-gray-200'}`}>
                <Text className={`text-xl font-bold ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Profile Picture</Text>
                <TouchableOpacity onPress={() => setShowImageActionModal(false)}>
                  <Trash2 size={24} color={isDarkColorScheme ? '#9CA3AF' : '#6B7280'} />
                </TouchableOpacity>
              </View>
              <View className="p-6">
                <TouchableOpacity
                  className={`flex-row items-center p-4 rounded-lg mb-3 ${isDarkColorScheme ? 'bg-gray-700' : 'bg-gray-50'}`}
                  onPress={pickImage}
                >
                  <GalleryIcon size={20} color={COLORS.primary} />
                  <Text className={`ml-3 font-medium ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Select Image</Text>
                </TouchableOpacity>
                {profileImage && (
                  <TouchableOpacity
                    className={`flex-row items-center p-4 rounded-lg mb-3 ${isDarkColorScheme ? 'bg-gray-700' : 'bg-gray-50'}`}
                    onPress={deleteImage}
                  >
                    <Trash2 size={20} color={COLORS.danger} />
                    <Text className={`ml-3 font-medium text-red-500`}>Delete Image</Text>
                  </TouchableOpacity>
                )}
                <Button
                  onPress={() => setShowImageActionModal(false)}
                  className={`py-3 rounded-xl ${isDarkColorScheme ? 'bg-gray-600' : 'bg-gray-200'}`}
                >
                  <Text className={`font-semibold text-center ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</Text>
                </Button>
              </View>
            </View>
          </View>
        </Modal>

        <EditProfileModal
          visible={isEditingProfile}
          onClose={() => {
            setIsEditingProfile(false);
            fetchUserData();
          }}
          onSubmit={handleUpdateProfile}
          isLoading={isLoading}
          formData={formData}
          setFormData={setFormData}
        />

        <ChangePasswordModal
          visible={isChangePasswordModalVisible}
          onClose={() => setIsChangePasswordModalVisible(false)}
          onSubmit={handleChangePasswordSubmit}
          isLoading={changePasswordLoading}
        />
      </View>
    </LinearGradient>
  );
}