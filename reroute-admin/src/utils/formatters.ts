/**
 * Utility functions for formatting data throughout the application
 */

/**
 * Format Firestore timestamp to readable date string
 * @param timestamp - Firestore timestamp or Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string or 'N/A' if invalid
 */
export const formatDate = (
  timestamp: any,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }
): string => {
  if (!timestamp) return 'N/A';

  try {
    // Handle Firestore Timestamp
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return new Date(timestamp.toDate()).toLocaleDateString('en-IN', options);
    }

    // Handle Date object or string
    return new Date(timestamp).toLocaleDateString('en-IN', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

/**
 * Format Firestore timestamp to readable date and time string
 * @param timestamp - Firestore timestamp or Date object
 * @returns Formatted date-time string or 'N/A' if invalid
 */
export const formatDateTime = (timestamp: any): string => {
  if (!timestamp) return 'N/A';

  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date-time:', error);
    return 'N/A';
  }
};

/**
 * Format currency amount in Indian Rupees
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) return '₹0';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(numAmount);
};

/**
 * Format number with Indian numbering system (lakhs, crores)
 * @param num - Number to format
 * @returns Formatted number string
 */
export const formatNumber = (num: number | string): string => {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;

  if (isNaN(numValue)) return '0';

  return new Intl.NumberFormat('en-IN').format(numValue);
};

/**
 * Format percentage value
 * @param value - Value to format as percentage
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  if (isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Truncate text to specified length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Convert snake_case to Title Case
 * @param text - Snake case text
 * @returns Title case text
 */
export const snakeCaseToTitleCase = (text: string): string => {
  if (!text) return '';
  return text
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Get status color for MUI Chip component
 * @param status - Status string
 * @returns MUI color prop value
 */
export const getStatusColor = (
  status: string
): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const statusLower = status?.toLowerCase();

  switch (statusLower) {
    case 'approved':
    case 'active':
    case 'completed':
    case 'confirmed':
    case 'success':
      return 'success';

    case 'pending':
    case 'in_progress':
    case 'processing':
      return 'warning';

    case 'rejected':
    case 'cancelled':
    case 'failed':
    case 'inactive':
      return 'error';

    case 'draft':
    case 'upcoming':
      return 'info';

    default:
      return 'default';
  }
};

/**
 * Calculate time difference from now
 * @param timestamp - Past timestamp
 * @returns Human-readable time difference
 */
export const getTimeAgo = (timestamp: any): string => {
  if (!timestamp) return 'Unknown';

  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return formatDate(timestamp);
  } catch (error) {
    console.error('Error calculating time ago:', error);
    return 'Unknown';
  }
};
