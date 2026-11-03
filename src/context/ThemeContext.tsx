import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyThemeClasses(shouldBeDark: boolean) {
  const root = document.documentElement;
  const body = document.body;

  if (shouldBeDark) {
    root.classList.add('dark');
    if (body) body.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    if (body) body.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('familyhub_theme') as Theme;
      return (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'light';
    } catch {
      return 'light';
    }
  });

  const getSystemDark = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, []);

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('familyhub_theme') as Theme;
    if (saved === 'dark') return true;
    if (saved === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches;
    return false;
  });

  useEffect(() => {
    const computeDark = () => {
      if (theme === 'dark') return true;
      if (theme === 'light') return false;
      return getSystemDark();
    };

    const activeDark = computeDark();
    setIsDark(activeDark);
    applyThemeClasses(activeDark);

    try {
      localStorage.setItem('familyhub_theme', theme);
    } catch (err) {
      console.warn('Failed to save theme preference:', err);
    }

    // Listen for OS system theme changes if theme is 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const dark = e.matches;
        setIsDark(dark);
        applyThemeClasses(dark);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, [theme, getSystemDark]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
