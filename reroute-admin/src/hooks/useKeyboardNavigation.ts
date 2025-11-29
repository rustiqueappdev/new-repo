import { useEffect, useCallback } from 'react';

/**
 * Custom hook for keyboard navigation shortcuts
 * @param shortcuts - Object mapping key combinations to callback functions
 * @param enabled - Whether keyboard shortcuts are enabled (default: true)
 */
interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
  description: string;
}

export const useKeyboardNavigation = (
  shortcuts: ShortcutConfig[],
  enabled: boolean = true
) => {
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          event.preventDefault();
          shortcut.callback();
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyPress);
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [handleKeyPress, enabled]);

  return shortcuts;
};

/**
 * Hook for Escape key to close modals/dialogs
 * @param onEscape - Callback when Escape is pressed
 * @param enabled - Whether the hook is active
 */
export const useEscapeKey = (
  onEscape: () => void,
  enabled: boolean = true
) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (enabled && event.key === 'Escape') {
        onEscape();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onEscape, enabled]);
};

/**
 * Hook for Enter key to submit forms
 * @param onEnter - Callback when Enter is pressed
 * @param enabled - Whether the hook is active
 */
export const useEnterKey = (
  onEnter: () => void,
  enabled: boolean = true
) => {
  useEffect(() => {
    const handleEnter = (event: KeyboardEvent) => {
      if (enabled && event.key === 'Enter' && !event.shiftKey) {
        // Don't submit if in a textarea (allow newlines)
        const target = event.target as HTMLElement;
        if (target.tagName === 'TEXTAREA') {
          return;
        }
        event.preventDefault();
        onEnter();
      }
    };

    window.addEventListener('keydown', handleEnter);
    return () => {
      window.removeEventListener('keydown', handleEnter);
    };
  }, [onEnter, enabled]);
};
