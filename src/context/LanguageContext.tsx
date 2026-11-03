import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Language, translations, Translations } from '../locales/translations';
import { SUPPORTED_LANGUAGES, LanguageCode, isRtlLanguage, LanguageMeta } from '../locales/languages';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRtl: boolean;
  currentLanguageMeta: LanguageMeta;
  supportedLanguages: LanguageMeta[];
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date | string | number) => string;
  formatNumber: (value: number) => string;
  formatCurrency: (amount: number, currency?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('familyhub_lang') as Language;
      const valid = SUPPORTED_LANGUAGES.some((l) => l.code === saved);
      return valid ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('familyhub_lang', lang);
    } catch (err) {
      console.warn('Failed to save language preference:', err);
    }
  };

  const isRtl = isRtlLanguage(language);

  const currentLanguageMeta = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  }, [language]);

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;

    // Manage script font classes
    document.body.classList.remove('font-urdu', 'font-arabic', 'font-farsi');
    if (language === 'ur') {
      document.body.classList.add('font-urdu');
    } else if (language === 'ar') {
      document.body.classList.add('font-arabic');
    } else if (language === 'fa') {
      document.body.classList.add('font-farsi');
    }
  }, [language, isRtl]);

  const activeLocale = currentLanguageMeta.locale || 'en-US';

  const formatDate = (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
    try {
      const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat(activeLocale, options || {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(d);
    } catch {
      return new Date(date).toLocaleDateString();
    }
  };

  const formatTime = (date: Date | string | number): string => {
    try {
      const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat(activeLocale, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const formatNumber = (value: number): string => {
    try {
      return new Intl.NumberFormat(activeLocale).format(value);
    } catch {
      return value.toString();
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    try {
      return new Intl.NumberFormat(activeLocale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  const value = {
    language,
    setLanguage,
    t: translations[language] || translations.en,
    isRtl,
    currentLanguageMeta,
    supportedLanguages: SUPPORTED_LANGUAGES,
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
