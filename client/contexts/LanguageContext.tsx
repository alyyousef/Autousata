import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  isArabic: boolean;
  t: (en: string, ar: string) => string;
  formatNumber: (value: number) => string;
  formatCurrencyEGP: (value: number) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'AUTOUSATA:language';

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'ar' || stored === 'en') return stored;
  const legacyDir = window.localStorage.getItem('textDirection');
  if (legacyDir === 'rtl') return 'ar';
  const rootLang = document.documentElement.getAttribute('lang');
  if (rootLang === 'ar') return 'ar';
  return 'ar';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', language);
    root.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    const isArabic = language === 'ar';
    const sanitizeArabic = (value: string) =>
      value.replace(/[.,\u060C\u061F\u061B:\u2026!]/g, '').replace(/\s{2,}/g, ' ').trim();
    return {
      language,
      setLanguage,
      isArabic,
      t: (en, ar) => (isArabic ? sanitizeArabic(ar) : en),
      formatNumber: (value) => value.toLocaleString(isArabic ? 'ar-EG' : 'en-US', { useGrouping: !isArabic }),
      formatCurrencyEGP: (value) => {
        const formatted = value.toLocaleString(isArabic ? 'ar-EG' : 'en-US', { useGrouping: !isArabic });
        return isArabic ? `\u062c \u0645 ${formatted}` : `EGP ${formatted}`;
      }
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
