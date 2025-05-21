import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { Text } from '~/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { useAuthStore } from '~/lib/stores/authStore';
import { User, Mail, Phone, Camera, Key, Shield, RefreshCcw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { getDatabase } from '~/lib/db/database';

interface UserProfileData {
  name: string;
  email: string | null;
  phone: string | null;
  profileImage?: string | null;
}

export default function ProfileScreen() {
  const { userName, userId } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [formData, setFormData] = useState<UserProfileData>({
    name: userName || 'Store Owner',
    email: null,
    phone: null,
    profileImage: null,
  });
  
  // Fetch user data from database on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        const db = getDatabase();
        const user = await db.getFirstAsync<{ name: string; email: string | null; phone: string | null }>(
          'SELECT name, email, phone FROM Users WHERE id = ?',
          [userId]
        );
        
        if (user) {
          setFormData({
            name: user.name || userName || 'Store Owner',
            email: user.email,
            phone: user.phone,
            profileImage: null // Profile image not stored in DB yet
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [userId, userName]);
  
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      
      if (!result.canceled && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri);
        setFormData(prev => ({...prev, profileImage: result.assets[0].uri}));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  
  const handleUpdateProfile = async () => {
    if (!userId) {
      Alert.alert('Error', 'No user ID found');
      return;
    }
    
    setIsLoading(true);
    try {
      const db = getDatabase();
      await db.runAsync(
        'UPDATE Users SET name = ?, email = ?, phone = ?, updatedAt = ? WHERE id = ?',
        [
          formData.name,
          formData.email || null,
          formData.phone || null,
          new Date().toISOString(),
          userId
        ]
      );
      
      // Note: Profile image storage will need to be implemented
      // This would typically involve storing the image locally or in a cloud service
      // and keeping the reference (URI) in the database
      
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-4">
        <Text className="text-2xl font-bold mb-6 text-foreground">Profile</Text>
        
        {/* Profile Card */}
        <Card className="mb-6">
          <CardContent className="pt-6 items-center">
            <TouchableOpacity onPress={pickImage}>
              <View className="h-24 w-24 rounded-full bg-muted justify-center items-center mb-4 overflow-hidden">
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <User size={40} className="text-muted-foreground" />
                )}
                <View className="absolute bottom-0 right-0 bg-primary h-8 w-8 rounded-full justify-center items-center">
                  <Camera size={16} className="text-primary-foreground" />
                </View>
              </View>
            </TouchableOpacity>
            
            <Text className="text-xl font-bold text-foreground mb-1">{formData.name}</Text>
            <Text className="text-sm text-muted-foreground mb-4">
              Account ID: {userId ? userId.substring(0, 8) : '12345678'}
            </Text>
            
            {!isEditingProfile ? (
              <Button 
                variant="outline" 
                onPress={() => setIsEditingProfile(true)}
                className="mb-2"
                disabled={isLoading}
              >
                <Text>Edit Profile</Text>
              </Button>
            ) : (
              <View className="flex-row gap-2 mb-2">
                <Button 
                  variant="outline" 
                  onPress={() => setIsEditingProfile(false)}
                  disabled={isLoading}
                >
                  <Text>Cancel</Text>
                </Button>
                <Button 
                  onPress={handleUpdateProfile}
                  disabled={isLoading}
                >
                  <Text className="text-primary-foreground">
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Text>
                </Button>
              </View>
            )}
          </CardContent>
        </Card>
        
        {/* Profile Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isEditingProfile ? (
              <View className="space-y-4">
                <View>
                  <Text className="text-sm font-medium mb-1 text-foreground">Full Name</Text>
                  <View className="flex-row items-center">
                    <User size={18} className="mr-2 text-muted-foreground" />
                    <Input
                      value={formData.name}
                      onChangeText={(text) => setFormData({...formData, name: text})}
                      placeholder="Your Full Name"
                      editable={!isLoading}
                    />
                  </View>
                </View>
                
                <View>
                  <Text className="text-sm font-medium mb-1 text-foreground">Email</Text>
                  <View className="flex-row items-center">
                    <Mail size={18} className="mr-2 text-muted-foreground" />
                    <Input
                      value={formData.email || ''}
                      onChangeText={(text) => setFormData({...formData, email: text})}
                      placeholder="Your Email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isLoading}
                    />
                  </View>
                </View>
                
                <View>
                  <Text className="text-sm font-medium mb-1 text-foreground">Phone</Text>
                  <View className="flex-row items-center">
                    <Phone size={18} className="mr-2 text-muted-foreground" />
                    <Input
                      value={formData.phone || ''}
                      onChangeText={(text) => setFormData({...formData, phone: text})}
                      placeholder="Your Phone Number"
                      keyboardType="phone-pad"
                      editable={!isLoading}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View className="space-y-4">
                <View className="flex-row items-center py-2">
                  <View className="h-8 w-8 rounded-full bg-muted justify-center items-center mr-3">
                    <User size={16} className="text-muted-foreground" />
                  </View>
                  <View>
                    <Text className="text-sm text-muted-foreground">Full Name</Text>
                    <Text className="text-base text-foreground">{formData.name}</Text>
                  </View>
                </View>
                
                <View className="flex-row items-center py-2">
                  <View className="h-8 w-8 rounded-full bg-muted justify-center items-center mr-3">
                    <Mail size={16} className="text-muted-foreground" />
                  </View>
                  <View>
                    <Text className="text-sm text-muted-foreground">Email</Text>
                    <Text className="text-base text-foreground">
                      {formData.email || 'Not provided'}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row items-center py-2">
                  <View className="h-8 w-8 rounded-full bg-muted justify-center items-center mr-3">
                    <Phone size={16} className="text-muted-foreground" />
                  </View>
                  <View>
                    <Text className="text-sm text-muted-foreground">Phone</Text>
                    <Text className="text-base text-foreground">
                      {formData.phone || 'Not provided'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </CardContent>
        </Card>
        
        {/* Security */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Security</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TouchableOpacity 
              className="flex-row items-center py-4"
              onPress={() => Alert.alert('Change Password', 'This feature will be available in the next update.')}
              disabled={isLoading}
            >
              <View className="h-8 w-8 rounded-full bg-muted justify-center items-center mr-3">
                <Key size={16} className="text-muted-foreground" />
              </View>
              <View className="flex-1">
                <Text className="text-base text-foreground">Change Password</Text>
                <Text className="text-sm text-muted-foreground">Secure your account</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center py-4"
              onPress={() => Alert.alert('Security Question', 'This feature will be available in the next update.')}
              disabled={isLoading}
            >
              <View className="h-8 w-8 rounded-full bg-muted justify-center items-center mr-3">
                <Shield size={16} className="text-muted-foreground" />
              </View>
              <View className="flex-1">
                <Text className="text-base text-foreground">Security Question</Text>
                <Text className="text-sm text-muted-foreground">Update your security question</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center py-4"
              onPress={() => Alert.alert('Account Recovery', 'This feature will be available in the next update.')}
              disabled={isLoading}
            >
              <View className="h-8 w-8 rounded-full bg-muted justify-center items-center mr-3">
                <RefreshCcw size={16} className="text-muted-foreground" />
              </View>
              <View className="flex-1">
                <Text className="text-base text-foreground">Account Recovery</Text>
                <Text className="text-sm text-muted-foreground">Setup recovery options</Text>
              </View>
            </TouchableOpacity>
          </CardContent>
        </Card>
        
        {/* App Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">App Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <View className="py-2">
              <Text className="text-sm text-muted-foreground">Version</Text>
              <Text className="text-base text-foreground">1.0.0</Text>
            </View>
            
            <View className="py-2">
              <Text className="text-sm text-muted-foreground">Build</Text>
              <Text className="text-base text-foreground">{new Date().getFullYear() + "." + (new Date().getMonth() + 1)}</Text>
            </View>
            
            <TouchableOpacity 
              className="bg-muted py-2 px-4 rounded-md mt-2 items-center"
              onPress={() => Alert.alert('About', 'Petti Kadai is a simple inventory management app for small stores.')}
              disabled={isLoading}
            >
              <Text className="text-primary text-sm">About Petti Kadai</Text>
            </TouchableOpacity>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}