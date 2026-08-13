import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { emptyApi } from '@/store/emptyApi';
import { toQueryError } from '@/store/queryError';

export const authApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    signInAnonymously: builder.mutation<{ uid: string }, void>({
      queryFn: async () => {
        try {
          const credential = await signInAnonymously(auth);
          return { data: { uid: credential.user.uid } };
        } catch (e) {
          return toQueryError(e, 'Could not sign in.');
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const { useSignInAnonymouslyMutation } = authApi;
