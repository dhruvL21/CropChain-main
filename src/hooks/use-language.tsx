'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode, useCallback } from 'react';

import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import mr from '@/locales/mr.json';
import gu from '@/locales/gu.json';

type Language = 'en' | 'hi' | 'mr' | 'gu';

const translations: Record<Language, any> = { en, hi, mr, gu };

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: string, values?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let translation = translations[language];
    try {
      for (const k of keys) {
        translation = translation[k];
      }
    } catch (e) {
      translation = null;
    }
    

    if (!translation) {
      translation = translations['en'];
      try {
        for (const k of keys) {
          translation = translation[k];
        }
      } catch(e) {
        return key;
      }
    }

    if (typeof translation !== 'string') {
        return key;
    }

    if (values) {
        Object.keys(values).forEach(valueKey => {
            const regex = new RegExp(`{${valueKey}}`, 'g');
            translation = translation.replace(regex, String(values[valueKey]));
        });
    }
    return translation;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
  }), [language, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
