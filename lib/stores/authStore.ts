// ~/lib/stores/authStore.ts
import { create } from 'zustand';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentAuthState,
  resetPassword,
  verifySecurityQuestion,
  changePassword as dbChangePassword,
  getUserDetailsForPasswordReset, // Import new function
} from '../db/authOperations';
import {
  AuthState,
  UserRegistrationInput,
  UserLoginInput,
  PasswordResetInput,
  User // Make sure User is imported if needed for types, though not directly stored
} from '../models/user';
import { getDatabase } from '../db/database';

interface AuthStoreState extends AuthState {
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signup: (userData: UserRegistrationInput) => Promise<boolean>;
  login: (credentials: UserLoginInput) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchUserAndSecurityQuestion: (emailOrPhone: string) => Promise<{ securityQuestion: string; userId: string } | null>; // New function signature
  verifySecurityAnswer: (emailOrPhone: string, answer: string) => Promise<User | null>;
  resetUserPassword: (resetData: PasswordResetInput) => Promise<boolean>;
  clearError: () => void;
    updateAuthStoreUserName: (newName: string, userIdToUpdate: string) => Promise<void>; // New function
  changeUserPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  isAuthenticated: false,
  userId: undefined,
  userName: undefined,
  lastLoginAt: undefined,
  isLoading: false,
  error: null,

  initialize: async () => {
    // console.log('[AuthStore] Initializing auth state...');
    set({ isLoading: true, error: null });
    try {
      const authState = await getCurrentAuthState();
      if (authState) {
        // console.log('[AuthStore] Auth state from DB:', authState);
        set({
          isAuthenticated: authState.isAuthenticated,
          userId: authState.userId,
          userName: authState.userName,
          lastLoginAt: authState.lastLoginAt,
        });
      } else {
        // console.log('[AuthStore] No persisted auth state found, defaulting.');
        set({
            isAuthenticated: false,
            userId: undefined,
            userName: undefined,
            lastLoginAt: undefined,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize auth';
      console.error('[AuthStore] Initialization error:', errorMessage);
      set({ error: errorMessage, isAuthenticated: false, userId: undefined, userName: undefined });
    } finally {
      set({ isLoading: false });
      // console.log('[AuthStore] Initialization complete. Current state:', get());
    }
  },

  signup: async (userData: UserRegistrationInput) => {
    set({ isLoading: true, error: null });
    try {
      await registerUser(userData);
      // console.log('[AuthStore] Signup successful for:', userData.name);
      set({ isLoading: false });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to register user';
      console.error('[AuthStore] Signup error:', errorMessage);
      set({ isLoading: false, error: errorMessage });
      return false;
    }
  },

  login: async (credentials: UserLoginInput) => {
    set({ isLoading: true, error: null });
    try {
      const authState = await loginUser(credentials);
      // console.log('[AuthStore] Login successful, new state:', authState);
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
      console.error('[AuthStore] Login error:', errorMessage);
      set({ isLoading: false, error: errorMessage });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await logoutUser();
      // console.log('[AuthStore] Logout successful, clearing state.');
      set({
        isAuthenticated: false,
        userId: undefined,
        userName: undefined,
        lastLoginAt: undefined,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to logout';
      console.error('[AuthStore] Logout error:', errorMessage);
      set({ isLoading: false, error: errorMessage });
    }
  },

  fetchUserAndSecurityQuestion: async (emailOrPhone: string) => {
    set({ isLoading: true, error: null });
    try {
      const userDetails = await getUserDetailsForPasswordReset(emailOrPhone);
      set({ isLoading: false });
      return userDetails; // Returns { securityQuestion: string, userId: string }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user details';
      // console.error('[AuthStore] Fetch user details error:', errorMessage);
      set({ isLoading: false, error: errorMessage });
      return null;
    }
  },

  verifySecurityAnswer: async (emailOrPhone: string, answer: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await verifySecurityQuestion(emailOrPhone, answer);
      set({ isLoading: false });
      return user; // Returns the user object if successful, or null if verifySecurityQuestion throws (which it should on failure)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify security answer';
      // console.error('[AuthStore] Verify security answer error:', errorMessage);
      set({ isLoading: false, error: errorMessage });
      return null; // Ensure null is returned on error
    }
  },

  resetUserPassword: async (resetData: PasswordResetInput) => {
    set({ isLoading: true, error: null });
    try {
      const success = await resetPassword(resetData); // The DB operation
      set({ isLoading: false });
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      // console.error('[AuthStore] Reset password error:', errorMessage);
      set({ isLoading: false, error: errorMessage });
      return false;
    }
  },

  clearError: () => {
    set({ error: null });
  },

   updateAuthStoreUserName: async (newName: string, userIdToUpdate: string) => {
    // Only update if the newName is for the currently authenticated user
    if (get().isAuthenticated && get().userId === userIdToUpdate) {
      set({ userName: newName });
      // Also update the persisted AuthState table
      try {
        const db = getDatabase();
        await db.runAsync(
          'UPDATE AuthState SET userName = ?, updatedAt = ? WHERE id = "current_auth" AND userId = ?',
          [newName, new Date().toISOString(), userIdToUpdate]
        );
        // console.log('[AuthStore] Updated userName in AuthState table.');
      } catch (dbError) {
        console.error('[AuthStore] Failed to update userName in AuthState table:', dbError);
      }
    }
  },

  changeUserPassword: async (currentPassword: string, newPassword: string) => {
    const userId = get().userId;
    if (!userId) {
      const msg = 'User not authenticated to change password.';
      set({ error: msg });
      return { success: false, message: msg };
    }

    set({ isLoading: true, error: null });
    try {
      await dbChangePassword(userId, currentPassword, newPassword);
      set({ isLoading: false });
      // console.log('[AuthStore] Password changed successfully.');
      return { success: true, message: 'Password changed successfully!' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      // console.error('[AuthStore] Change password error:', errorMessage);
      set({ isLoading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },
}));