import React from 'react';

export const TrophyIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9a9.75 9.75 0 000 1.5h9a9.75 9.75 0 000-1.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V11.25m0 0L15 9M12 11.25L9 9m6 2.25V6.75a4.5 4.5 0 00-9 0v4.5m11.25 4.5a4.5 4.5 0 00-9 0" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a2.25 2.25 0 012.25-2.25H15a2.25 2.25 0 012.25 2.25v.75M9 6.75a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25v.75" />
    </svg>
);