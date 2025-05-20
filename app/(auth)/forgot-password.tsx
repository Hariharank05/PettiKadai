// ~/screens/(auth)/forgot-password.tsx
import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '~/lib/stores/authStore';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import { validatePasswordStrength } from '~/lib/utils/authUtils';

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
    resetUserPassword, // Corrected: was resetPassword
    isLoading, 
    error, 
    clearError 
  } = useAuthStore();
  const router = useRouter();

  const handleVerifyUser = async () => {
    if (!emailOrPhone.trim()) {
      setValidationError('Please enter your email or phone');
      return;
    }
    
    clearError();
    setValidationError(null);
    
    // In a real implementation, we would fetch the security question from the server
    // For now, we'll simulate it by trying to verify and then fetching the question if successful.
    // Or, better, have a dedicated endpoint to fetch the question first.
    // For this example, we'll assume `verifySecurityAnswer` (or a new method) could also return the question or user details.
    // Let's assume for now we just set a placeholder question.
    setSecurityQuestion("What was your first pet's name?"); // Placeholder
    setCurrentStep(ResetStep.ANSWER_QUESTION);
    // Ideally, you'd call an API endpoint here like:
    // const userDetails = await fetchUserForPasswordReset(emailOrPhone);
    // if (userDetails && userDetails.securityQuestion) {
    //   setSecurityQuestion(userDetails.securityQuestion);
    //   setCurrentStep(ResetStep.ANSWER_QUESTION);
    // } else {
    //   setValidationError('User not found or no security question set.');
    // }
  };

  const handleVerifySecurityAnswer = async () => {
    if (!securityAnswer.trim()) {
      setValidationError('Please enter your security answer');
      return;
    }
    
    clearError();
    setValidationError(null);
    
    // The `verifySecurityAnswer` in the store returns User | null.
    // We are checking if it returns a user object (truthy) to proceed.
    const user = await verifySecurityAnswer(emailOrPhone, securityAnswer);
    if (user) { // If user is not null, verification was successful
      setCurrentStep(ResetStep.CREATE_PASSWORD);
    } else {
      // Error will be set in the store, which is displayed.
      // No need to setValidationError here unless you want a specific message
      // for this step that differs from the store's error.
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
    
    const success = await resetUserPassword({ // Corrected: was resetPassword
      emailOrPhone,
      securityAnswer, // Note: The backend `resetPassword` operation should re-verify this or use a token.
      newPassword
    });
    
    if (success) {
      setCurrentStep(ResetStep.SUCCESS);
    }
  };

  const getStepContent = () => {
    switch (currentStep) {
      case ResetStep.IDENTIFY_USER:
        return (
          <>
            <View className="items-center mb-8">
              <Text className="text-2xl font-bold text-foreground">Reset Password</Text>
              <Text className="text-base text-muted-foreground mt-2 text-center">
                Enter your email or phone to reset your password
              </Text>
            </View>
            
            <View className="space-y-4 mb-6">
              <View>
                <Text className="text-base text-foreground font-medium mb-2">Email or Phone</Text>
                <Input
                  placeholder="Enter your email or phone"
                  value={emailOrPhone}
                  onChangeText={text => {
                    setEmailOrPhone(text);
                    setValidationError(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="h-12"
                  editable={!isLoading}
                />
              </View>
            </View>
            
            <Button
              onPress={handleVerifyUser}
              disabled={isLoading || !emailOrPhone.trim()}
              className="h-12 mb-4"
            >
              <Text className="text-primary-foreground font-semibold text-base">
                {isLoading ? 'Verifying...' : 'Continue'}
              </Text>
            </Button>
          </>
        );
        
      case ResetStep.ANSWER_QUESTION:
        return (
          <>
            <View className="items-center mb-8">
              <Text className="text-2xl font-bold text-foreground">Security Question</Text>
              <Text className="text-base text-muted-foreground mt-2 text-center">
                Answer your security question to reset your password
              </Text>
            </View>
            
            <View className="space-y-4 mb-6">
              <View>
                <Text className="text-base text-foreground font-medium mb-2">Question</Text>
                <Text className="text-foreground p-3 bg-muted rounded-md">
                  {securityQuestion || "Loading question..."}
                </Text>
              </View>
              
              <View>
                <Text className="text-base text-foreground font-medium mb-2">Your Answer</Text>
                <Input
                  placeholder="Enter your answer"
                  value={securityAnswer}
                  onChangeText={text => {
                    setSecurityAnswer(text);
                    setValidationError(null);
                  }}
                  className="h-12"
                  editable={!isLoading}
                />
              </View>
            </View>
            
            <Button
              onPress={handleVerifySecurityAnswer}
              disabled={isLoading || !securityAnswer.trim()}
              className="h-12 mb-4"
            >
              <Text className="text-primary-foreground font-semibold text-base">
                {isLoading ? 'Verifying...' : 'Verify Answer'}
              </Text>
            </Button>
          </>
        );
        
      case ResetStep.CREATE_PASSWORD:
        return (
          <>
            <View className="items-center mb-8">
              <Text className="text-2xl font-bold text-foreground">New Password</Text>
              <Text className="text-base text-muted-foreground mt-2 text-center">
                Create a new password for your account
              </Text>
            </View>
            
            <View className="space-y-4 mb-6">
              <View>
                <Text className="text-base text-foreground font-medium mb-2">New Password</Text>
                <View className="relative">
                  <Input
                    placeholder="Create a new password"
                    value={newPassword}
                    onChangeText={text => {
                      setNewPassword(text);
                      setValidationError(null);
                    }}
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
              
              <View>
                <Text className="text-base text-foreground font-medium mb-2">Confirm Password</Text>
                <Input
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChangeText={text => {
                    setConfirmPassword(text);
                    setValidationError(null);
                  }}
                  secureTextEntry={!showPassword}
                  className="h-12"
                  editable={!isLoading}
                />
              </View>
            </View>
            
            <Button
              onPress={handleResetPassword}
              disabled={isLoading || !newPassword || !confirmPassword}
              className="h-12 mb-4"
            >
              <Text className="text-primary-foreground font-semibold text-base">
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Text>
            </Button>
          </>
        );
        
      case ResetStep.SUCCESS:
        return (
          <>
            <View className="items-center mb-8">
              <Text className="text-2xl font-bold text-foreground">Success!</Text>
              <Text className="text-base text-muted-foreground mt-2 text-center">
                Your password has been reset successfully.
              </Text>
            </View>
            
            <Button
              onPress={() => router.replace('/(auth)/login')}
              className="h-12 mb-4"
            >
              <Text className="text-primary-foreground font-semibold text-base">
                Back to Login
              </Text>
            </Button>
          </>
        );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-10 pb-4 bg-background">
          <View className="flex-row mb-6">
            <TouchableOpacity 
              onPress={() => {
                if (currentStep === ResetStep.IDENTIFY_USER) {
                  router.back();
                } else if (currentStep !== ResetStep.SUCCESS) { // Don't go back from success step
                  setCurrentStep(currentStep - 1);
                  clearError(); // Clear errors when going back a step
                  setValidationError(null);
                }
              }}
              className="p-2"
            >
              <ArrowLeft size={24} className="text-foreground" />
            </TouchableOpacity>
          </View>
          
          {(error || validationError) && (
            <View className="bg-destructive/10 p-3 rounded-md mb-4">
              <Text className="text-destructive text-center">
                {error || validationError}
              </Text>
            </View>
          )}
          
          {getStepContent()}
          
          {currentStep !== ResetStep.SUCCESS && currentStep !== ResetStep.IDENTIFY_USER && (
             // Show "Back to Login" only on steps after IDENTIFY_USER and before SUCCESS
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity className="mt-4" disabled={isLoading}>
                <Text className="text-center text-primary">Cancel and Back to Login</Text>
              </TouchableOpacity>
            </Link>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}