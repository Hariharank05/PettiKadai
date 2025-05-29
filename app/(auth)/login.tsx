// ~/screens/login.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useAuthStore } from '~/lib/stores/authStore';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Eye, EyeOff, ArrowRight, ShoppingBag } from 'lucide-react-native';
import { initDatabase } from '~/lib/db/database';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
  StyleSheet,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AnimatedBackground from '~/components/AnimatedBackground';
import GlobalToaster, { Toaster as toast } from '~/components/toaster/Toaster';

const ACTIVE_BUTTON_COLOR = '#F9C00C';
const DISABLED_BUTTON_COLOR = '#FBE08A';

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
      } catch (dbError) {
        console.error('Database initialization error:', dbError);
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
        description: error || 'An unknown error occurred. Please try again.',
      });
      clearError();
    }
  }, [error, clearError]);

  const handleLogin = async () => {
    if (!emailOrPhone.trim() || !password) {
      toast.error('Missing information', {
        description: 'Please enter both email/phone and password',
      });
      return;
    }

    clearError();
    const success = await login({ emailOrPhone, password });
    if (success) {
      toast.success('Welcome back!', {
        description: 'You have successfully signed in',
      });
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 1000);
    }

  };

  const handleEmailOrPhoneChange = (text: string) => {
    setEmailOrPhone(text);
    if (error) clearError();
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (error) clearError();
  };

  const isButtonDisabled = isLoading || !emailOrPhone.trim() || !password;

  if (initializingDb) {
    return (
      <GestureHandlerRootView className="flex-1">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF9D9' }}>
          <Stack.Screen options={{ headerShown: false }} />
          <StatusBar barStyle="dark-content" backgroundColor="#FFF9D9" />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF9D9', paddingHorizontal: 24, zIndex: 1 }}>
            <ShoppingBag size={48} color="#FBBF24" />
            <ActivityIndicator size="large" color="#FBBF24" style={{ marginVertical: 16 }} />
            <Text className="mt-4 text-slate-800 font-semibold text-base">
              Setting up your shopping experience...
            </Text>
            <Text className="mt-2 text-slate-500 text-sm text-center">
              Just a moment while we prepare everything for you
            </Text>
          </View>
          <GlobalToaster />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF9D9' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor="#FFF9D9" />
        <AnimatedBackground />
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
                      <Text className="text-4xl font-bold text-purple-900 leading-tight tracking-wide">
                        Petti Kadai
                      </Text>
                      <Text className="text-xs text-slate-500 italic mt-1">
                        Store Management Made Easy
                      </Text>
                    </View>
                  </View>

                  <View className="bg-gray-50 rounded-3xl p-7 shadow-lg mb-6 w-full">
                    <View className="mb-5">
                      <Text className="text-xl font-bold text-slate-800 mb-6">Sign In</Text>

                      <View className="mb-4 bg-white rounded-2xl shadow-sm border border-slate-200/60">
                        <Input
                          placeholder="Phone number/username/email"
                          value={emailOrPhone}
                          onChangeText={handleEmailOrPhoneChange}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          className="h-14 px-4 text-base text-slate-800 border-0 w-full"
                          editable={!isLoading}
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
                      disabled={isButtonDisabled}
                      style={[
                        styles.signInButtonBase,
                        { backgroundColor: isButtonDisabled ? DISABLED_BUTTON_COLOR : ACTIVE_BUTTON_COLOR }
                      ]}
                      activeOpacity={0.85}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#334155" />
                      ) : (
                        <View className="flex-row items-center justify-center">
                          <Text className="text-white font-bold text-base mr-3">Sign In</Text>
                          <View className="w-6 h-6 rounded-full bg-white justify-center items-center shadow-sm">
                            <ArrowRight size={16} color={ACTIVE_BUTTON_COLOR} />
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
        <GlobalToaster />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  signInButtonBase: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});