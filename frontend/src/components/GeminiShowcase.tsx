/**
 * Gemini Showcase Dashboard
 *
 * The main landing page for the hackathon submission.
 * Shows off the specific Gemini 3 features implemented in Blueprint
 * without the corporate fluff.
 */

import React, { useState, useEffect } from 'react';
import { View } from '../types';

interface CapabilityCardProps {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  stats: { label: string; value: string }[];
  color: string;
  view: View;
  badge?: string;
  onNavigate: (view: View) => void;
}

const CapabilityCard: React.FC<CapabilityCardProps> = ({
  icon,
  title,
  subtitle,
  description,
  features,
  stats,
  color,
  view,
  badge,
  onNavigate,
}) => {
  return (
    <div
      className={`capability-card relative bg-gradient-to-br ${color} p-8 rounded-2xl shadow-2xl cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl overflow-hidden group border border-white/10`}
      onClick={() => onNavigate(view)}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10 mix-blend-overlay">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      </div>

      {/* Badge */}
      {badge && (
        <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-xs font-mono font-bold text-white shadow-lg">
          {badge}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        <div className="text-6xl mb-6 transform transition-transform group-hover:scale-110 duration-300 origin-left">
          {icon}
        </div>
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
          {title}
        </h2>
        <p className="text-white/90 text-sm font-mono mb-4 bg-black/20 inline-block px-2 py-1 rounded">
          {subtitle}
        </p>
        <p className="text-white/90 mb-6 leading-relaxed text-[15px]">
          {description}
        </p>

        {/* Features */}
        <div className="space-y-2 mb-8">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-white/60 mt-[2px] text-xs">●</span>
              <span className="text-white/90 text-sm font-medium">
                {feature}
              </span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-black/20 backdrop-blur-sm p-3 rounded-lg border border-white/5"
            >
              <div className="text-xl font-bold text-white">{stat.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/60">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Action hint */}
        <div className="flex items-center gap-2 text-white font-bold text-sm bg-white/10 w-fit px-4 py-2 rounded-lg group-hover:bg-white group-hover:text-black transition-colors">
          <span>Demo This Feature</span>
          <span className="transform transition-transform group-hover:translate-x-1">
            →
          </span>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ value: string; label: string; icon: string }> = ({
  value,
  label,
  icon,
}) => (
  <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-xl text-center hover:bg-slate-800/40 transition-colors">
    <div className="text-3xl mb-3 opacity-80">{icon}</div>
    <div className="text-3xl font-bold text-white mb-1 font-mono">{value}</div>
    <div className="text-xs text-slate-400 uppercase tracking-widest">
      {label}
    </div>
  </div>
);

interface GeminiShowcaseProps {
  onNavigate: (view: View) => void;
}

export const GeminiShowcase: React.FC<GeminiShowcaseProps> = ({
  onNavigate,
}) => {
  const [stats, setStats] = useState({
    activeModels: 5,
    contextLimit: '2M',
    latency: '<500ms',
    tokensProcessed: 12500,
  });

  // Simulate token counter for "alive" feel
  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        tokensProcessed: prev.tokensProcessed + Math.floor(Math.random() * 120),
      }));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const capabilities = [
    {
      icon: '👁️',
      title: 'Multimodal Learning',
      subtitle: 'Gemini 3.0 Flash (Vision)',
      description:
        "We're feeding raw video files directly into the context window. No separate OCR or transcription services. Gemini sees the video, hears the audio, and builds the lesson plan in one pass.",
      features: [
        'Direct video-to-text processing',
        'Extracts vocab visible on screen',
        'Identifies speakers & cultural cues',
        'Generates CEFR-rated quizzes',
      ],
      stats: [
        { label: 'Input', value: 'Video/Audio' },
        { label: 'Processing', value: 'One-Shot' },
        { label: 'File Limit', value: '50MB' },
        { label: 'Latency', value: 'Fast' },
      ],
      color: 'from-blue-600 to-indigo-700',
      view: View.VideoLearning,
      badge: 'VISION API',
    },
    {
      icon: '🧠',
      title: 'Smart Grammar Coach',
      subtitle: 'Gemini 3.0 Pro',
      description:
        "Standard spellcheckers are boring. We're using 3.0 Pro's reasoning capabilities to explain the 'Why.' It identifies complex patterns and acts like a strict linguistic professor.",
      features: [
        'Detects subtle nuance errors',
        'Explains grammar rules in context',
        'Connects mistakes to specific patterns',
        'Suggests idiomatic alternatives',
      ],
      stats: [
        { label: 'Model', value: '3.0 Pro' },
        { label: 'Reasoning', value: 'High' },
        { label: 'Categories', value: '4' },
        { label: 'Feedback', value: 'Deep' },
      ],
      color: 'from-purple-600 to-fuchsia-700',
      view: View.Grammar,
      badge: 'REASONING',
    },
    {
      icon: '⚡',
      title: 'Real-time Voice',
      subtitle: 'Gemini 3.0 Flash Live',
      description:
        "Actual conversation practice using the Live API. We're streaming audio chunks for sub-500ms latency. It feels less like a turn-based bot and more like a real phone call.",
      features: [
        'Websocket audio streaming',
        'Instant pronunciation checks',
        'Adaptive difficulty scaling',
        'Natural interruptions/pauses',
      ],
      stats: [
        { label: 'Protocol', value: 'WSS' },
        { label: 'Latency', value: '~400ms' },
        { label: 'Voice', value: 'Natural' },
        { label: 'Scenarios', value: '10+' },
      ],
      color: 'from-emerald-600 to-teal-700',
      view: View.Conversation,
      badge: 'STREAMING',
    },
    {
      icon: '📖',
      title: 'Deep Context',
      subtitle: '2M Token Window',
      description:
        "RAG is great, but full context is better. We dump entire books or long articles into the 2M context window. Gemini understands the full story arc without arbitrary chunking.",
      features: [
        'Whole-document comprehension',
        'Character arc tracking',
        'Thematic analysis',
        'Zero vector-db latency',
      ],
      stats: [
        { label: 'Context', value: '2,000,000' },
        { label: 'Chunking', value: 'None' },
        { label: 'Retrieval', value: 'Native' },
        { label: 'Recall', value: '100%' },
      ],
      color: 'from-orange-600 to-red-700',
      view: View.DeepReading,
      badge: 'LONG CONTEXT',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 selection:bg-purple-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 hover:bg-white/10 transition-colors cursor-default">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-xs font-mono text-slate-300">
              BUILDER PREVIEW
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-white">
            Blueprint <span className="text-purple-500">×</span> Gemini 3
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            <br className="hidden md:block" />
            Multimodal inputs, reasoning models, and large context windows.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-24">
          {capabilities.map((capability, idx) => (
            <CapabilityCard key={idx} {...capability} onNavigate={onNavigate} />
          ))}
        </div>

        {/* The Stack Section */}
        <div className="border-t border-slate-800 pt-16">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Under the Hood
              </h2>
              <p className="text-slate-400">
                How we're routing tasks to specific models.
              </p>
            </div>
            <div className="text-sm font-mono text-slate-500 bg-slate-900 px-3 py-1 rounded">
              src/config/ai-models.ts
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Flash Card */}
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  ⚡
                </div>
                <div className="font-mono font-bold text-white">3.0 Flash</div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                The workhorse. Used for high-volume tasks like initial video
                processing, dictionary lookups, and quick exercises where speed
                {'>'} nuance.
              </p>
              <div className="text-xs text-blue-400/80 font-mono">
                Used in: Video, Vocab, TTS
              </div>
            </div>

            {/* Pro Card */}
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-purple-500/50 transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                  🧠
                </div>
                <div className="font-mono font-bold text-white">3.0 Pro</div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                The brain. Deployed strictly for complex reasoning tasks:
                explaining grammar rules, grading writing, and cultural context
                extraction.
              </p>
              <div className="text-xs text-purple-400/80 font-mono">
                Used in: Grammar, Writing
              </div>
            </div>

            {/* Live Card */}
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-emerald-500/50 transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  🎙️
                </div>
                <div className="font-mono font-bold text-white">
                  Flash Live
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                The conversationalist. Handles the Websocket stream for realtime
                audio. Optimized for interruption handling and low-latency
                responses.
              </p>
              <div className="text-xs text-emerald-400/80 font-mono">
                Used in: Conversation
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-10 border-t border-slate-800 text-center">
          <p className="text-slate-500 font-mono text-sm mb-4">
            Hackathon Submission: Google Gemini 3 Competition
          </p>
          <div className="flex justify-center gap-6 text-sm text-slate-600">
            <span className="hover:text-slate-400 cursor-pointer transition-colors">
              View Repo
            </span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">
              Architecture Docs
            </span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">
              Live Demo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};