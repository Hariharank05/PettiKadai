// ~/screens/forgot-password.tsx
import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, ViewStyle, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useAuthStore } from '~/lib/stores/authStore';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import { validatePasswordStrength } from '~/lib/utils/authUtils';
import { toast, Toaster } from 'sonner-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AnimatedBackground from '~/components/AnimatedBackground';

// Toast styles using NativeWind colors but as style objects for sonner-native compatibility
const toasterOptionsConfig = {
  style: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  titleStyle: {
    color: '#1E293B',
    fontWeight: '600' as '600',
    fontSize: 14,
    marginBottom: 2,
  },
  descriptionStyle: {
    color: '#64748B',
    fontSize: 12,
  },
  success: {
    style: {
      backgroundColor: '#ECFDF5',
      borderColor: '#A7F3D0',
    },
  },
  error: {
    style: {
      backgroundColor: '#FEF2F2',
      borderColor: '#FECACA',
    },
  },
};

const ACTIVE_BUTTON_COLOR = '#F9C00C';
const DISABLED_BUTTON_COLOR = '#FBE08A';

enum ResetStep {
  IDENTIFY_USER,
  ANSWER_QUESTION,
  CREATE_PASSWORD,
  SUCCESS
}

export default function ForgotPasswordScreen() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState<ResetStep>(ResetStep.IDENTIFY_USER);
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    verifySecurityAnswer,
    resetUserPassword,
    isLoading,
    error,
    clearError,
    fetchUserAndSecurityQuestion
  } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // console.log("[FORGOT PASSWORD] Component did mount - clearing error from store.");
    clearError();
  }, [clearError]); // Runs on mount

  useEffect(() => {
    // ADD THIS CONSOLE LOG TO SEE THE EXACT ERROR
    console.log(`[FORGOT PASSWORD] Error Effect: store.error is "${error}", currentStep is ${ResetStep[currentStep]}`);

    if (!error) {
      return; 
    }

    let errorToastShown = false; 
    const currentErrorValue = error; // Capture error value for this effect run

    if (currentStep === ResetStep.IDENTIFY_USER) {
      if (currentErrorValue.toLowerCase().includes('user not found')) {
        toast.dismiss(); // Explicitly dismiss other toasts
        toast.error('User Not Found', {
          description: 'The email or phone number entered does not match any account. Please check and try again.',
        });
        errorToastShown = true;
      } else if (currentErrorValue.toLowerCase().includes('security question not set')) {
        toast.dismiss(); // Explicitly dismiss other toasts
        toast.error('Account Issue', {
          description: 'A security question is not set up for this account. Please contact support.',
        });
        errorToastShown = true;
      }
    } else if (currentStep === ResetStep.ANSWER_QUESTION) {
      if (currentErrorValue.toLowerCase().includes('incorrect security answer')) {
        toast.dismiss(); // Explicitly dismiss other toasts
        toast.error('Incorrect Security Answer', {
          description: 'The answer provided is incorrect. Please try again.',
        });
        errorToastShown = true;
      } else if (currentErrorValue.toLowerCase().includes('user not found')) {
        toast.dismiss(); // Explicitly dismiss other toasts
        toast.error('User Not Found', {
          description: 'The email or phone number entered does not match any account. Please check and try again.',
        });
        errorToastShown = true;
      } else if (currentErrorValue.toLowerCase().includes('security question not set')) {
        toast.dismiss(); // Explicitly dismiss other toasts
        toast.error('Account Issue', {
          description: 'A security question is not set up for this account. Please contact support.',
        });
        errorToastShown = true;
      }
    } else if (currentStep === ResetStep.CREATE_PASSWORD) {
      toast.dismiss(); // Explicitly dismiss other toasts
      toast.error('Password Reset Failed', {
        description: currentErrorValue,
      });
      errorToastShown = true;
    }

    // Important: Clear the error from the store AFTER processing it for this screen.
    // This ensures that this instance of the error has been handled.
    if (errorToastShown) {
      clearError();
    } else {
      // If no specific toast was shown for the error in the current step,
      // (e.g. a generic network error not caught above for IDENTIFY_USER/ANSWER_QUESTION)
      // still clear it to prevent it from lingering.
      if (currentStep !== ResetStep.CREATE_PASSWORD) {
        clearError();
      }
      // For CREATE_PASSWORD step, if errorToastShown is false (which shouldn't happen due to above logic),
      // the error would be cleared here if not handled.
      // However, any error in CREATE_PASSWORD step *is* handled and shows a toast.
    }
  }, [error, currentStep, clearError]);

  useEffect(() => {
    if (validationError) {
      toast.dismiss(); // Dismiss other toasts before showing validation error
      toast.error('Validation error', {
        description: validationError,
      });
    }
  }, [validationError]);

  const handleVerifyUser = async () => {
    if (!emailOrPhone.trim()) {
      setValidationError('Please enter your email or phone');
      return;
    }
    clearError(); // Clear any existing store error before new async operation
    setValidationError(null);
    const userDetails = await fetchUserAndSecurityQuestion(emailOrPhone);
    if (userDetails && userDetails.securityQuestion) {
      setSecurityQuestion(userDetails.securityQuestion);
      setCurrentStep(ResetStep.ANSWER_QUESTION);
    }
    // If error, the useEffect for [error] will handle it.
  };

  const handleVerifySecurityAnswer = async () => {
    if (!securityAnswer.trim()) {
      setValidationError('Please enter your security answer');
      return;
    }
    clearError(); // Clear any existing store error
    setValidationError(null);
    const user = await verifySecurityAnswer(emailOrPhone, securityAnswer);
    if (user) {
      setCurrentStep(ResetStep.CREATE_PASSWORD);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      setValidationError('Please enter a new password');
      return;
    }
    if (!validatePasswordStrength(newPassword)) {
      setValidationError('Password must be at least 8 characters and contain a number');
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }
    clearError(); // Clear any existing store error
    setValidationError(null);
    const success = await resetUserPassword({
      emailOrPhone,
      securityAnswer,
      newPassword,
    });
    if (success) {
      toast.dismiss(); // Dismiss others before success
      toast.success('Password reset successful!', {
        description: 'You can now sign in with your new password',
      });
      setTimeout(() => {
        setCurrentStep(ResetStep.SUCCESS);
      }, 1000); 
    }
  };

  const getFormattedSecurityQuestion = () => {
    if (!securityQuestion) return "Loading question...";
    if (securityQuestion.startsWith("{value=") && securityQuestion.includes("label=") && securityQuestion.endsWith("}")) {
      const labelMatch = securityQuestion.match(/label=([^}]+)/);
      if (labelMatch && labelMatch[1]) {
        return labelMatch[1].trim();
      }
    }
    return securityQuestion;
  };

  const getStepContent = () => {
    let isButtonDisabled;
    switch (currentStep) {
      case ResetStep.IDENTIFY_USER:
        isButtonDisabled = isLoading || !emailOrPhone.trim();
        return (
          <>
            <View className="items-center mb-8">
              <Text className="text-2xl font-bold text-slate-800">Reset Password</Text>
              <Text className="text-base text-slate-500 mt-2 text-center">
                Enter your email or phone to reset your password
              </Text>
            </View>
            <View className="space-y-4 mb-6">
              <View>
                <Text className="text-base text-slate-800 font-medium mb-2">Email or Phone</Text>
                <Input
                  placeholder="Enter your email or phone"
                  value={emailOrPhone}
                  onChangeText={text => {
                    setEmailOrPhone(text);
                    setValidationError(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="h-12 bg-white rounded-2xl shadow-sm border border-slate-200/60"
                  editable={!isLoading}
                />
              </View>
            </View>
            <Button
              onPress={handleVerifyUser}
              disabled={isButtonDisabled}
              style={[
                styles.actionButtonBase,
                { backgroundColor: isButtonDisabled ? DISABLED_BUTTON_COLOR : ACTIVE_BUTTON_COLOR }
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#334155" />
              ) : (
                <Text className="text-white font-bold text-base">Continue</Text>
              )}
            </Button>
          </>
        );

      case ResetStep.ANSWER_QUESTION:
        isButtonDisabled = isLoading || !securityAnswer.trim();
        return (
          <>
            <View className="items-center mb-8">
              <Text className="text-2xl font-bold text-slate-800">Security Question</Text>
              <Text className="text-base text-slate-500 mt-2 text-center">
                Answer your security question to reset your password
              </Text>
            </View>
            <View className="space-y-4 mb-6">
              <View>
                <Text className="text-base text-slate-800 font-medium mb-2">Question</Text>
                <Text className="text-slate-800 p-3 bg-gray-50 rounded-2xl shadow-sm border border-slate-200/60">
                  {getFormattedSecurityQuestion()}
                </Text>
              </View>
              <View>
                <Text className="text-base text-slate-800 font-medium mb-2">Your Answer</Text>
                <Input
                  placeholder="Enter your answer"
                  value={securityAnswer}
                  onChangeText={text => {
                    setSecurityAnswer(text);
                    setValidationError(null);
                  }}
                  className="h-12 bg-white rounded-2xl shadow-sm border border-slate-200/60"
                  editable={!isLoading}
                />
              </View>
            </View>
            <Button
              onPress={handleVerifySecurityAnswer}
              disabled={isButtonDisabled}
              style={[
                styles.actionButtonBase,
                { backgroundColor: isButtonDisabled ? DISABLED_BUTTON_COLOR : ACTIVE_BUTTON_COLOR }
              ]}
            >
               {isLoading ? (
                <ActivityIndicator size="small" color="#334155" />
              ) : (
                <Text className="text-white font-bold text-base">Verify Answer</Text>
              )}
            </Button>
          </>
        );

      case ResetStep.CREATE_PASSWORD:
        isButtonDisabled = isLoading || !newPassword || !confirmPassword;
        return (
          <>
            <View className="items-center mb-8">
              <Text className="text-2xl font-bold text-slate-800">New Password</Text>
              <Text className="text-base text-slate-500 mt-2 text-center">
                Create a new password for your account
              </Text>
            </View>
            <View className="space-y-4 mb-6">
              <View>
                <Text className="text-base text-slate-800 font-medium mb-2">New Password</Text>
                <View className="relative">
                  <Input
                    placeholder="Create a new password"
                    value={newPassword}
                    onChangeText={text => {
                      setNewPassword(text);
                      setValidationError(null);
                    }}
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
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChangeText={text => {
                    setConfirmPassword(text);
                    setValidationError(null);
                  }}
                  secureTextEntry={!showPassword}
                  className="h-12 bg-white rounded-2xl shadow-sm border border-slate-200/60"
                  editable={!isLoading}
                />
              </View>
            </View>
            <Button
              onPress={handleResetPassword}
              disabled={isButtonDisabled}
              style={[
                styles.actionButtonBase,
                { backgroundColor: isButtonDisabled ? DISABLED_BUTTON_COLOR : ACTIVE_BUTTON_COLOR }
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#334155" />
              ) : (
                <Text className="text-white font-bold text-base">Reset Password</Text>
              )}
            </Button>
          </>
        );

      case ResetStep.SUCCESS:
        return (
          <>
            <View className="items-center mb-8">
              <Text className="text-2xl font-bold text-slate-800">Success!</Text>
              <Text className="text-base text-slate-500 mt-2 text-center">
                Your password has been reset successfully.
              </Text>
            </View>
            <Button
              onPress={() => router.replace('/(auth)/login')}
              style={[
                styles.actionButtonBase,
                { backgroundColor: ACTIVE_BUTTON_COLOR }
              ]}
            >
              <Text className="text-white font-bold text-base">
                Back to Login
              </Text>
            </Button>
          </>
        );
    }
  };

  const toasterContainerStyle: ViewStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
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
            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 16 }}>
              <View className="flex-row mb-6">
                <TouchableOpacity
                  onPress={() => {
                    if (currentStep === ResetStep.IDENTIFY_USER) {
                      router.back();
                    } else if (currentStep !== ResetStep.SUCCESS) {
                      setCurrentStep(currentStep - 1);
                      clearError(); // Clear store error when navigating back between steps
                      setValidationError(null); 
                    }
                  }}
                  className="p-2"
                >
                  <ArrowLeft size={24} color="#1E293B" />
                </TouchableOpacity>
              </View>
              {getStepContent()}
              {currentStep !== ResetStep.SUCCESS && currentStep !== ResetStep.IDENTIFY_USER && (
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity className="mt-4" disabled={isLoading}>
                    <Text className="text-center text-indigo-600">Cancel and Back to Login</Text>
                  </TouchableOpacity>
                </Link>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
        <View style={toasterContainerStyle}>
          <Toaster
            position="top-center" // was top-center previously
            toastOptions={toasterOptionsConfig}
          />
        </View>
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