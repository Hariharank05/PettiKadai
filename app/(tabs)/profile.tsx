import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { Text } from '~/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { useAuthStore } from '~/lib/stores/authStore';
import { User, Mail, Phone, Camera, Key, Shield, RefreshCcw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const { userName, userId } = useAuthStore();
  
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [formData, setFormData] = useState({
    name: userName || 'Store Owner',
    email: 'user@example.com',
    phone: '+91 1234567890',
  });
  
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
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  
  const handleUpdateProfile = () => {
    // In a real app, we would update the user profile in the database
    Alert.alert('Success', 'Profile updated successfully!');
    setIsEditingProfile(false);
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
            <Text className="text-sm text-muted-foreground mb-4">Account ID: {userId?.substring(0, 8) || '12345678'}</Text>
            
            {!isEditingProfile ? (
              <Button 
                variant="outline" 
                onPress={() => setIsEditingProfile(true)}
                className="mb-2"
              >
                <Text>Edit Profile</Text>
              </Button>
            ) : (
              <View className="flex-row gap-2 mb-2">
                <Button 
                  variant="outline" 
                  onPress={() => setIsEditingProfile(false)}
                >
                  <Text>Cancel</Text>
                </Button>
                <Button 
                  onPress={handleUpdateProfile}
                >
                  <Text className="text-primary-foreground">Save Changes</Text>
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
                    />
                  </View>
                </View>
                
                <View>
                  <Text className="text-sm font-medium mb-1 text-foreground">Email</Text>
                  <View className="flex-row items-center">
                    <Mail size={18} className="mr-2 text-muted-foreground" />
                    <Input
                      value={formData.email}
                      onChangeText={(text) => setFormData({...formData, email: text})}
                      placeholder="Your Email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
                
                <View>
                  <Text className="text-sm font-medium mb-1 text-foreground">Phone</Text>
                  <View className="flex-row items-center">
                    <Phone size={18} className="mr-2 text-muted-foreground" />
                    <Input
                      value={formData.phone}
                      onChangeText={(text) => setFormData({...formData, phone: text})}
                      placeholder="Your Phone Number"
                      keyboardType="phone-pad"
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
                    <Text className="text-base text-foreground">{formData.email}</Text>
                  </View>
                </View>
                
                <View className="flex-row items-center py-2">
                  <View className="h-8 w-8 rounded-full bg-muted justify-center items-center mr-3">
                    <Phone size={16} className="text-muted-foreground" />
                  </View>
                  <View>
                    <Text className="text-sm text-muted-foreground">Phone</Text>
                    <Text className="text-base text-foreground">{formData.phone}</Text>
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
            >
              <View className="h-8 w-8 rounded-full bg-muted justify-center items-center mr-3">
                <Key size={16} className="text-muted-foreground" />
              </View>
              <View className="flex-1">
                <Text className="text-base text-foreground">Change Password</Text>
                <Text className="text-sm text-muted-foreground">Last changed 30 days ago</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center py-4"
              onPress={() => Alert.alert('Security Question', 'This feature will be available in the next update.')}
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
              <Text className="text-base text-foreground">2023.05.01</Text>
            </View>
            
            <TouchableOpacity 
              className="bg-muted py-2 px-4 rounded-md mt-2 items-center"
              onPress={() => Alert.alert('About', 'Petti Kadai is a simple inventory management app for small stores.')}
            >
              <Text className="text-primary text-sm">About Petti Kadai</Text>
            </TouchableOpacity>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}