import { createApi } from '@reduxjs/toolkit/query/react';
import firebaseBaseQuery from '@/store/firebaseBaseQuery';

export const emptyApi = createApi({
  reducerPath: 'api',
  baseQuery: firebaseBaseQuery(),
  endpoints: () => ({}),
});
