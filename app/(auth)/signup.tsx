import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '~/lib/stores/authStore';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Eye, EyeOff, ChevronDown } from 'lucide-react-native';
import { SECURITY_QUESTIONS } from '~/lib/models/user';
import {
  validateEmail,
  validatePhone,
  validatePasswordStrength
} from '~/lib/utils/authUtils';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '~/components/ui/select';

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

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Name is required';
    }

    if (!emailOrPhone.trim()) {
      errors.emailOrPhone = `${isEmail ? 'Email' : 'Phone'} is required`;
    } else if (isEmail && !validateEmail(emailOrPhone)) {
      errors.emailOrPhone = 'Invalid email format';
    } else if (!isEmail && !validatePhone(emailOrPhone)) {
      errors.emailOrPhone = 'Invalid phone format';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (!validatePasswordStrength(password)) {
      errors.password = 'Password must be at least 8 characters and contain a number';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!securityQuestion) {
      errors.securityQuestion = 'Security question is required';
    }

    if (!securityAnswer.trim()) {
      errors.securityAnswer = 'Security answer is required';
    }

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
      // Set either email or phone based on user's choice
      ...(isEmail
        ? { email: emailOrPhone }
        : { phone: emailOrPhone })
    };

    const success = await signup(userData);
    if (success) {
      router.replace('/(auth)/login');
    }
  };

  const toggleInputType = () => {
    setIsEmail(!isEmail);
    setEmailOrPhone('');
    // Clear the validation error when switching input type
    const newErrors = { ...validationErrors };
    delete newErrors.emailOrPhone;
    setValidationErrors(newErrors);
  };

  // Handle security question selection
  const handleSecurityQuestionChange = (value: string) => {
    setSecurityQuestion(value);
    if (validationErrors.securityQuestion) {
      const newErrors = { ...validationErrors };
      delete newErrors.securityQuestion;
      setValidationErrors(newErrors);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-10 pb-4 bg-background">
          <View className="items-center mb-8">
            <Text className="text-3xl font-bold text-foreground">Create Account</Text>
            <Text className="text-base text-muted-foreground mt-2">Sign up for Petti Kadai</Text>
          </View>

          {error && (
            <View className="bg-destructive/10 p-3 rounded-md mb-4">
              <Text className="text-destructive text-center">{error}</Text>
            </View>
          )}

          <View className="space-y-4 mb-6">
            <View>
              <Text className="text-base text-foreground font-medium mb-2">Full Name</Text>
              <Input
                placeholder="Enter your full name"
                value={name}
                onChangeText={text => {
                  setName(text);
                  if (validationErrors.name) {
                    const newErrors = { ...validationErrors };
                    delete newErrors.name;
                    setValidationErrors(newErrors);
                  }
                }}
                className="h-12"
              />
              {validationErrors.name && (
                <Text className="text-destructive text-sm mt-1">{validationErrors.name}</Text>
              )}
            </View>

            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-base text-foreground font-medium">
                  {isEmail ? 'Email' : 'Phone Number'}
                </Text>
                <TouchableOpacity onPress={toggleInputType}>
                  <Text className="text-primary">
                    Use {isEmail ? 'phone' : 'email'} instead
                  </Text>
                </TouchableOpacity>
              </View>

              <Input
                placeholder={isEmail ? "Enter your email" : "Enter your phone number"}
                value={emailOrPhone}
                onChangeText={text => {
                  setEmailOrPhone(text);
                  if (validationErrors.emailOrPhone) {
                    const newErrors = { ...validationErrors };
                    delete newErrors.emailOrPhone;
                    setValidationErrors(newErrors);
                  }
                }}
                keyboardType={isEmail ? "email-address" : "phone-pad"}
                autoCapitalize="none"
                className="h-12"
              />
              {validationErrors.emailOrPhone && (
                <Text className="text-destructive text-sm mt-1">{validationErrors.emailOrPhone}</Text>
              )}
            </View>

            <View>
              <Text className="text-base text-foreground font-medium mb-2">Password</Text>
              <View className="relative">
                <Input
                  placeholder="Create a password"
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    if (validationErrors.password) {
                      const newErrors = { ...validationErrors };
                      delete newErrors.password;
                      setValidationErrors(newErrors);
                    }
                  }}
                  secureTextEntry={!showPassword}
                  className="h-12 pr-12"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3"
                >
                  {showPassword ? (
                    <EyeOff size={24} className="text-muted-foreground" />
                  ) : (
                    <Eye size={24} className="text-muted-foreground" />
                  )}
                </TouchableOpacity>
              </View>
              {validationErrors.password && (
                <Text className="text-destructive text-sm mt-1">{validationErrors.password}</Text>
              )}
            </View>

            <View>
              <Text className="text-base text-foreground font-medium mb-2">Confirm Password</Text>
              <Input
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={text => {
                  setConfirmPassword(text);
                  if (validationErrors.confirmPassword) {
                    const newErrors = { ...validationErrors };
                    delete newErrors.confirmPassword;
                    setValidationErrors(newErrors);
                  }
                }}
                secureTextEntry={!showPassword}
                className="h-12"
              />
              {validationErrors.confirmPassword && (
                <Text className="text-destructive text-sm mt-1">{validationErrors.confirmPassword}</Text>
              )}
            </View>

            <View>
              <Text className="text-base text-foreground font-medium mb-2">Security Question</Text>
              <Select
                defaultValue=""
                onValueChange={handleSecurityQuestionChange}
                open={selectOpen}
                onOpenChange={setSelectOpen}
              >
                <SelectTrigger className="h-12">
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
              {validationErrors.securityQuestion && (
                <Text className="text-destructive text-sm mt-1">{validationErrors.securityQuestion}</Text>
              )}
            </View>

            <View>
              <Text className="text-base text-foreground font-medium mb-2">Security Answer</Text>
              <Input
                placeholder="Answer to your security question"
                value={securityAnswer}
                onChangeText={text => {
                  setSecurityAnswer(text);
                  if (validationErrors.securityAnswer) {
                    const newErrors = { ...validationErrors };
                    delete newErrors.securityAnswer;
                    setValidationErrors(newErrors);
                  }
                }}
                className="h-12"
              />
              {validationErrors.securityAnswer && (
                <Text className="text-destructive text-sm mt-1">{validationErrors.securityAnswer}</Text>
              )}
            </View>
          </View>

          <Button
            onPress={handleSignup}
            disabled={isLoading}
            className="h-12 mb-4"
          >
            <Text className="text-primary-foreground font-semibold text-base">
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </Button>

          <View className="flex-row justify-center items-center">
            <Text className="text-muted-foreground">Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity className="ml-1">
                <Text className="text-primary font-medium">Log in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}