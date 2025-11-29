/**
 * Validation utility functions
 */

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns True if valid email format
 */
export const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Indian phone number
 * @param phone - Phone number to validate
 * @returns True if valid 10-digit Indian phone number
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  // Remove spaces, dashes, and plus signs
  const cleaned = phone.replace(/[\s\-\+]/g, '');
  // Check for 10 digits (Indian mobile) or 12 digits with country code
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  return phoneRegex.test(cleaned);
};

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns True if valid URL
 */
export const isValidURL = (url: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate date is not in the past
 * @param date - Date to validate
 * @returns True if date is today or in the future
 */
export const isValidFutureDate = (date: Date | string): boolean => {
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate >= today;
};

/**
 * Validate date range (start before end)
 * @param startDate - Start date
 * @param endDate - End date
 * @returns True if start date is before end date
 */
export const isValidDateRange = (startDate: Date | string, endDate: Date | string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end;
};

/**
 * Validate positive number
 * @param value - Value to validate
 * @returns True if positive number
 */
export const isPositiveNumber = (value: number | string): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num > 0;
};

/**
 * Validate non-negative number
 * @param value - Value to validate
 * @returns True if zero or positive number
 */
export const isNonNegativeNumber = (value: number | string): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= 0;
};

/**
 * Validate percentage value (0-100)
 * @param value - Value to validate
 * @returns True if between 0 and 100
 */
export const isValidPercentage = (value: number | string): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= 0 && num <= 100;
};

/**
 * Validate string is not empty (after trimming)
 * @param value - String to validate
 * @returns True if string has content
 */
export const isNonEmptyString = (value: string): boolean => {
  return Boolean(value && value.trim().length > 0);
};

/**
 * Validate minimum string length
 * @param value - String to validate
 * @param minLength - Minimum required length
 * @returns True if string meets minimum length
 */
export const hasMinLength = (value: string, minLength: number): boolean => {
  return Boolean(value && value.trim().length >= minLength);
};

/**
 * Validate maximum string length
 * @param value - String to validate
 * @param maxLength - Maximum allowed length
 * @returns True if string is within maximum length
 */
export const hasMaxLength = (value: string, maxLength: number): boolean => {
  return !value || value.trim().length <= maxLength;
};

/**
 * Validate PAN card format (Indian)
 * @param pan - PAN card number
 * @returns True if valid PAN format
 */
export const isValidPAN = (pan: string): boolean => {
  if (!pan) return false;
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan.toUpperCase());
};

/**
 * Validate Aadhaar number format (Indian)
 * @param aadhaar - Aadhaar number
 * @returns True if valid Aadhaar format
 */
export const isValidAadhaar = (aadhaar: string): boolean => {
  if (!aadhaar) return false;
  const cleaned = aadhaar.replace(/[\s\-]/g, '');
  const aadhaarRegex = /^[2-9]{1}[0-9]{11}$/;
  return aadhaarRegex.test(cleaned);
};

/**
 * Sanitize user input to prevent XSS
 * @param input - User input string
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
};

/**
 * Validate file size
 * @param fileSizeInBytes - File size in bytes
 * @param maxSizeInMB - Maximum allowed size in MB
 * @returns True if file size is within limit
 */
export const isValidFileSize = (fileSizeInBytes: number, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return fileSizeInBytes <= maxSizeInBytes;
};

/**
 * Validate file extension
 * @param filename - Name of the file
 * @param allowedExtensions - Array of allowed extensions (e.g., ['jpg', 'png'])
 * @returns True if file extension is allowed
 */
export const isValidFileExtension = (filename: string, allowedExtensions: string[]): boolean => {
  if (!filename) return false;
  const extension = filename.split('.').pop()?.toLowerCase();
  return Boolean(extension && allowedExtensions.includes(extension));
};
