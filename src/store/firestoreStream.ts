import { onSnapshot } from 'firebase/firestore';
import type { DocumentReference, DocumentSnapshot, Query, QuerySnapshot } from 'firebase/firestore';
import type { ReadWriteArgs } from '@/store/firebaseBaseQuery';
import { isCollection, resolveRef, snapshotData } from '@/store/firebaseBaseQuery';

// Narrowed to "takes a thunk": this dispatch only ever forwards an endpoint's own upsert thunk,
// and spelling out the store state here would tie the store layer to every api that uses it.
type StreamDispatch = (thunk: (...args: never[]) => unknown) => unknown;

// Seeds a cache entry that holds no data. `updateCachedData` is a `produce` over existing data
// and a no-op on an entry that has none, so without this a failed initial read could never be
// repaired: the listener would keep receiving snapshots and silently drop them. That matters
// beyond a lost network — Firestore's latency compensation flips a local value (e.g.
// `round.revealed`) before the server commits, so the revealing client can out-run its own write
// against a rule that reads the server state and have a read denied for an instant.
//
// Endpoints pass their own `api.util.upsertQueryData(name, arg, value)` because only they know
// the endpoint name as the literal type that call requires.
export type Upsert<A, T> = (dispatch: StreamDispatch, arg: A, value: T) => void;

// The slice of RTK Query's cache-lifecycle api this helper needs.
interface StreamApi<T> {
  updateCachedData: (recipe: () => T) => unknown;
  getCacheEntry: () => { data?: T };
  dispatch: StreamDispatch;
  cacheEntryRemoved: Promise<unknown>;
}

// Keeps a cache entry live from the same descriptor its `query` already fetched, so the
// streamed shape always matches the fetched one. Subscriptions can't live in baseQuery —
// BaseQueryFn resolves once and has no channel for later values.
export const streamFrom =
  <A, T>(toArgs: (arg: A) => ReadWriteArgs, upsert: Upsert<A, T>) =>
  async (
    arg: A,
    { updateCachedData, getCacheEntry, dispatch, cacheEntryRemoved }: StreamApi<T>
  ): Promise<void> => {
    // Deliberately not awaiting `cacheDataLoaded` first: RTK settles it only when data lands or
    // the entry is dropped, so a read that failed leaves it pending forever — and that is exactly
    // the entry the listener has to repair. Whichever of the two arrives first wins; the other
    // overwrites it moments later with a read of the same collection.
    const args = toArgs(arg);
    const push = (snap: QuerySnapshot | DocumentSnapshot): void => {
      const next = snapshotData(snap) as T;
      // A read that found nothing on an endpoint declaring `notFound` is exactly what that option
      // exists to report, and the fetch has already reported it. Upserting the `null` over that
      // error would replace "no such room" with "a room whose data is null" — which is what put a
      // blank screen behind every mistyped room code: the error screen rendered, and the listener
      // destroyed it a moment later.
      if (next === null && args.notFound !== undefined) return;
      if (getCacheEntry().data === undefined) upsert(dispatch, arg, next);
      else updateCachedData(() => next);
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
