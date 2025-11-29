/**
 * Accessibility utility functions and ARIA label generators
 */

/**
 * Generate ARIA label for table cell
 * @param columnName - Name of the column
 * @param value - Value in the cell
 * @returns ARIA label string
 */
export const getTableCellAriaLabel = (columnName: string, value: any): string => {
  return `${columnName}: ${value}`;
};

/**
 * Generate ARIA label for action button
 * @param action - Type of action (edit, delete, view, etc.)
 * @param itemName - Name of the item being acted upon
 * @returns ARIA label string
 */
export const getActionButtonAriaLabel = (action: string, itemName: string): string => {
  const actionMap: Record<string, string> = {
    edit: 'Edit',
    delete: 'Delete',
    view: 'View details for',
    approve: 'Approve',
    reject: 'Reject',
    activate: 'Activate',
    deactivate: 'Deactivate',
    download: 'Download',
    export: 'Export',
    cancel: 'Cancel'
  };

  const actionText = actionMap[action.toLowerCase()] || action;
  return `${actionText} ${itemName}`;
};

/**
 * Generate ARIA label for status chip
 * @param status - Status value
 * @param itemType - Type of item (booking, farmhouse, etc.)
 * @returns ARIA label string
 */
export const getStatusAriaLabel = (status: string, itemType: string = 'item'): string => {
  return `${itemType} status: ${status}`;
};

/**
 * Generate ARIA label for search input
 * @param searchType - What is being searched
 * @returns ARIA label string
 */
export const getSearchAriaLabel = (searchType: string): string => {
  return `Search ${searchType}`;
};

/**
 * Generate ARIA label for filter select
 * @param filterType - Type of filter
 * @returns ARIA label string
 */
export const getFilterAriaLabel = (filterType: string): string => {
  return `Filter by ${filterType}`;
};

/**
 * Generate ARIA label for pagination
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @returns ARIA label string
 */
export const getPaginationAriaLabel = (currentPage: number, totalPages: number): string => {
  return `Page ${currentPage} of ${totalPages}`;
};

/**
 * Generate ARIA live region announcement
 * @param message - Message to announce
 * @param politeness - ARIA live politeness level
 * @returns ARIA live props
 */
export const getAriaLiveProps = (
  message: string,
  politeness: 'polite' | 'assertive' = 'polite'
) => {
  return {
    'aria-live': politeness,
    'aria-atomic': 'true',
    role: 'status',
    children: message
  };
};

/**
 * Announce message to screen readers
 * @param message - Message to announce
 * @param politeness - Politeness level
 */
export const announceToScreenReader = (
  message: string,
  politeness: 'polite' | 'assertive' = 'polite'
): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', politeness);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Generate ARIA label for dialog/modal
 * @param dialogType - Type of dialog (confirmation, form, etc.)
 * @param itemName - Name of item dialog relates to
 * @returns ARIA label props
 */
export const getDialogAriaProps = (dialogType: string, itemName?: string) => {
  const title = itemName ? `${dialogType} ${itemName}` : dialogType;
  return {
    'aria-labelledby': 'dialog-title',
    'aria-describedby': 'dialog-description',
    role: 'dialog',
    'aria-modal': 'true'
  };
};

/**
 * Generate ARIA props for loading state
 * @param isLoading - Whether content is loading
 * @param loadingMessage - Message to display while loading
 * @returns ARIA props object
 */
export const getLoadingAriaProps = (
  isLoading: boolean,
  loadingMessage: string = 'Loading content'
) => {
  if (!isLoading) return {};

  return {
    'aria-busy': 'true',
    'aria-live': 'polite',
    'aria-label': loadingMessage
  };
};

/**
 * Generate ARIA props for sortable table header
 * @param columnName - Name of the column
 * @param sortDirection - Current sort direction ('asc', 'desc', or null)
 * @returns ARIA props object
 */
export const getSortableHeaderAriaProps = (
  columnName: string,
  sortDirection: 'asc' | 'desc' | null
) => {
  const ariaSort = sortDirection === 'asc' ? 'ascending' :
                   sortDirection === 'desc' ? 'descending' : 'none';

  return {
    'aria-sort': ariaSort,
    'aria-label': `${columnName}, sortable column`,
    role: 'columnheader'
  };
};

/**
 * Check if element is keyboard focusable
 * @param element - DOM element to check
 * @returns True if element is focusable
 */
export const isFocusable = (element: HTMLElement): boolean => {
  if (!element) return false;

  const focusableElements = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'];
  const isFocusableTag = focusableElements.includes(element.tagName);
  const hasTabIndex = element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1';

  return !element.hasAttribute('disabled') && (isFocusableTag || hasTabIndex);
};

/**
 * Get all focusable elements within a container
 * @param container - Container element
 * @returns Array of focusable elements
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  return Array.from(container.querySelectorAll(selector));
};

/**
 * Trap focus within a container (useful for modals)
 * @param container - Container to trap focus in
 * @returns Cleanup function
 */
export const trapFocus = (container: HTMLElement): (() => void) => {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus first element
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
};
