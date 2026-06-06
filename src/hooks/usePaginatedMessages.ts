import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  endBefore,
  getDocs,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../firebaseData";
import type { Message } from "../types";

const PAGE_SIZE = 25;

type PaginatedMessagesState = {
  messages: Message[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
};

export function usePaginatedMessages() {
  const [state, setState] = useState<PaginatedMessagesState>({
    messages: [],
    loading: true,
    loadingMore: false,
    error: null,
    hasMore: true,
  });

  const oldestDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const messagesRef = collection(db, "messages");
    const recentQuery = query(
      messagesRef,
      orderBy("createdAt", "asc"),
      limitToLast(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(
      recentQuery,
      (snapshot) => {
        const messages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];

        if (snapshot.docs.length > 0 && !initialLoadDone.current) {
          oldestDocRef.current = snapshot.docs[0];
          initialLoadDone.current = true;
        }

        setState((current) => {
          if (current.messages.length === 0) {
            return {
              ...current,
              messages,
              loading: false,
              hasMore: snapshot.docs.length >= PAGE_SIZE,
            };
          }

          const existingIds = new Set(
            current.messages.slice(0, -PAGE_SIZE).map((m) => m.id)
          );
          const olderMessages = current.messages.filter((m) =>
            existingIds.has(m.id)
          );

          return {
            ...current,
            messages: [...olderMessages, ...messages],
            loading: false,
          };
        });
      },
      (error) => {
        setState((current) => ({
          ...current,
          loading: false,
          error: error.message,
        }));
      }
    );

    return unsubscribe;
  }, []);

  const loadMore = useCallback(async () => {
    if (state.loadingMore || !state.hasMore || !oldestDocRef.current) {
      return;
    }

    setState((current) => ({ ...current, loadingMore: true }));

    try {
      const messagesRef = collection(db, "messages");
      const olderQuery = query(
        messagesRef,
        orderBy("createdAt", "asc"),
        endBefore(oldestDocRef.current),
        limitToLast(PAGE_SIZE)
      );

      const snapshot = await getDocs(olderQuery);
      const olderMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      if (snapshot.docs.length > 0) {
        oldestDocRef.current = snapshot.docs[0];
      }

      setState((current) => ({
        ...current,
        messages: [...olderMessages, ...current.messages],
        loadingMore: false,
        hasMore: snapshot.docs.length >= PAGE_SIZE,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loadingMore: false,
        error: error instanceof Error ? error.message : "Failed to load more",
      }));
    }
  }, [state.loadingMore, state.hasMore]);

  return {
    messages: state.messages,
    loading: state.loading,
    loadingMore: state.loadingMore,
    error: state.error,
    hasMore: state.hasMore,
    loadMore,
  };
}
