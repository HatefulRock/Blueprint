/*
import React, { useMemo, useState, useEffect } from 'react';
import { LeaderboardUser } from '../../../types';
import { TrophyIcon } from './icons/TrophyIcon';
import { getLeaderboard } from '../../../services/leaderboardService';

interface LeaderboardViewProps {
  userPoints: number;
}

interface RankedUser extends LeaderboardUser {
    rank: number;
    isCurrentUser: boolean;
}

export const LeaderboardView = ({ userPoints }: LeaderboardViewProps) => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const data = await getLeaderboard();
                setLeaderboard(data);
            } catch (err) {
                setError("Could not load leaderboard data.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const rankedUsers = useMemo((): RankedUser[] => {
        if (!leaderboard) return [];
        const currentUser = { name: 'You', points: userPoints };
        const combined = [...leaderboard, currentUser];
        
        const sorted = combined.sort((a, b) => b.points - a.points);
        
        return sorted.map((user, index) => ({
            ...user,
            rank: index + 1,
            isCurrentUser: user.name === 'You'
        }));

    }, [userPoints, leaderboard]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center p-20">
                    <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center p-20 text-red-400">
                    <p>{error}</p>
                </div>
            );
        }

        return (
            <ul className="divide-y divide-slate-700">
                {rankedUsers.map(user => (
                    <li key={user.rank} className={`flex items-center p-4 transition-colors ${user.isCurrentUser ? 'bg-sky-500/20' : 'hover:bg-slate-700/30'}`}>
                        <div className="flex items-center gap-4 w-20 flex-shrink-0">
                            <span className={`text-xl font-bold w-8 text-center ${user.rank <= 3 ? 'text-amber-400' : 'text-slate-400'}`}>{user.rank}</span>
                            {user.rank <= 3 && <TrophyIcon className={`w-6 h-6 ${
                                user.rank === 1 ? 'text-amber-400' : 
                                user.rank === 2 ? 'text-slate-300' : 
                                'text-amber-600'
                            }`} />}
                        </div>
                        <div className="flex-grow">
                            <p className={`font-bold ${user.isCurrentUser ? 'text-sky-300' : 'text-slate-200'}`}>{user.name}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-mono font-bold text-lg text-emerald-300">{user.points.toLocaleString()} pts</p>
                        </div>
                    </li>
                ))}
            </ul>
        );
    }


    return (
        <div className="flex-1 p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <TrophyIcon className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                    <h2 className="text-4xl font-bold text-white">All-Time Leaderboard</h2>
                    <p className="text-slate-400 mt-2">See how you stack up against other learners.</p>
                </div>
                
                <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
*/
