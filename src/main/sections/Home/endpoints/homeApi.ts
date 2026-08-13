import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ISession } from '@/types';
import { emptyApi } from '@/store/emptyApi';
import { toQueryError } from '@/store/queryError';

export const homeApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    createSession: builder.mutation<ISession, { userId: string; code: string }>({
      queryFn: async ({ userId, code }) => {
        try {
          const sessionRef = await addDoc(collection(db, 'sessions'), {
            code,
            adminId: userId,
            createdAt: serverTimestamp(),
          });
          return { data: { id: sessionRef.id, code, adminId: userId, createdAt: Date.now() } };
        } catch (e) {
          return toQueryError(e, 'Could not create session.');
        }
      },
    }),
    ensureParticipant: builder.mutation<void, { sessionId: string; userId: string; name: string }>({
      queryFn: async ({ sessionId, userId, name }) => {
        try {
          await setDoc(doc(db, 'sessions', sessionId, 'participants', userId), {
            name,
            joinedAt: serverTimestamp(),
          });
          return { data: undefined };
        } catch (e) {
          return toQueryError(e, 'Could not join session.');
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const { useCreateSessionMutation, useEnsureParticipantMutation } = homeApi;
