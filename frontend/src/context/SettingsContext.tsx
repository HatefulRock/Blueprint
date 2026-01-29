import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LanguageOption, AnalysisDisplayMode } from '../types';
import { userService } from '../services/api';
import { useAuth } from './AuthContext';

interface SettingsContextType {
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  uiLanguage: string;
  setUiLanguage: (lang: string) => void;
  analysisDisplayMode: AnalysisDisplayMode;
  setAnalysisDisplayMode: (mode: AnalysisDisplayMode) => void;
  customTargetLanguages: LanguageOption[];
  setCustomTargetLanguages: (langs: LanguageOption[]) => void;
  addCustomTargetLanguage: (opt: LanguageOption) => Promise<void>;
  removeCustomTargetLanguage: (code: string) => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [targetLanguage, setTargetLanguageState] = useState('Chinese');
  const [uiLanguage, setUiLanguage] = useState('English');
  const [customTargetLanguages, setCustomTargetLanguages] = useState<LanguageOption[]>([]);
  const [analysisDisplayMode, setAnalysisDisplayModeState] = useState<AnalysisDisplayMode>('panel');
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from server
  const loadSettings = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const server = await userService.getSettings().catch(() => null);
      if (server) {
        setCustomTargetLanguages(server.customTargetLanguages || []);
        if (server.targetLanguage) setTargetLanguageState(server.targetLanguage);
        if (server.readerSettings)
          setAnalysisDisplayModeState(server.readerSettings.analysisDisplayMode || 'panel');
      }
    } catch (e) {
      console.warn('Failed to load settings from server', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Persist target language to server
  const setTargetLanguage = async (code: string) => {
    try {
      const res = await userService.setDefaultLanguage(code).catch(() => null);
      if (res && res.targetLanguage) setTargetLanguageState(res.targetLanguage);
      else setTargetLanguageState(code);
    } catch (e) {
      console.warn('Failed to persist default language', e);
      setTargetLanguageState(code);
    }
  };

  // Persist reader settings to server
  const setAnalysisDisplayMode = async (mode: AnalysisDisplayMode) => {
    try {
      const res = await userService.updateReaderSettings({ analysisDisplayMode: mode }).catch(() => null);
      if (res) setAnalysisDisplayModeState(res.analysisDisplayMode || mode);
      else setAnalysisDisplayModeState(mode);
    } catch (e) {
      console.warn('Failed to persist reader settings', e);
      setAnalysisDisplayModeState(mode);
    }
  };

  // Add custom target language
  const addCustomTargetLanguage = async (opt: LanguageOption) => {
    try {
      const res = await userService.addUserLanguage(opt).catch(() => null);
      if (res) {
        setCustomTargetLanguages(res || []);
      } else {
        setCustomTargetLanguages((prev) =>
          prev.find((p) => p.code === opt.code) ? prev : [...prev, opt]
        );
      }
    } catch (e) {
      console.warn('Failed to add custom language on server', e);
    }
  };

  // Remove custom target language
  const removeCustomTargetLanguage = async (code: string) => {
    try {
      const res = await userService.removeUserLanguage(code).catch(() => null);
      if (res) {
        setCustomTargetLanguages(res || []);
      } else {
        setCustomTargetLanguages((prev) => prev.filter((p) => p.code !== code));
      }
    } catch (e) {
      console.warn('Failed to remove custom language on server', e);
    }
  };

  // Load settings when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

  return (
    <SettingsContext.Provider
      value={{
        targetLanguage,
        setTargetLanguage,
        uiLanguage,
        setUiLanguage,
        analysisDisplayMode,
        setAnalysisDisplayMode,
        customTargetLanguages,
        setCustomTargetLanguages,
        addCustomTargetLanguage,
        removeCustomTargetLanguage,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};
