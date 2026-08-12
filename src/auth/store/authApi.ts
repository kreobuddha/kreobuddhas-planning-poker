import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { emptyApi } from '@/store/emptyApi';

export const authApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    signInAnonymously: builder.mutation<{ uid: string }, void>({
      queryFn: async () => {
        try {
          const credential = await signInAnonymously(auth);
          return { data: { uid: credential.user.uid } };
        } catch (e) {
          return {
            error: { status: 'CUSTOM_ERROR', error: e instanceof Error ? e.message : 'Could not sign in.' },
          };
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const { useSignInAnonymouslyMutation } = authApi;
