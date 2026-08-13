import { Timestamp } from 'firebase/firestore';

// Firestore returns Timestamp instances for serverTimestamp() fields, which aren't
// plain-serializable and trip RTK Query's dev-mode state check once they land in the store.
// Our domain types declare these fields as `number` (millis) anyway, so convert on read.
export const withMillis = <T extends Record<string, unknown>>(data: T): T => {
  const result = { ...data };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (value instanceof Timestamp) {
      (result as Record<string, unknown>)[key] = value.toMillis();
    }
  }
  return result;
};
