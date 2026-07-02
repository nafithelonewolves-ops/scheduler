import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LANGUAGES, T, DEFAULT_LANG } from '../lib/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(DEFAULT_LANG);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get initial user and language preference
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchLanguage(session.user.id);
      } else {
        // Use browser language or localStorage
        const saved = localStorage.getItem('hr_planner_lang');
        if (saved && T[saved]) {
          setLanguage(saved);
        } else {
          const browserLang = navigator.language?.split('-')[0];
          if (T[browserLang]) setLanguage(browserLang);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchLanguage(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchLanguage = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('language')
      .eq('id', userId)
      .maybeSingle();

    if (data?.language && T[data.language]) {
      setLanguage(data.language);
      localStorage.setItem('hr_planner_lang', data.language);
    }
  };

  const changeLanguage = useCallback(async (newLang) => {
    setLanguage(newLang);
    localStorage.setItem('hr_planner_lang', newLang);

    if (user) {
      await supabase
        .from('profiles')
        .update({ language: newLang })
        .eq('id', user.id);
    }
  }, [user]);

  // Translation helper
  const t = useCallback((key) => {
    return T[language]?.[key] || T.en[key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
