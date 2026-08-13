const KEY = 'planning-poker:name';

export const readStoredName = (): string => localStorage.getItem(KEY) ?? '';

// Safari in private mode throws on write, and a name we failed to remember is not worth
// failing a join over.
export const storeName = (name: string): void => {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    // ignore
  }
};
