import { onSnapshot } from 'firebase/firestore';
import type { DocumentReference, DocumentSnapshot, Query, QuerySnapshot } from 'firebase/firestore';
import type { ReadWriteArgs } from '@/store/firebaseBaseQuery';
import { applySelect, effectiveSelect, isCollection, resolveRef } from '@/store/firebaseBaseQuery';

// The slice of RTK Query's cache-lifecycle api this helper needs.
interface StreamApi<T> {
  updateCachedData: (recipe: () => T) => unknown;
  cacheDataLoaded: Promise<unknown>;
  cacheEntryRemoved: Promise<unknown>;
}

// Keeps a cache entry live from the same descriptor its `query` already fetched, so the
// streamed shape always matches the fetched one. Subscriptions can't live in baseQuery —
// BaseQueryFn resolves once and has no channel for later values.
export const streamFrom =
  <A, T>(toArgs: (arg: A) => ReadWriteArgs) =>
  async (
    arg: A,
    { updateCachedData, cacheDataLoaded, cacheEntryRemoved }: StreamApi<T>
  ): Promise<void> => {
    // Rejects if the entry is dropped before the initial read resolves; attaching anyway is
    // harmless because `cacheEntryRemoved` will then already be settled.
    await cacheDataLoaded.catch(() => undefined);

    const args = toArgs(arg);
    const push = (snap: QuerySnapshot | DocumentSnapshot): void => {
      updateCachedData(() => applySelect(snap, effectiveSelect(args)) as T);
    };

    // Without this handler a denied or dropped listener fails silently, and the cache entry
    // keeps whatever it had — indistinguishable from a room where genuinely nothing happened.
    const onError = (e: Error): void => {
      console.error(`[firestoreStream] listener on ${args.url} stopped`, e);
    };

    const ref = resolveRef(args);
    const unsubscribe = isCollection(args.url)
      ? onSnapshot(ref as Query, push, onError)
      : onSnapshot(ref as DocumentReference, push, onError);

    await cacheEntryRemoved;
    unsubscribe();
  };
