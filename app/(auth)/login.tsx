import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '~/lib/stores/authStore';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Eye, EyeOff } from 'lucide-react-native';
import { initDatabase } from '~/lib/db/database';

export default function LoginScreen() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [initializingDb, setInitializingDb] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();

  // Initialize the database when component mounts
  useEffect(() => {
    const setupDb = async () => {
      setInitializingDb(true);
      try {
        await initDatabase();
        setDbInitialized(true);
      } catch (error) {
        console.error('Database initialization error:', error);
      } finally {
        setInitializingDb(false);
      }
    };

    if (!dbInitialized) {
      setupDb();
    }
  }, [dbInitialized]);

  const handleLogin = async () => {
    if (!emailOrPhone.trim() || !password) {
      return;
    }

    clearError();
    const success = await login({ emailOrPhone, password });
    if (success) {
      router.replace('/(tabs)/home');
    }
  };

  if (initializingDb) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="hsl(var(--primary))" />
        <Text className="mt-4 text-muted-foreground">Initializing database...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center px-6 pt-10 pb-4 bg-background">
          <View className="items-center mb-8">
            <Text className="text-3xl font-bold text-foreground">Petti Kadai</Text>
            <Text className="text-base text-muted-foreground mt-2">Login to your account</Text>
          </View>
          
          {error && (
            <View className="bg-destructive/10 p-3 rounded-md mb-4">
              <Text className="text-destructive text-center">{error}</Text>
            </View>
          )}
          
          <View className="space-y-4 mb-6">
            <View>
              <Text className="text-base text-foreground font-medium mb-2">Email or Phone</Text>
              <Input
                placeholder="Enter your email or phone"
                value={emailOrPhone}
                onChangeText={setEmailOrPhone}
                autoCapitalize="none"
                keyboardType="email-address"
                className="h-12"
                editable={!isLoading}
              />
            </View>
            
            <View>
              <Text className="text-base text-foreground font-medium mb-2">Password</Text>
              <View className="relative">
                <Input
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  className="h-12 pr-12"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff size={24} className="text-muted-foreground" />
                  ) : (
                    <Eye size={24} className="text-muted-foreground" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <Button
            onPress={handleLogin}
            disabled={isLoading || !emailOrPhone.trim() || !password}
            className="h-12 mb-4"
          >
            {isLoading ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                <Text className="text-primary-foreground font-semibold text-base">Logging in...</Text>
              </View>
            ) : (
              <Text className="text-primary-foreground font-semibold text-base">Login</Text>
            )}
          </Button>
          
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity className="mb-4" disabled={isLoading}>
              <Text className="text-center text-primary">Forgot password?</Text>
            </TouchableOpacity>
          </Link>
          
          <View className="flex-row justify-center items-center">
            <Text className="text-muted-foreground">Don't have an account?</Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity className="ml-1" disabled={isLoading}>
                <Text className="text-primary font-medium">Sign up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}