import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { RootState } from '@/store';
import { setAuthError, setUid } from '@/auth/userSlice';
import { useSignInAnonymouslyMutation } from '@/auth/store/authApi';

interface UseCheckAuthResult {
  userId: string | null;
  loading: boolean;
  error: string | null;
}

export const useCheckAuth = (): UseCheckAuthResult => {
  const dispatch = useDispatch();
  const { uid, loading, error } = useSelector((state: RootState) => state.user);
  const [signInAnonymously] = useSignInAnonymouslyMutation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        dispatch(setUid(user.uid));
        return;
      }
      signInAnonymously()
        .unwrap()
        .catch((err: { error?: string }) => {
          dispatch(setAuthError(err.error ?? 'Could not sign in.'));
        });
    });

    return unsubscribe;
  }, [dispatch, signInAnonymously]);

  return { userId: uid, loading, error };
};
