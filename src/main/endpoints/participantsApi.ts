import { serverTimestamp } from 'firebase/firestore';
import type { IParticipant } from '@/types';
import { emptyApi } from '@/store/emptyApi';

interface ParticipantArg {
  sessionId: string;
  userId: string;
}

export const participantsApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    // Deliberately without `notFound`: not being in a room yet is the normal state of somebody
    // about to join, so it resolves to null rather than to an error the caller has to unwrap.
    fetchParticipant: builder.query<IParticipant | null, ParticipantArg>({
      query: ({ sessionId, userId }) => ({
        url: `/sessions/${sessionId}/participants/${userId}`,
      }),
    }),

    // `joinedAt` is written once and never again — the rules freeze it, and the participant
    // list is ordered by it, so rewriting it on every visit would send a returning member to
    // the bottom of the room. Hence this being a create rather than the upsert it used to be:
    // rejoining goes through `renameParticipant` instead.
    createParticipant: builder.mutation<void, ParticipantArg & { name: string }>({
      query: ({ sessionId, userId, name }) => ({
        url: `/sessions/${sessionId}/participants/${userId}`,
        method: 'PUT',
        // The first presence beat rides along with the row, for the reason spelled out beside
        // the same write in `createSession`.
        data: { name, joinedAt: serverTimestamp(), lastSeenAt: Date.now() },
      }),
    }),

    renameParticipant: builder.mutation<void, ParticipantArg & { name: string }>({
      query: ({ sessionId, userId, name }) => ({
        url: `/sessions/${sessionId}/participants/${userId}`,
        method: 'PATCH',
        data: { name },
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useLazyFetchParticipantQuery,
  useCreateParticipantMutation,
  useRenameParticipantMutation,
} = participantsApi;
