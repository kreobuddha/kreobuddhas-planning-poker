import { serverTimestamp } from 'firebase/firestore';
import type { DeckKey } from '@/config';
import type { IParticipant, IRound, IVote } from '@/types';
import { emptyApi } from '@/store/emptyApi';
import type { ReadWriteArgs } from '@/store/firebaseBaseQuery';
import { streamFrom } from '@/store/firestoreStream';

interface RoundArg {
  sessionId: string;
  roundId: string;
}

type MyVoteArg = RoundArg & { userId: string };

// Each subscription names its descriptor once, then feeds it to both `query` (initial fetch)
// and `streamFrom` (live updates), so the two can't drift apart. `streamed` marks the listener
// as the source of truth — see the note in firebaseBaseQuery.
const participantsUrl = (sessionId: string): ReadWriteArgs => ({
  url: `/sessions/${sessionId}/participants`,
  streamed: true,
});

// Ordered by a client clock rather than serverTimestamp(): a pending serverTimestamp() reads
// back as null locally, and null sorts last under `desc`, so the admin who just started a round
// would keep seeing the previous one until the server acknowledged the write. Only the admin
// writes rounds within a session, so one clock orders them all.
const latestRoundUrl = (sessionId: string): ReadWriteArgs => ({
  url: `/sessions/${sessionId}/rounds`,
  params: { orderBy: [['createdAt', 'desc']], limit: 1 },
  select: 'first',
  streamed: true,
});

const votesUrl = ({ sessionId, roundId }: RoundArg): ReadWriteArgs => ({
  url: `/sessions/${sessionId}/rounds/${roundId}/votes`,
  streamed: true,
});

export const roomApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    subscribeParticipants: builder.query<IParticipant[], string>({
      query: participantsUrl,
      onCacheEntryAdded: streamFrom<string, IParticipant[]>(participantsUrl),
    }),

    subscribeLatestRound: builder.query<IRound | null, string>({
      query: latestRoundUrl,
      onCacheEntryAdded: streamFrom<string, IRound | null>(latestRoundUrl),
    }),

    subscribeVotes: builder.query<IVote[], RoundArg>({
      query: votesUrl,
      onCacheEntryAdded: streamFrom<RoundArg, IVote[]>(votesUrl),
    }),

    askQuestion: builder.mutation<{ id: string }, { sessionId: string; question: string }>({
      query: ({ sessionId, question }) => ({
        url: `/sessions/${sessionId}/rounds`,
        method: 'POST',
        data: { question, revealed: false, createdAt: Date.now() },
      }),
    }),

    castVote: builder.mutation<void, MyVoteArg & { value: number }>({
      query: ({ sessionId, roundId, userId, value }) => ({
        url: `/sessions/${sessionId}/rounds/${roundId}/votes/${userId}`,
        method: 'PUT',
        data: { value, createdAt: serverTimestamp() },
      }),
    }),

    clearVote: builder.mutation<void, MyVoteArg>({
      query: ({ sessionId, roundId, userId }) => ({
        url: `/sessions/${sessionId}/rounds/${roundId}/votes/${userId}`,
        method: 'DELETE',
      }),
    }),

    setDeck: builder.mutation<void, { sessionId: string; deck: DeckKey }>({
      query: ({ sessionId, deck }) => ({
        url: `/sessions/${sessionId}`,
        method: 'PATCH',
        data: { deck },
      }),
    }),

    revealVotes: builder.mutation<void, RoundArg>({
      query: ({ sessionId, roundId }) => ({
        url: `/sessions/${sessionId}/rounds/${roundId}`,
        method: 'PATCH',
        data: { revealed: true },
      }),
    }),

    // The reveal, undone. Votes already cast are left alone — the rules allow writing and
    // clearing them again the moment the round is open, so reopening returns the room to exactly
    // where it was rather than starting the question over.
    reopenRound: builder.mutation<void, RoundArg>({
      query: ({ sessionId, roundId }) => ({
        url: `/sessions/${sessionId}/rounds/${roundId}`,
        method: 'PATCH',
        data: { revealed: false },
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useSubscribeParticipantsQuery,
  useSubscribeLatestRoundQuery,
  useSubscribeVotesQuery,
  useAskQuestionMutation,
  useCastVoteMutation,
  useClearVoteMutation,
  useSetDeckMutation,
  useRevealVotesMutation,
  useReopenRoundMutation,
} = roomApi;
