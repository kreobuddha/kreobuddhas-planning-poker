import { serverTimestamp } from 'firebase/firestore';
import { DEFAULT_DECK } from '@/config';
import { emptyApi } from '@/store/emptyApi';

export const homeApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    // The session and its admin's participant row go in one batch: a session that exists with
    // nobody in it is a dead room nobody can be added to afterwards. The code doubles as the
    // document id, so a `set` onto a code already in use is an update of someone else's
    // session and the rules reject it — that's how a collision surfaces instead of silently
    // dropping the second team into the first team's room.
    createSession: builder.mutation<void, { userId: string; code: string; name: string }>({
      query: ({ userId, code, name }) => ({
        method: 'BATCH',
        writes: [
          {
            url: `/sessions/${code}`,
            method: 'PUT',
            data: { code, adminId: userId, deck: DEFAULT_DECK, createdAt: serverTimestamp() },
          },
          {
            url: `/sessions/${code}/participants/${userId}`,
            method: 'PUT',
            data: { name, joinedAt: serverTimestamp() },
          },
        ],
      }),
    }),
    ensureParticipant: builder.mutation<void, { sessionId: string; userId: string; name: string }>({
      query: ({ sessionId, userId, name }) => ({
        url: `/sessions/${sessionId}/participants/${userId}`,
        method: 'PUT',
        data: { name, joinedAt: serverTimestamp() },
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useCreateSessionMutation, useEnsureParticipantMutation } = homeApi;
