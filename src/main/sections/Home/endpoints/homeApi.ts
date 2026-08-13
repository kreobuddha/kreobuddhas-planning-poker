import { serverTimestamp } from 'firebase/firestore';
import { emptyApi } from '@/store/emptyApi';

export const homeApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    createSession: builder.mutation<{ id: string }, { userId: string; code: string }>({
      query: ({ userId, code }) => ({
        url: '/sessions',
        method: 'POST',
        data: { code, adminId: userId, createdAt: serverTimestamp() },
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
