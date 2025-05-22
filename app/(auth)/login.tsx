import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useAuthStore } from '~/lib/stores/authStore';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Eye, EyeOff, User, ArrowRight, ShoppingBag } from 'lucide-react-native';
import { initDatabase } from '~/lib/db/database';
import { toast, Toaster } from 'sonner-native';
import { 
  View, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  SafeAreaView, 
  Dimensions, 
  Image,
  StatusBar,
  ViewStyle,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Toast styles using NativeWind colors but as style objects for sonner-native compatibility
const toasterOptionsConfig = {
  style: {
    backgroundColor: '#FEF3C7', // Corresponds to COLORS.surface or your desired default
    borderColor: '#E2E8F0', // Corresponds to COLORS.border
    borderWidth: 1,
    borderRadius: 16, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    marginHorizontal: 16, 
    elevation: 8, // For Android shadow
    shadowColor: '#000000', // For iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  titleStyle: {
    color: '#1E293B', // Corresponds to COLORS.text
    fontWeight: '600' as '600', 
    fontSize: 14, 
    marginBottom: 2,
  },
  descriptionStyle: {
    color: '#64748B', // Corresponds to COLORS.textLight
    fontSize: 12, 
  },
  success: { // Styles for success type toasts
    style: {
      backgroundColor: '#ECFDF5', // Your desired success background (e.g., emerald-50)
      borderColor: '#A7F3D0',   // Your desired success border (e.g., emerald-200)
    },
  },
  error: { // Styles for error type toasts
    style: {
      backgroundColor: '#FEF2F2', // Your desired error background (e.g., red-50)
      borderColor: '#FECACA',   // Your desired error border (e.g., red-200)
    },
  },
};

export default function LoginScreen() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [initializingDb, setInitializingDb] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const setupDb = async () => {
      setInitializingDb(true);
      try {
        await initDatabase();
        setDbInitialized(true);
        toast.success('Logout Successful!', {
          description: 'Please sign in to continue',
        });
      } catch (error) {
        console.error('Database initialization error:', error);
        toast.error('Setup failed', {
          description: 'Please restart the app and try again',
        });
      } finally {
        setInitializingDb(false);
      }
    };

    if (!dbInitialized) {
      setupDb();
    }
  }, [dbInitialized]);

  useEffect(() => {
    if (error) {
      toast.error('Sign in failed', {
        description: error,
      });
    }
  }, [error]);

  const handleLogin = async () => {
    if (!emailOrPhone.trim() || !password) {
      toast.error('Missing information', {
        description: 'Please enter both email/phone and password',
      });
      console.log('Login attempted with empty fields:', { emailOrPhone, password });
      return;
    }

    clearError();
    const success = await login({ emailOrPhone, password });
    if (success) {
      toast.success('Welcome back!', {
        description: 'You have successfully signed in',
      });
      // Delay navigation to allow the toast to be visible
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 1000); // 1-second delay to ensure the toast is visible
    }
  };

  const handleEmailOrPhoneChange = (text: string) => {
    console.log('Email/Phone input changed:', text);
    setEmailOrPhone(text);
  };

  const handlePasswordChange = (text: string) => {
    console.log('Password input changed:', text);
    setPassword(text);
  };

  // Define the style with explicit typing to satisfy TypeScript
  const toasterContainerStyle: ViewStyle = { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    zIndex: 10000,
  };

  if (initializingDb) {
    return (
      <GestureHandlerRootView className="flex-1">
        <SafeAreaView className="flex-1 bg-white">
          <Stack.Screen options={{ headerShown: false }} />
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
          <View className="flex-1 justify-center items-center bg-white px-6" style={{ zIndex: 1 }}>
            <ShoppingBag size={48} color="#FBBF24" />
            <ActivityIndicator size="large" color="#FBBF24" style={{ marginVertical: 16 }} />
            <Text className="mt-4 text-slate-800 font-semibold text-base">
              Setting up your shopping experience...
            </Text>
            <Text className="mt-2 text-slate-500 text-sm text-center">
              Just a moment while we prepare everything for you
            </Text>
          </View>
          <View style={toasterContainerStyle}>
            <Toaster 
              position="top-center"
              toastOptions={toasterOptionsConfig} 
            />
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        {/* Main content wrapped in a View with lower zIndex */}
        <View style={{ zIndex: 1, flex: 1 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start', alignItems: 'center', paddingBottom: 20, paddingTop: 60 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-1 justify-center items-center w-full">
                <View className="flex-1 p-6 justify-center items-center w-[90%] max-w-sm">
                  <View className="flex-col items-center mb-10">
                    <View className="w-16 h-16 bg-gray-50 rounded-2xl justify-center items-center shadow-md mb-6 border-2 border-amber-200/20">
                      <Image
                        source={require('../../assets/images/petti-kadai-icon.png')}
                        className="w-24 h-24"
                        resizeMode="contain"
                      />
                    </View>
                    <View className="items-center">
                      <Text className="text-sm text-slate-500 mb-1 font-medium">Welcome to</Text>
                      <Text className="text-4xl font-bold text-slate-800 leading-tight tracking-wide">
                        Petti Kadai
                      </Text>
                      <Text className="text-xs text-slate-500 italic mt-1">
                        Your neighborhood shop, online
                      </Text>
                    </View>
                  </View>

                  <View className="bg-gray-50 rounded-3xl p-7 shadow-lg mb-6 w-full">
                    <View className="mb-5">
                      <Text className="text-xl font-bold text-slate-800 mb-6">Sign In</Text>

                      <View className="mb-4 bg-white rounded-2xl shadow-sm border border-slate-200/60">
                        <Input
                          placeholder="Phone number, username, or email"
                          value={emailOrPhone}
                          onChangeText={handleEmailOrPhoneChange}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          className="h-14 px-4 text-base text-slate-800 border-0 w-full"
                          editable={!isLoading}
                          onFocus={() => console.log('Email/Phone input focused')}
                        />
                      </View>

                      <View className="mb-4 bg-white rounded-2xl shadow-sm border border-slate-200/60 relative">
                        <Input
                          placeholder="Password"
                          value={password}
                          onChangeText={handlePasswordChange}
                          secureTextEntry={!showPassword}
                          className="h-14 px-4 text-base text-slate-800 border-0 w-full"
                          editable={!isLoading}
                          onFocus={() => console.log('Password input focused')}
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-0 bottom-0 justify-center p-2"
                          disabled={isLoading}
                          activeOpacity={0.7}
                        >
                          {showPassword ? (
                            <EyeOff size={20} color="#64748B" />
                          ) : (
                            <Eye size={20} color="#64748B" />
                          )}
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        className="self-end mt-2 py-1"
                        disabled={isLoading}
                        onPress={() => router.push('/(auth)/forgot-password')}
                        activeOpacity={0.7}
                      >
                        <Text className="text-indigo-600 font-semibold text-sm">Forgot password?</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={handleLogin}
                      disabled={isLoading || !emailOrPhone.trim() || !password}
                      className={`${
                        (!emailOrPhone.trim() || !password) 
                          ? 'bg-amber-300/60 shadow-sm' 
                          : 'bg-amber-400 shadow-lg'
                      } h-14 rounded-2xl justify-center items-center w-full`}
                      activeOpacity={0.85}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <View className="flex-row items-center justify-center">
                          <Text className="text-slate-800 font-bold text-base mr-3">Sign In</Text>
                          <View className="w-6 h-6 rounded-full bg-white justify-center items-center shadow-sm">
                            <ArrowRight size={16} color="#FBBF24" />
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row justify-center items-center py-3 w-1/2 min-h-[60px] self-center">
                    <Text className="text-slate-500 text-sm mr-1">New to Petti Kadai?</Text>
                    <TouchableOpacity
                      onPress={() => router.push('/(auth)/signup')}
                      disabled={isLoading}
                      className="py-1.5 px-2.5"
                      activeOpacity={0.7}
                    >
                      <Text className="text-purple-600 font-bold text-sm">Create Account</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
        {/* Toaster is rendered last and absolutely positioned to ensure it’s on top */}
        <View style={toasterContainerStyle}>
          <Toaster 
            position="top-center"
            toastOptions={toasterOptionsConfig} 
          />
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}