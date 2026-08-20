import { useCallback, useState } from 'react';
import type { Theme } from '@/lib/theme';
import { applyTheme, readStoredTheme, storeTheme, systemTheme } from '@/lib/theme';

interface UseThemeResult {
  theme: Theme;
  toggleTheme: () => void;
}

export const useTheme = (): UseThemeResult => {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme() ?? systemTheme());

  const toggleTheme = useCallback((): void => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      storeTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
};
