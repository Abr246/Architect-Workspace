import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'goalkick-theme';

function getPreferredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // localStorage can throw in private browsing or when site storage is
    // blocked - fall through to the system preference instead of crashing.
  }

  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

// Applies the chosen theme as a `data-theme` attribute on <html> so
// index.css's `:root[data-theme='dark']` token overrides take effect
// everywhere, and persists the choice so it survives a reload.
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(getPreferredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Best-effort only; the toggle still works for the rest of this session.
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  return [theme, toggleTheme];
}
