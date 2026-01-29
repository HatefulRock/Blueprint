import React, { useState, useRef, useEffect } from 'react';
import { View } from '../../../types';

interface DropdownOption {
  label: string;
  view: View;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface HeaderDropdownProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  options: DropdownOption[];
  currentView: View;
  onNavigate: (view: View) => void;
  isActive: boolean;
  lastVisitedView?: View;
}

export const HeaderDropdown: React.FC<HeaderDropdownProps> = ({
  label,
  icon: Icon,
  options,
  currentView,
  onNavigate,
  isActive,
  lastVisitedView,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }

    // Open after short delay
    const timeout = setTimeout(() => {
      setIsOpen(true);
    }, 150);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    // Clear timeout if we leave before it fires
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }

    // Close after short delay
    const timeout = setTimeout(() => {
      setIsOpen(false);
    }, 200);
    setHoverTimeout(timeout);
  };

  const handleButtonClick = () => {
    // If dropdown is closed, open it
    if (!isOpen) {
      setIsOpen(true);
    } else {
      // If open and we have a last visited view, navigate to it
      if (lastVisitedView) {
        onNavigate(lastVisitedView);
        setIsOpen(false);
      } else {
        // Otherwise navigate to first option
        onNavigate(options[0].view);
        setIsOpen(false);
      }
    }
  };

  const handleOptionClick = (view: View) => {
    onNavigate(view);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleButtonClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-sky-500 text-white'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
      >
        <Icon className="w-5 h-5" />
        {label}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg shadow-slate-900/50 overflow-hidden z-50 animate-fade-in">
          {options.map((option) => {
            const OptionIcon = option.icon;
            const isOptionActive = currentView === option.view;

            return (
              <button
                key={option.view}
                onClick={() => handleOptionClick(option.view)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  isOptionActive
                    ? 'bg-sky-500/20 text-sky-400 border-l-2 border-sky-500'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <OptionIcon className="w-4 h-4" />
                <span className="flex-1 text-left">{option.label}</span>
                {option.badge !== undefined && option.badge > 0 && (
                  <span className="px-2 py-0.5 bg-sky-500 text-white text-xs font-bold rounded-full">
                    {option.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out;
        }
      `}</style>
    </div>
  );
};
