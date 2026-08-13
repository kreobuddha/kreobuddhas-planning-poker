import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { withMillis } from '@/lib/firestoreDoc';
import type { IParticipant, IRound, IVote } from '@/types';
import { emptyApi } from '@/store/emptyApi';
import { toQueryError } from '@/store/queryError';

interface RoundArg {
  sessionId: string;
  roundId: string;
}

export const roomApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    subscribeParticipants: builder.query<IParticipant[], string>({
      queryFn: () => ({ data: [] }),
      async onCacheEntryAdded(sessionId, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        await cacheDataLoaded;
        const unsubscribe = onSnapshot(collection(db, 'sessions', sessionId, 'participants'), (snap) => {
          updateCachedData(() =>
            snap.docs.map((d) => ({ id: d.id, ...withMillis(d.data() as Omit<IParticipant, 'id'>) }))
          );
        });
        await cacheEntryRemoved;
        unsubscribe();
      },
    }),

    subscribeLatestRound: builder.query<IRound | null, string>({
      queryFn: () => ({ data: null }),
      async onCacheEntryAdded(sessionId, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        await cacheDataLoaded;
        const unsubscribe = onSnapshot(
          query(collection(db, 'sessions', sessionId, 'rounds'), orderBy('createdAt', 'desc'), limit(1)),
          (snap) => {
            const latest = snap.docs[0];
            updateCachedData(() =>
              latest ? { id: latest.id, ...withMillis(latest.data() as Omit<IRound, 'id'>) } : null
            );
          }
        );
        await cacheEntryRemoved;
        unsubscribe();
      },
    }),

    subscribeMyVote: builder.query<IVote | null, RoundArg & { userId: string }>({
      queryFn: () => ({ data: null }),
      async onCacheEntryAdded(
        { sessionId, roundId, userId },
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        await cacheDataLoaded;
        const unsubscribe = onSnapshot(
          doc(db, 'sessions', sessionId, 'rounds', roundId, 'votes', userId),
          (snap) => {
            updateCachedData(() =>
              snap.exists() ? { id: snap.id, ...withMillis(snap.data() as Omit<IVote, 'id'>) } : null
            );
          }
        );
        await cacheEntryRemoved;
        unsubscribe();
      },
    }),

    subscribeVoteStatus: builder.query<string[], RoundArg>({
      queryFn: () => ({ data: [] }),
      async onCacheEntryAdded({ sessionId, roundId }, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        await cacheDataLoaded;
        const unsubscribe = onSnapshot(
          collection(db, 'sessions', sessionId, 'rounds', roundId, 'voteStatus'),
          (snap) => {
            updateCachedData(() => snap.docs.map((d) => d.id));
          }
        );
        await cacheEntryRemoved;
        unsubscribe();
      },
    }),

    subscribeVotes: builder.query<IVote[], RoundArg>({
      queryFn: () => ({ data: [] }),
      async onCacheEntryAdded({ sessionId, roundId }, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        await cacheDataLoaded;
        const unsubscribe = onSnapshot(
          collection(db, 'sessions', sessionId, 'rounds', roundId, 'votes'),
          (snap) => {
            updateCachedData(() =>
              snap.docs.map((d) => ({ id: d.id, ...withMillis(d.data() as Omit<IVote, 'id'>) }))
            );
          }
        );
        await cacheEntryRemoved;
        unsubscribe();
      },
    }),

    askQuestion: builder.mutation<void, { sessionId: string; question: string }>({
      queryFn: async ({ sessionId, question }) => {
        try {
          await addDoc(collection(db, 'sessions', sessionId, 'rounds'), {
            question,
            revealed: false,
            createdAt: serverTimestamp(),
          });
          return { data: undefined };
        } catch (e) {
          return toQueryError(e, 'Could not start round.');
        }
      },
    }),

    castVote: builder.mutation<void, RoundArg & { userId: string; value: number }>({
      queryFn: async ({ sessionId, roundId, userId, value }) => {
        try {
          const batch = writeBatch(db);
          batch.set(doc(db, 'sessions', sessionId, 'rounds', roundId, 'votes', userId), {
            value,
            createdAt: serverTimestamp(),
          });
          batch.set(doc(db, 'sessions', sessionId, 'rounds', roundId, 'voteStatus', userId), {
            votedAt: serverTimestamp(),
          });
          await batch.commit();
          return { data: undefined };
        } catch (e) {
          return toQueryError(e, 'Could not submit vote.');
        }
      },
    }),

    revealVotes: builder.mutation<void, RoundArg>({
      queryFn: async ({ sessionId, roundId }) => {
        try {
          await updateDoc(doc(db, 'sessions', sessionId, 'rounds', roundId), { revealed: true });
          return { data: undefined };
        } catch (e) {
          return toQueryError(e, 'Could not reveal votes.');
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useSubscribeParticipantsQuery,
  useSubscribeLatestRoundQuery,
  useSubscribeMyVoteQuery,
  useSubscribeVoteStatusQuery,
  useSubscribeVotesQuery,
  useAskQuestionMutation,
  useCastVoteMutation,
  useRevealVotesMutation,
} = roomApi;
