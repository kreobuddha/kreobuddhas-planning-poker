import type { ISession } from '@/types';
import { emptyApi } from '@/store/emptyApi';

export const sessionsApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    findSessionByCode: builder.query<ISession, string>({
      query: (code) => ({
        url: '/sessions',
        params: { where: [['code', '==', code.toUpperCase()]], limit: 1 },
        single: true,
        notFound: 'Session not found.',
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useFindSessionByCodeQuery, useLazyFindSessionByCodeQuery } = sessionsApi;
