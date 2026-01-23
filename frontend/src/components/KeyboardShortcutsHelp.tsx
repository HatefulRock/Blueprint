import React, { useState } from 'react';
import { View } from '../types';

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

const shortcutGroups: Record<string, ShortcutGroup[]> = {
  global: [
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['?'], description: 'Show keyboard shortcuts' },
        { keys: ['Esc'], description: 'Close modals/popups' },
      ],
    },
  ],
  flashcards: [
    {
      title: 'Flashcard Review',
      shortcuts: [
        { keys: ['Space'], description: 'Flip card' },
        { keys: ['1'], description: 'Rate: Again (needs review)' },
        { keys: ['2'], description: 'Rate: Hard' },
        { keys: ['3'], description: 'Rate: Good' },
        { keys: ['4'], description: 'Rate: Easy' },
      ],
    },
  ],
  grammar: [
    {
      title: 'Grammar Exercises',
      shortcuts: [
        { keys: ['Enter'], description: 'Check answer / Continue' },
        { keys: ['←'], description: 'Previous exercise' },
      ],
    },
  ],
  reader: [
    {
      title: 'Reading Session',
      shortcuts: [
        { keys: ['Esc'], description: 'Close analysis popup' },
      ],
    },
  ],
};

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  currentView?: View;
}

const KeyBadge = ({ keyLabel }: { keyLabel: string }) => (
  <kbd className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm font-mono text-slate-200 shadow-sm">
    {keyLabel}
  </kbd>
);

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  currentView,
}) => {
  if (!isOpen) return null;

  // Determine which shortcuts to show based on current view
  let relevantGroups: ShortcutGroup[] = [...shortcutGroups.global];

  if (currentView === View.Flashcards) {
    relevantGroups = [...relevantGroups, ...shortcutGroups.flashcards];
  } else if (currentView === View.Grammar) {
    relevantGroups = [...relevantGroups, ...shortcutGroups.grammar];
  } else if (currentView === View.ReadingSession) {
    relevantGroups = [...relevantGroups, ...shortcutGroups.reader];
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Keyboard Shortcuts
            </h2>
            <p className="text-slate-400 text-sm">
              Speed up your workflow with these shortcuts
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {relevantGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <h3 className="text-lg font-semibold text-sky-400 mb-4">
                {group.title}
              </h3>
              <div className="space-y-3">
                {group.shortcuts.map((shortcut, shortcutIndex) => (
                  <div
                    key={shortcutIndex}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <span className="text-slate-200">{shortcut.description}</span>
                    <div className="flex items-center gap-2">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          {keyIndex > 0 && (
                            <span className="text-slate-500 text-sm">+</span>
                          )}
                          <KeyBadge keyLabel={key} />
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* All shortcuts section */}
          {currentView && [View.Dashboard, View.Reader, View.Vocabulary].includes(currentView) && (
            <div className="mt-8 p-4 bg-slate-700/30 border border-slate-600 rounded-lg">
              <p className="text-slate-400 text-sm text-center">
                View-specific shortcuts are available in Flashcards, Grammar, and Reading
                sessions
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4 text-center">
          <p className="text-slate-400 text-sm">
            Press <KeyBadge keyLabel="?" /> to toggle this help anytime, or{' '}
            <KeyBadge keyLabel="Esc" /> to close
          </p>
        </div>
      </div>
    </div>
  );
};

// Hook to toggle keyboard shortcuts help
export const useKeyboardShortcutsHelp = () => {
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle with ? key (Shift + /)
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if typing in input/textarea
        if (
          target.tagName !== 'INPUT' &&
          target.tagName !== 'TEXTAREA' &&
          !target.isContentEditable
        ) {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }
      }
      // Close with Escape
      else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
};
