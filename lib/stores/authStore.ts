import { create } from 'zustand';
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  getCurrentAuthState, 
  resetPassword, 
  verifySecurityQuestion 
} from '../db/authOperations';
import { 
  AuthState, 
  UserRegistrationInput, 
  UserLoginInput, 
  PasswordResetInput 
} from '../models/user';

interface AuthStore extends AuthState {
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Auth actions
  initialize: () => Promise<void>;
  signup: (userData: UserRegistrationInput) => Promise<boolean>;
  login: (credentials: UserLoginInput) => Promise<boolean>;
  logout: () => Promise<void>;
  verifySecurityAnswer: (emailOrPhone: string, answer: string) => Promise<boolean>;
  resetPassword: (resetData: PasswordResetInput) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Auth state
  isAuthenticated: false,
  userId: undefined,
  userName: undefined,
  lastLoginAt: undefined,
  
  // UI state
  isLoading: false,
  error: null,

  // Initialize auth state from database
  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const authState = await getCurrentAuthState();
      if (authState) {
        set({
          isAuthenticated: authState.isAuthenticated,
          userId: authState.userId,
          userName: authState.userName,
          lastLoginAt: authState.lastLoginAt,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize auth';
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  // Register new user
  signup: async (userData: UserRegistrationInput) => {
    set({ isLoading: true, error: null });
    try {
      await registerUser(userData);
      // Don't auto-login after signup to allow explicit login
      set({ isLoading: false });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to register user';
      set({ isLoading: false, error: errorMessage });
      return false;
    }
  },

  // Login user
  login: async (credentials: UserLoginInput) => {
    set({ isLoading: true, error: null });
    try {
      const authState = await loginUser(credentials);
      set({
        isAuthenticated: authState.isAuthenticated,
        userId: authState.userId,
        userName: authState.userName,
        lastLoginAt: authState.lastLoginAt,
        isLoading: false,
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to login';
      set({ isLoading: false, error: errorMessage });
      return false;
    }
  },

  // Logout user
  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await logoutUser();
      set({
        isAuthenticated: false,
        userId: undefined,
        userName: undefined,
        lastLoginAt: undefined,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to logout';
      set({ isLoading: false, error: errorMessage });
    }
  },

  // Verify security question for password reset
  verifySecurityAnswer: async (emailOrPhone: string, answer: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await verifySecurityQuestion(emailOrPhone, answer);
      set({ isLoading: false });
      return !!user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify security answer';
      set({ isLoading: false, error: errorMessage });
      return false;
    }
  },

  // Reset password
  resetPassword: async (resetData: PasswordResetInput) => {
    set({ isLoading: true, error: null });
    try {
      const success = await resetPassword(resetData);
      set({ isLoading: false });
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      set({ isLoading: false, error: errorMessage });
      return false;
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));