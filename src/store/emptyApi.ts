import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

export const emptyApi = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery(),
  endpoints: () => ({}),
});
