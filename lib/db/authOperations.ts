import { getDatabase } from './database';
import { 
  generateId, 
  generateSalt, 
  hashPassword, 
  verifyPassword, 
  normalizeEmail 
} from '../utils/authUtils';
import { 
  User, 
  UserRegistrationInput, 
  AuthState, 
  UserLoginInput, 
  PasswordResetInput 
} from '../models/user';

const db = getDatabase();

/**
 * Register a new user
 */
export const registerUser = async (input: UserRegistrationInput): Promise<User> => {
  try {
    // Ensure we have either email or phone
    if (!input.email && !input.phone) {
      throw new Error('Either email or phone is required');
    }

    // Generate unique ID and password salt
    const id = generateId();
    const salt = generateSalt();
    const passwordHash = hashPassword(input.password, salt);
    const now = new Date().toISOString();

    // Normalize email if provided
    const email = input.email ? normalizeEmail(input.email) : null;

    // Check if user already exists
    if (email) {
      const existingUser = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM Users WHERE email = ?',
        [email]
      );
      if (existingUser && existingUser.count > 0) {
        throw new Error('User with this email already exists');
      }
    }

    if (input.phone) {
      const existingUser = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM Users WHERE phone = ?',
        [input.phone]
      );
      if ((existingUser?.count ?? 0) > 0) {
        throw new Error('User with this phone number already exists');
      }
    }

    // Create the user
    const user: User = {
      id,
      name: input.name,
      email: email || undefined,
      phone: input.phone,
      passwordHash,
      passwordSalt: salt,
      securityQuestion: input.securityQuestion,
      securityAnswer: input.securityAnswer.toLowerCase(), // Store lowercase for case-insensitive comparison
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database
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

    return user;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

/**
 * Login a user
 */
export const loginUser = async (input: UserLoginInput): Promise<AuthState> => {
  try {
    // Find user by email or phone
    const user = await db.getFirstAsync<User>(
      'SELECT * FROM Users WHERE email = ? OR phone = ?',
      [input.emailOrPhone.toLowerCase(), input.emailOrPhone]
    );

    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isPasswordValid = verifyPassword(
      input.password,
      user.passwordSalt,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // Update auth state
    const now = new Date().toISOString();
    const authState: AuthState = {
      isAuthenticated: true,
      userId: user.id,
      userName: user.name,
      lastLoginAt: now,
    };

    // Store in AuthState table
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

    return authState;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

/**
 * Logout user - clear auth state
 */
export const logoutUser = async (): Promise<void> => {
  try {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE AuthState SET 
        isAuthenticated = ?, userId = NULL, userName = NULL, 
        lastLoginAt = NULL, updatedAt = ? 
      WHERE id = "current_auth"`,
      [0, now]
    );
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};

/**
 * Get current auth state from database
 */
export const getCurrentAuthState = async (): Promise<AuthState | null> => {
  try {
    const authState = await db.getFirstAsync<{
      isAuthenticated: number;
      userId: string | null;
      userName: string | null;
      lastLoginAt: string | null;
    }>('SELECT isAuthenticated, userId, userName, lastLoginAt FROM AuthState WHERE id = "current_auth"');

    if (!authState) {
      return null;
    }

    return {
      isAuthenticated: authState.isAuthenticated === 1,
      userId: authState.userId || undefined,
      userName: authState.userName || undefined,
      lastLoginAt: authState.lastLoginAt || undefined,
    };
  } catch (error) {
    console.error('Error getting auth state:', error);
    return null;
  }
};

/**
 * Verify security question for password reset
 */
export const verifySecurityQuestion = async (
  emailOrPhone: string, 
  securityAnswer: string
): Promise<User | null> => {
  try {
    const user = await db.getFirstAsync<User>(
      'SELECT * FROM Users WHERE email = ? OR phone = ?',
      [emailOrPhone.toLowerCase(), emailOrPhone]
    );

    if (!user) {
      throw new Error('User not found');
    }

    // Compare security answer (case insensitive)
    if (user.securityAnswer !== securityAnswer.toLowerCase()) {
      throw new Error('Incorrect security answer');
    }

    return user;
  } catch (error) {
    console.error('Error verifying security question:', error);
    throw error;
  }
};

/**
 * Reset user password
 */
export const resetPassword = async (input: PasswordResetInput): Promise<boolean> => {
  try {
    // Verify security answer
    const user = await verifySecurityQuestion(
      input.emailOrPhone, 
      input.securityAnswer
    );

    if (!user) {
      return false;
    }

    // Generate new salt and hash
    const salt = generateSalt();
    const passwordHash = hashPassword(input.newPassword, salt);
    const now = new Date().toISOString();

    // Update user record
    await db.runAsync(
      `UPDATE Users SET 
        passwordHash = ?, passwordSalt = ?, updatedAt = ? 
      WHERE id = ?`,
      [passwordHash, salt, now, user.id]
    );

    return true;
  } catch (error) {
    console.error('Error resetting password:', error);
    return false;
  }
};