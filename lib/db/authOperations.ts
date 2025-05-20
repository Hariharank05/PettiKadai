// ~/lib/db/authOperations.ts
import { getDatabase } from './database';
import {
  generateId,
  generateSalt,
  hashPassword,
  verifyPassword,
  normalizeEmail
} from '../utils/authUtils'; // Assuming authUtils.ts exists and is correct
import {
  User,
  UserRegistrationInput,
  AuthState,
  UserLoginInput,
  PasswordResetInput
} from '../models/user'; // Assuming user.ts model exists

const db = getDatabase();

/**
 * Register a new user
 */
export const registerUser = async (input: UserRegistrationInput): Promise<User> => {
  // console.log('[AuthOps] Registering user:', input.name);
  try {
    if (!input.email && !input.phone) {
      throw new Error('Either email or phone is required');
    }

    const id = generateId(); // Use your custom generateId
    const salt = generateSalt();
    const passwordHash = hashPassword(input.password, salt);
    const now = new Date().toISOString();
    const email = input.email ? normalizeEmail(input.email) : null;

    // Check if user already exists by email
    if (email) {
      const existingUserByEmail = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM Users WHERE email = ?',
        [email]
      );
      if (existingUserByEmail && existingUserByEmail.count > 0) {
        throw new Error('User with this email already exists');
      }
    }

    // Check if user already exists by phone
    if (input.phone) {
      const existingUserByPhone = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM Users WHERE phone = ?',
        [input.phone]
      );
      if (existingUserByPhone && existingUserByPhone.count > 0) {
        throw new Error('User with this phone number already exists');
      }
    }

    const user: User = {
      id,
      name: input.name,
      email: email || undefined,
      phone: input.phone,
      passwordHash,
      passwordSalt: salt,
      securityQuestion: input.securityQuestion,
      securityAnswer: input.securityAnswer.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };

    await db.runAsync(
      `INSERT INTO Users (
        id, name, email, phone, passwordHash, passwordSalt,
        securityQuestion, securityAnswer, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.email || null,
        user.phone || null,
        user.passwordHash,
        user.passwordSalt,
        user.securityQuestion,
        user.securityAnswer,
        user.createdAt,
        user.updatedAt,
      ]
    );
    // console.log('[AuthOps] User registered successfully:', user.id);
    return user;
  } catch (error) {
    console.error('[AuthOps] Error registering user:', error);
    throw error;
  }
};

/**
 * Login a user
 */
export const loginUser = async (input: UserLoginInput): Promise<AuthState> => {
  // console.log('[AuthOps] Attempting login for:', input.emailOrPhone);
  try {
    const normalizedIdentifier = input.emailOrPhone.includes('@') ? normalizeEmail(input.emailOrPhone) : input.emailOrPhone;
    const user = await db.getFirstAsync<User>(
      'SELECT * FROM Users WHERE email = ? OR phone = ?',
      [normalizedIdentifier, input.emailOrPhone]
    );

    if (!user) {
      throw new Error('User not found. Please check your email/phone.');
    }

    const isPasswordValid = verifyPassword(
      input.password,
      user.passwordSalt,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new Error('Invalid password. Please try again.');
    }

    const now = new Date().toISOString();
    const authState: AuthState = {
      isAuthenticated: true,
      userId: user.id,
      userName: user.name,
      lastLoginAt: now,
    };

    const existingAuth = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM AuthState WHERE id = "current_auth"'
    );

    if (existingAuth) {
      await db.runAsync(
        `UPDATE AuthState SET
          isAuthenticated = ?, userId = ?, userName = ?,
          lastLoginAt = ?, updatedAt = ?
        WHERE id = "current_auth"`,
        [1, user.id, user.name, now, now]
      );
    } else {
      await db.runAsync(
        `INSERT INTO AuthState (
          id, isAuthenticated, userId, userName, lastLoginAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        ['current_auth', 1, user.id, user.name, now, now]
      );
    }
    // console.log('[AuthOps] Login successful, AuthState updated for user:', user.id);
    return authState;
  } catch (error) {
    console.error('[AuthOps] Error logging in:', error);
    throw error;
  }
};

/**
 * Logout user - clear auth state
 */
export const logoutUser = async (): Promise<void> => {
  // console.log('[AuthOps] Logging out user.');
  try {
    const now = new Date().toISOString();
    // Instead of deleting, set isAuthenticated to 0 and clear user-specific fields
    await db.runAsync(
      `UPDATE AuthState SET
        isAuthenticated = 0, userId = NULL, userName = NULL,
        lastLoginAt = NULL, updatedAt = ?
      WHERE id = "current_auth"`,
      [now]
    );
    // console.log('[AuthOps] Logout successful, AuthState cleared.');
  } catch (error) {
    console.error('[AuthOps] Error logging out:', error);
    throw error;
  }
};

/**
 * Get current auth state from database
 */
export const getCurrentAuthState = async (): Promise<AuthState | null> => {
  // console.log('[AuthOps] Getting current auth state.');
  try {
    const authStateRow = await db.getFirstAsync<{
      isAuthenticated: number; // SQLite stores boolean as 0 or 1
      userId: string | null;
      userName: string | null;
      lastLoginAt: string | null;
    }>('SELECT isAuthenticated, userId, userName, lastLoginAt FROM AuthState WHERE id = "current_auth"');

    if (!authStateRow) {
      // console.log('[AuthOps] No auth state found in DB, returning default (not authenticated).');
      // If no row exists, it means first run or cleared state, so treat as not authenticated.
      return {
        isAuthenticated: false,
        userId: undefined,
        userName: undefined,
        lastLoginAt: undefined,
      };
    }
    // console.log('[AuthOps] Auth state retrieved from DB:', authStateRow);
    return {
      isAuthenticated: authStateRow.isAuthenticated === 1,
      userId: authStateRow.userId || undefined,
      userName: authStateRow.userName || undefined,
      lastLoginAt: authStateRow.lastLoginAt || undefined,
    };
  } catch (error) {
    console.error('[AuthOps] Error getting auth state:', error);
    // Return a non-authenticated state on error to prevent app lock/crash
    return {
      isAuthenticated: false,
      userId: undefined,
      userName: undefined,
      lastLoginAt: undefined,
    };
  }
};


/**
 * Verify security question for password reset
 */
export const verifySecurityQuestion = async (
  emailOrPhone: string,
  securityAnswer: string
): Promise<User | null> => {
  // console.log('[AuthOps] Verifying security question for:', emailOrPhone);
  try {
    const normalizedIdentifier = emailOrPhone.includes('@') ? normalizeEmail(emailOrPhone) : emailOrPhone;
    const user = await db.getFirstAsync<User>(
      'SELECT * FROM Users WHERE email = ? OR phone = ?',
      [normalizedIdentifier, emailOrPhone]
    );

    if (!user) {
      throw new Error('User not found');
    }

    if (user.securityAnswer.toLowerCase() !== securityAnswer.toLowerCase()) {
      throw new Error('Incorrect security answer');
    }
    // console.log('[AuthOps] Security question verified for user:', user.id);
    return user;
  } catch (error) {
    console.error('[AuthOps] Error verifying security question:', error);
    throw error;
  }
};

/**
 * Reset user password
 */
export const resetPassword = async (input: PasswordResetInput): Promise<boolean> => {
  // console.log('[AuthOps] Attempting password reset for:', input.emailOrPhone);
  try {
    const user = await verifySecurityQuestion(
      input.emailOrPhone,
      input.securityAnswer
    );

    if (!user) {
      // verifySecurityQuestion would have thrown, but as a safeguard:
      throw new Error("User not found or security answer incorrect during password reset.");
    }

    const newSalt = generateSalt();
    const newPasswordHash = hashPassword(input.newPassword, newSalt);
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE Users SET
        passwordHash = ?, passwordSalt = ?, updatedAt = ?
      WHERE id = ?`,
      [newPasswordHash, newSalt, now, user.id]
    );
    // console.log('[AuthOps] Password reset successful for user:', user.id);
    return true;
  } catch (error) {
    console.error('[AuthOps] Error resetting password:', error);
    return false; // Or throw error to be handled by store
  }
};

/**
 * Get user by ID (needed for fetching salt during password change)
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  // console.log('[AuthOps] Getting user by ID:', userId);
  try {
    const user = await db.getFirstAsync<User>(
      'SELECT * FROM Users WHERE id = ?',
      [userId]
    );
    return user;
  } catch (error) {
    console.error('[AuthOps] Error getting user by ID:', error);
    throw error; // Or return null based on how you want to handle "not found"
  }
};

/**
 * Change user password
 */
export const changePassword = async (
  userId: string,
  currentPasswordPlain: string,
  newPasswordPlain: string
): Promise<boolean> => {
  // console.log('[AuthOps] Attempting to change password for user:', userId);
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    const isCurrentPasswordValid = verifyPassword(
      currentPasswordPlain,
      user.passwordSalt,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Incorrect current password.');
    }

    // Strength check for new password (can be more sophisticated)
    if (newPasswordPlain.length < 8) {
        throw new Error('New password must be at least 8 characters long.');
    }
    if (newPasswordPlain === currentPasswordPlain) {
        throw new Error('New password cannot be the same as the current password.');
    }


    const newSalt = generateSalt();
    const newPasswordHash = hashPassword(newPasswordPlain, newSalt);
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE Users SET
        passwordHash = ?, passwordSalt = ?, updatedAt = ?
      WHERE id = ?`,
      [newPasswordHash, newSalt, now, userId]
    );
    // console.log('[AuthOps] Password changed successfully for user:', userId);
    return true;
  } catch (error) {
    console.error('[AuthOps] Error changing password:', error);
    throw error; // Re-throw to be caught by the calling function (in store or component)
  }
};