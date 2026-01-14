import React, { useState, useEffect } from 'react';
import { StudyPlan, StudyTask, View, ActiveReadingText, Goals, GoalProgress } from '../types';
import { getStudyPlan } from '../services/userService';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { CURATED_CONTENT } from '../data/curatedContent';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { BoltIcon } from './icons/BoltIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';


interface DashboardViewProps {
  wordCount: number;
  setCurrentView: (view: View) => void;
  onStartReadingSession: (textData: ActiveReadingText) => void;
  goals: Goals | null;
  goalProgress: GoalProgress | null;
  uiStrings: {
    welcome: string;
    subtitle: string;
  };
}

const GoalProgressCard = ({ label, current, goal, icon }: { label: string, current: number, goal: number, icon: React.ReactNode }) => {
    const percentage = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
    return (
        <div className="bg-slate-800/60 p-5 rounded-lg border border-slate-700/60 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <p className="font-semibold text-slate-300">{label}</p>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-white mb-1">{current} <span className="text-base font-normal text-slate-400">/ {goal}</span></p>
                <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                </div>
            </div>
        </div>
    )
}

const QuickStartCard = ({ title, description, icon, onClick }: { title: string, description: string, icon: React.ReactNode, onClick: () => void }) => (
    <button onClick={onClick} className="bg-slate-800 p-5 rounded-lg border border-slate-700 hover:bg-slate-700/50 hover:border-sky-500 transition-all duration-200 text-left w-full flex items-start gap-4">
        <div className="bg-slate-700 p-3 rounded-lg text-sky-400">
            {icon}
        </div>
        <div>
            <h4 className="font-bold text-white">{title}</h4>
            <p className="text-sm text-slate-400">{description}</p>
        </div>
    </button>
);


// FIX: Changed TaskCard to be a React.FC to correctly handle the `key` prop provided during list rendering.
const TaskCard: React.FC<{ task: StudyTask, onStartTask: (task: StudyTask) => void }> = ({ task, onStartTask }) => {
    const iconMap = {
        flashcards: '⚡️',
        practice: '✏️',
        read: '📖',
        conversation: '💬'
    };

    return (
        <div className="bg-slate-800/60 p-5 rounded-lg border border-slate-700/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <span className="text-3xl">{iconMap[task.type]}</span>
                <div>
                    <h4 className="font-bold text-white">{task.title}</h4>
                    <p className="text-sm text-slate-400">{task.description}</p>
                </div>
            </div>
            <button 
                onClick={() => onStartTask(task)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
            >
                Start
                <ArrowRightIcon className="w-4 h-4" />
            </button>
        </div>
    );
};


export const DashboardView = ({ wordCount, setCurrentView, onStartReadingSession, goals, goalProgress, uiStrings }: DashboardViewProps) => {
    const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                const plan = await getStudyPlan();
                setStudyPlan(plan);
            } catch (error) {
                console.error("Failed to fetch study plan", error);
                setError("Could not load your study plan for today.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPlan();
    }, []);

    const handleStartTask = (task: StudyTask) => {
        if (task.type === 'read' && task.metadata?.textId) {
            const textToRead = CURATED_CONTENT.find(c => c.id === task.metadata.textId);
            if (textToRead) {
                onStartReadingSession(textToRead);
                return;
            }
        }
        setCurrentView(task.targetView);
    };
    
    const renderStudyPlan = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center p-12">
                     <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            );
        }

        if (error) {
            return <p className="text-center text-red-400 p-8">{error}</p>
        }

        if (studyPlan) {
            return (
                <div className="space-y-4">
                    <p className="text-center text-slate-300 italic mb-6">"{studyPlan.summary}"</p>
                    {studyPlan.tasks.map(task => (
                        <TaskCard key={task.id} task={task} onStartTask={handleStartTask} />
                    ))}
                </div>
            )
        }
        
        return <p className="text-center text-slate-400 p-8">No study plan available for today.</p>
    }

    return (
        <div className="flex-1 p-6 md:p-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">{uiStrings.welcome}</h2>
            <p className="text-slate-400 mb-8">{uiStrings.subtitle}</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left side (main content) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Stats & Goals */}
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-4">This Week's Progress</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <GoalProgressCard 
                                label="New Words" 
                                current={goalProgress?.newWordsThisWeek || 0} 
                                goal={goals?.wordsPerWeek || 20}
                                icon={<BookOpenIcon className="w-6 h-6 text-slate-500" />} 
                            />
                            <GoalProgressCard 
                                label="Practice Sessions" 
                                current={goalProgress?.practiceSessionsThisWeek || 0} 
                                goal={goals?.practiceSessionsPerWeek || 3}
                                icon={<PencilSquareIcon className="w-6 h-6 text-slate-500" />} 
                            />
                        </div>
                    </div>

                    {/* Quick Start */}
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-4">Jump Back In</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <QuickStartCard
                                title="Read"
                                description="Start a new reading session."
                                icon={<BookOpenIcon className="w-6 h-6" />}
                                onClick={() => setCurrentView(View.Reader)}
                            />
                            <QuickStartCard
                                title="Flashcards"
                                description="Review your vocabulary."
                                icon={<BoltIcon className="w-6 h-6" />}
                                onClick={() => setCurrentView(View.Flashcards)}
                            />
                            <QuickStartCard
                                title="Conversation"
                                description="Practice speaking with AI."
                                icon={<ChatBubbleIcon className="w-6 h-6" />}
                                onClick={() => setCurrentView(View.Conversation)}
                            />
                        </div>
                    </div>
                </div>

                {/* Right side (Study Plan) */}
                <div className="lg:col-span-1 bg-slate-800/50 border border-slate-700/80 rounded-lg p-6 h-fit">
                    <h3 className="text-2xl font-bold text-white mb-2 text-center">Today's Study Plan</h3>
                    {renderStudyPlan()}
                </div>
            </div>
        </div>
    );
};