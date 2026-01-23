import { useEffect, useCallback, useRef } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
  key: string;
  handler: () => void;
  description?: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  disabled?: boolean;
}

/**
 * Hook for managing keyboard shortcuts
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: ' ', handler: flipCard, description: 'Flip card' },
 *   { key: '1', handler: () => rateCard(1), description: 'Rate 1' },
 * ]);
 */
export const useKeyboardShortcuts = (
  shortcuts: ShortcutConfig[],
  enabled: boolean = true
) => {
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if typing in input/textarea
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    const activeShortcuts = shortcutsRef.current;

    for (const shortcut of activeShortcuts) {
      if (shortcut.disabled) continue;

      const keyMatch = event.key === shortcut.key || event.code === shortcut.key;
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        shortcut.handler();
        break;
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
};

/**
 * Hook for arrow key navigation
 */
export const useArrowNavigation = (
  onPrevious: () => void,
  onNext: () => void,
  enabled: boolean = true
) => {
  useKeyboardShortcuts(
    [
      { key: 'ArrowLeft', handler: onPrevious, description: 'Previous' },
      { key: 'ArrowRight', handler: onNext, description: 'Next' },
    ],
    enabled
  );
};

/**
 * Hook for number key ratings (1-5)
 */
export const useNumberRatings = (
  onRate: (rating: number) => void,
  enabled: boolean = true,
  maxRating: number = 5
) => {
  const shortcuts = Array.from({ length: maxRating }, (_, i) => ({
    key: String(i + 1),
    handler: () => onRate(i + 1),
    description: `Rate ${i + 1}`,
  }));

  useKeyboardShortcuts(shortcuts, enabled);
};
