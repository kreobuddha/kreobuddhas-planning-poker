import { useCallback, useState } from 'react';
import type { Theme } from '@/lib/theme';
import { applyTheme, readStoredTheme, storeTheme, systemTheme } from '@/lib/theme';

interface UseThemeResult {
  theme: Theme;
  toggleTheme: () => void;
}

export const useTheme = (): UseThemeResult => {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme() ?? systemTheme());

  // The DOM attribute and the stored choice are written here rather than inside a `setTheme`
  // updater. React may call an updater more than once for a single state change — StrictMode
  // does so on purpose — and an updater that touches anything outside React is a defect waiting
  // for the first effect that is not idempotent to be added beside these two, which happen to be.
  // Reading `theme` from the closure is safe for the same reason the updater was never needed: a
  // toggle is one click, and the click cannot land before the render carrying its own result.
  const toggleTheme = useCallback((): void => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    storeTheme(next);
    setTheme(next);
  }, [theme]);

  return { theme, toggleTheme };
};
