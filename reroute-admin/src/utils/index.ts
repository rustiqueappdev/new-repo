/**
 * Central export point for all utility functions
 */

// Formatters
export {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  formatPercentage,
  truncateText,
  snakeCaseToTitleCase,
  getStatusColor,
  getTimeAgo
} from './formatters';

// CSV Export
export {
  exportToCSV,
  generateExportFilename,
  objectsToCsvData
} from './csvExport';

// Firebase Helpers
export {
  fetchCollection,
  fetchPaginatedCollection,
  fetchByField,
  fetchActiveDocuments,
  timestampToDate,
  batchProcess,
  safeGet,
  fieldContains
} from './firebaseHelpers';

// Validation
export {
  isValidEmail,
  isValidPhoneNumber,
  isValidURL,
  isValidFutureDate,
  isValidDateRange,
  isPositiveNumber,
  isNonNegativeNumber,
  isValidPercentage,
  isNonEmptyString,
  hasMinLength,
  hasMaxLength,
  isValidPAN,
  isValidAadhaar,
  sanitizeInput,
  isValidFileSize,
  isValidFileExtension
} from './validation';
