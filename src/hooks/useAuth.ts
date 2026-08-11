import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface UseAuthResult {
  userId: string | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = (): UseAuthResult => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setLoading(false);
        return;
      }
      signInAnonymously(auth).catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not sign in.');
        setLoading(false);
      });
    });

    return unsubscribe;
  }, []);

  return { userId, loading, error };
};
