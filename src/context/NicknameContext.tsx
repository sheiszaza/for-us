import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseData';
import { useRealtimeDoc } from '../hooks/useRealtimeDoc';
import type { Role } from '../types';

const DEFAULT_NICKNAMES: Record<Role, string> = {
  me: 'Him',
  her: 'Her',
};

type Nicknames = {
  me: string;
  her: string;
};

type NicknameContextValue = {
  nicknames: Nicknames;
  loading: boolean;
  getNickname: (role: Role) => string;
  setNickname: (role: Role, nickname: string) => Promise<void>;
};

const NicknameContext = createContext<NicknameContextValue | undefined>(undefined);

type NicknameProviderProps = {
  children: ReactNode;
};

export function NicknameProvider({ children }: NicknameProviderProps) {
  const { data, loading } = useRealtimeDoc<Nicknames>('settings', 'nicknames');

  const nicknames = useMemo<Nicknames>(
    () => ({
      me: data?.me || DEFAULT_NICKNAMES.me,
      her: data?.her || DEFAULT_NICKNAMES.her,
    }),
    [data]
  );

  const getNickname = useCallback(
    (role: Role): string => nicknames[role],
    [nicknames]
  );

  const setNickname = useCallback(
    async (role: Role, nickname: string) => {
      const trimmed = nickname.trim() || DEFAULT_NICKNAMES[role];
      await setDoc(
        doc(db, 'settings', 'nicknames'),
        { [role]: trimmed },
        { merge: true }
      );
    },
    []
  );

  const value = useMemo<NicknameContextValue>(
    () => ({ nicknames, loading, getNickname, setNickname }),
    [nicknames, loading, getNickname, setNickname]
  );

  return <NicknameContext.Provider value={value}>{children}</NicknameContext.Provider>;
}

export const useNicknames = () => {
  const value = useContext(NicknameContext);

  if (!value) {
    throw new Error('useNicknames must be used within NicknameProvider');
  }

  return value;
};
