// User interface for type safety
export interface User {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    passwordHash: string;
    passwordSalt: string;
    securityQuestion: string;
    securityAnswer: string;
    createdAt: string;
    updatedAt: string;
  }
  
  // User input for registration
  export interface UserRegistrationInput {
    name: string;
    email?: string;
    phone?: string;
    password: string;
    securityQuestion: string;
    securityAnswer: string;
  }
  
  // User input for login
  export interface UserLoginInput {
    emailOrPhone: string;
    password: string;
  }
  
  // User input for reset password
  export interface PasswordResetInput {
    emailOrPhone: string;
    securityAnswer: string;
    newPassword: string;
  }
  
  // Authentication state
  export interface AuthState {
    isAuthenticated: boolean;
    userId?: string;
    userName?: string;
    lastLoginAt?: string;
  }
  
  // Security questions for user registration - Now using string type explicitly
  export const SECURITY_QUESTIONS: string[] = [
    "What was your first pet's name?",
    "In what city were you born?",
    "What is your mother's maiden name?",
    "What high school did you attend?",
    "What was the make of your first car?",
    "What is your favorite movie?",
    "What is your favorite color?",
    "What is the name of your favorite teacher?",
  ];