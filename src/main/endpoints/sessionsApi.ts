import type { ISession } from '@/types';
import { emptyApi } from '@/store/emptyApi';
import type { ReadWriteArgs } from '@/store/firebaseBaseQuery';
import { streamFrom } from '@/store/firestoreStream';

// Streamed so room-wide settings (the card deck) reach every participant without a reload.
const sessionByCodeUrl = (code: string): ReadWriteArgs => ({
  url: '/sessions',
  params: { where: [['code', '==', code.toUpperCase()]], limit: 1 },
  single: true,
  notFound: 'Session not found.',
  streamed: true,
});

export const sessionsApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    findSessionByCode: builder.query<ISession, string>({
      query: sessionByCodeUrl,
      onCacheEntryAdded: streamFrom<string, ISession>(sessionByCodeUrl),
    }),
  }),
  overrideExisting: false,
});

export const { useFindSessionByCodeQuery, useLazyFindSessionByCodeQuery } = sessionsApi;
