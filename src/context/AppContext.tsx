
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { defaultLanguage, languageOptions, uiTexts, type LanguageOption } from '@/lib/constants';

type Theme = 'light' | 'dark' | 'system';

interface AppContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: string;
  setLanguage: (language: string) => void;
  currentLanguageOptions: LanguageOption[];
  getUIText: (key: string) => string;
  isClient: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [language, setLanguageState] = useState<string>(defaultLanguage);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const storedLanguage = localStorage.getItem('language');

    if (storedTheme) {
      setThemeState(storedTheme);
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(systemPrefersDark ? 'dark' : 'light');
    }
    
    if (storedLanguage && languageOptions.some(lang => lang.value === storedLanguage)) {
      setLanguageState(storedLanguage);
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;
    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', systemPrefersDark);
      localStorage.removeItem('theme'); 
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      localStorage.setItem('theme', theme);
    }
  }, [theme, isClient]);

  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language, isClient]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setLanguage = (newLanguage: string) => {
    if (languageOptions.some(lang => lang.value === newLanguage)) {
      setLanguageState(newLanguage);
    }
  };

  const getUIText = useCallback((key: string): string => {
    if (!isClient) return uiTexts[defaultLanguage]?.[key] || key; 
    return uiTexts[language]?.[key] || uiTexts[defaultLanguage]?.[key] || key;
  }, [language, isClient]);

  return (
    <AppContext.Provider value={{ theme, setTheme, language, setLanguage, currentLanguageOptions: languageOptions, getUIText, isClient }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
