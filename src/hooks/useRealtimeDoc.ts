import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseData';

type RealtimeDocState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useRealtimeDoc<T>(collectionName: string, docId: string) {
  const [state, setState] = useState<RealtimeDocState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const ref = doc(db, collectionName, docId);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const data = snapshot.exists() ? (snapshot.data() as T) : null;
        setState({ data, loading: false, error: null });
      },
      (error) => {
        setState((current) => ({ ...current, loading: false, error: error.message }));
      },
    );

    return unsubscribe;
  }, [collectionName, docId]);

  return state;
}
