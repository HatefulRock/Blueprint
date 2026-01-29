import React, { useState, useEffect } from "react";
import {
  StudyTask,
  View,
  ActiveReadingText,
  Goals,
  GoalProgress,
} from "../../../types";
import { dashboardService } from "../../../services/api"; // Make sure this import is correct
import { ArrowRightIcon } from "../../common/icons/ArrowRightIcon";
import { BookOpenIcon } from "../../common/icons/BookOpenIcon";
import { BoltIcon } from "../../common/icons/BoltIcon";
import { ChatBubbleIcon } from "../../common/icons/ChatBubbleIcon";
import { PencilSquareIcon } from "../../common/icons/PencilSquareIcon";
import { CURATED_CONTENT } from "../../../data/curatedContent"; // Ensure this file exists or remove logic using it

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

const GoalProgressCard = ({
  label,
  current,
  goal,
  icon,
}: {
  label: string;
  current: number;
  goal: number;
  icon: React.ReactNode;
}) => {
  const percentage = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  return (
    <div className="bg-slate-800/60 p-5 rounded-lg border border-slate-700/60 h-full flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <p className="font-semibold text-slate-300">{label}</p>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white mb-1">
          {current}{" "}
          <span className="text-base font-normal text-slate-400">/ {goal}</span>
        </p>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

const QuickStartCard = ({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="bg-slate-800 p-5 rounded-lg border border-slate-700 hover:bg-slate-700/50 hover:border-sky-500 transition-all duration-200 text-left w-full flex items-start gap-4"
  >
    <div className="bg-slate-700 p-3 rounded-lg text-sky-400">{icon}</div>
    <div>
      <h4 className="font-bold text-white">{title}</h4>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  </button>
);

const TaskCard: React.FC<{
  task: StudyTask;
  onStartTask: (task: StudyTask) => void;
}> = ({ task, onStartTask }) => {
  const iconMap: Record<string, string> = {
    flashcards: "⚡️",
    practice: "✏️",
    read: "📖",
    conversation: "💬",
  };

  return (
    <div className="bg-slate-800/60 p-5 rounded-lg border border-slate-700/60 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="text-3xl">{iconMap[task.type] || "•"}</span>
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

export const DashboardView = ({
  setCurrentView,
  onStartReadingSession,
  uiStrings,
  goalProgress,
  goals,
}: DashboardViewProps) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await dashboardService.getDashboard();
        // api interceptor already returns response.data, so `response` is the payload
        setData(response);
      } catch (err) {
        console.error(err);
        setError("Could not connect to the server.");
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const handleStartTask = (task: StudyTask) => {
    if (task.type === "read" && task.metadata?.textId) {
      // If you have logic to fetch specific text by ID, do it here.
      // For now, let's assume we switch to the reader view:
      setCurrentView(View.Reader);
      return;
    }

    // Map string task types to View Enums if they differ
    switch (task.type) {
      case "flashcards":
        setCurrentView(View.Flashcards);
        break;
      case "conversation":
        setCurrentView(View.Conversation);
        break;
      case "practice":
        setCurrentView(View.Practice);
        break;
      default:
        setCurrentView(View.Dashboard);
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  // 2. Error State (Prevents the crash)
  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <p className="mb-4 text-xl">{error || "No data available"}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  // 3. Safe Destructuring (Only happens if data exists)
  const user = data?.user ?? { username: 'User', points: 0, streak: 0 };
  const rawStudyPlan = data?.studyPlan ?? { summary: '', tasks: [] };
  // Ensure the summary uses numeric fallbacks so it never contains 'None' or 'null'
  const studyPlan = {
    ...rawStudyPlan,
    summary:
      rawStudyPlan.summary && rawStudyPlan.summary.trim().length > 0
        ? rawStudyPlan.summary.replace(/\b(None|null)\b/gi, String(data?.progress?.newWordsThisWeek ?? 0))
        : `You're doing great! You've learned ${data?.progress?.newWordsThisWeek ?? 0} words this week.`,
    tasks: rawStudyPlan.tasks ?? [],
  };

  const progressData = data?.progress ?? { newWordsThisWeek: 0, practiceSessionsThisWeek: 0, wordsGoal: 20, sessionsGoal: 3 };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto pb-24">
      {/* Header with Gamification */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">
            {uiStrings.welcome}, {user.username}!
          </h2>
          <p className="text-slate-400">
            {user.streak} day streak • {user.points} XP
          </p>
        </div>

        <div className="flex gap-3">
          <div className="bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-full flex items-center gap-2">
            <span className="text-orange-500 text-xl">🔥</span>
            <span className="font-bold text-orange-500">{user.streak}</span>
          </div>
          <div className="bg-sky-500/10 border border-sky-500/20 px-4 py-2 rounded-full flex items-center gap-2">
            <span className="text-sky-500 text-xl">⭐</span>
            <span className="font-bold text-sky-500">{user.points}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left side (main content) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stats & Goals */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">
              This Week's Progress
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <GoalProgressCard
                 label="New Words"
                 current={progressData?.newWordsThisWeek ?? 0}
                 goal={progressData?.wordsGoal ?? goals?.wordsPerWeek ?? 20}
                 icon={<BookOpenIcon className="w-6 h-6 text-slate-500" />}
               />
               <GoalProgressCard
                 label="Practice Sessions"
                 current={progressData?.practiceSessionsThisWeek ?? 0}
                 goal={progressData?.sessionsGoal ?? goals?.practiceSessionsPerWeek ?? 3}
                 icon={<PencilSquareIcon className="w-6 h-6 text-slate-500" />}
               />
            </div>
          </div>

          {/* Gemini 3 Showcase - Featured */}
          <div>
            <button
              onClick={() => setCurrentView(View.Showcase)}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 p-6 rounded-2xl border border-purple-400/30 hover:scale-[1.02] transition-all duration-300 text-left shadow-2xl hover:shadow-purple-500/50 mb-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">✨</span>
                    <h3 className="text-2xl font-bold text-white">Gemini 3 Showcase</h3>
                    <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold text-white">
                      NEW
                    </span>
                  </div>
                  <p className="text-white/90 text-sm mb-3">
                    Explore cutting-edge AI features: Video Learning, Deep Reading, Enhanced Conversations & More
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="bg-white/10 backdrop-blur-sm px-2 py-1 rounded text-xs text-white/80">🎥 Multimodal</span>
                    <span className="bg-white/10 backdrop-blur-sm px-2 py-1 rounded text-xs text-white/80">🧠 Reasoning</span>
                    <span className="bg-white/10 backdrop-blur-sm px-2 py-1 rounded text-xs text-white/80">💬 Live Streaming</span>
                    <span className="bg-white/10 backdrop-blur-sm px-2 py-1 rounded text-xs text-white/80">📚 Long Context</span>
                  </div>
                </div>
                <div className="text-white/80 ml-4">
                  <ArrowRightIcon className="w-8 h-8" />
                </div>
              </div>
            </button>
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
        <div className="lg:col-span-1">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✨</span>
              <h3 className="text-xl font-bold text-white">Daily Plan</h3>
            </div>
            {studyPlan && studyPlan.summary ? (
              <>
                <p className="text-sm text-slate-400 mb-6 italic">
                  {studyPlan.summary}
                </p>
                <div className="space-y-3">
                  {(studyPlan.tasks || []).map((task: any, index: number) => (
                    <TaskCard
                      key={task.id || index}
                      task={task}
                      onStartTask={handleStartTask}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-slate-400">No plan for today.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
