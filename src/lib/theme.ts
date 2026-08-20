// The key is repeated by the inline script in index.html — see the comment there. Change both.
const KEY = 'planning-poker:theme';

export type Theme = 'light' | 'dark';

export const readStoredTheme = (): Theme | null => {
  const stored = localStorage.getItem(KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
};

// Safari in private mode throws on write, and a theme we failed to remember is not worth
// failing a click over.
export const storeTheme = (theme: Theme): void => {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // ignore
  }
};

export const systemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const applyTheme = (theme: Theme): void => {
  document.documentElement.setAttribute('data-kreo-theme', theme);
};
