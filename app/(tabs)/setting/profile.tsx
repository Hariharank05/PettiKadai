import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Platform, Image, ActivityIndicator, Alert, Modal } from 'react-native';
import { Text } from '~/components/ui/text';
import { Separator } from '~/components/ui/separator';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { useAuthStore } from '~/lib/stores/authStore';
import { UserCircle, Mail, Phone, Key, Shield, RefreshCcw, Info, ChevronRight, EditIcon, Image as GalleryIcon, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getDatabase } from '~/lib/db/database';
import { useColorScheme } from '~/lib/useColorScheme';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChangePasswordModal } from '~/components/screens/settings-components/ChangePasswordModal';

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

const ListItem: React.FC<{
  icon: React.ReactElement;
  label: string;
  onPress?: () => void;
  showChevron?: boolean;
  customRightContent?: React.ReactNode;
  isFirst?: boolean;
  isLast?: boolean;
}> = ({ icon, label, onPress, showChevron = true, customRightContent, isFirst, isLast }) => (
  <TouchableOpacity
    onPress={onPress}
    className={`flex-row items-center bg-card active:opacity-70 h-[50px] px-4 
                ${isFirst && isLast ? 'rounded-lg' : ''} 
                ${isFirst && !isLast ? 'rounded-t-lg' : ''} 
                ${!isFirst && isLast ? 'rounded-b-lg' : ''}`}
    disabled={!onPress && !customRightContent}
  >
    <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{ backgroundColor: icon.props.color ? `${icon.props.color}20` : 'transparent' }}>
      {React.cloneElement(icon, { size: 20 })}
    </View>
    <Text className="text-base text-foreground ml-1 flex-1">{label}</Text>
    {customRightContent}
    {showChevron && !customRightContent && <ChevronRight size={20} className="text-muted-foreground opacity-50" />}
  </TouchableOpacity>
);

export default function ProfileScreen({ navigation }: Props) {
  const { userName, userId, changeUserPassword } = useAuthStore();
  const { isDarkColorScheme } = useColorScheme();
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

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: isDarkColorScheme ? 'black' : '#F0F2F5' },
    profileSection: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 15,
      backgroundColor: isDarkColorScheme ? '#1C1C1E' : '#FFFFFF',
      marginTop: Platform.OS === 'android' ? 10 : 0,
      marginHorizontal: Platform.OS === 'ios' ? 15 : 0,
      borderRadius: Platform.OS === 'ios' ? 10 : 0,
    },
    profileAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDarkColorScheme ? '#3A3A3C' : '#E5E5EA',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
      overflow: 'hidden',
      borderColor: isDarkColorScheme ? '#4A004A' : '#800080',
      borderWidth: 2,
    },
    profileTextContainer: { flex: 1 },
    profileName: { fontSize: 20, fontWeight: '600', color: isDarkColorScheme ? '#FFFFFF' : '#000000' },
    profileSubtitle: { fontSize: 14, color: isDarkColorScheme ? '#8E8E93' : '#666666', marginTop: 2 },
    settingsSectionTitle: {
      fontSize: 13,
      fontWeight: 'normal',
      color: isDarkColorScheme ? '#8E8E93' : '#6D6D72',
      textTransform: 'uppercase',
      paddingHorizontal: Platform.OS === 'ios' ? 30 : 15,
      paddingTop: 25,
      paddingBottom: 8,
    },
    settingsGroup: {
      backgroundColor: isDarkColorScheme ? '#1C1C1E' : '#FFFFFF',
      borderRadius: Platform.OS === 'ios' ? 10 : 0,
      marginHorizontal: Platform.OS === 'ios' ? 15 : 0,
      marginBottom: 20,
      overflow: 'hidden',
    },
    inputContainer: { paddingHorizontal: 16, paddingVertical: 10 },
    label: { fontSize: 14, color: isDarkColorScheme ? '#909090' : '#555555', marginBottom: 6, marginTop: 10, fontWeight: '500' },
    buttonComponent: { marginTop: 16, height: 50, borderRadius: 8 },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDarkColorScheme ? '#3A3A3C' : '#E5E5EA',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: isDarkColorScheme ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      width: '80%',
      maxWidth: 320,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDarkColorScheme ? '#FFFFFF' : '#000000',
      marginBottom: 16,
      textAlign: 'center',
    },
    modalActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 8,
    },
    modalActionText: {
      fontSize: 16,
      fontWeight: '500',
      marginLeft: 12,
    },
    modalCancelButton: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    modalCancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDarkColorScheme ? '#0A84FF' : '#007AFF',
    },
  });

  const iconColor = isDarkColorScheme ? '#0A84FF' : '#007AFF';
  const destructiveColor = isDarkColorScheme ? '#FF453A' : '#FF3B30';

  if (isLoading && !profileImage && !formData.email) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={iconColor} />
        <Text className="mt-2" style={{ color: isDarkColorScheme ? '#aaa' : '#555' }}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={handleProfileImagePress} className="relative w-20 h-20">
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
            <View className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-gray-500/70 justify-center items-center border-2"
              style={{ borderColor: isDarkColorScheme ? '#000000' : '#FFFFFF' }}>
              <EditIcon size={12} color="white" />
            </View>
          </TouchableOpacity>
          <View className='text-right mr-2 mt-4' style={[styles.profileTextContainer, { paddingLeft: 8 }]}>
            <Text style={styles.profileName}>{formData.name}</Text>
            <Text style={styles.profileSubtitle}>Account ID: {userId ? userId.substring(0, 8).toUpperCase() : 'N/A'}</Text>
          </View>
        </View>

        <Text style={styles.settingsSectionTitle}>Personal Information</Text>
        <View style={styles.settingsGroup}>
          {!isEditingProfile ? (
            <>
              <ListItem
                icon={<UserCircle color={iconColor} />}
                label="Full Name"
                customRightContent={<Text className="text-muted-foreground max-w-[60%]" numberOfLines={1} ellipsizeMode="tail">{formData.name}</Text>}
                showChevron={false}
                isFirst
              />
              <Separator className="bg-separator" style={{ marginLeft: 60 }} />
              <ListItem
                icon={<Mail color={iconColor} />}
                label="Email"
                customRightContent={<Text className="text-muted-foreground max-w-[60%]" numberOfLines={1} ellipsizeMode="tail">{formData.email || 'Not provided'}</Text>}
                showChevron={false}
              />
              <Separator className="bg-separator" style={{ marginLeft: 60 }} />
              <ListItem
                icon={<Phone color={iconColor} />}
                label="Phone"
                customRightContent={<Text className="text-muted-foreground max-w-[60%]" numberOfLines={1} ellipsizeMode="tail">{formData.phone || 'Not provided'}</Text>}
                showChevron={false}
                isLast
              />
              <View style={[styles.inputContainer, { paddingTop: 10, paddingBottom: 10 }]}>
                <Button
                  variant="outline"
                  onPress={() => setIsEditingProfile(true)}
                  disabled={isLoading}
                  style={[styles.buttonComponent, { marginTop: 0 }]}
                >
                  <Text>Edit Profile</Text>
                </Button>
              </View>
            </>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <View className="flex-row items-center border border-input rounded-md pl-2 bg-background">
                  <View style={styles.iconContainer}>
                    <UserCircle size={18} className="text-muted-foreground" />
                  </View>
                  <Input
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="Your Full Name"
                    editable={!isLoading}
                    className="flex-1 h-[42px] border-0 bg-transparent"
                  />
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <View className="flex-row items-center border border-input rounded-md pl-2 bg-background">
                  <View style={styles.iconContainer}>
                    <Mail size={18} className="text-muted-foreground" />
                  </View>
                  <Input
                    value={formData.email || ''}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    placeholder="Your Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isLoading}
                    className="flex-1 h-[42px] border-0 bg-transparent"
                  />
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone</Text>
                <View className="flex-row items-center border border-input rounded-md pl-2 bg-background">
                  <View style={styles.iconContainer}>
                    <Phone size={18} className="text-muted-foreground" />
                  </View>
                  <Input
                    value={formData.phone || ''}
                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                    placeholder="Your Phone Number"
                    keyboardType="phone-pad"
                    editable={!isLoading}
                    className="flex-1 h-[42px] border-0 bg-transparent"
                  />
                </View>
              </View>
              <View style={[styles.inputContainer, { paddingBottom: 10 }]}>
                <View className="flex-row gap-3 mt-2">
                  <Button
                    variant="outline"
                    onPress={() => {
                      setIsEditingProfile(false);
                      fetchUserData();
                    }}
                    disabled={isLoading}
                    style={[styles.buttonComponent, { flex: 1, marginTop: 0 }]}
                  >
                    <Text>Cancel</Text>
                  </Button>
                  <Button
                    onPress={handleUpdateProfile}
                    disabled={isLoading}
                    style={[styles.buttonComponent, { flex: 1, marginTop: 0 }]}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={isDarkColorScheme ? 'black' : 'white'} />
                    ) : (
                      <Text className="text-primary-foreground">Save Changes</Text>
                    )}
                  </Button>
                </View>
              </View>
            </>
          )}
        </View>

        <Text style={styles.settingsSectionTitle}>Security</Text>
        <View style={styles.settingsGroup}>
          <ListItem
            icon={<Key color={iconColor} />}
            label="Change Password"
            onPress={() => setIsChangePasswordModalVisible(true)}
            showChevron={false}
            isFirst
          />
          <Separator className="bg-separator" style={{ marginLeft: 60 }} />
          <ListItem
            icon={<Shield color={iconColor} />}
            label="Security Question"
            onPress={() => Alert.alert('Security Question', 'This feature will be available in a future update.')}
          />
          <Separator className="bg-separator" style={{ marginLeft: 60 }} />
          <ListItem
            icon={<RefreshCcw color={iconColor} />}
            label="Account Recovery"
            onPress={() => Alert.alert('Account Recovery', 'This feature will be available in a future update.')}
            isLast
          />
        </View>

        <Text style={styles.settingsSectionTitle}>App Information</Text>
        <View style={styles.settingsGroup}>
          <ListItem
            icon={<Info color={iconColor} />}
            label="Version"
            customRightContent={<Text className="text-muted-foreground">1.0.0</Text>}
            showChevron={false}
            isFirst
          />
          <Separator className="bg-separator" style={{ marginLeft: 60 }} />
          <ListItem
            icon={<Info color={iconColor} />}
            label="Build"
            customRightContent={
              <Text className="text-muted-foreground">{`${new Date().getFullYear()}.${new Date().getMonth() + 1}.${new Date().getDate()}`}</Text>
            }
            showChevron={false}
          />
          <Separator className="bg-separator" style={{ marginLeft: 60 }} />
          <ListItem
            icon={<Info color={iconColor} />}
            label="About Petti Kadai"
            onPress={() => Alert.alert('About', 'Petti Kadai is a simple inventory management app for small stores.')}
            isLast
            showChevron={false}
          />
        </View>
      </ScrollView>

      <Modal
        visible={showImageActionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Profile Picture</Text>
            <TouchableOpacity
              style={[styles.modalActionRow, { backgroundColor: isDarkColorScheme ? '#2A2A2C' : '#F5F5F5' }]}
              onPress={pickImage}
            >
              <GalleryIcon size={20} color={iconColor} />
              <Text style={[styles.modalActionText, { color: isDarkColorScheme ? '#FFFFFF' : '#000000' }]}>Select Image</Text>
            </TouchableOpacity>
            {profileImage && (
              <TouchableOpacity
                style={[styles.modalActionRow, { backgroundColor: isDarkColorScheme ? '#2A2A2C' : '#F5F5F5' }]}
                onPress={deleteImage}
              >
                <Trash2 size={20} color={destructiveColor} />
                <Text style={[styles.modalActionText, { color: destructiveColor }]}>Delete Image</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowImageActionModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ChangePasswordModal
        visible={isChangePasswordModalVisible}
        onClose={() => setIsChangePasswordModalVisible(false)}
        onSubmit={handleChangePasswordSubmit}
        isLoading={changePasswordLoading}
      />
    </>
  );
}