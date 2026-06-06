import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebaseData';

type RealtimeCollectionState<T> = {
  data: T[];
  loading: boolean;
  error: string | null;
};

export function useRealtimeCollection<T extends { id: string }>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
) {
  const [state, setState] = useState<RealtimeCollectionState<T>>({
    data: [],
    loading: true,
    error: null,
  });

  const stableConstraints = useMemo(() => constraints, [constraints]);

  useEffect(() => {
    const ref = query(collection(db, collectionName), ...stableConstraints);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const data = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];

        setState({ data, loading: false, error: null });
      },
      (error) => {
        setState((current) => ({ ...current, loading: false, error: error.message }));
      },
    );

    return unsubscribe;
  }, [collectionName, stableConstraints]);

  return state;
}
