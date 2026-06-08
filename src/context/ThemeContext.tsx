import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeName = 'rose' | 'lavender' | 'ocean' | 'sunset';
export type DisplayScaleName = 'compact' | 'comfortable' | 'large' | 'extraLarge';

type Theme = {
  name: ThemeName;
  label: string;
  primary: string;
  primaryLight: string;
  accent: string;
};

type DisplayScale = {
  name: DisplayScaleName;
  label: string;
  description: string;
  rootFontSize: string;
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

export const displayScales: Record<DisplayScaleName, DisplayScale> = {
  compact: {
    name: 'compact',
    label: 'Compact',
    description: 'Smaller text with more room on screen.',
    rootFontSize: '93.75%',
  },
  comfortable: {
    name: 'comfortable',
    label: 'Comfortable',
    description: 'The default size for everyday use.',
    rootFontSize: '100%',
  },
  large: {
    name: 'large',
    label: 'Large',
    description: 'Bigger text and controls.',
    rootFontSize: '112.5%',
  },
  extraLarge: {
    name: 'extraLarge',
    label: 'Extra Large',
    description: 'Maximum zoom for easier reading.',
    rootFontSize: '125%',
  },
};

type ThemeContextType = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  currentTheme: Theme;
  displayScale: DisplayScaleName;
  setDisplayScale: (displayScale: DisplayScaleName) => void;
  currentDisplayScale: DisplayScale;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_KEY = 'for-us:theme';
const DISPLAY_SCALE_KEY = 'for-us:display-scale';

function isThemeName(value: string | null): value is ThemeName {
  return value !== null && Object.prototype.hasOwnProperty.call(themes, value);
}

function isDisplayScaleName(value: string | null): value is DisplayScaleName {
  return value !== null && Object.prototype.hasOwnProperty.call(displayScales, value);
}

function applyTheme(themeName: ThemeName) {
  const theme = themes[themeName];
  const root = document.documentElement;

  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-primary-light', theme.primaryLight);
  root.style.setProperty('--theme-accent', theme.accent);
  root.setAttribute('data-theme', themeName);
}

function applyDisplayScale(displayScaleName: DisplayScaleName) {
  const root = document.documentElement;
  const displayScale = displayScales[displayScaleName];

  root.style.fontSize = displayScale.rootFontSize;
  root.setAttribute('data-display-scale', displayScaleName);
}

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    return isThemeName(stored) ? stored : 'rose';
  });
  const [displayScale, setDisplayScaleState] = useState<DisplayScaleName>(() => {
    const stored = window.localStorage.getItem(DISPLAY_SCALE_KEY);
    return isDisplayScaleName(stored) ? stored : 'comfortable';
  });

  const setTheme = useCallback((newTheme: ThemeName) => {
    window.localStorage.setItem(THEME_KEY, newTheme);
    setThemeState(newTheme);
    applyTheme(newTheme);
  }, []);

  const setDisplayScale = useCallback((newDisplayScale: DisplayScaleName) => {
    window.localStorage.setItem(DISPLAY_SCALE_KEY, newDisplayScale);
    setDisplayScaleState(newDisplayScale);
    applyDisplayScale(newDisplayScale);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyDisplayScale(displayScale);
  }, [displayScale]);

  const currentTheme = useMemo(() => themes[theme], [theme]);
  const currentDisplayScale = useMemo(() => displayScales[displayScale], [displayScale]);

  const value = useMemo(
    () => ({ theme, setTheme, currentTheme, displayScale, setDisplayScale, currentDisplayScale }),
    [theme, setTheme, currentTheme, displayScale, setDisplayScale, currentDisplayScale],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
