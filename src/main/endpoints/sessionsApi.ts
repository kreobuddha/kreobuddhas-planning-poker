import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { withMillis } from '@/lib/firestoreDoc';
import type { ISession } from '@/types';
import { emptyApi } from '@/store/emptyApi';
import { queryError, toQueryError } from '@/store/queryError';

export const sessionsApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    findSessionByCode: builder.query<ISession, string>({
      queryFn: async (code) => {
        try {
          const snapshot = await getDocs(
            query(collection(db, 'sessions'), where('code', '==', code.toUpperCase()), limit(1))
          );
          const sessionDoc = snapshot.docs[0];
          if (!sessionDoc) {
            return queryError('Session not found.');
          }
          return {
            data: { id: sessionDoc.id, ...withMillis(sessionDoc.data() as Omit<ISession, 'id'>) },
          };
        } catch (e) {
          return toQueryError(e, 'Could not find session.');
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const { useFindSessionByCodeQuery, useLazyFindSessionByCodeQuery } = sessionsApi;
