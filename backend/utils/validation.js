// utils/validation.js - Input validation utilities

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Vietnamese format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidPhone = (phone) => {
  if (!phone) return false;
  // Vietnamese phone: 0xxxxxxxxx or +84xxxxxxxxx (10-11 digits)
  const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
};

/**
 * Validate Vietnamese National ID (CCCD/CMND)
 * @param {string} nationalId - National ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidNationalId = (nationalId) => {
  if (!nationalId) return false;
  // CCCD: 12 digits, CMND: 9 digits
  const idRegex = /^[0-9]{9}$|^[0-9]{12}$/;
  return idRegex.test(nationalId);
};

/**
 * Validate Vietnamese Health Insurance Number (BHYT)
 * @param {string} insuranceNumber - Insurance number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidInsuranceNumber = (insuranceNumber) => {
  if (!insuranceNumber) return false;
  // BHYT: Format XX1234567890123 (2 letters + 13 digits = 15 chars)
  const bhytRegex = /^[A-Z]{2}[0-9]{13}$/;
  return bhytRegex.test(insuranceNumber.toUpperCase());
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - { isValid: boolean, errors: Array<string> }
 */
const validatePassword = (password) => {
  const errors = [];

  if (!password) {
    return { isValid: false, errors: ["Password is required"] };
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[@$!%*?&#]/.test(password)) {
    errors.push(
      "Password must contain at least one special character (@$!%*?&#)"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate date of birth
 * @param {string} dateOfBirth - Date of birth in YYYY-MM-DD format
 * @returns {Object} - { isValid: boolean, error: string|null }
 */
const isValidDateOfBirth = (dateOfBirth) => {
  if (!dateOfBirth) {
    return { isValid: false, error: "Date of birth is required" };
  }

  const date = new Date(dateOfBirth);
  const now = new Date();

  if (isNaN(date.getTime())) {
    return { isValid: false, error: "Invalid date format" };
  }

  if (date > now) {
    return { isValid: false, error: "Date of birth cannot be in the future" };
  }

  // Check if age is reasonable (0-150 years)
  const age = now.getFullYear() - date.getFullYear();
  if (age < 0 || age > 150) {
    return { isValid: false, error: "Invalid age range" };
  }

  return { isValid: true, error: null };
};

/**
 * Validate gender value
 * @param {string} gender - Gender value
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidGender = (gender) => {
  if (!gender) return false;
  const validGenders = ["male", "female", "other"];
  return validGenders.includes(gender.toLowerCase());
};

/**
 * Validate user role
 * @param {string} role - User role
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidRole = (role) => {
  if (!role) return false;
  const validRoles = ["admin", "doctor", "nurse", "receptionist", "patient"];
  return validRoles.includes(role.toLowerCase());
};

/**
 * Sanitize string input (remove dangerous characters)
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeString = (input) => {
  if (!input) return "";
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, "") // Remove < and >
    .trim();
};

/**
 * Validate required fields in an object
 * @param {Object} data - Data object to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Object} - { isValid: boolean, missing: Array<string> }
 */
const validateRequiredFields = (data, requiredFields) => {
  const missing = requiredFields.filter((field) => {
    const value = data[field];
    return value === undefined || value === null || value === "";
  });

  return {
    isValid: missing.length === 0,
    missing,
  };
};

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidNationalId,
  isValidInsuranceNumber,
  validatePassword,
  isValidDateOfBirth,
  isValidGender,
  isValidRole,
  sanitizeString,
  validateRequiredFields,
};
