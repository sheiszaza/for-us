import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { db } from '../firebaseData';
import { useRealtimeDoc } from '../hooks/useRealtimeDoc';
import { DEFAULT_PINS } from '../lib/roles';
import type { Role } from '../types';

type Pins = Record<Role, string>;

type StoredPins = Partial<Pins>;

const LEGACY_PIN_PREFIX = 'for-us:pin:';

const getLegacyPins = (): StoredPins => {
  if (typeof window === 'undefined') {
    return {};
  }

  const storedPins: StoredPins = {};
  const me = window.localStorage.getItem(`${LEGACY_PIN_PREFIX}me`);
  const her = window.localStorage.getItem(`${LEGACY_PIN_PREFIX}her`);

  if (me && me.trim().length >= 4) {
    storedPins.me = me.trim();
  }

  if (her && her.trim().length >= 4) {
    storedPins.her = her.trim();
  }

  return storedPins;
};

const clearLegacyPins = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(`${LEGACY_PIN_PREFIX}me`);
  window.localStorage.removeItem(`${LEGACY_PIN_PREFIX}her`);
};

type PinContextValue = {
  pins: Pins;
  loading: boolean;
  error: string | null;
  verifyPin: (role: Role, pin: string) => boolean;
  setPin: (role: Role, pin: string) => Promise<void>;
};

const PinContext = createContext<PinContextValue | undefined>(undefined);

type PinProviderProps = {
  children: ReactNode;
};

export function PinProvider({ children }: PinProviderProps) {
  const { user, loading: authLoading, error: authError } = useAuth();
  const migratedLegacyPins = useRef(false);
  const legacyPins = useMemo(() => getLegacyPins(), []);
  const { data, loading, error } = useRealtimeDoc<StoredPins>(
    'settings',
    'pins',
    Boolean(user) && !authLoading && !authError,
  );

  const pins = useMemo<Pins>(
    () => ({
      me: data?.me || legacyPins.me || DEFAULT_PINS.me,
      her: data?.her || legacyPins.her || DEFAULT_PINS.her,
    }),
    [data, legacyPins],
  );

  useEffect(() => {
    if (migratedLegacyPins.current || loading || error || data || (!legacyPins.me && !legacyPins.her)) {
      return;
    }

    migratedLegacyPins.current = true;

    setDoc(
      doc(db, 'settings', 'pins'),
      {
        ...legacyPins,
        updatedAt: serverTimestamp(),
        updatedBy: legacyPins.me ? 'me' : 'her',
      },
      { merge: true },
    )
      .then(clearLegacyPins)
      .catch((migrationError: unknown) => {
        console.error('PIN migration error:', migrationError);
      });
  }, [data, error, legacyPins, loading]);

  const verifyPin = useCallback(
    (role: Role, pin: string) => pins[role] === pin.trim(),
    [pins],
  );

  const setPin = useCallback(async (role: Role, pin: string) => {
    await setDoc(
      doc(db, 'settings', 'pins'),
      {
        [role]: pin.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: role,
      },
      { merge: true },
    );
    clearLegacyPins();
  }, []);

  const value = useMemo<PinContextValue>(
    () => ({
      pins,
      loading: authLoading || (!authError && loading),
      error,
      verifyPin,
      setPin,
    }),
    [authError, authLoading, error, loading, pins, setPin, verifyPin],
  );

  return <PinContext.Provider value={value}>{children}</PinContext.Provider>;
}

export const usePins = () => {
  const value = useContext(PinContext);

  if (!value) {
    throw new Error('usePins must be used within PinProvider');
  }

  return value;
};
