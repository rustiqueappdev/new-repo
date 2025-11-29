/**
 * CSV Export utility functions
 */

/**
 * Export data to CSV file
 * @param headers - Array of column headers
 * @param data - Array of data rows (each row is an array of values)
 * @param filename - Name of the file to download
 * @returns Success message or throws error
 */
export const exportToCSV = (
  headers: string[],
  data: (string | number)[][],
  filename: string
): string => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Escape CSV values and wrap in quotes
  const escapeCSVValue = (value: string | number): string => {
    const stringValue = String(value);
    // Replace double quotes with two double quotes and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => row.map(escapeCSVValue).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);

  return `Exported ${data.length} records to ${filename}`;
};

/**
 * Generate timestamped filename for export
 * @param prefix - Filename prefix
 * @param extension - File extension (default: 'csv')
 * @returns Filename with timestamp
 */
export const generateExportFilename = (
  prefix: string,
  extension: string = 'csv'
): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  return `${prefix}_export_${timestamp}.${extension}`;
};

/**
 * Convert object array to CSV data format
 * @param objects - Array of objects to convert
 * @param keys - Keys to extract (in order)
 * @returns Array of arrays suitable for CSV export
 */
export const objectsToCsvData = <T extends Record<string, any>>(
  objects: T[],
  keys: (keyof T)[]
): (string | number)[][] => {
  return objects.map(obj =>
    keys.map(key => {
      const value = obj[key];
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      // Handle objects (stringify)
      if (typeof value === 'object') return JSON.stringify(value);
      return value;
    })
  );
};
