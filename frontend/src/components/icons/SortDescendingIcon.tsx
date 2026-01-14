import React from 'react';

export const SortDescendingIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25 4.5l-3-3m0 0l-3 3m3-3v-6m3 10.5l-3-3m0 0l-3 3m3-3v6" />
    </svg>
);