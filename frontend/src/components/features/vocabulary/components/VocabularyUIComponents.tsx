import React from 'react';
import { SortAscendingIcon } from '../../../common/icons/SortAscendingIcon';
import { SortDescendingIcon } from '../../../common/icons/SortDescendingIcon';
import { ClockIcon } from '../../../common/icons/ClockIcon';

type SortKey = 'term' | 'familiarity_score' | 'next_review_date';
type SortDirection = 'asc' | 'desc';

export const FamiliarityMeter = ({ score }: { score: number }) => (
  <div className="flex gap-1">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className={`w-6 h-2 rounded-full ${i < score ? 'bg-emerald-500' : 'bg-slate-600'}`}
      ></div>
    ))}
  </div>
);

export const ActionButton = ({
  onClick,
  disabled,
  children,
  label,
  className,
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled: boolean;
  children?: React.ReactNode;
  label: string;
  className?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-7 h-7 flex items-center justify-center font-bold bg-slate-700 rounded-md text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    aria-label={label}
  >
    {children}
  </button>
);

export const AnalysisSection = ({ title, content }: { title: string; content: string }) => (
  <div>
    <h3 className="text-sm font-semibold text-sky-400 mb-1">{title}</h3>
    <p className="text-slate-300 text-sm">{content}</p>
  </div>
);

export const SortButton = ({
  label,
  sortKey,
  activeSortKey,
  activeDirection,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  activeDirection: SortDirection;
  onClick: (key: SortKey) => void;
}) => {
  const isActive = sortKey === activeSortKey;
  return (
    <button
      onClick={() => onClick(sortKey)}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
    >
      {label}
      {isActive &&
        (activeDirection === 'asc' ? (
          <SortAscendingIcon className="w-4 h-4" />
        ) : (
          <SortDescendingIcon className="w-4 h-4" />
        ))}
    </button>
  );
};

export const ReviewStatus = ({ dateStr }: { dateStr?: string }) => {
  if (!dateStr)
    return (
      <span className="text-slate-500 text-xs font-medium px-2 py-1 bg-slate-800 rounded-full">
        New
      </span>
    );

  const now = new Date();
  const reviewDate = new Date(dateStr);
  const isDue = reviewDate <= now;

  if (isDue) {
    return (
      <div className="flex items-center gap-1 text-amber-400 text-xs font-bold px-2 py-1 bg-amber-500/10 rounded-full w-fit border border-amber-500/20">
        <ClockIcon className="w-3 h-3" />
        Due
      </div>
    );
  }

  const diffTime = Math.abs(reviewDate.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <span className="text-slate-400 text-xs font-medium px-2 py-1 bg-slate-800 rounded-full">
      in {diffDays}d
    </span>
  );
};

export const TrashIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);
