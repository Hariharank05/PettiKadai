/**
 * Authentication utilities for Petti Kadai
 * 
 * Since we can't use crypto libraries, we're implementing a custom,
 * simple hashing algorithm for demonstration purposes.
 * In a real-world app, use a proper crypto library.
 */

// Generate a random string for salt
export function generateSalt(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  // Custom hash function using Base64 encoding and string manipulation
  export function hashPassword(password: string, salt: string): string {
    // Concatenate the password and salt
    const combined = password + salt;
    
    // Simple character shifting (not secure, but demonstrates the concept)
    let shifted = '';
    for (let i = 0; i < combined.length; i++) {
      const charCode = combined.charCodeAt(i);
      shifted += String.fromCharCode(charCode + 7); // Add 7 to each char code
    }
    
    // Convert to Base64-like encoding
    return btoa(shifted);
  }
  
  // Verify password
  export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
    const computedHash = hashPassword(password, salt);
    return computedHash === storedHash;
  }
  
  // Generate an ID (timestamp + random string)
  export function generateId(): string {
    const timestamp = Date.now().toString();
    const randomPart = Math.random().toString(36).substring(2, 11);
    return `${timestamp}-${randomPart}`;
  }
  
  // Normalize email (lowercase)
  export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
  
  // Basic email validation
  export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // Basic phone validation (allows various formats)
  export function validatePhone(phone: string): boolean {
    // Accept numbers with optional +, spaces, dashes, parentheses
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,7}$/;
    return phoneRegex.test(phone);
  }
  
  // Password strength validation (minimum 8 chars, at least 1 number)
  export function validatePasswordStrength(password: string): boolean {
    return password.length >= 8 && /\d/.test(password);
  }