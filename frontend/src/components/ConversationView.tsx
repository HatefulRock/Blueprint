
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { TranscriptMessage, PronunciationFeedback } from '../types';
import { decode, decodeAudioData, createAudioBlob, mergeFloat32Arrays, encodeWAV } from '../utils';
import { getPronunciationFeedback } from '../services/geminiService';
import api, { aiService } from '../services/api';
import { CONVERSATION_SCENARIOS, ConversationScenario } from '../data/conversationScenarios';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { GEMINI_MODELS } from '../config/geminiModels';

interface ConversationViewProps {
    targetLanguage: string;
}

const MicrophoneIcon = ({ isListening, className }: { isListening: boolean, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm-1 3a4 4 0 108 0V4a4 4 0 10-8 0v3zM10 12a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" clipRule="evenodd" />
        <path d="M3 10a1 1 0 011-1h1a1 1 0 110 2H4a1 1 0 01-1-1zm13 0a1 1 0 100 2h1a1 1 0 100-2h-1zM10 15a3 3 0 01-3-3H5a5 5 0 1010 0h-2a3 3 0 01-3 3z" />
         {isListening && <circle cx="10" cy="10" r="8" fill="currentColor" className="text-red-500 animate-pulse" />}
    </svg>
);

const StatusIndicator = ({ status }: { status: string }) => {
    const statusMap: Record<string, { text: string, color: string, dotColor: string }> = {
        idle: { text: "Ready to start", color: "text-slate-400", dotColor: "bg-slate-500" },
        connecting: { text: "Connecting...", color: "text-sky-400", dotColor: "bg-sky-500 animate-pulse" },
        listening: { text: "Listening...", color: "text-emerald-400", dotColor: "bg-emerald-500 animate-ping" },
        processing: { text: "AI Speaking...", color: "text-sky-400", dotColor: "bg-sky-500" },
        error: { text: "Error", color: "text-red-500", dotColor: "bg-red-500" },
    };
    const { text, color, dotColor } = statusMap[status] || statusMap.idle;
    
    return (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
            <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
            <span className={`text-xs font-medium ${color}`}>{text}</span>
        </div>
    );
};

const PronunciationCard = ({ feedback }: { feedback: PronunciationFeedback }) => {
    if (!feedback) return null;
    
    const scoreColor = feedback.score >= 80 ? 'text-emerald-400' : feedback.score >= 60 ? 'text-amber-400' : 'text-red-400';
    
    return (
        <div className="mt-3 bg-slate-800/80 rounded-xl p-4 border border-slate-600 animate-fade-in text-sm">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-white">Pronunciation Analysis</h4>
                <span className={`font-bold ${scoreColor}`}>{feedback.score}/100</span>
            </div>
            <p className="text-slate-300 mb-3">{feedback.feedbackText}</p>
            
            {feedback.mispronouncedWords.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Improvements</p>
                    {feedback.mispronouncedWords.map((item, idx) => (
                         <div key={idx} className="flex items-start gap-2 bg-slate-900/50 p-2 rounded">
                             <span className="text-red-400 font-mono">{item.word}</span>
                             <div className="text-xs text-slate-400">
                                <span className="block text-slate-300">{item.error}</span>
                                <span className="block text-emerald-500/80">Try: {item.correction}</span>
                             </div>
                         </div>
                    ))}
                </div>
            )}
            
            {feedback.intonationTip && (
                 <div className="mt-3 pt-2 border-t border-slate-700">
                     <p className="text-xs font-semibold text-purple-400 uppercase mb-1">Intonation Tip</p>
                     <p className="text-slate-400 text-xs italic">{feedback.intonationTip}</p>
                 </div>
            )}
        </div>
    )
}

const MessageBubble: React.FC<{ msg: TranscriptMessage }> = ({ msg }) => (
    <div className={`flex flex-col ${msg.author === 'user' ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-start gap-3 max-w-xl ${msg.author === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.author === 'ai' && <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-xs text-white font-bold flex-shrink-0 mt-1">AI</div>}
            {msg.author === 'user' && <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white font-bold flex-shrink-0 mt-1">You</div>}
            
            <div className={`p-4 rounded-2xl ${msg.author === 'user' ? 'bg-sky-600 text-white rounded-tr-none' : 'bg-slate-700 text-slate-200 rounded-tl-none'}`}>
                <p className="leading-relaxed">{msg.text}</p>
            </div>
        </div>
        
        {msg.feedback && <div className="max-w-md w-full mr-11"><PronunciationCard feedback={msg.feedback} /></div>}
        {msg.isLoadingFeedback && (
            <div className="max-w-md w-full mr-11 mt-2 flex items-center gap-2 text-xs text-slate-400 animate-pulse">
                <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                Analyzing pronunciation...
            </div>
        )}
    </div>
);

// Infer the promise type returned by ai.live.connect
type LiveSessionPromise = ReturnType<InstanceType<typeof GoogleGenAI>['live']['connect']>;

export const ConversationView = ({ targetLanguage }: ConversationViewProps) => {
    const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [status, setStatus] = useState('idle');
    const [selectedScenario, setSelectedScenario] = useState<ConversationScenario>(CONVERSATION_SCENARIOS[0]);

    const [currentTurn, setCurrentTurn] = useState<{user?: TranscriptMessage, ai?: TranscriptMessage}>({});
    const [textInput, setTextInput] = useState('');

    // Audio Context Refs
    const sessionPromiseRef = useRef<LiveSessionPromise | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    // Audio Recording Refs for Analysis
    const audioChunksRef = useRef<Float32Array[]>([]); 

    // Auto-scroll to bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [transcript, currentTurn]);

    const analyzeLastTurn = useCallback(async (text: string, audioBase64: string) => {
        // Set loading state for the last user message
        setTranscript(prev => {
            const newTranscript = [...prev];
            
            let lastMsgIndex = -1;
            for (let i = newTranscript.length - 1; i >= 0; i--) {
                if (newTranscript[i].author === 'user') {
                    lastMsgIndex = i;
                    break;
                }
            }

            if (lastMsgIndex !== -1) {
                newTranscript[lastMsgIndex] = { ...newTranscript[lastMsgIndex], isLoadingFeedback: true };
            }
            return newTranscript;
        });

        try {
            const feedback = await getPronunciationFeedback(text, audioBase64, targetLanguage);
            
            setTranscript(prev => {
                const newTranscript = [...prev];
                let lastMsgIndex = -1;
                for (let i = newTranscript.length - 1; i >= 0; i--) {
                    if (newTranscript[i].author === 'user') {
                        lastMsgIndex = i;
                        break;
                    }
                }

                if (lastMsgIndex !== -1) {
                    newTranscript[lastMsgIndex] = { 
                        ...newTranscript[lastMsgIndex], 
                        isLoadingFeedback: false,
                        feedback: feedback 
                    };
                }
                return newTranscript;
            });
        } catch (e) {
            console.error("Pronunciation analysis failed", e);
            setTranscript(prev => {
                const newTranscript = [...prev];
                let lastMsgIndex = -1;
                for (let i = newTranscript.length - 1; i >= 0; i--) {
                    if (newTranscript[i].author === 'user') {
                        lastMsgIndex = i;
                        break;
                    }
                }

                if (lastMsgIndex !== -1) {
                    newTranscript[lastMsgIndex] = { ...newTranscript[lastMsgIndex], isLoadingFeedback: false };
                }
                return newTranscript;
            });
        }
    }, [targetLanguage]);

    const stopConversation = useCallback(async () => {
        if (sessionPromiseRef.current) {
          const session = await sessionPromiseRef.current;
          session.close();
          sessionPromiseRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        outputSourcesRef.current.forEach(source => source.stop());
        outputSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        audioChunksRef.current = [];
        setIsSessionActive(false);
        setStatus('idle');
        setCurrentTurn({});
    }, []);

    const startConversation = useCallback(async () => {
        if (isSessionActive) return;

        setStatus('connecting');
        setTranscript([]);

        try {
            if (!process.env.API_KEY) {
                throw new Error("API_KEY environment variable not configured. Cannot connect to Gemini.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            if (!inputAudioContextRef.current) inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            if (!outputAudioContextRef.current) outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            sessionPromiseRef.current = ai.live.connect({
                model: GEMINI_MODELS.live,  // Use Gemini 3 Live for real-time conversation
                callbacks: {
                    onopen: () => {
                        setIsSessionActive(true);
                        setStatus('listening');
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;
                        
                        // Clear previous recording
                        audioChunksRef.current = [];

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            
                            // 1. Send to Live API
                            const pcmBlob = createAudioBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                            
                            // 2. Buffer locally for Pronunciation Analysis
                            // We clone the data because inputData is reused by the browser
                            audioChunksRef.current.push(new Float32Array(inputData));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                            setCurrentTurn(prev => ({
                                ...prev,
                                user: {
                                    id: prev.user?.id || Date.now(),
                                    author: 'user',
                                    text: (prev.user?.text || '') + text
                                }
                            }));
                        } else if (message.serverContent?.outputTranscription) {
                            const text = message.serverContent.outputTranscription.text;
                            if (status !== 'processing') setStatus('processing');
                             setCurrentTurn(prev => ({
                                ...prev,
                                ai: {
                                    id: prev.ai?.id || Date.now() + 1,
                                    author: 'ai',
                                    text: (prev.ai?.text || '') + text
                                }
                            }));
                        } else if (message.serverContent?.turnComplete) {
                           
                           // Handle turn completion
                           // If we have user text, it means the user just finished speaking.
                           // We should package the audio buffer and trigger analysis.
                           
                           let userTextToAnalyze = "";
                           let audioToAnalyze = "";

                           setCurrentTurn(prev => {
                                const newMessages: TranscriptMessage[] = [];
                                if (prev.user) {
                                    userTextToAnalyze = prev.user.text;
                                    newMessages.push(prev.user);
                                }
                                if (prev.ai) newMessages.push(prev.ai);
                                
                                if (newMessages.length > 0) {
                                    setTranscript(t => [...t, ...newMessages]);
                                }
                                return {}; // Reset for next turn
                           });

                           // If there was user text, process the audio
                           if (userTextToAnalyze && audioChunksRef.current.length > 0) {
                               const fullAudio = mergeFloat32Arrays(audioChunksRef.current);
                               audioToAnalyze = encodeWAV(fullAudio); // Convert to WAV base64
                               // Clear buffer for next turn
                               audioChunksRef.current = [];
                               
                            // Trigger async analysis
                                analyzeLastTurn(userTextToAnalyze, audioToAnalyze);

                                // Send the user's utterance to the backend conversation audio endpoint for a full AI response
                                try {
                                    const fd = new FormData();
                                    fd.append('user_id', '1');
                                    fd.append('scenario', selectedScenario.name);
                                    fd.append('target_language', targetLanguage);
                                    fd.append('history_json', JSON.stringify(transcript.concat([{ id: Date.now(), author: 'user', text: userTextToAnalyze }])))
                                    // audioToAnalyze is a base64-encoded WAV string, convert to binary
                                    const audioBlob = (function(base64) {
                                        const binary = atob(base64.split(',').pop() || base64);
                                        const len = binary.length;
                                        const bytes = new Uint8Array(len);
                                        for (let i = 0; i < len; i++) {
                                            bytes[i] = binary.charCodeAt(i);
                                        }
                                        return new Blob([bytes.buffer], { type: 'audio/wav' });
                                    })(audioToAnalyze);

                                    fd.append('audio_file', audioBlob, 'upload.wav');

                                    // call backend
                                    const res: any = await aiService.sendAudio(fd);
                                    // res should be ChatResponse-like
                                    const chat = res;
                                    const aiMsg: any = { id: Date.now()+1, author: 'ai', text: chat.reply };
                                    setTranscript((t: TranscriptMessage[]) => [...t, aiMsg]);
                                } catch (e) {
                                    console.error('Failed to send audio to backend', e);
                                }
                           }
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            if (status !== 'processing') setStatus('processing');
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            
                            const currentTime = outputAudioContextRef.current.currentTime;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            outputSourcesRef.current.add(source);
                            source.onended = () => {
                                outputSourcesRef.current.delete(source);
                                if (outputSourcesRef.current.size === 0) {
                                    setStatus('listening');
                                    // Reset audio buffer when AI finishes speaking, ensuring we only capture FRESH user input for the next turn
                                    audioChunksRef.current = [];
                                }
                            };
                        }
                        
                        const interrupted = message.serverContent?.interrupted;
                        if (interrupted) {
                            for (const source of outputSourcesRef.current.values()) {
                                source.stop();
                                outputSourcesRef.current.delete(source);
                            }
                            nextStartTimeRef.current = 0;
                            audioChunksRef.current = [];
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setStatus('error');
                        stopConversation();
                    },
                    onclose: (e: CloseEvent) => {
                        stopConversation();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    systemInstruction: selectedScenario.getPrompt(targetLanguage),
                },
            });

        } catch (error) {
            console.error("Failed to start conversation:", error);
            setStatus('error');
            stopConversation();
        }
    }, [isSessionActive, selectedScenario, stopConversation, status, targetLanguage, analyzeLastTurn]);

    const handleToggleListening = () => {
        if (isSessionActive) {
            stopConversation();
        } else {
            startConversation();
        }
    };
    
    useEffect(() => {
        return () => {
            stopConversation();
        }
    }, [stopConversation]);

    const handleSendText = async () => {
        const text = textInput.trim();
        if (!text) return;
        setTextInput('');

        // Append user's text to transcript
        const userMsg: TranscriptMessage = { id: Date.now(), author: 'user', text };
        setTranscript(t => [...t, userMsg]);

        // Build ChatRequest payload for text API
        const payload = {
            user_id: 1,
            text: text,
            scenario: selectedScenario.getPrompt(targetLanguage),
            target_language: targetLanguage,
            history: transcript.map(m => ({ role: m.author === 'ai' ? 'model' : 'user', content: m.text })),
            tutor_style: selectedScenario.id === 'tutor' ? 'Friendly' : 'Neutral',
            topic: selectedScenario.name,
        };

        try {
            const res: any = await aiService.sendMessage(payload);
            const replyText = res.reply || (typeof res === 'string' ? res : JSON.stringify(res));
            const aiMsg: TranscriptMessage = { id: Date.now()+1, author: 'ai', text: replyText };
            setTranscript(t => [...t, aiMsg]);
        } catch (e) {
            console.error('Failed to send text to backend', e);
        }
    };

    const handleSelectScenario = (scenario: ConversationScenario) => {
        if (isSessionActive) stopConversation();
        setSelectedScenario(scenario);
    };

    return (
        <div className="flex-1 p-6 md:p-8 flex gap-6 h-[calc(100vh-80px)] overflow-hidden">
            
            {/* SIDEBAR: SCENARIOS */}
            <div className="w-80 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col flex-shrink-0">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-white mb-1">Scenarios</h2>
                    <p className="text-sm text-slate-400">Choose a setting for your practice.</p>
                </div>
                
                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {CONVERSATION_SCENARIOS.map(scenario => (
                        <button
                            key={scenario.id}
                            onClick={() => handleSelectScenario(scenario)}
                            disabled={isSessionActive && selectedScenario.id !== scenario.id}
                            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                                selectedScenario.id === scenario.id
                                    ? 'bg-sky-600/20 border-sky-500/50 text-white ring-1 ring-sky-500/50'
                                    : 'bg-slate-700/30 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
                            } ${isSessionActive && selectedScenario.id !== scenario.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">{scenario.icon}</span>
                                <div className="flex-1">
                                    <div className="font-semibold">{scenario.name}</div>
                                    <div className="text-xs text-slate-400 mt-0.5">{scenario.difficulty}</div>
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 leading-relaxed pl-9">
                                {scenario.description}
                            </div>
                            {selectedScenario.id === scenario.id && (
                                <div className="text-xs text-sky-200 mt-2 pl-9 animate-fade-in font-semibold">
                                    ✓ Active Scenario
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN: CHAT INTERFACE */}
            <div className="flex-1 bg-slate-900/50 border border-slate-700 rounded-2xl flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-700/50 bg-slate-800/30 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ChatBubbleIcon className="w-6 h-6 text-sky-400" />
                        <h3 className="font-bold text-white">{selectedScenario.name} ({targetLanguage})</h3>
                    </div>
                    <StatusIndicator status={status} />
                </div>

                {/* Transcript */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
                    {transcript.length === 0 && !currentTurn.user && !currentTurn.ai && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center">
                                <MicrophoneIcon isListening={false} className="w-10 h-10 text-slate-600" />
                            </div>
                            <p className="text-lg">Press the microphone to start speaking.</p>
                        </div>
                    )}
                    
                    {transcript.map((msg) => (
                        <MessageBubble key={msg.id} msg={msg} />
                    ))}
                    {currentTurn.user && <MessageBubble msg={currentTurn.user} />}
                    {currentTurn.ai && <MessageBubble msg={currentTurn.ai} />}
                </div>

                {/* Controls Footer */}
                <div className="p-6 bg-slate-800/30 border-t border-slate-700/50">
                    <div className="flex items-center gap-4 mb-3">
                        <input
                            type="text"
                            placeholder="Type a message to the tutor..."
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    await handleSendText();
                                }
                            }}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none"
                        />
                        <button onClick={handleSendText} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg">Send</button>
                    </div>
                    <div className="flex justify-center items-center gap-6">
                         <button
                            onClick={handleToggleListening}
                            className={`relative group p-4 rounded-full transition-all duration-300 shadow-lg ${
                                isSessionActive 
                                    ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-500/20' 
                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white ring-4 ring-emerald-500/20 hover:scale-105'
                            }`}
                        >
                            <MicrophoneIcon isListening={isSessionActive} className="w-8 h-8" />
                        </button>
                        
                        {isSessionActive && (
                             <div className="absolute right-8 bottom-8 text-xs text-slate-500 hidden md:block">
                                Powered by Gemini Live
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};
