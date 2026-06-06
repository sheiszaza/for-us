import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeName = 'rose' | 'lavender' | 'ocean' | 'sunset';

type Theme = {
  name: ThemeName;
  label: string;
  primary: string;
  primaryLight: string;
  accent: string;
};

export const themes: Record<ThemeName, Theme> = {
  rose: {
    name: 'rose',
    label: 'Rose',
    primary: '244 63 94',
    primaryLight: '254 205 211',
    accent: '190 18 60',
  },
  lavender: {
    name: 'lavender',
    label: 'Lavender',
    primary: '139 92 246',
    primaryLight: '221 214 254',
    accent: '109 40 217',
  },
  ocean: {
    name: 'ocean',
    label: 'Ocean',
    primary: '6 182 212',
    primaryLight: '207 250 254',
    accent: '14 116 144',
  },
  sunset: {
    name: 'sunset',
    label: 'Sunset',
    primary: '249 115 22',
    primaryLight: '254 215 170',
    accent: '194 65 12',
  },
};

type ThemeContextType = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  currentTheme: Theme;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_KEY = 'for-us:theme';

function applyTheme(themeName: ThemeName) {
  const theme = themes[themeName];
  const root = document.documentElement;
  
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-primary-light', theme.primaryLight);
  root.style.setProperty('--theme-accent', theme.accent);
  root.setAttribute('data-theme', themeName);
}

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    return (stored as ThemeName) || 'rose';
  });

  const setTheme = useCallback((newTheme: ThemeName) => {
    window.localStorage.setItem(THEME_KEY, newTheme);
    setThemeState(newTheme);
    applyTheme(newTheme);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const currentTheme = useMemo(() => themes[theme], [theme]);

  const value = useMemo(() => ({ theme, setTheme, currentTheme }), [theme, setTheme, currentTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
