// ~/lib/utils/formValidation.ts

export type ValidationError = {
    field: string;
    message: string;
  };
  
  export type ValidationResult = {
    isValid: boolean;
    errors: ValidationError[];
  };
  
  /**
   * Validates a form field is not empty
   * @param value The field value to validate
   * @param fieldName The name of the field for error reporting
   * @returns ValidationError or null
   */
  export const validateRequired = (value: string | null | undefined, fieldName: string): ValidationError | null => {
    if (!value || value.trim() === '') {
      return {
        field: fieldName,
        message: `${fieldName} is required`,
      };
    }
    return null;
  };
  
  /**
   * Validates email format
   * @param email Email to validate
   * @param required Whether the field is required
   * @returns ValidationError or null
   */
  export const validateEmail = (email: string | null | undefined, required = true): ValidationError | null => {
    if (!email || email.trim() === '') {
      return required ? { field: 'email', message: 'Email is required' } : null;
    }
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return { field: 'email', message: 'Invalid email format' };
    }
    
    return null;
  };
  
  /**
   * Validates phone number format
   * @param phone Phone number to validate
   * @param required Whether the field is required
   * @returns ValidationError or null
   */
  export const validatePhone = (phone: string | null | undefined, required = true): ValidationError | null => {
    if (!phone || phone.trim() === '') {
      return required ? { field: 'phone', message: 'Phone number is required' } : null;
    }
    
    // Basic phone validation - adjust based on your country format requirements
    const phonePattern = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,7}$/;
    if (!phonePattern.test(phone)) {
      return { field: 'phone', message: 'Invalid phone number format' };
    }
    
    return null;
  };
  
  /**
   * Validates password strength
   * @param password Password to validate
   * @returns ValidationError or null
   */
  export const validatePassword = (password: string): ValidationError | null => {
    if (!password) {
      return { field: 'password', message: 'Password is required' };
    }
    
    if (password.length < 8) {
      return { field: 'password', message: 'Password must be at least 8 characters long' };
    }
    
    if (!/\d/.test(password)) {
      return { field: 'password', message: 'Password must contain at least one number' };
    }
    
    if (!/[a-zA-Z]/.test(password)) {
      return { field: 'password', message: 'Password must contain at least one letter' };
    }
    
    return null;
  };
  
  /**
   * Validates that two passwords match
   * @param password The original password
   * @param confirmPassword The confirmation password
   * @returns ValidationError or null
   */
  export const validatePasswordMatch = (password: string, confirmPassword: string): ValidationError | null => {
    if (password !== confirmPassword) {
      return { field: 'confirmPassword', message: 'Passwords do not match' };
    }
    return null;
  };
  
  /**
   * Validates a numeric value
   * @param value The value to validate
   * @param fieldName The name of the field
   * @param options Options for validation (min, max, required)
   * @returns ValidationError or null
   */
  export const validateNumeric = (
    value: string | number | null | undefined,
    fieldName: string,
    options: { min?: number; max?: number; required?: boolean } = {}
  ): ValidationError | null => {
    const { min, max, required = true } = options;
    
    // Convert to string if number
    const strValue = value?.toString() || '';
    
    if ((!strValue || strValue.trim() === '') && required) {
      return { field: fieldName, message: `${fieldName} is required` };
    }
    
    if (strValue && strValue.trim() !== '') {
      const numValue = parseFloat(strValue);
      
      if (isNaN(numValue)) {
        return { field: fieldName, message: `${fieldName} must be a number` };
      }
      
      if (min !== undefined && numValue < min) {
        return { field: fieldName, message: `${fieldName} must be at least ${min}` };
      }
      
      if (max !== undefined && numValue > max) {
        return { field: fieldName, message: `${fieldName} must be at most ${max}` };
      }
    }
    
    return null;
  };
  
  /**
   * Combine multiple validators for form validation
   * @param validators Array of validation results (null means valid)
   * @returns ValidationResult with isValid flag and errors array
   */
  export const combineValidators = (validators: (ValidationError | null)[]): ValidationResult => {
    const errors = validators.filter((error): error is ValidationError => error !== null);
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  };
  
  /**
   * Get first error message for a specific field
   * @param validationResult The validation result from combineValidators
   * @param fieldName The field name to get error for
   * @returns Error message or null
   */
  export const getFieldError = (validationResult: ValidationResult, fieldName: string): string | null => {
    const fieldError = validationResult.errors.find(error => error.field === fieldName);
    return fieldError ? fieldError.message : null;
  };
  
  /**
   * Creates a form state object with errors mapped by field name
   * @param validationResult The validation result from combineValidators
   * @returns Object with field names as keys and error messages as values
   */
  export const mapErrorsByField = (validationResult: ValidationResult): Record<string, string> => {
    return validationResult.errors.reduce((acc, error) => {
      acc[error.field] = error.message;
      return acc;
    }, {} as Record<string, string>);
  };