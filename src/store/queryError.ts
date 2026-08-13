import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

// Endpoint side: the shape a queryFn must return to signal failure.
export const queryError = (message: string): { error: FetchBaseQueryError } => ({
  error: { status: 'CUSTOM_ERROR', error: message },
});

export const toQueryError = (e: unknown, fallback: string): { error: FetchBaseQueryError } =>
  queryError(e instanceof Error ? e.message : fallback);

// Component side: pull the message back off a rejected `.unwrap()`.
export const errorMessage = (err: unknown, fallback: string): string => {
  if (err && typeof err === 'object' && 'error' in err && typeof err.error === 'string') {
    return err.error;
  }
  return fallback;
};
