import { serverTimestamp } from 'firebase/firestore';
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

const latestRoundUrl = (sessionId: string): ReadWriteArgs => ({
  url: `/sessions/${sessionId}/rounds`,
  params: { orderBy: [['createdAt', 'desc']], limit: 1 },
  select: 'first',
  streamed: true,
});

const myVoteUrl = ({ sessionId, roundId, userId }: MyVoteArg): ReadWriteArgs => ({
  url: `/sessions/${sessionId}/rounds/${roundId}/votes/${userId}`,
  streamed: true,
});

const voteStatusUrl = ({ sessionId, roundId }: RoundArg): ReadWriteArgs => ({
  url: `/sessions/${sessionId}/rounds/${roundId}/voteStatus`,
  select: 'ids',
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

    subscribeMyVote: builder.query<IVote | null, MyVoteArg>({
      query: myVoteUrl,
      onCacheEntryAdded: streamFrom<MyVoteArg, IVote | null>(myVoteUrl),
    }),

    subscribeVoteStatus: builder.query<string[], RoundArg>({
      query: voteStatusUrl,
      onCacheEntryAdded: streamFrom<RoundArg, string[]>(voteStatusUrl),
    }),

    subscribeVotes: builder.query<IVote[], RoundArg>({
      query: votesUrl,
      onCacheEntryAdded: streamFrom<RoundArg, IVote[]>(votesUrl),
    }),

    askQuestion: builder.mutation<{ id: string }, { sessionId: string; question: string }>({
      query: ({ sessionId, question }) => ({
        url: `/sessions/${sessionId}/rounds`,
        method: 'POST',
        data: { question, revealed: false, createdAt: serverTimestamp() },
      }),
    }),

    castVote: builder.mutation<void, MyVoteArg & { value: number }>({
      query: ({ sessionId, roundId, userId, value }) => ({
        method: 'BATCH',
        writes: [
          {
            url: `/sessions/${sessionId}/rounds/${roundId}/votes/${userId}`,
            method: 'PUT',
            data: { value, createdAt: serverTimestamp() },
          },
          {
            url: `/sessions/${sessionId}/rounds/${roundId}/voteStatus/${userId}`,
            method: 'PUT',
            data: { votedAt: serverTimestamp() },
          },
        ],
      }),
    }),

    revealVotes: builder.mutation<void, RoundArg>({
      query: ({ sessionId, roundId }) => ({
        url: `/sessions/${sessionId}/rounds/${roundId}`,
        method: 'PATCH',
        data: { revealed: true },
      }),
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
