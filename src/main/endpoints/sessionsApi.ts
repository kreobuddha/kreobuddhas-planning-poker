import type { ISession } from '@/types';
import { emptyApi } from '@/store/emptyApi';
import type { ReadWriteArgs } from '@/store/firebaseBaseQuery';
import { streamFrom } from '@/store/firestoreStream';

// The join code IS the session's document id, so this is a direct document read rather than a
// filtered collection query — which is what lets the rules deny `list` on /sessions outright.
// Streamed so room-wide settings (the card deck) reach every participant without a reload.
const sessionByCodeUrl = (code: string): ReadWriteArgs => ({
  url: `/sessions/${code.toUpperCase()}`,
  notFound: 'Session not found.',
});

export const sessionsApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    findSessionByCode: builder.query<ISession, string>({
      query: sessionByCodeUrl,
      onCacheEntryAdded: streamFrom<string, ISession>(sessionByCodeUrl, (dispatch, code, value) => {
        dispatch(sessionsApi.util.upsertQueryData('findSessionByCode', code, value));
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useFindSessionByCodeQuery, useLazyFindSessionByCodeQuery } = sessionsApi;
