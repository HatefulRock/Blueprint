import { useState, useRef, useCallback, useEffect } from 'react';
import { TranscriptMessage } from '../types';

// Simple unique ID generator
let messageIdCounter = 0;
const generateId = () => ++messageIdCounter;

interface UseConversationTranscriptReturn {
  messages: TranscriptMessage[];
  liveUserText: string;
  liveAiText: string;
  addMessage: (author: 'user' | 'ai', text: string) => void;
  appendUserText: (text: string) => void;
  appendAiText: (text: string) => void;
  commitLiveTexts: () => TranscriptMessage[];
  commitUserText: () => TranscriptMessage | null;
  commitAiText: () => TranscriptMessage | null;
  clearLiveTexts: () => void;
  clear: () => void;
  getMessagesRef: () => TranscriptMessage[];
  getLiveUserTextRef: () => string;
  getLiveAiTextRef: () => string;
}

export const useConversationTranscript = (): UseConversationTranscriptReturn => {
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [liveUserText, setLiveUserText] = useState('');
  const [liveAiText, setLiveAiText] = useState('');

  // Refs for accessing current values in callbacks without stale closures
  const messagesRef = useRef<TranscriptMessage[]>([]);
  const liveUserTextRef = useRef('');
  const liveAiTextRef = useRef('');

  // Keep refs in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    liveUserTextRef.current = liveUserText;
  }, [liveUserText]);

  useEffect(() => {
    liveAiTextRef.current = liveAiText;
  }, [liveAiText]);

  const addMessage = useCallback((author: 'user' | 'ai', text: string) => {
    const message: TranscriptMessage = {
      id: generateId(),
      author,
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  }, []);

  const appendUserText = useCallback((text: string) => {
    liveUserTextRef.current += text;
    setLiveUserText(prev => prev + text);
  }, []);

  const appendAiText = useCallback((text: string) => {
    liveAiTextRef.current += text;
    setLiveAiText(prev => prev + text);
  }, []);

  const commitUserText = useCallback((): TranscriptMessage | null => {
    const text = liveUserTextRef.current.trim();
    if (!text) return null;

    const message: TranscriptMessage = {
      id: generateId(),
      author: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, message]);
    messagesRef.current = [...messagesRef.current, message];

    liveUserTextRef.current = '';
    setLiveUserText('');

    return message;
  }, []);

  const commitAiText = useCallback((): TranscriptMessage | null => {
    const text = liveAiTextRef.current.trim();
    if (!text) return null;

    const message: TranscriptMessage = {
      id: generateId(),
      author: 'ai',
      text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, message]);
    messagesRef.current = [...messagesRef.current, message];

    liveAiTextRef.current = '';
    setLiveAiText('');

    return message;
  }, []);

  const commitLiveTexts = useCallback((): TranscriptMessage[] => {
    const newMessages: TranscriptMessage[] = [];

    const userText = liveUserTextRef.current.trim();
    const aiText = liveAiTextRef.current.trim();

    if (userText) {
      newMessages.push({
        id: generateId(),
        author: 'user',
        text: userText,
        timestamp: new Date(),
      });
    }

    if (aiText) {
      newMessages.push({
        id: generateId(),
        author: 'ai',
        text: aiText,
        timestamp: new Date(),
      });
    }

    if (newMessages.length > 0) {
      setMessages(prev => [...prev, ...newMessages]);
      messagesRef.current = [...messagesRef.current, ...newMessages];
    }

    liveUserTextRef.current = '';
    liveAiTextRef.current = '';
    setLiveUserText('');
    setLiveAiText('');

    return newMessages;
  }, []);

  const clearLiveTexts = useCallback(() => {
    liveUserTextRef.current = '';
    liveAiTextRef.current = '';
    setLiveUserText('');
    setLiveAiText('');
  }, []);

  const clear = useCallback(() => {
    messagesRef.current = [];
    liveUserTextRef.current = '';
    liveAiTextRef.current = '';
    setMessages([]);
    setLiveUserText('');
    setLiveAiText('');
  }, []);

  // Ref getters for callback access
  const getMessagesRef = useCallback(() => messagesRef.current, []);
  const getLiveUserTextRef = useCallback(() => liveUserTextRef.current, []);
  const getLiveAiTextRef = useCallback(() => liveAiTextRef.current, []);

  return {
    messages,
    liveUserText,
    liveAiText,
    addMessage,
    appendUserText,
    appendAiText,
    commitLiveTexts,
    commitUserText,
    commitAiText,
    clearLiveTexts,
    clear,
    getMessagesRef,
    getLiveUserTextRef,
    getLiveAiTextRef,
  };
};
