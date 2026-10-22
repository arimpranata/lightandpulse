import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ApiClientError, type Session } from '@/services/backend';

const STORAGE_KEY = 'balilens:portal:v1';

type PortalContextValue = {
  session: Session | null;
  setSession: (session: Session | null) => void;
  /** Runs a portal API call; an expired or revoked session signs the user out. */
  run: <T>(call: (token: string) => Promise<T>) => Promise<T>;
};

const PortalContext = createContext<PortalContextValue | null>(null);

/** Partner portal session, kept apart from the traveller's own account. */
export function PortalProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => setSessionState(raw ? (JSON.parse(raw) as Session) : null))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setSession = useCallback((next: Session | null) => {
    setSessionState(next);
    (next ? AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)) : AsyncStorage.removeItem(STORAGE_KEY)).catch(() => {});
  }, []);

  const run = useCallback(
    async <T,>(call: (token: string) => Promise<T>) => {
      if (!session) throw new ApiClientError(401, 'UNAUTHORIZED', 'Sign in to continue.');
      try {
        return await call(session.token);
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) setSession(null);
        throw error;
      }
    },
    [session, setSession],
  );

  const value = useMemo(() => ({ session, setSession, run }), [session, setSession, run]);
  return <PortalContext.Provider value={value}>{loaded ? children : null}</PortalContext.Provider>;
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) throw new Error('usePortal must be used inside the portal layout');
  return context;
}
