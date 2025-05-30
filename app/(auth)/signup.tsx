// ~/screens/signup.tsx
import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useAuthStore } from '~/lib/stores/authStore';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Eye, EyeOff } from 'lucide-react-native';
import { SECURITY_QUESTIONS } from '~/lib/models/user';
import { validateEmail, validatePhone, validatePasswordStrength } from '~/lib/utils/authUtils';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '~/components/ui/select';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AnimatedBackground from '~/components/AnimatedBackground';
import GlobalToaster, { Toaster as toast } from '~/components/toaster/Toaster';

const ACTIVE_BUTTON_COLOR = '#F9C00C';
const DISABLED_BUTTON_COLOR = '#FBE08A';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [isEmail, setIsEmail] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState<string>('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { signup, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (error) {
      toast.error('Sign up failed', {
        description: error || 'An unknown error occurred. Please try again.',
      });
      clearError();
    }
  }, [error, clearError]);

  useEffect(() => {
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      if (firstError) {
        toast.error('Validation error', {
          description: firstError,
        });
      }
    }
  }, [validationErrors]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!emailOrPhone.trim()) errors.emailOrPhone = `${isEmail ? 'Email' : 'Phone'} is required`;
    else if (isEmail && !validateEmail(emailOrPhone)) errors.emailOrPhone = 'Invalid email format';
    else if (!isEmail && !validatePhone(emailOrPhone)) errors.emailOrPhone = 'Invalid phone format (e.g., +12223334444)';
    if (!password) errors.password = 'Password is required';
    else if (!validatePasswordStrength(password)) errors.password = 'Password must be at least 8 characters and contain a number';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (!securityQuestion) errors.securityQuestion = 'Security question is required';
    if (!securityAnswer.trim()) errors.securityAnswer = 'Security answer is required';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }
    clearError();
    const userData = {
      name,
      password,
      securityQuestion,
      securityAnswer,
      ...(isEmail ? { email: emailOrPhone } : { phone: emailOrPhone }),
    };

    const success = await signup(userData);
    if (success) {
      toast.success('Account created!', {
        description: 'You can now sign in',
      });
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1000);
    }

  };

  const toggleInputType = () => {
    setIsEmail(!isEmail);
    setEmailOrPhone('');
    const newErrors = { ...validationErrors };
    delete newErrors.emailOrPhone;
    setValidationErrors(newErrors);
    if (error) clearError();
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, fieldName?: keyof typeof validationErrors) => (text: string) => {
    setter(text);
    if (fieldName && validationErrors[fieldName]) {
      const newErrors = { ...validationErrors };
      delete newErrors[fieldName];
      setValidationErrors(newErrors);
    }
    if (error) clearError();
  };

  const handleSecurityQuestionChange = (value: string) => {
    setSecurityQuestion(value);
    if (validationErrors.securityQuestion) {
      const newErrors = { ...validationErrors };
      delete newErrors.securityQuestion;
      setValidationErrors(newErrors);
    }
    if (error) clearError();
  };

  const isFormSubmittable = () => {
    return name.trim() && emailOrPhone.trim() && password && confirmPassword && securityQuestion && securityAnswer.trim();
  };

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
            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
              <View className="items-center mb-8">
                <Text className="text-3xl font-bold text-slate-800">Create Account</Text>
                <Text className="text-base text-slate-500 mt-2">Sign up for Petti Kadai</Text>
              </View>

              <View className="space-y-4 mb-6">
                <View>
                  <Text className="text-base text-slate-800 font-medium mb-2">Full Name</Text>
                  <Input
                    placeholder="Enter your full name"
                    value={name}
                    onChangeText={handleInputChange(setName, 'name')}
                    className="h-12 bg-white rounded-2xl shadow-sm border border-slate-200/60"
                    editable={!isLoading}
                  />
                </View>

                <View>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-base text-slate-800 font-medium">
                      {isEmail ? 'Email' : 'Phone Number'}
                    </Text>
                    <TouchableOpacity onPress={toggleInputType} disabled={isLoading}>
                      <Text className="text-indigo-600">Use {isEmail ? 'phone' : 'email'} instead</Text>
                    </TouchableOpacity>
                  </View>
                  <Input
                    placeholder={isEmail ? 'Enter your email' : 'Enter your phone number'}
                    value={emailOrPhone}
                    onChangeText={handleInputChange(setEmailOrPhone, 'emailOrPhone')}
                    keyboardType={isEmail ? 'email-address' : 'phone-pad'}
                    autoCapitalize="none"
                    className="h-12 bg-white rounded-2xl shadow-sm border border-slate-200/60"
                    editable={!isLoading}
                  />
                </View>

                <View>
                  <Text className="text-base text-slate-800 font-medium mb-2">Password</Text>
                  <View className="relative">
                    <Input
                      placeholder="Create a password"
                      value={password}
                      onChangeText={handleInputChange(setPassword, 'password')}
                      secureTextEntry={!showPassword}
                      className="h-12 pr-12 bg-white rounded-2xl shadow-sm border border-slate-200/60"
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff size={24} color="#64748B" />
                      ) : (
                        <Eye size={24} color="#64748B" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View>
                  <Text className="text-base text-slate-800 font-medium mb-2">Confirm Password</Text>
                  <Input
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={handleInputChange(setConfirmPassword, 'confirmPassword')}
                    secureTextEntry={!showPassword}
                    className="h-12 bg-white rounded-2xl shadow-sm border border-slate-200/60"
                    editable={!isLoading}
                  />
                </View>

                <View>
                  <Text className="text-base text-slate-800 font-medium mb-2">Security Question</Text>
                  <Select
                    defaultValue=""
                    onValueChange={handleSecurityQuestionChange}
                    open={selectOpen}
                    onOpenChange={setSelectOpen}
                  >
                    <SelectTrigger className="h-12 bg-white rounded-2xl shadow-sm border border-slate-200/60">
                      <SelectValue placeholder="Select a security question" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECURITY_QUESTIONS.map((question) => (
                        <SelectItem key={question} value={question} label={question}>
                          {question}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </View>

                <View>
                  <Text className="text-base text-slate-800 font-medium mb-2">Security Answer</Text>
                  <Input
                    placeholder="Answer to your security question"
                    value={securityAnswer}
                    onChangeText={handleInputChange(setSecurityAnswer, 'securityAnswer')}
                    className="h-12 bg-white rounded-2xl shadow-sm border border-slate-200/60"
                    editable={!isLoading}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSignup}
                disabled={isLoading || !isFormSubmittable()}
                style={[
                  styles.actionButtonBase,
                  { backgroundColor: (isLoading || !isFormSubmittable()) ? DISABLED_BUTTON_COLOR : ACTIVE_BUTTON_COLOR }
                ]}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#334155" />
                ) : (
                  <Text className="text-white font-bold text-base">Create Account</Text>
                )}
              </TouchableOpacity>


              <View className="flex-row justify-center items-center mt-4">
                <Text className="text-slate-500">Already have an account?</Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity className="ml-1" disabled={isLoading}>
                    <Text className="text-indigo-600 font-medium">Log in</Text>
                  </TouchableOpacity>
                </Link>
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
  actionButtonBase: {
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
});