import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useAuthStore } from '~/lib/stores/authStore';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import { validatePasswordStrength } from '~/lib/utils/authUtils';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AnimatedBackground from '~/components/AnimatedBackground';
import GlobalToaster, { Toaster as toast } from '~/components/toaster/Toaster';

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
    clearError();
  }, [clearError]);

  useEffect(() => {
    console.log(`[FORGOT PASSWORD] Error Effect: store.error is "${error}", currentStep is ${ResetStep[currentStep]}`);

    if (!error) {
      return;
    }

    let errorToastShown = false;
    const currentErrorValue = error; // Can be string or null

    if (currentStep === ResetStep.IDENTIFY_USER) {
      if (currentErrorValue.toLowerCase().includes('user not found')) {
        toast.dismiss();
        toast.error('User Not Found', {
          description: 'The email or phone number entered does not match any account. Please check and try again.',
        });
        errorToastShown = true;
      } else if (currentErrorValue.toLowerCase().includes('security question not set')) {
        toast.dismiss();
        toast.error('Account Issue', {
          description: 'A security question is not set up for this account. Please contact support.',
        });
        errorToastShown = true;
      }
    } else if (currentStep === ResetStep.ANSWER_QUESTION) {
      if (currentErrorValue.toLowerCase().includes('incorrect security answer')) {
        toast.dismiss();
        toast.error('Incorrect Security Answer', {
          description: 'The answer provided is incorrect. Please try again.',
        });
        errorToastShown = true;
      } else if (currentErrorValue.toLowerCase().includes('user not found')) {
        toast.dismiss();
        toast.error('User Not Found', {
          description: 'The email or phone number entered does not match any account. Please check and try again.',
        });
        errorToastShown = true;
      } else if (currentErrorValue.toLowerCase().includes('security question not set')) {
        toast.dismiss();
        toast.error('Account Issue', {
          description: 'A security question is not set up for this account. Please contact support.',
        });
        errorToastShown = true;
      }
    } else if (currentStep === ResetStep.CREATE_PASSWORD) {
      toast.dismiss();
      toast.error('Password Reset Failed', {
        // Ensure description is a string, even if currentErrorValue is null
        description: currentErrorValue || 'An unknown error occurred. Please try again.',
      });
      errorToastShown = true;
    }

    if (errorToastShown) {
      clearError();
    } else {
      // If no specific toast was shown, but there's an error,
      // consider if a generic toast should be shown or just clear it.
      // For now, we only show toasts for specific handled errors or validation errors.
      // We still clear the error from the store if it wasn't handled by a toast above for current step.
      if (currentErrorValue && currentStep !== ResetStep.CREATE_PASSWORD) { // Ensure currentErrorValue is not null before logging
         // console.warn(`[FORGOT PASSWORD] Unhandled store error in step ${ResetStep[currentStep]}: ${currentErrorValue}`);
         // You might want to show a generic toast here for unhandled errors:
         /*
         toast.error('An unexpected error occurred', {
           description: currentErrorValue || 'Please try again later.',
         });
         */
      }
      // Always clear error if it wasn't explicitly shown as a toast by this effect run for the current step
      // (except for CREATE_PASSWORD where any error *is* shown).
      if (currentStep !== ResetStep.CREATE_PASSWORD || !errorToastShown) {
          clearError();
      }
    }
  }, [error, currentStep, clearError]);

  useEffect(() => {
    if (validationError) { // validationError is string | null, this ensures it's a string here
      toast.dismiss();
      toast.error('Validation error', {
        description: validationError, // validationError is guaranteed to be a string here
      });
    }
  }, [validationError]);

  const handleVerifyUser = async () => {
    if (!emailOrPhone.trim()) {
      setValidationError('Please enter your email or phone');
      return;
    }
    clearError();
    setValidationError(null);
    const userDetails = await fetchUserAndSecurityQuestion(emailOrPhone);
    if (userDetails && userDetails.securityQuestion) {
      setSecurityQuestion(userDetails.securityQuestion);
      setCurrentStep(ResetStep.ANSWER_QUESTION);
    }
  };

  const handleVerifySecurityAnswer = async () => {
    if (!securityAnswer.trim()) {
      setValidationError('Please enter your security answer');
      return;
    }
    clearError();
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
    clearError();
    setValidationError(null);
    const success = await resetUserPassword({
      emailOrPhone,
      securityAnswer,
      newPassword,
    });
    if (success) {
      toast.dismiss();
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
                      clearError();
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