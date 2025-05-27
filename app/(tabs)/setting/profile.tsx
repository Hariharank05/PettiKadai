import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    Platform,
    Image,
    ActivityIndicator,
    // Alert, // Some alerts replaced by toast
    Modal,
    useColorScheme as rnColorScheme,
    Alert, // Kept for informational alerts
} from 'react-native';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { useAuthStore } from '~/lib/stores/authStore';
import { UserCircle, Mail, Phone, Key, Shield, RefreshCcw, Info, EditIcon, Image as GalleryIcon, Trash2, X } from 'lucide-react-native'; // Added X
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getDatabase } from '~/lib/db/database';
import { useColorScheme } from '~/lib/useColorScheme';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChangePasswordModal } from '~/components/screens/settings-components/ChangePasswordModal';
import { LinearGradient } from 'expo-linear-gradient';
import GlobalToaster, { Toaster } from '~/components/toaster/Toaster'; 

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
  ChangePassword: undefined; // If you navigate to a separate screen for this
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

  const [localFormData, setLocalFormData] = useState<UserProfileData>(formData);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
        // Sync local form data when formData prop changes (e.g., when modal opens with new data)
        setLocalFormData(formData);
    }, [formData, visible]);


  const handleLocalInputChange = (field: keyof UserProfileData, value: string | null) => {
    setLocalFormData(prev => ({ ...prev, [field]: value }));
    if (validationError) setValidationError(null); // Clear validation error on input change
  };

  const validateAndSubmit = () => {
    if (!localFormData.name.trim()) {
      setValidationError("Full Name is required.");
      Toaster.warning("Validation Error", { description: "Full Name is required." });
      return;
    }
    // Add more validations if needed (e.g., email format, phone format)
    setValidationError(null);
    setFormData(localFormData); // Update parent state
    onSubmit(); // Call parent submit
  };


  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-4">
        <View className={`w-[90%] max-w-md ${isDarkColorScheme ? 'bg-gray-800' : 'bg-white'} rounded-2xl overflow-hidden`}>
          <View className={`flex-row items-center justify-between p-6 border-b ${isDarkColorScheme ? 'border-gray-700' : 'border-gray-200'}`}>
            <Text className={`text-xl font-bold ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={isDarkColorScheme ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
            <View className="mb-4">
              <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Full Name *</Text>
              <View className={`flex-row items-center ${isDarkColorScheme ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'} border rounded-lg px-4`}>
                <UserCircle size={20} color={isDarkColorScheme ? COLORS.lightPurple : COLORS.primary} />
                <Input
                  className={`flex-1 ml-3 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'} py-3 text-base bg-transparent border-0`}
                  value={localFormData.name}
                  onChangeText={(text) => handleLocalInputChange('name', text)}
                  placeholder="Your Full Name"
                  placeholderTextColor={isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
                />
              </View>
              {validationError && validationError.includes("Full Name") && (
                <Text className="text-red-500 text-sm mt-1">{validationError}</Text>
              )}
            </View>
            <View className="mb-4">
              <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Email</Text>
              <View className={`flex-row items-center ${isDarkColorScheme ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'} border rounded-lg px-4`}>
                <Mail size={20} color={isDarkColorScheme ? COLORS.lightRed : COLORS.danger} />
                <Input
                  className={`flex-1 ml-3 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'} py-3 text-base bg-transparent border-0`}
                  value={localFormData.email || ''}
                  onChangeText={(text) => handleLocalInputChange('email', text)}
                  placeholder="Your Email"
                  placeholderTextColor={isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
            <View className="mb-4">
              <Text className={`text-sm font-medium mb-2 ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Phone</Text>
               <View className={`flex-row items-center ${isDarkColorScheme ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'} border rounded-lg px-4`}>
                <Phone size={20} color={isDarkColorScheme ? COLORS.lightYellow : COLORS.accent} />
                <Input
                  className={`flex-1 ml-3 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'} py-3 text-base bg-transparent border-0`}
                  value={localFormData.phone || ''}
                  onChangeText={(text) => handleLocalInputChange('phone', text)}
                  placeholder="Your Phone Number"
                  placeholderTextColor={isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            </ScrollView>
             <View className={`flex-row gap-3 p-6 border-t ${isDarkColorScheme ? 'border-gray-700' : 'border-gray-200'}`}>
              <Button
                variant="outline"
                onPress={onClose}
                className={`flex-1 py-3 rounded-xl ${isDarkColorScheme ? 'bg-gray-600 border-gray-500' : 'bg-gray-200 border-gray-300'}`}
                 disabled={isLoading}
              >
                <Text className={`font-semibold text-center ${isDarkColorScheme ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</Text>
              </Button>
              <Button
                onPress={validateAndSubmit}
                disabled={isLoading}
                className={`flex-1 py-3 rounded-xl flex-row justify-center items-center`}
                style={{ backgroundColor: isLoading ? (isDarkColorScheme ? COLORS.lightPurple : COLORS.primary+'90') : COLORS.primary }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="font-semibold text-white text-center">Save Changes</Text>
                )}
              </Button>
            </View>
        </View>
      </View>
    </Modal>
  );
};

export default function ProfileScreen({ navigation }: Props) {
  const { userName, userId, logout: authLogout, changeUserPassword, updateAuthStoreUserName } = useAuthStore(); // Renamed logout to authLogout
  const { isDarkColorScheme } = useColorScheme();
  const currentRNColorScheme = rnColorScheme();
  const COLORS = getColors(currentRNColorScheme || 'light');

  const isFocused = useIsFocused();
  const [isLoading, setIsLoading] = useState(false); // General loading for the screen
  const [isProfileUpdating, setIsProfileUpdating] = useState(false); // Specific for profile update action
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
        const fetchedData = {
          name: user.name || userName || 'Store Owner',
          email: user.email,
          phone: user.phone,
          profileImage: user.profileImage,
        };
        setFormData(fetchedData);
        setProfileImage(user.profileImage);

        if (user.profileImage) {
          const fileInfo = await FileSystem.getInfoAsync(user.profileImage);
          if (!fileInfo.exists) {
            console.warn('Profile image file does not exist at path from DB:', user.profileImage);
            setProfileImage(null);
            setFormData(prev => ({ ...prev, profileImage: null }));
            // Clean up DB entry for missing image
            await db.runAsync(
              'UPDATE Users SET profileImage = NULL, updatedAt = ? WHERE id = ?',
              [new Date().toISOString(), userId as string]
            );
            console.log('Cleared missing profile image from database');
          }
        }
      } else {
        console.log('No user found for userId:', userId, 'Setting default form data.');
        const defaultData = { name: userName || 'Store Owner', email: null, phone: null, profileImage: null };
        setFormData(defaultData);
        setProfileImage(null);
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      Toaster.error("Data Load Error", { description: error.message || "Failed to load user data. Please try again." });
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
    setShowImageActionModal(false); // Close action modal first
    if (!userId) {
      Toaster.error("User Error", { description: "User ID not found. Cannot save image." });
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Toaster.warning("Permission Required", { description: "Please grant permission to access photos." });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setIsLoading(true); // Indicate loading while processing image
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
          Toaster.error("Storage Error", { description: "Document directory not found." });
          setIsLoading(false);
          return;
        }

        // Delete old image if it exists and is different
        if (profileImage && profileImage !== permanentUri) {
          try {
            const oldFileInfo = await FileSystem.getInfoAsync(profileImage);
            if (oldFileInfo.exists) {
              await FileSystem.deleteAsync(profileImage, { idempotent: true });
              console.log('Old image file deleted:', profileImage);
            }
          } catch (deleteError) {
            console.error('Error deleting old image file:', deleteError);
            // Non-critical, proceed with new image
          }
        }

        await FileSystem.copyAsync({
          from: tempUri,
          to: permanentUri,
        });
        console.log('Image copied to permanent URI:', permanentUri);

        setProfileImage(permanentUri); // Update UI immediately
        // formData.profileImage will be updated when profile is saved.

        // Save to DB immediately
        try {
          const db = getDatabase();
          await db.runAsync(
            'UPDATE Users SET profileImage = ?, updatedAt = ? WHERE id = ?',
            [permanentUri, new Date().toISOString(), userId]
          );
          console.log('Profile image updated in database.');
          setFormData(prev => ({ ...prev, profileImage: permanentUri })); // Sync formData
          Toaster.success("Image Updated", { description: "Profile picture has been updated." });
        } catch (dbError: any) {
          console.error('Error saving profile image to database:', dbError);
          Toaster.error("Database Error", { description: dbError.message || "Failed to save profile image to database." });
          // Revert UI if DB save fails? For now, UI shows new image but DB might be out of sync.
        }
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Toaster.error("Image Error", { description: error.message || "Failed to pick image. Please ensure you have granted permissions." });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteImage = async () => {
    setShowImageActionModal(false); // Close action modal first
    const currentImageToDelete = profileImage; // Use current state of profileImage

    if (!currentImageToDelete) {
      Toaster.info("No Image", { description: "There is no profile picture to delete." });
      return;
    }
     if (!userId) {
      Toaster.error("User Error", { description: "User not identified. Cannot delete image." });
      return;
    }

    setIsLoading(true); // Indicate loading
    setProfileImage(null); // Optimistically update UI

    if (currentImageToDelete) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(currentImageToDelete);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(currentImageToDelete, { idempotent: true });
          console.log('Image file deleted:', currentImageToDelete);
        } else {
          console.log('Image file to delete does not exist on disk:', currentImageToDelete);
        }
      } catch (error: any) {
        console.error('Error deleting image file:', error);
        // Non-critical for DB update, log and continue
      }
    }

    try {
      const db = getDatabase();
      await db.runAsync(
        'UPDATE Users SET profileImage = NULL, updatedAt = ? WHERE id = ?',
        [new Date().toISOString(), userId as string]
      );
      console.log('Profile image removed from database');
      setFormData(prev => ({ ...prev, profileImage: null })); // Sync formData
      Toaster.success("Image Removed", { description: "Profile picture has been removed." });
    } catch (error: any) {
      console.error('Error removing profile image from database:', error);
      Toaster.error("Database Error", { description: error.message || "Failed to remove profile image from database." });
      setProfileImage(currentImageToDelete); // Revert UI if DB fails
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileImagePress = () => {
    setShowImageActionModal(true);
  };

  const handleUpdateProfile = async () => {
    if (!userId) {
      Toaster.error("User Error", { description: "No user ID found. Cannot update profile." });
      return;
    }
    if (!formData.name.trim()) {
        Toaster.warning("Validation Error", { description: "Full Name is required."});
        return; // Already handled by EditProfileModal's internal validation toast
    }

    setIsProfileUpdating(true); // Use specific loading state for this action
    try {
      const db = getDatabase();
      const profileImageToSave = formData.profileImage ?? null; // Ensure it's null if undefined

      console.log('Updating user profile with data:', { ...formData, userId });

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

      if (userName !== formData.name) { // Only update auth store if name actually changed
        updateAuthStoreUserName(formData.name, userId);
      }

      Toaster.success("Profile Updated", { description: "Your profile has been updated successfully." });
      setIsEditingProfile(false); // Close modal on success
      // Re-fetch data to ensure UI consistency, especially if profileImage was part of formData
      // but not directly set by pickImage/deleteImage (e.g., cleared manually in modal - though not an option now)
      await fetchUserData(); 
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Toaster.error("Update Failed", { description: error.message || "Failed to update profile. Please try again." });
    } finally {
      setIsProfileUpdating(false);
    }
  };

  const handleChangePasswordSubmit = async (currentPass: string, newPass: string) => {
    setChangePasswordLoading(true);
    const result = await changeUserPassword(currentPass, newPass);
    setChangePasswordLoading(false);
    if (result.success) {
      Toaster.success("Password Changed", { description: result.message || 'Password changed successfully!' });
      setIsChangePasswordModalVisible(false);
    } else {
      Toaster.error("Password Change Failed", { description: result.message || 'Failed to change password.' });
    }
    return result;
  };

  if (isLoading && !isFocused) { // Show loading only on initial mount if not focused (prevents flicker on focus)
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
    <LinearGradient colors={[isDarkColorScheme ? COLORS.dark : COLORS.white, isDarkColorScheme ? COLORS.dark : COLORS.yellow]} style={{ flex: 1 }}>
      <View className="flex-1 bg-transparent">
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingTop: Platform.OS === 'android' ? 20 : 40, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Profile Section */}
          <View className="mb-6">
            <Text className={`text-xl font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Profile</Text>

            <View className="flex-row items-center">
              {/* Profile Image */}
              <TouchableOpacity onPress={handleProfileImagePress} className="relative w-20 h-20 mr-4">
                <View className="w-full h-full rounded-full overflow-hidden justify-center items-center bg-gray-300 dark:bg-gray-700 border-2 border-gray-400 dark:border-gray-600">
                  {isLoading && !profileImage ? ( // Show loader if loading and no image yet
                    <ActivityIndicator size="small" color={isDarkColorScheme ? COLORS.gray : COLORS.gray} />
                  ) : profileImage ? (
                    <Image
                      source={{ uri: profileImage }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <UserCircle size={48} color={isDarkColorScheme ? COLORS.gray : COLORS.gray} />
                  )}
                </View>

                <View
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary justify-center items-center border-2"
                  style={{ borderColor: isDarkColorScheme ? COLORS.dark : COLORS.white, backgroundColor: COLORS.primary }}
                >
                  <EditIcon size={14} color="white" />
                </View>
              </TouchableOpacity>

              <View className="flex-1">
                <Text className={`text-2xl font-semibold ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>
                  {formData.name}
                </Text>
                <Text className={`text-sm ${isDarkColorScheme ? 'text-gray-400' : 'text-gray-500'}`}>
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
              iconColor={isDarkColorScheme ? COLORS.lightPurple : COLORS.primary}
            />
            <DisplayField
              icon={Mail}
              label="Email"
              value={formData.email || ''}
              placeholder="Not provided"
              iconColor={isDarkColorScheme ? COLORS.lightRed : COLORS.danger}
            />
            <DisplayField
              icon={Phone}
              label="Phone"
              value={formData.phone || ''}
              placeholder="Not provided"
              iconColor={isDarkColorScheme ? COLORS.lightYellow : COLORS.accent}
            />
            <Button
              onPress={() => {
                // Ensure formData passed to modal is up-to-date
                // EditProfileModal will use its own local state initialized from this
                setFormData(prev => ({ ...prev, name: formData.name, email: formData.email, phone: formData.phone }));
                setIsEditingProfile(true);
              }}
              className="flex-row justify-center items-center py-3.5 rounded-xl mt-4"
              style={{ backgroundColor: COLORS.primary }}
            >
              <EditIcon size={18} color="white" />
              <Text className="ml-2 font-semibold text-white text-base">Edit Profile</Text>
            </Button>
          </View>

          {/* Security */}
          <View className="mb-6">
            <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Security</Text>
            <TouchableOpacity onPress={() => setIsChangePasswordModalVisible(true)}>
              <DisplayField
                icon={Key}
                label="Change Password"
                value={"********"} // Mask password
                placeholder="Tap to change"
                iconColor={isDarkColorScheme ? COLORS.lightBlue : COLORS.secondary}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Security Question', 'This feature will be available in a future update.')}>
              <DisplayField
                icon={Shield}
                label="Security Question"
                value="Not Set"
                placeholder="Tap to set"
                iconColor={isDarkColorScheme ? COLORS.lightBlue : COLORS.secondary}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Account Recovery', 'This feature will be available in a future update.')}>
              <DisplayField
                icon={RefreshCcw}
                label="Account Recovery"
                value="Not Configured"
                placeholder="Tap to configure"
                iconColor={isDarkColorScheme ? COLORS.lightBlue : COLORS.secondary}
              />
            </TouchableOpacity>
          </View>

          {/* App Information */}
          <View className="mb-6">
            <Text className={`text-lg font-bold mb-4 ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>App Information</Text>
            <DisplayField
              icon={Info}
              label="Version"
              value="1.0.2" // Updated version
              placeholder="N/A"
              iconColor={isDarkColorScheme ? COLORS.gray : COLORS.gray}
            />
            <DisplayField
              icon={Info}
              label="Build Date"
              value={`${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')}.${String(new Date().getDate()).padStart(2, '0')}`}
              placeholder="N/A"
              iconColor={isDarkColorScheme ? COLORS.gray : COLORS.gray}
            />
            <TouchableOpacity onPress={() => Alert.alert('About Petti Kadai', 'Petti Kadai is a simple inventory management app for small stores. Developed with ❤️.')}>
              <DisplayField
                icon={Info}
                label="About Petti Kadai"
                value="Tap for details"
                placeholder=""
                iconColor={isDarkColorScheme ? COLORS.gray : COLORS.gray}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Image Action Modal */}
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
                  <X size={24} color={isDarkColorScheme ? '#9CA3AF' : '#6B7280'} />
                </TouchableOpacity>
              </View>
              <View className="p-6">
                <TouchableOpacity
                  className={`flex-row items-center p-4 rounded-lg mb-3 ${isDarkColorScheme ? 'bg-gray-700' : 'bg-gray-50'}`}
                  onPress={pickImage}
                >
                  <GalleryIcon size={20} color={COLORS.primary} />
                  <Text className={`ml-3 font-medium ${isDarkColorScheme ? 'text-white' : 'text-gray-900'}`}>Select New Image</Text>
                </TouchableOpacity>
                {profileImage && ( // Only show delete if there's an image
                  <TouchableOpacity
                    className={`flex-row items-center p-4 rounded-lg mb-3 ${isDarkColorScheme ? 'bg-gray-700' : 'bg-gray-50'}`}
                    onPress={deleteImage}
                  >
                    <Trash2 size={20} color={COLORS.danger} />
                    <Text className={`ml-3 font-medium text-red-600 dark:text-red-500`}>Delete Current Image</Text>
                  </TouchableOpacity>
                )}
                <Button
                  variant="outline"
                  onPress={() => setShowImageActionModal(false)}
                  className={`py-3 rounded-xl mt-2 ${isDarkColorScheme ? 'bg-gray-600 border-gray-500' : 'bg-gray-200 border-gray-300'}`}
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
            // fetchUserData(); // Re-fetch to revert any un-saved changes shown in parent due to direct formData manipulation
          }}
          onSubmit={handleUpdateProfile} // This will be called by EditProfileModal's internal submit
          isLoading={isProfileUpdating} // Pass the specific loading state
          formData={formData} // Pass current formData to initialize modal
          setFormData={setFormData} // Allow modal to update parent formData before submit
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